import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { TripCard } from '../components/TripCard';
import { TripSheet } from '../components/TripSheet';
import { Button, EmptyState, PageLoader, SyncBadge } from '../components/ui';
import { UserMenu } from '../components/UserMenu';
import { pluralize } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { tripTotal } from '../lib/split';
import { useIsDesktop } from '../lib/useMediaQuery';
import { useTrips } from '../state/trips';

export function TripsPage() {
  const { trips, loading, loadError, retryLoad, syncStatus, pendingCount } = useTrips();
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const totalsByCurrency = new Map<string, number>();
  for (const trip of trips) {
    totalsByCurrency.set(trip.currency, (totalsByCurrency.get(trip.currency) ?? 0) + tripTotal(trip));
  }
  const spentText = [...totalsByCurrency].map(([currency, total]) => formatMoney(total, currency)).join(' + ');

  return (
    <div className="mx-auto max-w-5xl px-5 pb-36 pt-[calc(env(safe-area-inset-top)+1.75rem)] lg:px-10 lg:pb-16 lg:pt-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight">Trips</h1>
          {trips.length > 0 && (
            <p className="text-sm tabular-nums text-zinc-500">
              {pluralize(trips.length, 'trip')} · {spentText} spent in total
            </p>
          )}
          {!isDesktop && syncStatus !== 'saved' && (
            <div className="mt-1">
              <SyncBadge status={syncStatus} pendingCount={pendingCount} />
            </div>
          )}
        </div>
        {isDesktop ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New trip
          </Button>
        ) : (
          <UserMenu />
        )}
      </header>

      <div className="mt-6">
        {loading ? (
          <PageLoader />
        ) : loadError ? (
          <EmptyState
            emoji="📡"
            title="Couldn't load your trips"
            body={loadError}
            action={<Button onClick={retryLoad}>Try again</Button>}
          />
        ) : trips.length === 0 ? (
          <EmptyState
            emoji="🧳"
            title="No trips yet"
            body="Create a trip or event to track its budget, log expenses and split them with your group."
            action={
              <Button size="lg" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Create your first trip
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>

      {!isDesktop && trips.length > 0 && (
        <Button
          size="lg"
          onClick={() => setCreating(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-20 -translate-x-1/2 shadow-xl shadow-black/20"
        >
          <Plus className="size-4" />
          New trip
        </Button>
      )}

      {creating && <TripSheet onClose={() => setCreating(false)} onCreated={(trip) => navigate(`/trips/${trip.id}`)} />}
    </div>
  );
}
