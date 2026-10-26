import { categoryIdOf, tripCategories } from './categories';
import { pluralize, type TripTiming } from './dates';
import { formatMoney } from './money';
import { COMMON, type Expense, type Person, type Split, type Trip } from './types';

export const tripTotal = (trip: Trip) => trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);

export function findPersonByName(people: Person[], name: string) {
  const needle = name.trim().toLowerCase();
  return people.find((person) => person.name.toLowerCase() === needle);
}

export const isReservedName = (name: string) => name.trim().toLowerCase() === COMMON;

export const peopleLabel = (count: number) => pluralize(count, 'person', 'people');

/** Largest-remainder rounding in minor units, so parts always add up to `amount`; ties favour earlier entries. */
export function allocate(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (amount * weight) / totalWeight);
  const parts = exact.map(Math.floor);
  let leftover = amount - parts.reduce((sum, part) => sum + part, 0);
  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - parts[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of byFraction) {
    if (leftover <= 0) break;
    parts[index] += 1;
    leftover -= 1;
  }
  return parts;
}

export function expenseShares(expense: Pick<Expense, 'amount' | 'forId' | 'split'>, people: Person[]) {
  const shares = new Map<string, number>();
  if (expense.forId !== COMMON) {
    if (people.some((person) => person.id === expense.forId)) shares.set(expense.forId, expense.amount);
    return shares;
  }
  const split = expense.split ?? { mode: 'all' };
  if (split.mode === 'exact') {
    for (const person of people) if ((split.amounts[person.id] ?? 0) > 0) shares.set(person.id, split.amounts[person.id]);
    return shares;
  }
  const weighted: [string, number][] =
    split.mode === 'all'
      ? people.map((person) => [person.id, 1])
      : split.mode === 'custom'
        ? people.filter((person) => split.personIds.includes(person.id)).map((person) => [person.id, 1])
        : people
            .map((person): [string, number] => [
              person.id,
              (split.mode === 'shares' ? split.weights[person.id] : split.percents[person.id]) ?? 0,
            ])
            .filter(([, weight]) => weight > 0);
  const parts = allocate(
    expense.amount,
    weighted.map(([, weight]) => weight),
  );
  weighted.forEach(([id], index) => shares.set(id, parts[index]));
  return shares;
}

export const participantIds = (expense: Pick<Expense, 'amount' | 'forId' | 'split'>, people: Person[]) => [
  ...expenseShares(expense, people).keys(),
];

export type PersonSummary = {
  person: Person;
  personal: number;
  shared: number;
  /** Everything this person consumed: personal + shared. */
  total: number;
  paid: number;
  /** Positive: others owe them. Negative: they owe others. */
  balance: number;
  items: { expense: Expense; share: number; splitCount: number }[];
};

export type Transfer = { fromId: string; toId: string; amount: number };

export type TripSummary = {
  total: number;
  sharedTotal: number;
  personalTotal: number;
  /** Money in expenses that currently has nobody to split it between. */
  unassigned: number;
  /** Expenses that count towards shares but have no payer, so they're left out of balances. */
  unpaidCount: number;
  paidTotal: number;
  people: PersonSummary[];
  transfers: Transfer[];
};

function suggestTransfers(people: PersonSummary[]): Transfer[] {
  const debtors = people
    .filter((entry) => entry.balance < 0)
    .map((entry) => ({ id: entry.person.id, amount: -entry.balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = people
    .filter((entry) => entry.balance > 0)
    .map((entry) => ({ id: entry.person.id, amount: entry.balance }))
    .sort((a, b) => b.amount - a.amount);
  const transfers: Transfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({ fromId: debtor.id, toId: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtorIndex++;
    if (creditor.amount === 0) creditorIndex++;
  }
  return transfers;
}

/** With a category, only that category's expenses and the payments recorded for it count. */
export function summarizeTrip(trip: Trip, categoryId?: string): TripSummary {
  const byPerson = new Map<string, PersonSummary>(
    trip.people.map((person) => [person.id, { person, personal: 0, shared: 0, total: 0, paid: 0, balance: 0, items: [] }]),
  );
  let total = 0;
  let sharedTotal = 0;
  let unassigned = 0;
  let unpaidCount = 0;
  let paidTotal = 0;

  for (const expense of trip.expenses) {
    if (categoryId && categoryIdOf(trip, expense.category) !== categoryId) continue;
    const isShared = expense.forId === COMMON;
    const shares = expenseShares(expense, trip.people);
    const assigned = [...shares.values()].reduce((sum, share) => sum + share, 0);
    const payer = expense.paidById ? byPerson.get(expense.paidById) : undefined;
    total += expense.amount;
    if (isShared) sharedTotal += expense.amount;
    unassigned += expense.amount - assigned;
    if (payer) {
      payer.paid += expense.amount;
      paidTotal += expense.amount;
      // Only the assigned part moves balances, so they always net to zero.
      payer.balance += assigned;
    } else if (assigned > 0) {
      unpaidCount++;
    }
    for (const [personId, share] of shares) {
      const entry = byPerson.get(personId)!;
      if (isShared) entry.shared += share;
      else entry.personal += share;
      entry.total += share;
      if (payer) entry.balance -= share;
      entry.items.push({ expense, share, splitCount: shares.size });
    }
  }

  for (const settlement of trip.settlements) {
    if (categoryId && (!settlement.category || categoryIdOf(trip, settlement.category) !== categoryId)) continue;
    const from = byPerson.get(settlement.fromId);
    const to = byPerson.get(settlement.toId);
    if (!from || !to) continue;
    from.balance += settlement.amount;
    to.balance -= settlement.amount;
  }

  const people = [...byPerson.values()];
  return {
    total,
    sharedTotal,
    personalTotal: total - sharedTotal,
    unassigned,
    unpaidCount,
    paidTotal,
    people,
    transfers: suggestTransfers(people),
  };
}

/** Categories that have paid expenses, in the event's category order. */
export function categorySummaries(trip: Trip) {
  return tripCategories(trip)
    .map((category) => ({ category, summary: summarizeTrip(trip, category.id) }))
    .filter(({ summary }) => summary.paidTotal > 0);
}

export function perDayStat(budget: number | null, spent: number, timing: TripTiming) {
  if (timing.kind === 'undated') return null;
  const remaining = budget === null ? 0 : budget - spent;
  if (timing.kind === 'ongoing' && remaining > 0) {
    return { label: 'Per day left', amount: Math.floor(remaining / timing.daysLeft) };
  }
  if (timing.kind === 'upcoming' && remaining > 0) {
    return { label: 'Per day', amount: Math.floor(remaining / timing.totalDays) };
  }
  const elapsedDays = timing.kind === 'ongoing' ? timing.day : timing.totalDays;
  return { label: 'Avg per day', amount: Math.round(spent / elapsedDays) };
}

function splitIncludes(split: Split | undefined, personId: string) {
  switch (split?.mode) {
    case 'custom':
      return split.personIds.includes(personId);
    case 'shares':
      return (split.weights[personId] ?? 0) > 0;
    case 'percent':
      return (split.percents[personId] ?? 0) > 0;
    case 'exact':
      return (split.amounts[personId] ?? 0) > 0;
    default:
      return false;
  }
}

export function countUsesOfPerson(trip: Trip, personId: string) {
  const expenses = trip.expenses.filter(
    (expense) => expense.forId === personId || expense.paidById === personId || splitIncludes(expense.split, personId),
  ).length;
  const payments = trip.settlements.filter((settlement) => settlement.fromId === personId || settlement.toId === personId).length;
  return expenses + payments;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function splitProblem(split: Split, amount: number | null, people: Person[], currency: string): string | null {
  switch (split.mode) {
    case 'all':
      return people.length ? null : 'Add the people to split with';
    case 'custom':
      return people.some((person) => split.personIds.includes(person.id)) ? null : 'Pick at least one person to split with';
    case 'shares':
      return people.some((person) => (split.weights[person.id] ?? 0) > 0) ? null : 'Give at least one person a share';
    case 'percent': {
      const sum = people.reduce((total, person) => total + (split.percents[person.id] ?? 0), 0);
      return Math.abs(sum - 100) < 0.005 ? null : `Percentages add up to ${round2(sum)}%, they need to total 100%`;
    }
    case 'exact': {
      if (amount === null) return null;
      const difference = amount - people.reduce((total, person) => total + (split.amounts[person.id] ?? 0), 0);
      if (difference === 0) return null;
      return difference > 0
        ? `${formatMoney(difference, currency)} still to assign`
        : `${formatMoney(-difference, currency)} more than the total`;
    }
  }
}
