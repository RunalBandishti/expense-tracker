import { formatDateRange } from './dates';
import { formatMoney } from './money';
import { summarizeTrip } from './split';
import type { Trip } from './types';

export function tripSummaryText(trip: Trip, liveLink?: string) {
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
    }
  } else if (summary.paidTotal > 0) {
    lines.push('', 'Everyone is settled up ✅');
  }
  if (liveLink) lines.push('', `Live details: ${liveLink}`);
  return lines.join('\n');
}
