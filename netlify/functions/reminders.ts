import type { Config } from '@netlify/functions';
import webpush from 'web-push';
import { reminderNotification, reminderSlot } from '../../src/lib/reminders';
import type { Trip } from '../../src/lib/types';
import { subscriptionsStore, vapidKeys, type StoredSubscription } from '../lib/push';
import { tripsOf } from '../lib/trips';

const REMINDER_TTL_SECONDS = 60 * 60;

export default async () => {
  const now = new Date();
  const store = subscriptionsStore();
  const { blobs } = await store.list();
  if (blobs.length === 0) return;
  const { publicKey, privateKey } = await vapidKeys();
  const vapidDetails = { subject: process.env.URL ?? 'mailto:reminders@expense-manager.app', publicKey, privateKey };

  const tripsByUser = new Map<string, Promise<Trip[]>>();
  const tripsFor = (userId: string) => {
    const cached = tripsByUser.get(userId);
    if (cached) return cached;
    const loading = tripsOf(userId);
    tripsByUser.set(userId, loading);
    return loading;
  };

  await Promise.all(
    blobs.map(async ({ key }) => {
      const stored = (await store.get(key, { type: 'json' })) as StoredSubscription | null;
      const slot = stored && reminderSlot(stored.timeZone, now);
      if (!stored || !slot) return;
      const sentId = `${slot.date} ${slot.hour}`;
      if (stored.lastSent === sentId) return;
      const notification = reminderNotification(await tripsFor(stored.userId), slot);
      if (!notification) return;
      try {
        await webpush.sendNotification(stored.subscription, JSON.stringify(notification), { TTL: REMINDER_TTL_SECONDS, vapidDetails });
        await store.setJSON(key, { ...stored, lastSent: sentId });
      } catch (err) {
        // 404 and 410 mean the browser dropped the subscription, e.g. notifications were turned off.
        if (err instanceof webpush.WebPushError && (err.statusCode === 404 || err.statusCode === 410)) await store.delete(key);
        else console.error('Reminder failed', err);
      }
    }),
  );
};

// Runs every REMINDER_WINDOW_MINUTES.
export const config: Config = { schedule: '*/30 * * * *' };
