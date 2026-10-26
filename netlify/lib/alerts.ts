import { formatMoney } from '../../src/lib/money';
import type { PushNotification } from '../../src/lib/reminders';
import { expenseShares } from '../../src/lib/split';
import { COMMON, type Expense, type Trip } from '../../src/lib/types';
import { notifyUser } from './push';

/** One notification per linked member whose share is in the new expenses, never to whoever added them. */
export function expenseAlerts(trip: Trip, created: Expense[], actorId: string) {
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const actor = trip.members.find((member) => member.userId === actorId);
  const actorName = trip.people.find((person) => person.id === actor?.personId)?.name ?? actor?.username ?? 'Someone';
  const alerts = new Map<string, PushNotification>();
  for (const member of trip.members) {
    const personId = member.personId;
    if (member.userId === actorId || !personId) continue;
    const theirs = created.flatMap((expense) => {
      const share = expenseShares(expense, trip.people).get(personId);
      return share ? [{ expense, share }] : [];
    });
    if (theirs.length === 0) continue;
    const [{ expense, share }] = theirs;
    const body =
      theirs.length > 1
        ? `${actorName} added ${theirs.length} expenses · your share ${money(theirs.reduce((sum, item) => sum + item.share, 0))}`
        : expense.forId === COMMON
          ? `${actorName} added “${expense.title}” ${money(expense.amount)} · your share ${money(share)}`
          : `${actorName} added “${expense.title}” ${money(share)} for you`;
    alerts.set(member.userId, { title: `${trip.emoji} ${trip.name}`, body, url: `/trips/${trip.id}`, tag: `expense-${expense.id}` });
  }
  return alerts;
}

/** Best effort: the expenses are already saved, so a failed alert is only logged. */
export async function sendExpenseAlerts(trip: Trip, created: Expense[], actorId: string) {
  try {
    await Promise.all([...expenseAlerts(trip, created, actorId)].map(([userId, alert]) => notifyUser(userId, alert)));
  } catch (err) {
    console.error('Expense alerts failed', err);
  }
}
