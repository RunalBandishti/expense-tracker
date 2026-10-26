import { countUsesOfPerson } from './split';
import type { Expense, Person, Settlement, Trip, TripDetails } from './types';

/** Every op is idempotent, so a batch can safely be resent after a lost response. */
export type Op =
  | { type: 'trip/create'; trip: Trip }
  | { type: 'trip/update'; details: Partial<TripDetails> }
  | { type: 'person/add'; person: Person }
  | { type: 'person/update'; id: string; name: string }
  | { type: 'person/remove'; id: string }
  | { type: 'expense/upsert'; expense: Expense }
  | { type: 'expense/remove'; id: string }
  | { type: 'settlement/add'; settlement: Settlement }
  | { type: 'settlement/remove'; id: string }
  | { type: 'member/claim'; userId: string; personId: string | null };

const DETAIL_KEYS = ['name', 'emoji', 'startDate', 'endDate', 'budget', 'currency'] as const;

function pickDetails(details: Partial<TripDetails>) {
  const picked: Partial<Record<keyof TripDetails, unknown>> = {};
  for (const key of DETAIL_KEYS) if (key in details) picked[key] = details[key];
  return picked as Partial<TripDetails>;
}

export function applyOp(trip: Trip | null, op: Op): Trip | null {
  if (op.type === 'trip/create') return trip ?? op.trip;
  if (!trip) return null;
  switch (op.type) {
    case 'trip/update':
      return { ...trip, ...pickDetails(op.details) };
    case 'person/add':
      return trip.people.some((person) => person.id === op.person.id) ? trip : { ...trip, people: [...trip.people, op.person] };
    case 'person/update':
      return { ...trip, people: trip.people.map((person) => (person.id === op.id ? { ...person, name: op.name } : person)) };
    case 'person/remove':
      if (countUsesOfPerson(trip, op.id) > 0) return trip;
      return {
        ...trip,
        people: trip.people.filter((person) => person.id !== op.id),
        members: trip.members.map((member) => (member.personId === op.id ? { ...member, personId: undefined } : member)),
      };
    case 'expense/upsert': {
      const exists = trip.expenses.some((expense) => expense.id === op.expense.id);
      return {
        ...trip,
        expenses: exists
          ? trip.expenses.map((expense) => (expense.id === op.expense.id ? op.expense : expense))
          : [...trip.expenses, op.expense],
      };
    }
    case 'expense/remove':
      return { ...trip, expenses: trip.expenses.filter((expense) => expense.id !== op.id) };
    case 'settlement/add':
      return trip.settlements.some((settlement) => settlement.id === op.settlement.id)
        ? trip
        : { ...trip, settlements: [...trip.settlements, op.settlement] };
    case 'settlement/remove':
      return { ...trip, settlements: trip.settlements.filter((settlement) => settlement.id !== op.id) };
    case 'member/claim':
      if (op.personId !== null && !trip.people.some((person) => person.id === op.personId)) return trip;
      return {
        ...trip,
        members: trip.members.map((member) => (member.userId === op.userId ? { ...member, personId: op.personId } : member)),
      };
  }
}
