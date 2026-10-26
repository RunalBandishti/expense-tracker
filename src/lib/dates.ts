const DAY_MS = 86_400_000;

export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export const todayISO = () => toISODate(new Date());

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function utcDayNumber(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export const daysBetween = (from: string, to: string) => utcDayNumber(to) - utcDayNumber(from);

const longFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const dayHeaderFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const formatLongDate = (iso: string) => longFormat.format(parseISODate(iso));
export const formatShortDate = (iso: string) => shortFormat.format(parseISODate(iso));
export const formatDayHeader = (iso: string) => dayHeaderFormat.format(parseISODate(iso));

export function formatDateRange(start: string, end: string) {
  return start === end ? formatLongDate(start) : longFormat.formatRange(parseISODate(start), parseISODate(end));
}

export type TripTiming =
  | { kind: 'undated' }
  | { kind: 'upcoming'; totalDays: number; startsIn: number }
  | { kind: 'ongoing'; totalDays: number; day: number; daysLeft: number }
  | { kind: 'past'; totalDays: number };

export function tripTiming(start: string | null, end: string | null, today = todayISO()): TripTiming {
  if (!start || !end) return { kind: 'undated' };
  const totalDays = daysBetween(start, end) + 1;
  if (today < start) return { kind: 'upcoming', totalDays, startsIn: daysBetween(today, start) };
  if (today > end) return { kind: 'past', totalDays };
  const day = daysBetween(start, today) + 1;
  return { kind: 'ongoing', totalDays, day, daysLeft: totalDays - day + 1 };
}

export const pluralize = (count: number, word: string, plural = `${word}s`) => `${count} ${count === 1 ? word : plural}`;
