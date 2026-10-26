import { Link } from 'react-router';
import { formatDateRange, pluralize, tripTiming, type TripTiming } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { peopleLabel, tripTotal } from '../lib/split';
import type { Trip } from '../lib/types';
import { cx, ProgressBar } from './ui';

function statusFor(timing: TripTiming, overBudget: boolean) {
  if (overBudget) return { label: 'Over budget', className: 'text-red-600' };
  switch (timing.kind) {
    case 'ongoing':
      return { label: `Day ${timing.day} of ${timing.totalDays}`, className: 'text-emerald-700' };
    case 'upcoming':
      return { label: timing.startsIn === 1 ? 'Tomorrow' : `In ${timing.startsIn} days`, className: 'text-zinc-500' };
    case 'past':
      return { label: 'Completed', className: 'text-zinc-400' };
    default:
      return null;
  }
}

export function TripCard({ trip, compact = false, active = false }: { trip: Trip; compact?: boolean; active?: boolean }) {
  const total = tripTotal(trip);
  const ratio = trip.budget ? total / trip.budget : null;
  const status = statusFor(tripTiming(trip.startDate, trip.endDate), ratio !== null && ratio > 1);
  const dates = trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : null;

  return (
    <Link
      to={`/trips/${trip.id}`}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'block rounded-2xl border bg-white transition hover:-translate-y-px hover:shadow-md hover:shadow-black/5',
        compact ? 'p-3' : 'p-4',
        active ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,.04)]',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cx(
            'grid shrink-0 place-items-center rounded-xl bg-zinc-100',
            compact ? 'size-9 text-lg' : 'size-11 text-xl',
          )}
        >
          {trip.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{trip.name}</p>
          <p className="truncate text-xs text-zinc-500">{[dates, peopleLabel(trip.people.length)].filter(Boolean).join(' · ')}</p>
        </div>
        {status && !compact && (
          <span className={cx('flex shrink-0 items-center gap-1.5 text-[11px] font-medium', status.className)}>
            <span className="size-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        )}
      </div>
      <div className={cx('flex items-baseline justify-between gap-2', compact ? 'mt-2.5' : 'mt-4')}>
        <p className={cx('font-semibold tracking-tight tabular-nums', compact ? 'text-base' : 'text-xl')}>
          {formatMoney(total, trip.currency)}
        </p>
        <p className="truncate text-xs tabular-nums text-zinc-500">
          {ratio !== null
            ? `${Math.round(ratio * 100)}% of ${formatMoney(trip.budget!, trip.currency)}`
            : pluralize(trip.expenses.length, 'expense')}
        </p>
      </div>
      {ratio !== null && <ProgressBar ratio={ratio} className={cx('h-1.5', compact ? 'mt-2' : 'mt-2.5')} />}
    </Link>
  );
}
