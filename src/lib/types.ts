export const COMMON = 'common';

export type User = { id: string; username: string; provider: 'password' | 'google' };

export type Person = { id: string; name: string; upiId?: string };

export type Split =
  | { mode: 'all' }
  | { mode: 'custom'; personIds: string[] }
  | { mode: 'shares'; weights: Record<string, number> }
  | { mode: 'percent'; percents: Record<string, number> }
  /** Minor currency units per person. */
  | { mode: 'exact'; amounts: Record<string, number> };

export type CategoryDef = { id: string; label: string; emoji: string };

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
  /** A CategoryDef id; unknown or missing ids count as Other. */
  category?: string;
  createdAt: number;
};

export type Settlement = {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  method?: 'upi' | 'cash';
  /** Set when recorded by settling one category's bill; such payments only settle that category. */
  category?: string;
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
  /** Missing on trips created before categories were editable; those use the defaults. */
  categories?: CategoryDef[];
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
  people: Pick<Person, 'id' | 'name'>[];
  ownerName: string;
  alreadyMember: boolean;
};
