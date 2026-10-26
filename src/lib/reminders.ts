import type { Trip } from './types';

export const REMINDERS = [
  { hour: 13, message: "Log what you've spent so far today." },
  { hour: 21, message: "Add today's expenses before the day ends." },
];

/** Must equal the interval of the reminders function's schedule, so each reminder lands in exactly one run. */
export const REMINDER_WINDOW_MINUTES = 30;

const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
export const reminderTimesLabel = REMINDERS.map((reminder) => hourLabel(reminder.hour)).join(' and ');

export type ReminderSlot = { date: string; hour: number; message: string };

export function reminderSlot(timeZone: string, now: Date): ReminderSlot | null {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const reminder = REMINDERS.find((candidate) => candidate.hour === Number(parts.hour));
  if (!reminder || Number(parts.minute) >= REMINDER_WINDOW_MINUTES) return null;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: reminder.hour, message: reminder.message };
}

export type ReminderNotification = { title: string; body: string; url: string; tag: string };

/** Shared by every reminder so a new one replaces the last instead of piling up. */
const NOTIFICATION_TAG = 'expense-reminder';

export const testNotification: ReminderNotification = {
  title: '🔔 Reminders are on',
  body: `You'll get one at ${reminderTimesLabel} on each day of an event.`,
  url: '/',
  tag: NOTIFICATION_TAG,
};

export function reminderNotification(trips: Trip[], slot: ReminderSlot): ReminderNotification | null {
  const events = trips.filter((trip) => trip.startDate && trip.endDate && trip.startDate <= slot.date && slot.date <= trip.endDate);
  if (events.length === 0) return null;
  if (events.length === 1) {
    const [event] = events;
    return { title: `${event.emoji} ${event.name}`, body: slot.message, url: `/trips/${event.id}?add=1`, tag: NOTIFICATION_TAG };
  }
  const names = events.map((event) => event.name);
  const listed = names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and ');
  return { title: 'Time to log expenses', body: `${listed} are on today. ${slot.message}`, url: '/', tag: NOTIFICATION_TAG };
}
