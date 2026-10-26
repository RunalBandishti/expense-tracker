export const COMMON = 'common';

export type User = { id: string; username: string; provider: 'password' | 'google' };

export type Person = { id: string; name: string };

export type Split =
  | { mode: 'all' }
  | { mode: 'custom'; personIds: string[] }
  | { mode: 'shares'; weights: Record<string, number> }
  | { mode: 'percent'; percents: Record<string, number> }
  /** Minor currency units per person. */
  | { mode: 'exact'; amounts: Record<string, number> };

export type Category = 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'other';

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
  paidById?: string;
  category?: Category;
  createdAt: number;
};

export type Settlement = {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  createdAt: number;
};

export type Member = {
  userId: string;
  username: string;
  role: 'owner' | 'editor';
  /** Undefined until the member picks who they are; null means they aren't one of the trip's people. */
  personId?: string | null;
  joinedAt: number;
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
  settlements: Settlement[];
  members: Member[];
  ownerId: string;
  shareToken: string | null;
  inviteToken: string | null;
  /** Bumped by the server on every write so clients can ignore stale reads. */
  version: number;
  createdAt: number;
  updatedAt: number;
};

export type TripDetails = Pick<Trip, 'name' | 'emoji' | 'startDate' | 'endDate' | 'budget' | 'currency'>;

export type InvitePreview = Pick<Trip, 'name' | 'emoji' | 'startDate' | 'endDate'> & {
  tripId: string;
  memberCount: number;
  ownerName: string;
  alreadyMember: boolean;
};
