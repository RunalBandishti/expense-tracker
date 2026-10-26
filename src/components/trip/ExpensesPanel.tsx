import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { formatDayHeader } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { participantIds } from '../../lib/split';
import { COMMON, type Expense, type Person, type Trip } from '../../lib/types';
import { Button, CategoryTile, cx, EmptyState, SectionLabel } from '../ui';

function forLabel(expense: Expense, people: Person[]) {
  if (expense.forId !== COMMON) return people.find((person) => person.id === expense.forId)?.name ?? 'Removed person';
  const ids = participantIds(expense, people);
  if (ids.length > 0 && ids.length === people.length) return `Common · All ${ids.length}`;
  const names = ids.map((id) => people.find((person) => person.id === id)!.name);
  return `Common · ${names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`}`;
}

function subtitle(expense: Expense, people: Person[]) {
  const payer = people.find((person) => person.id === expense.paidById);
  return payer ? `${forLabel(expense, people)} · ${payer.name} paid` : forLabel(expense, people);
}

type Props = { trip: Trip; onAdd?: () => void; onOpen?: (expense: Expense) => void };

export function ExpensesPanel({ trip, onAdd, onOpen }: Props) {
  const groups = useMemo(() => {
    const sorted = [...trip.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    const byDate = new Map<string, Expense[]>();
    for (const expense of sorted) byDate.set(expense.date, [...(byDate.get(expense.date) ?? []), expense]);
    return [...byDate];
  }, [trip.expenses]);

  if (trip.expenses.length === 0) {
    return (
      <EmptyState
        emoji="🧾"
        title="No expenses yet"
        body="Log what you spend, for one person or shared by the group."
        action={
          onAdd && (
            <Button onClick={onAdd}>
              <Plus className="size-4" />
              Add expense
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([date, expenses]) => (
        <section key={date}>
          <SectionLabel
            aside={
              <span className="text-xs tabular-nums text-zinc-400">
                {formatMoney(
                  expenses.reduce((sum, expense) => sum + expense.amount, 0),
                  trip.currency,
                )}
              </span>
            }
          >
            {formatDayHeader(date)}
          </SectionLabel>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {expenses.map((expense) => {
              const content = (
                <>
                  <CategoryTile category={expense.category} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{expense.title}</p>
                    <p className="truncate text-xs text-zinc-500">{subtitle(expense, trip.people)}</p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums">{formatMoney(expense.amount, trip.currency)}</p>
                </>
              );
              const rowClass = 'flex w-full items-center gap-3 px-4 py-3 text-left';
              return (
                <li key={expense.id}>
                  {onOpen ? (
                    <button type="button" onClick={() => onOpen(expense)} className={cx(rowClass, 'transition hover:bg-zinc-50')}>
                      {content}
                    </button>
                  ) : (
                    <div className={rowClass}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
