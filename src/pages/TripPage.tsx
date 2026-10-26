import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronDown, ChevronLeft, Ellipsis, FileDown, LoaderCircle, Pencil, Plus, Trash, TriangleAlert } from 'lucide-react';
import { ExpenseSheet } from '../components/ExpenseSheet';
import { PersonSheet } from '../components/PersonSheet';
import { TripSheet } from '../components/TripSheet';
import {
  Avatar,
  Button,
  CommonAvatar,
  cx,
  EmptyState,
  Menu,
  PageLoader,
  ProgressBar,
  SectionLabel,
  SegmentedControl,
  SyncBadge,
} from '../components/ui';
import { formatDateRange, formatDayHeader, formatShortDate, pluralize, tripTiming, type TripTiming } from '../lib/dates';
import { newId } from '../lib/id';
import { formatMoney } from '../lib/money';
import {
  findPersonByName,
  isReservedName,
  participantIds,
  peopleLabel,
  perDayStat,
  summarizeTrip,
  type TripSummary,
} from '../lib/split';
import { COMMON, type Expense, type Person, type Trip } from '../lib/types';
import { useIsDesktop } from '../lib/useMediaQuery';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';

export function TripPage() {
  const { tripId } = useParams();
  const { trips, loading } = useTrips();
  const navigate = useNavigate();
  const trip = trips.find((candidate) => candidate.id === tripId);

  if (loading) return <PageLoader />;
  if (!trip) {
    return (
      <div className="mx-auto max-w-md px-5 pt-24">
        <EmptyState
          emoji="🗺️"
          title="Trip not found"
          body="It may have been deleted, or the link is wrong."
          action={<Button onClick={() => navigate('/')}>Back to trips</Button>}
        />
      </div>
    );
  }
  return <TripView key={trip.id} trip={trip} />;
}

function TripView({ trip }: { trip: Trip }) {
  const { syncStatus, deleteTrip } = useTrips();
  const navigate = useNavigate();
  const toast = useToast();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<'expenses' | 'split'>('expenses');
  const [expenseSheet, setExpenseSheet] = useState<{ expense?: Expense } | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [exporting, setExporting] = useState(false);

  const summary = useMemo(() => summarizeTrip(trip), [trip]);
  const timing = tripTiming(trip.startDate, trip.endDate);
  const meta = [
    trip.startDate && trip.endDate && formatDateRange(trip.startDate, trip.endDate),
    timing.kind !== 'undated' && pluralize(timing.totalDays, 'day'),
    peopleLabel(trip.people.length),
  ]
    .filter(Boolean)
    .join(' · ');

  const handleExport = async () => {
    if (trip.expenses.length === 0) {
      toast({ message: 'Add an expense before exporting' });
      return;
    }
    setExporting(true);
    try {
      const { exportTripPdf } = await import('../lib/pdf');
      await exportTripPdf(trip);
    } catch (err) {
      console.error(err);
      toast({ message: "Couldn't create the PDF. Please try again.", tone: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete “${trip.name}” and all of its expenses? This can't be undone.`)) return;
    deleteTrip(trip.id);
    navigate('/', { replace: true });
    toast({ message: `Deleted “${trip.name}”` });
  };

  const budgetPanel = <BudgetPanel trip={trip} total={summary.total} timing={timing} onSetBudget={() => setEditingTrip(true)} />;
  const expensesPanel = (
    <ExpensesPanel trip={trip} onAdd={() => setExpenseSheet({})} onOpen={(expense) => setExpenseSheet({ expense })} />
  );
  const splitPanel = <SplitPanel trip={trip} summary={summary} onEditPerson={setEditingPerson} />;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-36 pt-[calc(env(safe-area-inset-top)+1rem)] lg:px-10 lg:pb-16 lg:pt-8">
      <div className="flex items-center justify-between gap-2">
        {isDesktop ? (
          <span />
        ) : (
          <Link
            to="/"
            className="-ml-2 flex items-center gap-0.5 rounded-full px-2 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            <ChevronLeft className="size-4" />
            Trips
          </Link>
        )}
        <div className="flex items-center gap-2">
          {!isDesktop && syncStatus !== 'saved' && <SyncBadge status={syncStatus} />}
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <LoaderCircle className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
            Export PDF
          </Button>
          {isDesktop && (
            <Button size="sm" onClick={() => setExpenseSheet({})}>
              <Plus className="size-3.5" />
              Add expense
            </Button>
          )}
          <Menu
            label="Trip options"
            items={[
              { label: 'Edit trip', icon: <Pencil className="size-4" />, onSelect: () => setEditingTrip(true) },
              { label: 'Delete trip', icon: <Trash className="size-4" />, danger: true, onSelect: handleDelete },
            ]}
            triggerClassName="grid size-8 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50"
          >
            <Ellipsis className="size-4" />
          </Menu>
        </div>
      </div>

      <header className="mt-5 flex items-center gap-3.5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-zinc-200">
          {trip.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight lg:text-[28px]">{trip.name}</h1>
          <p className="truncate text-sm text-zinc-500">{meta}</p>
        </div>
      </header>

      {isDesktop ? (
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start gap-10">
          <div className="space-y-10">
            {budgetPanel}
            {splitPanel}
          </div>
          {expensesPanel}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {budgetPanel}
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'expenses', label: trip.expenses.length ? `Expenses (${trip.expenses.length})` : 'Expenses' },
              { value: 'split', label: 'Split' },
            ]}
          />
          {tab === 'expenses' ? expensesPanel : splitPanel}
        </div>
      )}

      {!isDesktop && (
        <button
          type="button"
          aria-label="Add expense"
          onClick={() => setExpenseSheet({})}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-5 z-20 grid size-14 place-items-center rounded-full bg-zinc-900 text-white shadow-xl shadow-black/25 transition active:scale-95"
        >
          <Plus className="size-6" />
        </button>
      )}

      {expenseSheet && <ExpenseSheet trip={trip} expense={expenseSheet.expense} onClose={() => setExpenseSheet(null)} />}
      {editingTrip && <TripSheet trip={trip} onClose={() => setEditingTrip(false)} />}
      {editingPerson && <PersonSheet trip={trip} person={editingPerson} onClose={() => setEditingPerson(null)} />}
    </div>
  );
}

function BudgetPanel({
  trip,
  total,
  timing,
  onSetBudget,
}: {
  trip: Trip;
  total: number;
  timing: TripTiming;
  onSetBudget: () => void;
}) {
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const { budget } = trip;
  const remaining = budget === null ? null : budget - total;
  const perDay = perDayStat(budget, total, timing);
  const timingValue =
    timing.kind === 'ongoing'
      ? `Day ${timing.day} / ${timing.totalDays}`
      : timing.kind === 'upcoming'
        ? timing.startsIn === 1
          ? 'Tomorrow'
          : `In ${timing.startsIn} days`
        : timing.kind === 'past'
          ? 'Completed'
          : null;

  const stats: { label: string; value: string; tone?: string }[] = [
    remaining === null
      ? { label: 'Expenses', value: String(trip.expenses.length) }
      : {
          label: remaining >= 0 ? 'Remaining' : 'Over budget',
          value: money(Math.abs(remaining)),
          tone: remaining < 0 ? 'text-red-600' : undefined,
        },
  ];
  if (perDay) stats.push({ label: perDay.label, value: money(perDay.amount) });
  if (timingValue) stats.push({ label: timing.kind === 'upcoming' ? 'Starts' : 'Trip', value: timingValue });

  return (
    <section aria-label="Budget">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Spent</p>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-[40px] font-semibold leading-tight tracking-tight tabular-nums">{money(total)}</p>
        {budget !== null ? (
          <p className="text-sm tabular-nums text-zinc-500">/ {money(budget)}</p>
        ) : (
          <button type="button" onClick={onSetBudget} className="text-sm font-medium text-emerald-700 hover:underline">
            Set a budget
          </button>
        )}
      </div>
      {budget !== null && <ProgressBar ratio={total / budget} className="mt-2 h-2.5" />}
      <div
        className={cx(
          'mt-4 grid divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-white py-3 text-center',
          stats.length === 3 ? 'grid-cols-3' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 px-2">
            <p className={cx('truncate text-sm font-semibold tabular-nums', stat.tone)}>{stat.value}</p>
            <p className="truncate text-[11px] text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function forLabel(expense: Expense, people: Person[]) {
  if (expense.forId !== COMMON) return people.find((person) => person.id === expense.forId)?.name ?? 'Removed person';
  const ids = participantIds(expense, people);
  if (ids.length > 0 && ids.length === people.length) return `Common · All ${ids.length}`;
  const names = ids.map((id) => people.find((person) => person.id === id)!.name);
  return `Common · ${names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`}`;
}

function ExpensesPanel({
  trip,
  onAdd,
  onOpen,
}: {
  trip: Trip;
  onAdd: () => void;
  onOpen: (expense: Expense) => void;
}) {
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
          <Button onClick={onAdd}>
            <Plus className="size-4" />
            Add expense
          </Button>
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
              const person = trip.people.find((candidate) => candidate.id === expense.forId);
              return (
                <li key={expense.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(expense)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
                  >
                    {person ? <Avatar person={person} /> : <CommonAvatar />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{expense.title}</p>
                      <p className="truncate text-xs text-zinc-500">{forLabel(expense, trip.people)}</p>
                    </div>
                    <p className="text-[15px] font-semibold tabular-nums">{formatMoney(expense.amount, trip.currency)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SplitPanel({
  trip,
  summary,
  onEditPerson,
}: {
  trip: Trip;
  summary: TripSummary;
  onEditPerson: (person: Person) => void;
}) {
  const { updateTrip } = useTrips();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const money = (minor: number) => formatMoney(minor, trip.currency);

  const trimmed = newName.trim();
  const nameTaken = isReservedName(trimmed) || !!findPersonByName(trip.people, trimmed);

  const addPerson = () => {
    if (!trimmed || nameTaken) return;
    updateTrip(trip.id, (current) => ({ ...current, people: [...current.people, { id: newId(), name: trimmed }] }));
    setNewName('');
  };

  return (
    <section aria-label="Split">
      <SectionLabel>Each person's share</SectionLabel>
      {summary.unassigned > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {money(summary.unassigned)} of Common expenses has nobody to split with yet. Add people below.
        </p>
      )}
      {trip.people.length === 0 && (
        <p className="mb-3 px-1 text-sm text-zinc-500">Add the people on this trip to split Common expenses between them.</p>
      )}
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {summary.people.map(({ person, personal, shared, total, items }) => {
          const isOpen = expandedId === person.id;
          const breakdown = [personal && `Personal ${money(personal)}`, shared && `Shared ${money(shared)}`]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={person.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpandedId(isOpen ? null : person.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
              >
                <Avatar person={person} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{person.name}</p>
                  <p className="truncate text-xs tabular-nums text-zinc-500">{breakdown || 'No expenses yet'}</p>
                </div>
                <p className="text-[15px] font-semibold tabular-nums">{money(total)}</p>
                <ChevronDown className={cx('size-4 shrink-0 text-zinc-400 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="border-t border-zinc-100 bg-zinc-50/70 px-4 pb-3 pt-2">
                  <ul>
                    {[...items]
                      .sort((a, b) => a.expense.date.localeCompare(b.expense.date))
                      .map(({ expense, share, splitCount }) => (
                        <li key={expense.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                          <span className="min-w-0 truncate text-zinc-700">
                            {expense.title}
                            <span className="text-zinc-400">
                              {' · '}
                              {formatShortDate(expense.date)}
                              {expense.forId === COMMON && ` · split ${splitCount} ways`}
                            </span>
                          </span>
                          <span className="tabular-nums text-zinc-600">{money(share)}</span>
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onEditPerson(person)}
                    className="mt-1.5 inline-flex items-center gap-1.5 py-1 text-sm font-medium text-emerald-700 hover:underline"
                  >
                    <Pencil className="size-3.5" />
                    Rename or remove {person.name}
                  </button>
                </div>
              )}
            </li>
          );
        })}
        <li className="flex items-center gap-2 px-3 py-2.5">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addPerson();
            }}
            placeholder="Add a person"
            aria-label="New person's name"
            autoCapitalize="words"
            enterKeyHint="done"
            maxLength={40}
            className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
          />
          <Button size="sm" onClick={addPerson} disabled={!trimmed || nameTaken}>
            Add
          </Button>
        </li>
      </ul>
      {nameTaken && trimmed && <p className="mt-2 px-1 text-xs text-zinc-500">“{trimmed}” is already on this trip.</p>}
      {trip.expenses.length > 0 && (
        <dl className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-sm tabular-nums">
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">Shared</dt>
            <dd className="font-medium">{money(summary.sharedTotal)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">Personal</dt>
            <dd className="font-medium">{money(summary.personalTotal)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">Total</dt>
            <dd className="font-semibold">{money(summary.total)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
