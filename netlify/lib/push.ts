import { getStore } from '@netlify/blobs';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { testNotification, type ReminderNotification } from '../../src/lib/reminders';
import { configStore, type SessionUser } from './auth';
import { asString, HttpError, json, noContent, readJson } from './http';

export type StoredSubscription = {
  userId: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  timeZone: string;
  /** Date and hour of the last reminder sent, so a repeated run can't send it twice. */
  lastSent?: string;
};

type VapidKeys = { publicKey: string; privateKey: string };

// Only real push services, so the reminders job never posts to an arbitrary URL.
const PUSH_HOST_SUFFIXES = ['.googleapis.com', '.push.apple.com', '.mozilla.com', '.notify.windows.com'];
const BASE64URL_KEY = /^[A-Za-z0-9_-]{16,200}={0,2}$/;
const PUSH_TTL_SECONDS = 60 * 60;

export const subscriptionsStore = () => getStore({ name: 'push-subscriptions', consistency: 'strong' });
const subscriptionKey = (endpoint: string) => createHash('sha256').update(endpoint).digest('base64url');

function generateVapidKeys(): VapidKeys {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const { x, y, d } = privateKey.export({ format: 'jwk' });
  if (!x || !y || !d) throw new Error('Could not create push keys');
  const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]);
  return { publicKey: publicKey.toString('base64url'), privateKey: d };
}

let cachedKeys: VapidKeys | undefined;

export async function vapidKeys() {
  if (cachedKeys) return cachedKeys;
  const store = configStore();
  let keys = (await store.get('vapid-keys', { type: 'json' })) as VapidKeys | null;
  if (!keys) {
    await store.setJSON('vapid-keys', generateVapidKeys(), { onlyIfNew: true });
    keys = (await store.get('vapid-keys', { type: 'json' })) as VapidKeys | null;
  }
  if (!keys) throw new Error('Push keys unavailable');
  return (cachedKeys = keys);
}

/** Resolves whether it was delivered; subscriptions the push service has dropped are deleted. */
export async function sendPush(key: string, stored: StoredSubscription, notification: ReminderNotification) {
  // Loaded on demand so API cold starts don't pay for it; the API only needs it for test pushes.
  const [{ default: webpush }, { publicKey, privateKey }] = await Promise.all([import('web-push'), vapidKeys()]);
  try {
    await webpush.sendNotification(stored.subscription, JSON.stringify(notification), {
      TTL: PUSH_TTL_SECONDS,
      vapidDetails: { subject: process.env.URL ?? 'mailto:reminders@expense-manager.app', publicKey, privateKey },
    });
    return true;
  } catch (err) {
    // 404 and 410 mean the browser dropped the subscription, e.g. notifications were turned off.
    if (err instanceof webpush.WebPushError && (err.statusCode === 404 || err.statusCode === 410)) await subscriptionsStore().delete(key);
    else console.error('Push failed', err);
    return false;
  }
}

function isPushEndpoint(endpoint: string) {
  if (endpoint.length > 1000) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && PUSH_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function isTimeZone(value: string) {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function pushPublicKey() {
  return json({ publicKey: (await vapidKeys()).publicKey });
}

type SubscriptionBody = { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; timeZone?: unknown };

export async function saveSubscription(req: Request, user: SessionUser) {
  const body = await readJson<SubscriptionBody>(req);
  const endpoint = asString(body.subscription?.endpoint);
  const p256dh = asString(body.subscription?.keys?.p256dh);
  const auth = asString(body.subscription?.keys?.auth);
  const timeZone = asString(body.timeZone);
  if (!isPushEndpoint(endpoint) || !BASE64URL_KEY.test(p256dh) || !BASE64URL_KEY.test(auth) || !isTimeZone(timeZone)) {
    throw new HttpError(400, "Couldn't turn on reminders on this device");
  }
  const stored: StoredSubscription = { userId: user.id, subscription: { endpoint, keys: { p256dh, auth } }, timeZone };
  await subscriptionsStore().setJSON(subscriptionKey(endpoint), stored);
  return noContent();
}

export async function deleteSubscription(req: Request, user: SessionUser) {
  const endpoint = asString((await readJson<{ endpoint?: unknown }>(req)).endpoint);
  const store = subscriptionsStore();
  const key = subscriptionKey(endpoint);
  const stored = (await store.get(key, { type: 'json' })) as StoredSubscription | null;
  if (stored?.userId === user.id) await store.delete(key);
  return noContent();
}

export async function sendTestPush(req: Request, user: SessionUser) {
  const key = subscriptionKey(asString((await readJson<{ endpoint?: unknown }>(req)).endpoint));
  const stored = (await subscriptionsStore().get(key, { type: 'json' })) as StoredSubscription | null;
  if (stored?.userId !== user.id) throw new HttpError(404, 'Turn on reminders on this device first');
  if (!(await sendPush(key, stored, testNotification))) {
    throw new HttpError(502, "Couldn't send a test notification to this device. Try again.");
  }
  return noContent();
}
