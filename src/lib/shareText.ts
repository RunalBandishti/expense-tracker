import { categoryTotals } from './categories';
import { formatDateRange, formatShortDate } from './dates';
import { formatMoney } from './money';
import { allocate, byDate, summarizeTrip } from './split';
import type { Trip } from './types';
import { payPageUrl, transferPayment } from './upi';

type SummaryOptions = { liveLink?: string; origin?: string; includeExpenses?: boolean; includeCategories?: boolean };

export function tripSummaryText(trip: Trip, { liveLink, origin, includeExpenses, includeCategories }: SummaryOptions = {}) {
  const summary = summarizeTrip(trip);
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const nameOf = (id: string) => trip.people.find((person) => person.id === id)?.name ?? '?';
  const lines = [`${trip.emoji} *${trip.name}*`];
  if (trip.startDate && trip.endDate) lines.push(formatDateRange(trip.startDate, trip.endDate));
  lines.push('', `Total spent: ${money(summary.total)}${trip.budget ? ` of ${money(trip.budget)} budget` : ''}`);

  const overBudget = trip.budget ? summary.total - trip.budget : 0;
  if (overBudget > 0) {
    const extras = allocate(overBudget, summary.people.map((entry) => entry.total));
    lines.push('', `*Over budget by ${money(overBudget)}*`);
    summary.people.forEach((entry, index) => {
      if (extras[index] > 0) lines.push(`• ${entry.person.name} owes ${money(extras[index])} extra`);
    });
  }
  const categories = includeCategories ? categoryTotals(trip) : [];
  if (categories.length) {
    lines.push('', '*Spent by category*');
    for (const category of categories) lines.push(`• ${category.emoji} ${category.label}: ${money(category.amount)}`);
  }

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
  if (includeExpenses && trip.expenses.length) {
    lines.push('', '*Expenses*');
    for (const expense of [...trip.expenses].sort(byDate)) lines.push(`• ${formatShortDate(expense.date)} · ${expense.title}: ${money(expense.amount)}`);
  }
  if (liveLink) lines.push('', `Live details: ${liveLink}`);
  return lines.join('\n');
}
