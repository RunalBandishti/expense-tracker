import { Link } from 'react-router';
import { formatDateRange, pluralize, tripTiming, type TripTiming } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { peopleLabel, summarizeTrip } from '../lib/split';
import { tripTint } from '../lib/tints';
import type { Trip } from '../lib/types';
import { useTrips } from '../state/trips';
import { AvatarStack, cx, ProgressBar } from './ui';

function statusFor(timing: TripTiming, overBudget: boolean) {
  if (overBudget) return { label: 'Over budget 🐯', chip: 'bg-red-50 text-red-700', live: false };
  switch (timing.kind) {
    case 'ongoing':
      return { label: `Day ${timing.day} ✨`, chip: 'bg-emerald-100 text-emerald-800', live: true };
    case 'upcoming':
      return {
        label: timing.startsIn === 1 ? 'Tomorrow ⏳' : `In ${timing.startsIn} days ⏳`,
        chip: 'bg-sky-100 text-sky-800',
        live: false,
      };
    case 'past':
      return { label: 'Completed ✓', chip: 'bg-zinc-100 text-zinc-600', live: false };
    default:
      return null;
  }
}

export function TripCard({ trip, compact = false, active = false }: { trip: Trip; compact?: boolean; active?: boolean }) {
  const { user } = useTrips();
  const summary = summarizeTrip(trip);
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const ratio = trip.budget ? summary.total / trip.budget : null;
  const status = statusFor(tripTiming(trip.startDate, trip.endDate), ratio !== null && ratio > 1);
  const dates = trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : null;
  const myPersonId = trip.members.find((member) => member.userId === user.id)?.personId;
  const myBalance = summary.paidTotal > 0 ? summary.people.find((entry) => entry.person.id === myPersonId)?.balance : undefined;
  const meta = [dates, peopleLabel(trip.people.length), trip.members.length > 1 && 'Shared'].filter(Boolean).join(' · ');
  const tint = tripTint(trip.id);

  return (
    <Link
      to={`/trips/${trip.id}`}
      aria-current={active ? 'page' : undefined}
      data-compact={compact || undefined}
      className={cx(
        'character-card relative block overflow-hidden rounded-2xl outline-none',
        tint.card,
        compact ? 'p-3' : 'p-4',
        active && 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-paper',
      )}
    >
      <span aria-hidden className={cx('absolute inset-y-0 left-0 w-1.5', tint.stripe)} />
      <div className="flex items-center gap-3">
        <span
          className={cx(
            'sticker-sm grid shrink-0 place-items-center rounded-xl bg-white',
            compact ? 'size-9 text-lg' : 'size-11 text-xl',
          )}
        >
          {trip.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{trip.name}</p>
          <p className="truncate text-xs text-zinc-500">{meta}</p>
        </div>
        {status && !compact && (
          <span
            className={cx(
              'sticker-sm flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold min-[380px]:text-[11px]',
              status.chip,
            )}
          >
            {status.live && <span className="status-pulse-dot size-1.5 rounded-full bg-current" />}
            {status.label}
          </span>
        )}
      </div>
      <div className={cx('flex items-baseline justify-between gap-2', compact ? 'mt-2.5' : 'mt-4')}>
        <p className={cx('font-semibold tracking-tight tabular-nums', compact ? 'text-base' : 'text-xl')}>
          {money(summary.total)}
        </p>
        <p className="truncate text-xs tabular-nums text-zinc-500">
          {ratio !== null ? `${Math.round(ratio * 100)}% of ${money(trip.budget!)}` : pluralize(trip.expenses.length, 'expense')}
        </p>
      </div>
      {ratio !== null && <ProgressBar ratio={ratio} className={compact ? 'mt-2' : 'mt-2.5'} />}
      {compact ? (
        myBalance !== undefined && (
          <p
            className={cx(
              'mt-2.5 text-xs font-medium tabular-nums',
              myBalance > 0 ? 'text-emerald-700' : myBalance < 0 ? 'text-red-600' : 'text-zinc-500',
            )}
          >
            {myBalance > 0 ? `You get back ${money(myBalance)}` : myBalance < 0 ? `You owe ${money(-myBalance)}` : "You're settled up"}
          </p>
        )
      ) : (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {myBalance !== undefined ? (
            myBalance === 0 ? (
              <span className="sticker-sm inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                🏆 Settled up
              </span>
            ) : (
              <span
                className={cx(
                  'sticker-sm inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                  myBalance > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700',
                )}
              >
                {myBalance > 0 ? `You get back ${money(myBalance)} 🤑` : `You owe ${money(-myBalance)} 😬`}
              </span>
            )
          ) : (
            <span />
          )}
          <AvatarStack people={trip.people} />
        </div>
      )}
    </Link>
  );
}
