import { COMMON, type Expense, type Person, type Trip } from './types';
import type { TripTiming } from './dates';

export const tripTotal = (trip: Trip) => trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);

export function findPersonByName(people: Person[], name: string) {
  const needle = name.trim().toLowerCase();
  return people.find((person) => person.name.toLowerCase() === needle);
}

export const isReservedName = (name: string) => name.trim().toLowerCase() === COMMON;

export function participantIds(expense: Pick<Expense, 'forId' | 'split'>, people: Person[]): string[] {
  const known = new Set(people.map((person) => person.id));
  if (expense.forId !== COMMON) return known.has(expense.forId) ? [expense.forId] : [];
  const split = expense.split ?? { mode: 'all' };
  if (split.mode === 'all') return people.map((person) => person.id);
  return split.personIds.filter((id) => known.has(id));
}

/** Splits evenly in minor units; leftover units go to the first participants so shares always add up. */
export function splitEvenly(amount: number, ids: string[]): Map<string, number> {
  const shares = new Map<string, number>();
  if (ids.length === 0) return shares;
  const base = Math.floor(amount / ids.length);
  const leftover = amount - base * ids.length;
  ids.forEach((id, index) => shares.set(id, base + (index < leftover ? 1 : 0)));
  return shares;
}

export type PersonSummary = {
  person: Person;
  personal: number;
  shared: number;
  total: number;
  items: { expense: Expense; share: number; splitCount: number }[];
};

export type TripSummary = {
  total: number;
  sharedTotal: number;
  personalTotal: number;
  /** Common expenses that currently have nobody to split between. */
  unassigned: number;
  people: PersonSummary[];
};

export function summarizeTrip(trip: Trip): TripSummary {
  const byPerson = new Map<string, PersonSummary>(
    trip.people.map((person) => [person.id, { person, personal: 0, shared: 0, total: 0, items: [] }]),
  );
  let total = 0;
  let sharedTotal = 0;
  let unassigned = 0;

  for (const expense of trip.expenses) {
    const isShared = expense.forId === COMMON;
    const ids = participantIds(expense, trip.people);
    total += expense.amount;
    if (isShared) sharedTotal += expense.amount;
    if (ids.length === 0) unassigned += expense.amount;

    for (const [personId, share] of splitEvenly(expense.amount, ids)) {
      const summary = byPerson.get(personId)!;
      if (isShared) summary.shared += share;
      else summary.personal += share;
      summary.total += share;
      summary.items.push({ expense, share, splitCount: ids.length });
    }
  }

  return { total, sharedTotal, personalTotal: total - sharedTotal, unassigned, people: [...byPerson.values()] };
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

export function countExpensesUsingPerson(trip: Trip, personId: string) {
  return trip.expenses.filter(
    (expense) =>
      expense.forId === personId || (expense.split?.mode === 'custom' && expense.split.personIds.includes(personId)),
  ).length;
}

export const peopleLabel = (count: number) => `${count} ${count === 1 ? 'person' : 'people'}`;
