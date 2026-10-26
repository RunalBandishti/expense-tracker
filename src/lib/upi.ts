import type { Transfer } from './split';
import type { Person, Trip } from './types';

export const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
/** Typical per-payment cap for person-to-person UPI, in paise. */
export const UPI_LIMIT = 10_000_000;
const NOTE_MAX = 50;

export type UpiPayment = { upiId: string; name: string; amount?: number; note?: string };

export const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay', scheme: 'tez://upi/pay' },
  { id: 'phonepe', label: 'PhonePe', scheme: 'phonepe://pay' },
  { id: 'paytm', label: 'Paytm', scheme: 'paytmmp://pay' },
  { id: 'any', label: 'Other UPI app', scheme: 'upi://pay' },
];

export const isValidUpiId = (value: string) => UPI_ID_PATTERN.test(value.trim());
export const supportsUpi = (trip: Pick<Trip, 'currency'>) => trip.currency === 'INR';

// UPI apps expect a literal '@' in the payee address and %20 (not +) for spaces.
const encodeParam = (value: string) => encodeURIComponent(value).replace(/%40/g, '@');

export function upiQuery({ upiId, name, amount, note }: UpiPayment) {
  const parts = [`pa=${encodeParam(upiId)}`, `pn=${encodeParam(name)}`];
  if (amount) parts.push(`am=${(amount / 100).toFixed(2)}`);
  parts.push('cu=INR');
  if (note) parts.push(`tn=${encodeParam(note.slice(0, NOTE_MAX))}`);
  return parts.join('&');
}

export const upiLink = (payment: UpiPayment, scheme = 'upi://pay') => `${scheme}?${upiQuery(payment)}`;

export const payPageUrl = (origin: string, payment: UpiPayment) => `${origin}/pay?${upiQuery(payment)}`;

export function parsePayPage(search: string): UpiPayment | null {
  const params = new URLSearchParams(search);
  const upiId = params.get('pa')?.trim() ?? '';
  const amountText = params.get('am');
  const amount = amountText ? Math.round(Number(amountText) * 100) : undefined;
  if (!isValidUpiId(upiId)) return null;
  if (amount !== undefined && !(Number.isSafeInteger(amount) && amount > 0)) return null;
  return {
    upiId,
    name: (params.get('pn') || upiId).slice(0, 50),
    amount,
    note: params.get('tn')?.slice(0, NOTE_MAX) || undefined,
  };
}

const settleNote = (trip: Pick<Trip, 'name'>) => `${trip.name} settle-up`;

export function transferPayment(trip: Trip, transfer: Transfer): UpiPayment | null {
  const payee = trip.people.find((person) => person.id === transfer.toId);
  if (!supportsUpi(trip) || !payee?.upiId) return null;
  return { upiId: payee.upiId, name: payee.name, amount: transfer.amount, note: settleNote(trip) };
}

export function personPayment(trip: Trip, person: Person, amount?: number): UpiPayment | null {
  if (!supportsUpi(trip) || !person.upiId) return null;
  return { upiId: person.upiId, name: person.name, amount, note: settleNote(trip) };
}
