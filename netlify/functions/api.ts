import type { Config } from '@netlify/functions';
import { handleAuth, readSession } from '../lib/auth';
import { HttpError, json } from '../lib/http';
import { deleteSubscription, pushPublicKey, saveSubscription } from '../lib/push';
import {
  acceptInvite,
  applyOps,
  createLink,
  deleteTrip,
  getTrip,
  invitePreview,
  leaveTrip,
  listTrips,
  publicTrip,
  removeMember,
  revokeLink,
} from '../lib/trips';

const ID = '([a-zA-Z0-9-]{1,64})';
const TOKEN = '([A-Za-z0-9_-]{16,64})';
const route = (pattern: string) => new RegExp(`^${pattern}$`);

const ROUTES = {
  trip: route(`/trips/${ID}`),
  tripAction: route(`/trips/${ID}/(ops|share|invite|leave)`),
  member: route(`/trips/${ID}/members/${ID}`),
  publicTrip: route(`/public/${TOKEN}`),
  invite: route(`/invites/${TOKEN}`),
  acceptInvite: route(`/invites/${TOKEN}/accept`),
};

async function handle(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/^\/api/, '').replace(/\/+$/, '');
  const { method } = req;

  if (path.startsWith('/auth/')) return handleAuth(req, path.slice('/auth/'.length));
  let match = path.match(ROUTES.publicTrip);
  if (match && method === 'GET') return publicTrip(match[1]);

  const user = await readSession(req);
  match = path.match(ROUTES.invite);
  if (match && method === 'GET') return invitePreview(match[1], user);
  if (!user) return json({ error: 'Please log in again' }, 401);

  if (path === '/trips' && method === 'GET') return listTrips(user);
  if ((match = path.match(ROUTES.trip))) {
    if (method === 'GET') return getTrip(user, match[1]);
    if (method === 'DELETE') return deleteTrip(user, match[1]);
  }
  if ((match = path.match(ROUTES.tripAction))) {
    const [, id, action] = match;
    if (action === 'ops' && method === 'POST') return applyOps(req, user, id);
    if (action === 'leave' && method === 'POST') return leaveTrip(user, id);
    if ((action === 'share' || action === 'invite') && method === 'POST') return createLink(user, id, action);
    if ((action === 'share' || action === 'invite') && method === 'DELETE') return revokeLink(user, id, action);
  }
  if ((match = path.match(ROUTES.member)) && method === 'DELETE') return removeMember(user, match[1], match[2]);
  if ((match = path.match(ROUTES.acceptInvite)) && method === 'POST') return acceptInvite(user, match[1]);
  if (path === '/push/key' && method === 'GET') return pushPublicKey();
  if (path === '/push/subscriptions' && method === 'POST') return saveSubscription(req, user);
  if (path === '/push/subscriptions' && method === 'DELETE') return deleteSubscription(req, user);
  return json({ error: 'Not found' }, 404);
}

export default async (req: Request) => {
  try {
    return await handle(req);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

export const config: Config = { path: '/api/*' };
