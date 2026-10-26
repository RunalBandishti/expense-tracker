import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { TripCard } from '../components/TripCard';
import { TripSheet } from '../components/TripSheet';
import { Button, EmptyState, PageLoader, SyncBadge } from '../components/ui';
import { UserMenu } from '../components/UserMenu';
import { pluralize, tripTiming } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { tripTotal } from '../lib/split';
import { useIsDesktop } from '../lib/useMediaQuery';
import { useTrips } from '../state/trips';

export function TripsPage() {
  const { trips, loading, loadError, retryLoad, syncStatus, pendingCount, user } = useTrips();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const totalsByCurrency = new Map<string, number>();
  let featuredBudget: { name: string; ratio: number; priority: number } | null = null;
  for (const trip of trips) {
    const total = tripTotal(trip);
    totalsByCurrency.set(trip.currency, (totalsByCurrency.get(trip.currency) ?? 0) + total);
    if (trip.budget && trip.budget > 0) {
      const timing = tripTiming(trip.startDate, trip.endDate);
      const ratio = total / trip.budget;
      const priority = timing.kind === 'ongoing' ? 4 : ratio > 1 ? 3 : timing.kind === 'upcoming' ? 2 : 1;
      if (!featuredBudget || priority > featuredBudget.priority || (priority === featuredBudget.priority && ratio > featuredBudget.ratio)) {
        featuredBudget = { name: trip.name, ratio, priority };
      }
    }
  }
  const spentText = [...totalsByCurrency].map(([currency, total]) => formatMoney(total, currency)).join(' + ');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.username.split(/[\s.@_-]/)[0] || user.username;
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const featuredPercent = featuredBudget ? Math.round(featuredBudget.ratio * 100) : null;
  const mascotLine =
    featuredBudget && featuredPercent !== null
      ? featuredBudget.ratio > 1
        ? `Easy, tiger — ${featuredBudget.name} is ${featuredPercent}% of budget.`
        : featuredBudget.ratio >= 0.8
          ? `${featuredBudget.name} is ${featuredPercent}% spent — pace yourself!`
          : featuredBudget.ratio > 0
            ? `${featuredBudget.name} is ${featuredPercent}% spent — nicely on track.`
            : `${featuredBudget.name} is ready for its first expense.`
      : `Penny's keeping an eye on ${pluralize(trips.length, 'event')} for you.`;

  return (
    <div className="mx-auto max-w-5xl px-5 pb-36 pt-[calc(env(safe-area-inset-top)+1.75rem)] lg:px-10 lg:pb-16 lg:pt-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            {greeting}, {displayName} 👋
          </p>
          <h1 className="mt-0.5 text-[32px] font-semibold leading-tight tracking-tight">Events</h1>
          {trips.length > 0 && <p className="text-sm tabular-nums text-zinc-500">{pluralize(trips.length, 'event')}</p>}
          {!isDesktop && syncStatus !== 'saved' && (
            <div className="mt-1">
              <SyncBadge status={syncStatus} pendingCount={pendingCount} />
            </div>
          )}
        </div>
        {isDesktop ? (
          <Button className="sticker-button" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New event
          </Button>
        ) : (
          <UserMenu />
        )}
      </header>

      {!loading && !loadError && trips.length > 0 && (
        <section className="mascot-card relative mt-6 overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="relative z-10 max-w-[calc(100%_-_3.5rem)] sm:max-w-[calc(100%_-_6rem)]">
            <p className="font-hand text-[28px] font-bold leading-[1.05] sm:text-[34px]">
              You’ve tracked <span className="playful-underline">{spentText}</span>
            </p>
            <p className="mt-2 text-[13px] font-semibold sm:text-sm">{mascotLine}</p>
          </div>
          <Mascot className="mascot-peek absolute -bottom-1 right-2 w-16 sm:right-4 sm:w-20" />
        </section>
      )}

      <div className="mt-6">
        {loading ? (
          <PageLoader />
        ) : loadError ? (
          <EmptyState
            emoji="📡"
            title="Couldn't load your events"
            body={loadError}
            action={<Button className="sticker-button" onClick={retryLoad}>Try again</Button>}
          />
        ) : trips.length === 0 ? (
          <EmptyState
            art={<Mascot mood="sad" className="mascot-float w-20" />}
            title="No events yet — Penny's bored"
            body="An event can be a trip, a party, your monthly home costs or anything else. Track its budget, log expenses and split them with friends."
            action={
              <Button size="lg" className="sticker-button" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Create your first event
              </Button>
            }
          />
        ) : (
          <>
            <h2 className="mb-2 mt-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Your events</h2>
            <div className="character-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </>
        )}
      </div>

      {!isDesktop && trips.length > 0 && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="sticker-button fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-20 inline-flex h-12 -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-amber-300 px-6 text-[15px] font-semibold text-ink"
        >
          <Plus className="size-4" />
          New event
        </button>
      )}

      {creating && <TripSheet onClose={() => setCreating(false)} onCreated={(trip) => navigate(`/trips/${trip.id}`)} />}
    </div>
  );
}
