import { useSyncExternalStore } from 'react';
import { api } from '../lib/api';
import { reminderTimesLabel } from '../lib/reminders';
import { useToast } from './toast';

export type ReminderStatus = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on';

let status: ReminderStatus = 'checking';
let checkStarted = false;
const listeners = new Set<() => void>();

function setStatus(next: ReminderStatus) {
  status = next;
  for (const listener of listeners) listener();
}

const isSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

const saveSubscription = (subscription: PushSubscription) =>
  api('/push/subscriptions', {
    method: 'POST',
    json: { subscription: subscription.toJSON(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

async function checkStatus() {
  if (!isSupported()) return setStatus('unsupported');
  if (Notification.permission === 'denied') return setStatus('blocked');
  const subscription = Notification.permission === 'granted' ? await currentSubscription() : null;
  setStatus(subscription ? 'on' : 'off');
  // Re-saving links the device to whoever is signed in now, in their current time zone.
  if (subscription) await saveSubscription(subscription).catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!checkStarted) {
    checkStarted = true;
    void checkStatus();
  }
  return () => {
    listeners.delete(listener);
  };
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** Must run straight from a tap: iOS only shows the permission prompt during a user gesture. */
async function enableReminders(): Promise<ReminderStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    const next = permission === 'denied' ? 'blocked' : 'off';
    setStatus(next);
    return next;
  }
  if (!(await navigator.serviceWorker.getRegistration())) {
    throw new Error('Reminders need the app to finish installing. Reload and try again.');
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes((await api<{ publicKey: string }>('/push/key')).publicKey),
    }));
  await saveSubscription(subscription);
  setStatus('on');
  return 'on';
}

export async function disableReminders() {
  if (!isSupported()) return;
  const subscription = await currentSubscription();
  if (subscription) {
    await api('/push/subscriptions', { method: 'DELETE', json: { endpoint: subscription.endpoint } }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => false);
  }
  if (status === 'on') setStatus('off');
}

export function useReminders() {
  const current = useSyncExternalStore(subscribe, () => status);
  const toast = useToast();
  return {
    status: current,
    turnOn: () =>
      enableReminders().then(
        (result) => {
          if (result === 'on') toast({ message: `Reminders on: ${reminderTimesLabel} on event days` });
          if (result === 'blocked') toast({ message: 'Notifications are blocked. Allow them for this app in Settings.', tone: 'error' });
        },
        (err: Error) => toast({ message: err.message, tone: 'error' }),
      ),
    turnOff: () => disableReminders().then(() => toast({ message: 'Reminders turned off' })),
  };
}
