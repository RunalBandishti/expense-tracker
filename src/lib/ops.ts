import { MAX_CATEGORIES, OTHER_CATEGORY, tripCategories, withCategory } from './categories';
import { countUsesOfPerson } from './split';
import type { CategoryDef, Expense, Person, Settlement, Trip, TripDetails } from './types';

/** Every op is idempotent, so a batch can safely be resent after a lost response. */
export type Op =
  | { type: 'trip/create'; trip: Trip }
  | { type: 'trip/update'; details: Partial<TripDetails> }
  | { type: 'person/add'; person: Person }
  | { type: 'person/update'; id: string; name: string }
  | { type: 'person/setUpi'; id: string; upiId: string | null }
  | { type: 'person/remove'; id: string }
  | { type: 'expense/upsert'; expense: Expense }
  | { type: 'expense/remove'; id: string }
  | { type: 'expense/archive'; ids: string[] }
  | { type: 'expense/unarchive'; ids: string[] }
  | { type: 'settlement/add'; settlement: Settlement }
  | { type: 'settlement/remove'; id: string }
  | { type: 'member/claim'; userId: string; personId: string | null }
  | { type: 'category/add'; category: CategoryDef; index?: number }
  | { type: 'category/update'; category: CategoryDef }
  /** Expenses in the category are deleted, or moved to Other. */
  | { type: 'category/remove'; id: string; deleteExpenses: boolean };

const DETAIL_KEYS = ['name', 'emoji', 'startDate', 'endDate', 'budget', 'currency'] as const;

function pickDetails(details: Partial<TripDetails>) {
  const picked: Partial<Record<keyof TripDetails, unknown>> = {};
  for (const key of DETAIL_KEYS) if (key in details) picked[key] = details[key];
  return picked as Partial<TripDetails>;
}

function moveExpenses(from: Expense[], to: Expense[], ids: string[]) {
  const moving = from.filter((expense) => ids.includes(expense.id));
  if (moving.length === 0) return null;
  return { from: from.filter((expense) => !ids.includes(expense.id)), to: [...to, ...moving] };
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
    case 'person/setUpi':
      return {
        ...trip,
        people: trip.people.map((person) => (person.id === op.id ? { ...person, upiId: op.upiId ?? undefined } : person)),
      };
    case 'person/remove':
      if (countUsesOfPerson(trip, op.id) > 0) return trip;
      return {
        ...trip,
        people: trip.people.filter((person) => person.id !== op.id),
        members: trip.members.map((member) => (member.personId === op.id ? { ...member, personId: undefined } : member)),
      };
    case 'expense/upsert': {
      const replace = (expense: Expense) => (expense.id === op.expense.id ? op.expense : expense);
      // An edit can arrive after another device archived the expense; it stays archived.
      if (trip.archivedExpenses?.some((expense) => expense.id === op.expense.id)) {
        return { ...trip, archivedExpenses: trip.archivedExpenses.map(replace) };
      }
      const exists = trip.expenses.some((expense) => expense.id === op.expense.id);
      return { ...trip, expenses: exists ? trip.expenses.map(replace) : [...trip.expenses, op.expense] };
    }
    case 'expense/remove':
      return {
        ...trip,
        expenses: trip.expenses.filter((expense) => expense.id !== op.id),
        archivedExpenses: trip.archivedExpenses?.filter((expense) => expense.id !== op.id),
      };
    case 'expense/archive': {
      const moved = moveExpenses(trip.expenses, trip.archivedExpenses ?? [], op.ids);
      return moved ? { ...trip, expenses: moved.from, archivedExpenses: moved.to } : trip;
    }
    case 'expense/unarchive': {
      const moved = moveExpenses(trip.archivedExpenses ?? [], trip.expenses, op.ids);
      return moved ? { ...trip, archivedExpenses: moved.from, expenses: moved.to } : trip;
    }
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
    case 'category/add': {
      const categories = tripCategories(trip);
      if (categories.some((category) => category.id === op.category.id) || categories.length >= MAX_CATEGORIES) return trip;
      return { ...trip, categories: withCategory(categories, op.category, op.index) };
    }
    case 'category/update':
      return {
        ...trip,
        categories: tripCategories(trip).map((category) => (category.id === op.category.id ? op.category : category)),
      };
    case 'category/remove':
      if (op.id === OTHER_CATEGORY) return trip;
      return {
        ...trip,
        categories: tripCategories(trip).filter((category) => category.id !== op.id),
        expenses: op.deleteExpenses
          ? trip.expenses.filter((expense) => expense.category !== op.id)
          : trip.expenses.map((expense) => (expense.category === op.id ? { ...expense, category: OTHER_CATEGORY } : expense)),
      };
  }
}
