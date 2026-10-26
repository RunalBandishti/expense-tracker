import type { Config } from '@netlify/functions';
import { reminderNotification, reminderSlot } from '../../src/lib/reminders';
import type { Trip } from '../../src/lib/types';
import { sendPush, subscriptionsStore, type StoredSubscription } from '../lib/push';
import { tripsOf } from '../lib/trips';

export default async () => {
  const now = new Date();
  const store = subscriptionsStore();
  const { blobs } = await store.list();

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
      if (notification && (await sendPush(key, stored, notification))) await store.setJSON(key, { ...stored, lastSent: sentId });
    }),
  );
};

// Runs every REMINDER_WINDOW_MINUTES.
export const config: Config = { schedule: '*/30 * * * *' };
