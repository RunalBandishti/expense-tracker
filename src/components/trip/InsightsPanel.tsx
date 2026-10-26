import { barColor, categoryIdOf, tripCategories } from '../../lib/categories';
import { addDays, daysBetween, formatShortDate, parseISODate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { Trip } from '../../lib/types';
import { cx, EmptyState, SectionLabel } from '../ui';

const MAX_CHART_DAYS = 62;

function chartDays(trip: Trip) {
  const expenseDates = trip.expenses.map((expense) => expense.date);
  if (trip.startDate && trip.endDate && daysBetween(trip.startDate, trip.endDate) < MAX_CHART_DAYS) {
    const days = Array.from({ length: daysBetween(trip.startDate, trip.endDate) + 1 }, (_, index) => addDays(trip.startDate!, index));
    return [...new Set([...days, ...expenseDates])].sort();
  }
  return [...new Set(expenseDates)].sort();
}

export function InsightsPanel({ trip, onManageCategories }: { trip: Trip; onManageCategories?: () => void }) {
  if (trip.expenses.length === 0) {
    return <EmptyState emoji="📊" title="No spending yet" body="Charts appear here once you add expenses." />;
  }

  const money = (minor: number) => formatMoney(minor, trip.currency);
  const total = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = tripCategories(trip)
    .map((category) => ({
      ...category,
      bar: barColor(trip, category.id),
      amount: trip.expenses
        .filter((expense) => categoryIdOf(trip, expense.category) === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const days = chartDays(trip).map((date) => ({
    date,
    amount: trip.expenses.filter((expense) => expense.date === date).reduce((sum, expense) => sum + expense.amount, 0),
  }));
  const tripDays = trip.startDate && trip.endDate ? daysBetween(trip.startDate, trip.endDate) + 1 : 0;
  const dailyBudget = trip.budget && tripDays ? Math.floor(trip.budget / tripDays) : null;
  const peak = Math.max(...days.map((day) => day.amount), dailyBudget ?? 0, 1);
  const busiest = days.reduce((best, day) => (day.amount > best.amount ? day : best), days[0]);

  return (
    <div className="space-y-8">
      <section aria-label="Spending by category">
        <SectionLabel
          aside={
            onManageCategories && (
              <button type="button" onClick={onManageCategories} className="text-xs font-semibold text-emerald-700 hover:underline">
                Manage
              </button>
            )
          }
        >
          By category
        </SectionLabel>
        <ul className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
          {byCategory.map((category) => {
            const share = category.amount / total;
            return (
              <li key={category.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden>{category.emoji}</span>
                    {category.label}
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    <span className="font-semibold text-zinc-900">{money(category.amount)}</span> · {Math.round(share * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className={cx('h-full rounded-full', category.bar)} style={{ width: `${Math.max(share * 100, 2)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Spending by day">
        <SectionLabel
          aside={
            <span className="text-xs tabular-nums text-zinc-400">
              Busiest: {formatShortDate(busiest.date)} · {money(busiest.amount)}
            </span>
          }
        >
          By day
        </SectionLabel>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="relative flex h-44 min-w-full items-end gap-1.5" style={{ width: `${Math.max(days.length * 30, 100)}px` }}>
            {dailyBudget && (
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-zinc-400"
                style={{ bottom: `calc(${(dailyBudget / peak) * 100}% * 0.82 + 1.25rem)` }}
              >
                <span className="absolute -top-5 right-0 rounded bg-white px-1 text-[10px] tabular-nums text-zinc-500">
                  {money(dailyBudget)}/day budget
                </span>
              </div>
            )}
            {days.map((day) => {
              const over = dailyBudget !== null && day.amount > dailyBudget;
              return (
                <div key={day.date} className="flex h-full min-w-6 flex-1 flex-col items-center justify-end gap-1">
                  <div className="flex h-[82%] w-full items-end">
                    <div
                      title={`${formatShortDate(day.date)}: ${money(day.amount)}`}
                      className={cx('w-full rounded-t-md', day.amount === 0 ? 'bg-zinc-100' : over ? 'bg-red-500' : 'bg-emerald-600')}
                      style={{ height: `${Math.max((day.amount / peak) * 100, day.amount ? 3 : 1.5)}%` }}
                    />
                  </div>
                  <span className="h-4 text-[10px] tabular-nums text-zinc-400">{parseISODate(day.date).getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
        {dailyBudget && (
          <p className="mt-2 px-1 text-xs text-zinc-500">Red bars are days that went over the daily budget.</p>
        )}
      </section>
    </div>
  );
}
