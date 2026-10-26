import { useState } from 'react';
import { Link, Outlet, useMatch, useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { TripCard } from '../components/TripCard';
import { TripSheet } from '../components/TripSheet';
import { Button, Logo, SyncBadge } from '../components/ui';
import { UserMenu } from '../components/UserMenu';
import { useIsDesktop } from '../lib/useMediaQuery';
import { useTrips } from '../state/trips';

function Sidebar() {
  const { trips, syncStatus, pendingCount } = useTrips();
  const activeTripId = useMatch('/trips/:tripId')?.params.tripId;
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <aside className="sticky top-0 flex h-dvh flex-col border-r border-zinc-200/80 bg-paper-dim">
      <Link to="/" className="flex items-center gap-3 px-5 pt-6">
        <Logo />
        <span>
          <span className="block font-semibold leading-tight tracking-tight">Expense Manager</span>
          <span className="block text-xs text-zinc-500">Trips, budgets & splits</span>
        </span>
      </Link>
      <div className="px-5 pt-6">
        <Button className="w-full" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New trip
        </Button>
      </div>
      <nav aria-label="Trips" className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} compact active={trip.id === activeTripId} />
        ))}
      </nav>
      <footer className="flex items-center justify-between gap-3 border-t border-zinc-200/80 px-5 py-4">
        <UserMenu placement="up" showName />
        <SyncBadge status={syncStatus} pendingCount={pendingCount} />
      </footer>
      {creating && (
        <TripSheet onClose={() => setCreating(false)} onCreated={(trip) => navigate(`/trips/${trip.id}`)} />
      )}
    </aside>
  );
}

export function Layout() {
  const isDesktop = useIsDesktop();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
      {isDesktop && <Sidebar />}
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
