import { TriangleAlert } from 'lucide-react';
import { categoryIdOf, tripCategories } from '../../lib/categories';
import { formatMoney } from '../../lib/money';
import type { TripSummary } from '../../lib/split';
import type { Trip } from '../../lib/types';
import { Avatar, EmptyState, SectionLabel } from '../ui';

type Props = { trip: Trip; summary: TripSummary; myPersonId?: string | null };

export function PeoplePanel({ trip, summary, myPersonId }: Props) {
  if (trip.people.length === 0) {
    return <EmptyState emoji="👥" title="No people yet" body="Add people to see how much was spent on each of them." />;
  }
  if (trip.expenses.length === 0) {
    return <EmptyState emoji="👥" title="No spending yet" body="Each person's spending shows here once you add expenses." />;
  }

  const money = (minor: number) => formatMoney(minor, trip.currency);
  const categories = tripCategories(trip);
  const people = [...summary.people].sort((a, b) => b.total - a.total);
  const assignedTotal = people.reduce((sum, entry) => sum + entry.total, 0);
  const highest = Math.max(people[0]?.total ?? 0, 1);
  const hasPayers = summary.paidTotal > 0;

  return (
    <section aria-label="Spending per person">
      <SectionLabel
        aside={
          people.length > 1 && (
            <span className="text-xs tabular-nums text-zinc-400">Avg {money(Math.round(assignedTotal / people.length))}</span>
          )
        }
      >
        Per person
      </SectionLabel>
      {summary.unassigned > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {money(summary.unassigned)} of shared expenses isn't assigned to anyone yet.
        </p>
      )}
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {people.map(({ person, personal, shared, total, paid, items }) => {
          const byCategory = categories
            .map((category) => ({
              category,
              amount: items
                .filter((item) => categoryIdOf(trip, item.expense.category) === category.id)
                .reduce((sum, item) => sum + item.share, 0),
            }))
            .filter(({ amount }) => amount > 0);
          const detail = [personal > 0 && `Personal ${money(personal)}`, shared > 0 && `Shared ${money(shared)}`, hasPayers && `Paid ${money(paid)}`]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={person.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar person={person} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">
                    {person.name}
                    {person.id === myPersonId && <span className="font-normal text-zinc-400"> (you)</span>}
                  </p>
                  <p className="truncate text-xs tabular-nums text-zinc-500">{detail || 'Nothing spent yet'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-semibold tabular-nums">{money(total)}</p>
                  <p className="text-xs tabular-nums text-zinc-500">{assignedTotal ? Math.round((total / assignedTotal) * 100) : 0}%</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(total / highest) * 100}%` }} />
              </div>
              {byCategory.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-zinc-600">
                  {byCategory.map(({ category, amount }) => (
                    <span key={category.id}>
                      <span aria-hidden>{category.emoji}</span> {category.label} {money(amount)}
                    </span>
                  ))}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
