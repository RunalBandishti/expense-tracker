import type { TripTiming } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { perDayStat } from '../../lib/split';
import type { Trip } from '../../lib/types';
import { cx, ProgressBar } from '../ui';

type Props = { trip: Trip; total: number; timing: TripTiming; onSetBudget?: () => void };

export function BudgetPanel({ trip, total, timing, onSetBudget }: Props) {
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
          onSetBudget && (
            <button type="button" onClick={onSetBudget} className="text-sm font-medium text-emerald-700 hover:underline">
              Set a budget
            </button>
          )
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
