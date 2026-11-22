import { useMemo, type ReactNode } from 'react';
import { Archive, Ellipsis, Pencil, Plus, Trash } from 'lucide-react';
import { categoryOf } from '../../lib/categories';
import { formatDayHeader } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { participantIds } from '../../lib/split';
import { COMMON, type Expense, type Person, type Trip } from '../../lib/types';
import { Button, CategoryTile, cx, EmptyState, Menu, SectionLabel } from '../ui';

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

type ExpenseDaysProps = {
  trip: Trip;
  expenses: Expense[];
  onOpen?: (expense: Expense) => void;
  dayAction?: (expenses: Expense[]) => ReactNode;
  rowAction?: (expense: Expense) => ReactNode;
};

export function ExpenseDays({ trip, expenses, onOpen, dayAction, rowAction }: ExpenseDaysProps) {
  const groups = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    const byDate = new Map<string, Expense[]>();
    for (const expense of sorted) byDate.set(expense.date, [...(byDate.get(expense.date) ?? []), expense]);
    return [...byDate];
  }, [expenses]);

  return (
    <div className="space-y-5">
      {groups.map(([date, dayExpenses]) => (
        <section key={date}>
          <SectionLabel
            aside={
              <span className="flex items-baseline gap-3">
                <span className="text-xs tabular-nums text-zinc-400">
                  {formatMoney(
                    dayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
                    trip.currency,
                  )}
                </span>
                {dayAction?.(dayExpenses)}
              </span>
            }
          >
            {formatDayHeader(date)}
          </SectionLabel>
          <ul className="sticker-sm divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white">
            {dayExpenses.map((expense) => {
              const content = (
                <>
                  <CategoryTile emoji={categoryOf(trip, expense.category).emoji} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{expense.title}</p>
                    <p className="truncate text-xs text-zinc-500">{subtitle(expense, trip.people)}</p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums">{formatMoney(expense.amount, trip.currency)}</p>
                </>
              );
              const action = rowAction?.(expense);
              const rowClass = cx('flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left', action ? 'pr-1' : 'pr-4');
              return (
                <li key={expense.id} className={cx('flex items-center', onOpen && 'transition hover:bg-zinc-50')}>
                  {onOpen ? (
                    <button type="button" onClick={() => onOpen(expense)} className={rowClass}>
                      {content}
                    </button>
                  ) : (
                    <div className={rowClass}>{content}</div>
                  )}
                  {action}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

type Props = {
  trip: Trip;
  onAdd?: () => void;
  onOpen?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onArchive?: (expenses: Expense[]) => void;
  onShowArchived?: () => void;
};

export function ExpensesPanel({ trip, onAdd, onOpen, onDelete, onArchive, onShowArchived }: Props) {
  const archivedCount = trip.archivedExpenses?.length ?? 0;
  const archivedButton = onShowArchived && archivedCount > 0 && (
    <button
      type="button"
      onClick={onShowArchived}
      className="mx-auto flex w-fit items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
    >
      <Archive className="size-4" />
      Archived ({archivedCount})
    </button>
  );

  if (trip.expenses.length === 0) {
    return (
      <div className="space-y-5">
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
        {archivedButton}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ExpenseDays
        trip={trip}
        expenses={trip.expenses}
        onOpen={onOpen}
        dayAction={
          onArchive &&
          ((expenses) => (
            <button type="button" onClick={() => onArchive(expenses)} className="text-xs font-semibold text-emerald-700 hover:underline">
              Archive day
            </button>
          ))
        }
        rowAction={
          onOpen &&
          onDelete &&
          ((expense) => (
            <Menu
              label={`Options for ${expense.title}`}
              items={[
                { label: 'Edit expense', icon: <Pencil className="size-4" />, onSelect: () => onOpen(expense) },
                ...(onArchive
                  ? [{ label: 'Archive expense', icon: <Archive className="size-4" />, onSelect: () => onArchive([expense]) }]
                  : []),
                { label: 'Delete expense', icon: <Trash className="size-4" />, danger: true, onSelect: () => onDelete(expense) },
              ]}
              triggerClassName="mr-2 grid size-9 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <Ellipsis className="size-4" />
            </Menu>
          ))
        }
      />
      {archivedButton}
    </div>
  );
}
