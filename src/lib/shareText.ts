import { formatDateRange } from './dates';
import { formatMoney } from './money';
import { summarizeTrip } from './split';
import type { Trip } from './types';
import { payPageUrl, transferPayment } from './upi';

export function tripSummaryText(trip: Trip, { liveLink, origin }: { liveLink?: string; origin?: string } = {}) {
  const summary = summarizeTrip(trip);
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const nameOf = (id: string) => trip.people.find((person) => person.id === id)?.name ?? '?';
  const lines = [`${trip.emoji} *${trip.name}*`];
  if (trip.startDate && trip.endDate) lines.push(formatDateRange(trip.startDate, trip.endDate));
  lines.push('', `Total spent: ${money(summary.total)}${trip.budget ? ` of ${money(trip.budget)} budget` : ''}`);

  if (summary.people.length) {
    lines.push('', "*Each person's share*");
    for (const entry of summary.people) lines.push(`• ${entry.person.name}: ${money(entry.total)}`);
  }
  if (summary.transfers.length) {
    lines.push('', '*To settle up*');
    for (const transfer of summary.transfers) {
      lines.push(`• ${nameOf(transfer.fromId)} pays ${nameOf(transfer.toId)} ${money(transfer.amount)}`);
      const payment = origin && transferPayment(trip, transfer);
      if (payment) lines.push(`  Pay by UPI: ${payPageUrl(origin, payment)}`);
    }
  } else if (summary.paidTotal > 0) {
    lines.push('', 'Everyone is settled up ✅');
  }
  if (liveLink) lines.push('', `Live details: ${liveLink}`);
  return lines.join('\n');
}
