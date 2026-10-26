export const COMMON = 'common';

export type User = { id: string; username: string };

export type Person = { id: string; name: string };

export type Split = { mode: 'all' } | { mode: 'custom'; personIds: string[] };

export type Expense = {
  id: string;
  title: string;
  /** Minor currency units (paise / cents). */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  /** A person id, or COMMON for an expense shared via `split`. */
  forId: string;
  split?: Split;
  createdAt: number;
};

export type Trip = {
  id: string;
  name: string;
  emoji: string;
  startDate: string | null;
  endDate: string | null;
  /** Minor currency units. */
  budget: number | null;
  currency: string;
  people: Person[];
  expenses: Expense[];
  createdAt: number;
  updatedAt: number;
};
