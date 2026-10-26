export const USER_KEY = 'em-user';
export const MY_UPI_KEY = 'em-upi-id';
export const REMINDER_PROMPT_KEY = 'em-reminder-prompt-dismissed';
export const tripsCacheKey = (userId: string) => `em-trips:${userId}`;

// Storage throws when the browser blocks site data or is full; the app then just runs without a local copy.
export function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function removeStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
