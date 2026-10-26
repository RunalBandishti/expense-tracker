import { getStore } from '@netlify/blobs';
import { DEFAULT_CATEGORIES } from '../../src/lib/categories';
import { applyOp } from '../../src/lib/ops';
import type { Trip } from '../../src/lib/types';
import { sendExpenseAlerts } from './alerts';
import type { SessionUser } from './auth';
import { HttpError, json, noContent, randomToken, readJson } from './http';
import { rememberSavedPeople } from './people';
import { parseOps } from './validate';

type LinkKind = 'share' | 'invite';

const MAX_TRIP_BYTES = 2_000_000;
const MAX_MEMBERS = 50;
const LINK_FIELD = { share: 'shareToken', invite: 'inviteToken' } as const;

const tripsStore = () => getStore({ name: 'trips', consistency: 'strong' });
const membershipsStore = () => getStore({ name: 'memberships', consistency: 'strong' });
const tokensStore = () => getStore({ name: 'tokens', consistency: 'strong' });
const membershipKey = (userId: string, tripId: string) => `${userId}/${tripId}`;

async function readTrip(id: string) {
  const result = await tripsStore().getWithMetadata(id, { type: 'json' });
  return result ? { trip: result.data as Trip, etag: result.etag } : null;
}

function memberOf(trip: Trip, user: SessionUser) {
  const member = trip.members.find((candidate) => candidate.userId === user.id);
  if (!member) throw new HttpError(404, 'Event not found');
  return member;
}

function requireOwner(trip: Trip, user: SessionUser) {
  if (memberOf(trip, user).role !== 'owner') throw new HttpError(403, 'Only the event owner can do that');
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Applies `change` to the latest copy, retrying when someone else saved in between.
 * Relies on Netlify Blobs' conditional writes; the local emulator returns no ETags, so it can't detect clashes.
 */
async function mutateTrip(id: string, user: SessionUser | null, change: (trip: Trip) => Trip) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) await pause(20 + Math.random() * 80 * attempt);
    const current = await readTrip(id);
    if (!current) throw new HttpError(404, 'Event not found');
    if (user) memberOf(current.trip, user);
    const next = change(current.trip);
    if (next === current.trip) return next;
    const saved: Trip = { ...next, version: current.trip.version + 1, updatedAt: Date.now() };
    if (JSON.stringify(saved).length > MAX_TRIP_BYTES) throw new HttpError(413, 'This event has grown too large');
    const { modified } = await tripsStore().setJSON(id, saved, { onlyIfMatch: current.etag });
    if (modified) return saved;
  }
  throw new HttpError(409, 'Lots of changes at once. Please try again.');
}

export async function tripsOf(userId: string) {
  const memberships = membershipsStore();
  const { blobs } = await memberships.list({ prefix: `${userId}/` });
  const trips = await Promise.all(
    blobs.map(async ({ key }) => {
      const current = await readTrip(key.slice(userId.length + 1));
      if (current?.trip.members.some((member) => member.userId === userId)) return current.trip;
      await memberships.delete(key);
      return null;
    }),
  );
  return trips.filter((trip): trip is Trip => trip !== null);
}

export async function listTrips(user: SessionUser) {
  return json({ trips: await tripsOf(user.id) });
}

export async function getTrip(user: SessionUser, id: string) {
  const current = await readTrip(id);
  if (!current) throw new HttpError(404, 'Event not found');
  memberOf(current.trip, user);
  return json({ trip: current.trip });
}

/** `defer` runs follow-up work after the response, such as telling linked people about their new expenses. */
export async function applyOps(req: Request, user: SessionUser, id: string, defer: (task: Promise<unknown>) => void) {
  const submitted = parseOps(await readJson(req), user.id);
  const [first, ...rest] = submitted;
  let ops = submitted;
  if (first.type === 'trip/create') {
    if (first.trip.id !== id) throw new HttpError(400, 'Some changes were invalid');
    const existing = await readTrip(id);
    if (!existing) {
      const now = Date.now();
      const { name, emoji, startDate, endDate, budget, currency, people } = first.trip;
      const trip: Trip = {
        id,
        name: name.trim(),
        emoji,
        startDate,
        endDate,
        budget,
        currency,
        people,
        expenses: [],
        settlements: [],
        categories: DEFAULT_CATEGORIES,
        members: [{ userId: user.id, username: user.username, role: 'owner', joinedAt: now }],
        ownerId: user.id,
        shareToken: null,
        inviteToken: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      const { modified } = await tripsStore().setJSON(id, trip, { onlyIfNew: true });
      if (modified) await membershipsStore().setJSON(membershipKey(user.id, id), { joinedAt: now });
    } else if (existing.trip.ownerId === user.id) {
      await membershipsStore().setJSON(membershipKey(user.id, id), { joinedAt: existing.trip.createdAt });
    }
    ops = rest;
  }
  if (ops.some((op) => op.type === 'trip/create')) throw new HttpError(400, 'Some changes were invalid');
  let createdIds = new Set<string>();
  const trip = await mutateTrip(id, user, (current) => {
    const existing = new Set(current.expenses.map((expense) => expense.id));
    createdIds = new Set(ops.flatMap((op) => (op.type === 'expense/upsert' && !existing.has(op.expense.id) ? [op.expense.id] : [])));
    return ops.reduce((acc, op) => applyOp(acc, op) ?? acc, current);
  });
  await rememberSavedPeople(user.id, submitted, trip);
  const created = trip.expenses.filter((expense) => createdIds.has(expense.id));
  if (created.length > 0) defer(sendExpenseAlerts(trip, created, user.id));
  return json({ trip });
}

export async function deleteTrip(user: SessionUser, id: string) {
  const current = await readTrip(id);
  if (!current) return noContent();
  requireOwner(current.trip, user);
  await tripsStore().delete(id);
  const memberships = membershipsStore();
  const tokens = tokensStore();
  await Promise.all([
    ...current.trip.members.map((member) => memberships.delete(membershipKey(member.userId, id))),
    current.trip.shareToken && tokens.delete(`share:${current.trip.shareToken}`),
    current.trip.inviteToken && tokens.delete(`invite:${current.trip.inviteToken}`),
  ]);
  return noContent();
}

export async function leaveTrip(user: SessionUser, id: string) {
  await mutateTrip(id, user, (current) => {
    if (memberOf(current, user).role === 'owner') throw new HttpError(400, 'Owners delete the event instead of leaving it');
    return { ...current, members: current.members.filter((member) => member.userId !== user.id) };
  });
  await membershipsStore().delete(membershipKey(user.id, id));
  return noContent();
}

export async function removeMember(user: SessionUser, id: string, memberId: string) {
  const trip = await mutateTrip(id, user, (current) => {
    requireOwner(current, user);
    if (memberId === user.id) throw new HttpError(400, "You can't remove yourself");
    return { ...current, members: current.members.filter((member) => member.userId !== memberId) };
  });
  await membershipsStore().delete(membershipKey(memberId, id));
  return json({ trip });
}

export async function createLink(user: SessionUser, id: string, kind: LinkKind) {
  const field = LINK_FIELD[kind];
  const token = randomToken();
  // The token record is written first so a link is never visible before it resolves.
  await tokensStore().setJSON(`${kind}:${token}`, { tripId: id });
  const trip = await mutateTrip(id, user, (current) => (current[field] ? current : { ...current, [field]: token }));
  if (trip[field] !== token) await tokensStore().delete(`${kind}:${token}`);
  return json({ trip });
}

export async function revokeLink(user: SessionUser, id: string, kind: LinkKind) {
  const field = LINK_FIELD[kind];
  const revoked = { token: null as string | null };
  const trip = await mutateTrip(id, user, (current) => {
    requireOwner(current, user);
    revoked.token = current[field];
    return current[field] ? { ...current, [field]: null } : current;
  });
  if (revoked.token) await tokensStore().delete(`${kind}:${revoked.token}`);
  return json({ trip });
}

async function tripForLink(kind: LinkKind, token: string) {
  const link = (await tokensStore().get(`${kind}:${token}`, { type: 'json' })) as { tripId: string } | null;
  const current = link && (await readTrip(link.tripId));
  if (!current || current.trip[LINK_FIELD[kind]] !== token) {
    throw new HttpError(404, kind === 'share' ? 'This link has been turned off' : 'This invite link has expired');
  }
  return current.trip;
}

export async function publicTrip(token: string) {
  const trip = await tripForLink('share', token);
  return json({ trip: { ...trip, members: [], ownerId: '', shareToken: null, inviteToken: null } });
}

export async function invitePreview(token: string, user: SessionUser | null) {
  const trip = await tripForLink('invite', token);
  return json({
    invite: {
      tripId: trip.id,
      name: trip.name,
      emoji: trip.emoji,
      startDate: trip.startDate,
      endDate: trip.endDate,
      memberCount: trip.members.length,
      people: trip.people.map(({ id, name }) => ({ id, name })),
      ownerName: trip.members.find((member) => member.role === 'owner')?.username ?? '',
      alreadyMember: !!user && trip.members.some((member) => member.userId === user.id),
    },
  });
}

export async function acceptInvite(user: SessionUser, token: string) {
  const { id } = await tripForLink('invite', token);
  const trip = await mutateTrip(id, null, (current) => {
    if (current.inviteToken !== token) throw new HttpError(404, 'This invite link has expired');
    if (current.members.some((member) => member.userId === user.id)) return current;
    if (current.members.length >= MAX_MEMBERS) throw new HttpError(400, 'This event already has the maximum number of members');
    return {
      ...current,
      members: [...current.members, { userId: user.id, username: user.username, role: 'editor', joinedAt: Date.now() }],
    };
  });
  await membershipsStore().setJSON(membershipKey(user.id, id), { joinedAt: Date.now() });
  return json({ trip });
}
