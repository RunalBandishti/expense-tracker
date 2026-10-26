import { useSyncExternalStore } from 'react';
import { api } from '../lib/api';
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

function unsupportedMessage() {
  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isAppleMobile) return "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.";
  return window.matchMedia('(display-mode: standalone)').matches
    ? 'Notifications need iOS 16.4 or later.'
    : 'On iPhone, notifications work in the Home Screen app: tap Share, then Add to Home Screen, and open it from there.';
}

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
    throw new Error('Notifications need the app to finish installing. Reload and try again.');
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
  await api('/push/test', { method: 'POST', json: { endpoint: subscription.endpoint } });
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
    turnOn: async () => {
      if (current === 'unsupported') {
        toast({ message: unsupportedMessage() });
        return;
      }
      try {
        const result = await enableReminders();
        if (result === 'on') toast({ message: 'Notifications on. Sending a test now.' });
        if (result === 'blocked') toast({ message: 'Notifications are blocked. Allow them for this app in Settings.', tone: 'error' });
      } catch (err) {
        toast({ message: (err as Error).message, tone: 'error' });
      }
    },
    turnOff: () => disableReminders().then(() => toast({ message: 'Notifications turned off' })),
  };
}
