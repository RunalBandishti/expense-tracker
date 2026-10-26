import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Eye } from 'lucide-react';
import { BalancesPanel } from '../components/trip/BalancesPanel';
import { BudgetPanel } from '../components/trip/BudgetPanel';
import { ExpensesPanel } from '../components/trip/ExpensesPanel';
import { InsightsPanel } from '../components/trip/InsightsPanel';
import { EmptyState, Logo, PageLoader, SegmentedControl } from '../components/ui';
import { api } from '../lib/api';
import { formatDateRange, pluralize, tripTiming } from '../lib/dates';
import { peopleLabel, summarizeTrip } from '../lib/split';
import type { Trip } from '../lib/types';

const PUBLIC_REFRESH_MS = 30_000;

type Tab = 'expenses' | 'balances' | 'insights';

export function PublicTripPage() {
  const { token } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('balances');

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api<{ trip: Trip }>(`/public/${token}`).then(
        ({ trip: loaded }) => {
          if (!cancelled) setTrip(loaded);
        },
        (err: Error) => {
          if (!cancelled) setError(err.message);
        },
      );
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, PUBLIC_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const summary = useMemo(() => trip && summarizeTrip(trip), [trip]);

  if (!trip || !summary) {
    return error ? (
      <div className="mx-auto max-w-md px-5 pt-24">
        <EmptyState emoji="🔒" title="This link isn't available" body={error} />
      </div>
    ) : (
      <PageLoader />
    );
  }

  const timing = tripTiming(trip.startDate, trip.endDate);
  const meta = [
    trip.startDate && trip.endDate && formatDateRange(trip.startDate, trip.endDate),
    timing.kind !== 'undated' && pluralize(timing.totalDays, 'day'),
    peopleLabel(trip.people.length),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Logo className="size-7" />
          Expense Manager
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600">
          <Eye className="size-3.5" />
          Live view
        </span>
      </div>

      <header className="mt-6 flex items-center gap-3.5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-zinc-200">
          {trip.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{trip.name}</h1>
          <p className="truncate text-sm text-zinc-500">{meta}</p>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <BudgetPanel trip={trip} total={summary.total} timing={timing} />
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'balances', label: 'Balances' },
            { value: 'expenses', label: `Expenses (${trip.expenses.length})` },
            { value: 'insights', label: 'Insights' },
          ]}
        />
        {tab === 'balances' ? (
          <BalancesPanel trip={trip} summary={summary} />
        ) : tab === 'expenses' ? (
          <ExpensesPanel trip={trip} />
        ) : (
          <InsightsPanel trip={trip} />
        )}
      </div>

      <p className="mt-12 text-center text-sm text-zinc-500">
        Updates automatically.{' '}
        <Link to="/" className="font-semibold text-zinc-900 underline-offset-4 hover:underline">
          Track your own trips
        </Link>
      </p>
    </div>
  );
}
