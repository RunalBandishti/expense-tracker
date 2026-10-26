import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { Trip, User } from '../../src/lib/types';

type StoredUser = User & { salt: string; hash: string; createdAt: number };

const SESSION_COOKIE = 'em_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const MAX_BODY_BYTES = 2_000_000;
const USERNAME_PATTERN = /^[a-zA-Z0-9._@+-]{3,64}$/;
const TRIP_ID_PATTERN = /^\/trips\/([a-zA-Z0-9-]{1,64})$/;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const usersStore = () => getStore({ name: 'users', consistency: 'strong' });
const tripsStore = () => getStore({ name: 'trips', consistency: 'strong' });
const configStore = () => getStore({ name: 'config', consistency: 'strong' });

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

async function readJson(req: Request): Promise<unknown> {
  // Requiring JSON blocks cross-site form posts (login CSRF).
  if (!req.headers.get('content-type')?.includes('application/json')) {
    throw new HttpError(415, 'Expected JSON');
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function hashPassword(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

let cachedSecret: string | undefined;

async function sessionSecret() {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET) return (cachedSecret = process.env.SESSION_SECRET);
  const store = configStore();
  let secret = await store.get('session-secret', { type: 'text' });
  if (!secret) {
    await store.set('session-secret', randomBytes(32).toString('base64url'), { onlyIfNew: true });
    secret = await store.get('session-secret', { type: 'text' });
  }
  if (!secret) throw new Error('Session secret unavailable');
  return (cachedSecret = secret);
}

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

async function createSessionToken(user: User) {
  const payload = Buffer.from(
    JSON.stringify({ uid: user.id, u: user.username, exp: Date.now() + SESSION_SECONDS * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload, await sessionSecret())}`;
}

function parseCookies(header: string | null) {
  const cookies: Record<string, string> = {};
  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (separator > 0) cookies[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
  }
  return cookies;
}

async function readSession(req: Request): Promise<User | null> {
  const [payload, signature] = parseCookies(req.headers.get('cookie'))[SESSION_COOKIE]?.split('.') ?? [];
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, await sessionSecret()));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof session.exp !== 'number' || session.exp < Date.now()) return null;
    return { id: session.uid, username: session.u };
  } catch {
    return null;
  }
}

function sessionCookie(req: Request, value: string, maxAge: number) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function respondWithSession(req: Request, record: StoredUser, status: number) {
  const user: User = { id: record.id, username: record.username };
  const token = await createSessionToken(user);
  return json({ user }, status, { 'Set-Cookie': sessionCookie(req, token, SESSION_SECONDS) });
}

async function handleAuth(req: Request, action: string) {
  if (action === 'me' && req.method === 'GET') {
    const user = await readSession(req);
    return user ? json({ user }) : json({ error: 'Not logged in' }, 401);
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (action === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(req, '', 0) });
  if (action !== 'signup' && action !== 'login') return json({ error: 'Not found' }, 404);

  const body = (await readJson(req)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!USERNAME_PATTERN.test(username)) {
    return json({ error: 'Username must be 3–64 characters (letters, numbers, . _ @ + -)' }, 400);
  }
  if (password.length < 8 || password.length > 200) {
    return json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const store = usersStore();
  const key = username.toLowerCase();

  if (action === 'signup') {
    const salt = randomBytes(16);
    const record: StoredUser = {
      id: randomUUID(),
      username,
      salt: salt.toString('base64'),
      hash: (await hashPassword(password, salt)).toString('base64'),
      createdAt: Date.now(),
    };
    const { modified } = await store.setJSON(key, record, { onlyIfNew: true });
    if (!modified) return json({ error: 'That username is already taken' }, 409);
    return respondWithSession(req, record, 201);
  }

  const record = (await store.get(key, { type: 'json' })) as StoredUser | null;
  // Hash even for unknown users so response time doesn't reveal which usernames exist.
  const hash = await hashPassword(password, record ? Buffer.from(record.salt, 'base64') : randomBytes(16));
  if (!record || !timingSafeEqual(hash, Buffer.from(record.hash, 'base64'))) {
    return json({ error: 'Wrong username or password' }, 401);
  }
  return respondWithSession(req, record, 200);
}

function isTrip(value: unknown): value is Trip {
  const trip = value as Trip | null;
  return (
    typeof trip === 'object' &&
    trip !== null &&
    typeof trip.id === 'string' &&
    typeof trip.name === 'string' &&
    trip.name.length <= 120 &&
    Array.isArray(trip.people) &&
    Array.isArray(trip.expenses) &&
    trip.people.every((person) => typeof person?.id === 'string' && typeof person?.name === 'string') &&
    trip.expenses.every(
      (expense) =>
        typeof expense?.id === 'string' && Number.isInteger(expense?.amount) && typeof expense?.forId === 'string',
    )
  );
}

async function listTrips(user: User) {
  const store = tripsStore();
  const { blobs } = await store.list({ prefix: `${user.id}/` });
  const trips = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: 'json' })));
  return json({ trips: trips.filter(Boolean) });
}

async function saveTrip(req: Request, user: User, tripId: string) {
  const trip = await readJson(req);
  if (!isTrip(trip) || trip.id !== tripId) return json({ error: 'Invalid trip' }, 400);
  trip.updatedAt = Date.now();
  await tripsStore().setJSON(`${user.id}/${tripId}`, trip);
  return json({ trip });
}

async function deleteTrip(user: User, tripId: string) {
  await tripsStore().delete(`${user.id}/${tripId}`);
  return new Response(null, { status: 204 });
}

export default async (req: Request) => {
  const path = new URL(req.url).pathname.replace(/^\/api/, '').replace(/\/+$/, '');
  try {
    if (path.startsWith('/auth/')) return await handleAuth(req, path.slice('/auth/'.length));

    const user = await readSession(req);
    if (!user) return json({ error: 'Please log in again' }, 401);

    if (path === '/trips' && req.method === 'GET') return await listTrips(user);
    const tripId = path.match(TRIP_ID_PATTERN)?.[1];
    if (tripId && req.method === 'PUT') return await saveTrip(req, user, tripId);
    if (tripId && req.method === 'DELETE') return await deleteTrip(user, tripId);
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

export const config: Config = { path: '/api/*' };
