import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { User } from '../../src/lib/types';
import { asString, cookie, HttpError, json, parseCookies, readJson, redirect } from './http';

type StoredUser = User & {
  salt?: string;
  hash?: string;
  recoverySalt?: string;
  recoveryHash?: string;
  /** Part of every session token; bumping it signs out all devices. */
  sessionVersion: number;
  createdAt: number;
};

export type SessionUser = User & { key: string };

const SESSION_COOKIE = 'em_session';
const OAUTH_COOKIE = 'em_oauth';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const USERNAME_PATTERN = /^[a-zA-Z0-9._@+-]{3,64}$/;
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const usersStore = () => getStore({ name: 'users', consistency: 'strong' });
export const configStore = () => getStore({ name: 'config', consistency: 'strong' });
const passwordKey = (username: string) => `u:${username.toLowerCase()}`;
const googleKey = (sub: string) => `g:${sub}`;
const publicUser = ({ id, username, provider }: StoredUser): User => ({ id, username, provider });

function hashSecret(secret: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(secret, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function hashed(secret: string) {
  const salt = randomBytes(16);
  return { salt: salt.toString('base64'), hash: (await hashSecret(secret, salt)).toString('base64') };
}

async function secretMatches(secret: string, salt: string | undefined, hash: string | undefined) {
  // Hash even with nothing to compare against so response time doesn't reveal which accounts exist.
  const computed = await hashSecret(secret, salt ? Buffer.from(salt, 'base64') : randomBytes(16));
  return !!hash && timingSafeEqual(computed, Buffer.from(hash, 'base64'));
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

async function sessionCookie(req: Request, key: string, record: StoredUser) {
  const payload = Buffer.from(
    JSON.stringify({ uid: record.id, k: key, sv: record.sessionVersion, exp: Date.now() + SESSION_SECONDS * 1000 }),
  ).toString('base64url');
  return cookie(req, SESSION_COOKIE, `${payload}.${sign(payload, await sessionSecret())}`, SESSION_SECONDS);
}

export async function readSession(req: Request): Promise<SessionUser | null> {
  const [payload, signature] = parseCookies(req.headers.get('cookie'))[SESSION_COOKIE]?.split('.') ?? [];
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, await sessionSecret()));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  let session: { uid?: unknown; k?: unknown; sv?: unknown; exp?: unknown };
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (typeof session.k !== 'string' || typeof session.exp !== 'number' || session.exp < Date.now()) return null;
  const record = (await usersStore().get(session.k, { type: 'json' })) as StoredUser | null;
  if (!record || record.id !== session.uid || record.sessionVersion !== session.sv) return null;
  return { ...publicUser(record), key: session.k };
}

function newRecoveryCode() {
  const characters = Array.from({ length: 16 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]);
  return characters.join('').match(/.{4}/g)!.join('-');
}

const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

async function issueRecoveryCode(record: StoredUser) {
  const code = newRecoveryCode();
  const { salt, hash } = await hashed(normalizeCode(code));
  record.recoverySalt = salt;
  record.recoveryHash = hash;
  return code;
}

function checkPassword(password: string) {
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Password must be at least 8 characters');
}

async function readCredentials(req: Request) {
  const body = await readJson<{ username?: unknown; password?: unknown }>(req);
  const username = asString(body?.username).trim();
  const password = asString(body?.password);
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, 'Username must be 3–64 characters (letters, numbers, . _ @ + -)');
  }
  checkPassword(password);
  return { username, password };
}

async function saveIfUnchanged(key: string, record: StoredUser, etag: string | undefined) {
  const { modified } = await usersStore().setJSON(key, record, { onlyIfMatch: etag });
  if (!modified) throw new HttpError(409, 'Your account changed at the same time. Please try again.');
}

async function signup(req: Request) {
  const { username, password } = await readCredentials(req);
  const key = passwordKey(username);
  const record: StoredUser = {
    id: randomUUID(),
    username,
    provider: 'password',
    ...(await hashed(password)),
    sessionVersion: 0,
    createdAt: Date.now(),
  };
  const recoveryCode = await issueRecoveryCode(record);
  const { modified } = await usersStore().setJSON(key, record, { onlyIfNew: true });
  if (!modified) throw new HttpError(409, 'That username is already taken');
  return json({ user: publicUser(record), recoveryCode }, 201, { 'Set-Cookie': await sessionCookie(req, key, record) });
}

async function login(req: Request) {
  const { username, password } = await readCredentials(req);
  const key = passwordKey(username);
  const record = (await usersStore().get(key, { type: 'json' })) as StoredUser | null;
  if (!(await secretMatches(password, record?.salt, record?.hash)) || !record) {
    throw new HttpError(401, 'Wrong username or password');
  }
  return json({ user: publicUser(record) }, 200, { 'Set-Cookie': await sessionCookie(req, key, record) });
}

async function recover(req: Request) {
  const body = await readJson<{ username?: unknown; recoveryCode?: unknown; newPassword?: unknown }>(req);
  const newPassword = asString(body?.newPassword);
  checkPassword(newPassword);
  const key = passwordKey(asString(body?.username).trim());
  const current = await usersStore().getWithMetadata(key, { type: 'json' });
  const record = current?.data as StoredUser | undefined;
  const codeMatches = await secretMatches(normalizeCode(asString(body?.recoveryCode)), record?.recoverySalt, record?.recoveryHash);
  if (!codeMatches || !record) throw new HttpError(401, "That username and recovery code don't match");
  Object.assign(record, await hashed(newPassword));
  record.sessionVersion += 1;
  const recoveryCode = await issueRecoveryCode(record);
  await saveIfUnchanged(key, record, current?.etag);
  return json({ user: publicUser(record), recoveryCode }, 200, { 'Set-Cookie': await sessionCookie(req, key, record) });
}

async function loadPasswordAccount(req: Request) {
  const session = await readSession(req);
  if (!session) throw new HttpError(401, 'Please log in again');
  const current = await usersStore().getWithMetadata(session.key, { type: 'json' });
  const record = current?.data as StoredUser | undefined;
  if (!record) throw new HttpError(401, 'Please log in again');
  if (record.provider !== 'password') throw new HttpError(400, 'This account signs in with Google');
  return { key: session.key, record, etag: current?.etag };
}

async function changePassword(req: Request) {
  const body = await readJson<{ currentPassword?: unknown; newPassword?: unknown }>(req);
  const newPassword = asString(body?.newPassword);
  checkPassword(newPassword);
  const { key, record, etag } = await loadPasswordAccount(req);
  if (!(await secretMatches(asString(body?.currentPassword), record.salt, record.hash))) {
    throw new HttpError(401, 'Your current password is wrong');
  }
  Object.assign(record, await hashed(newPassword));
  record.sessionVersion += 1;
  await saveIfUnchanged(key, record, etag);
  return json({ ok: true }, 200, { 'Set-Cookie': await sessionCookie(req, key, record) });
}

async function regenerateRecoveryCode(req: Request) {
  const { key, record, etag } = await loadPasswordAccount(req);
  const recoveryCode = await issueRecoveryCode(record);
  await saveIfUnchanged(key, record, etag);
  return json({ recoveryCode });
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const googleCallbackUrl = (req: Request) => `${new URL(req.url).origin}/api/auth/google/callback`;
const safeReturnPath = (path: string | null) => (path?.startsWith('/') && !path.startsWith('//') ? path : '/');

function startGoogle(req: Request) {
  const config = googleConfig();
  if (!config) return redirect('/?authError=google');
  const state = randomBytes(16).toString('base64url');
  const returnTo = safeReturnPath(new URL(req.url).searchParams.get('returnTo'));
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: googleCallbackUrl(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, {
    'Set-Cookie': cookie(req, OAUTH_COOKIE, `${state}.${Buffer.from(returnTo).toString('base64url')}`, 600),
  });
}

async function finishGoogle(req: Request) {
  const config = googleConfig();
  const url = new URL(req.url);
  const [state, encodedReturn] = parseCookies(req.headers.get('cookie'))[OAUTH_COOKIE]?.split('.') ?? [];
  const clearState = cookie(req, OAUTH_COOKIE, '', 0);
  const fail = () => redirect('/?authError=google', { 'Set-Cookie': clearState });
  const code = url.searchParams.get('code');
  if (!config || !code || !state || url.searchParams.get('state') !== state) return fail();

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: googleCallbackUrl(req),
      grant_type: 'authorization_code',
    }),
  });
  const { access_token: accessToken } = (await tokenResponse.json().catch(() => ({}))) as { access_token?: string };
  if (!tokenResponse.ok || !accessToken) return fail();
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = (await profileResponse.json().catch(() => ({}))) as { sub?: string; email?: string; name?: string };
  if (!profileResponse.ok || !profile.sub) return fail();

  const store = usersStore();
  const key = googleKey(profile.sub);
  let record = (await store.get(key, { type: 'json' })) as StoredUser | null;
  if (!record) {
    const created: StoredUser = {
      id: randomUUID(),
      username: (profile.name || profile.email || 'Google user').slice(0, 64),
      provider: 'google',
      sessionVersion: 0,
      createdAt: Date.now(),
    };
    const { modified } = await store.setJSON(key, created, { onlyIfNew: true });
    record = modified ? created : ((await store.get(key, { type: 'json' })) as StoredUser | null);
    if (!record) return fail();
  }
  const returnTo = safeReturnPath(encodedReturn ? Buffer.from(encodedReturn, 'base64url').toString() : null);
  return redirect(returnTo, [
    ['Set-Cookie', await sessionCookie(req, key, record)],
    ['Set-Cookie', clearState],
  ]);
}

export async function handleAuth(req: Request, action: string): Promise<Response> {
  if (req.method === 'GET') {
    if (action === 'me') {
      const session = await readSession(req);
      return json({ user: session && { id: session.id, username: session.username, provider: session.provider }, google: !!googleConfig() });
    }
    if (action === 'google') return startGoogle(req);
    if (action === 'google/callback') return finishGoogle(req);
  }
  if (req.method !== 'POST') return json({ error: 'Not found' }, 404);
  switch (action) {
    case 'logout':
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, SESSION_COOKIE, '', 0) });
    case 'signup':
      return signup(req);
    case 'login':
      return login(req);
    case 'recover':
      return recover(req);
    case 'password':
      return changePassword(req);
    case 'recovery-code':
      return regenerateRecoveryCode(req);
    default:
      return json({ error: 'Not found' }, 404);
  }
}
