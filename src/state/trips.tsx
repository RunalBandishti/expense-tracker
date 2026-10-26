import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { tripTiming } from '../lib/dates';
import { newId } from '../lib/id';
import type { Trip } from '../lib/types';
import { useAuth } from './auth';
import { useToast } from './toast';

const SAVE_DELAY_MS = 400;
const RETRY_DELAY_MS = 5000;
const TIMING_RANK = { ongoing: 0, upcoming: 1, undated: 2, past: 3 } as const;

export type SyncStatus = 'saved' | 'saving' | 'offline';

export type NewTrip = Pick<Trip, 'name' | 'emoji' | 'startDate' | 'endDate' | 'budget' | 'currency' | 'people'>;

type TripsContextValue = {
  trips: Trip[];
  loading: boolean;
  loadError: string | null;
  syncStatus: SyncStatus;
  createTrip: (input: NewTrip) => Trip;
  updateTrip: (id: string, update: (trip: Trip) => Trip) => void;
  deleteTrip: (id: string) => void;
  retryLoad: () => void;
};

const TripsContext = createContext<TripsContextValue | null>(null);

export function useTrips() {
  const context = useContext(TripsContext);
  if (!context) throw new Error('useTrips must be used inside TripsProvider');
  return context;
}

function sortTrips(trips: Trip[]) {
  const rank = (trip: Trip) => TIMING_RANK[tripTiming(trip.startDate, trip.endDate).kind];
  return [...trips].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const { expireSession } = useAuth();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [offline, setOffline] = useState(false);

  const tripsRef = useRef<Trip[]>([]);
  const timers = useRef(new Map<string, number>());
  const queues = useRef(new Map<string, Promise<void>>());
  const pending = useRef(new Set<string>());
  const callbacks = useRef({ expireSession, toast });
  useEffect(() => {
    callbacks.current = { expireSession, toast };
  });

  const actions = useMemo(() => {
    const commit = (next: Trip[]) => {
      tripsRef.current = next;
      setTrips(next);
    };

    const setPending = (id: string, isPending: boolean) => {
      if (isPending) pending.current.add(id);
      else pending.current.delete(id);
      setPendingCount(pending.current.size);
    };

    // Requests for one trip run strictly in order so a slow save can't land after a newer one or a delete.
    const enqueue = (id: string, task: () => Promise<void>) => {
      const run = (queues.current.get(id) ?? Promise.resolve()).then(task).catch(() => undefined);
      queues.current.set(id, run);
      return run;
    };

    async function save(id: string, keepalive = false) {
      const trip = tripsRef.current.find((candidate) => candidate.id === id);
      if (!trip) return;
      try {
        await api(`/trips/${id}`, { method: 'PUT', json: trip, keepalive });
        setOffline(false);
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 401) return callbacks.current.expireSession();
        if (status === 0 || status >= 500) {
          setOffline(true);
          if (!timers.current.has(id)) schedule(id, RETRY_DELAY_MS);
        } else {
          callbacks.current.toast({ message: (err as Error).message, tone: 'error' });
        }
      }
    }

    function runSave(id: string, keepalive = false) {
      void enqueue(id, () => save(id, keepalive)).then(() => {
        if (!timers.current.has(id)) setPending(id, false);
      });
    }

    function schedule(id: string, delay = SAVE_DELAY_MS) {
      window.clearTimeout(timers.current.get(id));
      setPending(id, true);
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          runSave(id);
        }, delay),
      );
    }

    return {
      load(list: Trip[]) {
        commit(list);
      },
      createTrip(input: NewTrip) {
        const now = Date.now();
        const trip: Trip = { ...input, id: newId(), expenses: [], createdAt: now, updatedAt: now };
        commit([trip, ...tripsRef.current]);
        schedule(trip.id, 0);
        return trip;
      },
      updateTrip(id: string, update: (trip: Trip) => Trip) {
        commit(tripsRef.current.map((trip) => (trip.id === id ? { ...update(trip), updatedAt: Date.now() } : trip)));
        schedule(id);
      },
      deleteTrip(id: string) {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        commit(tripsRef.current.filter((trip) => trip.id !== id));
        setPending(id, true);
        void enqueue(id, async () => {
          try {
            await api(`/trips/${id}`, { method: 'DELETE' });
          } catch {
            callbacks.current.toast({ message: "Couldn't delete the trip on the server", tone: 'error' });
          }
        }).then(() => setPending(id, false));
      },
      flush() {
        for (const [id, timer] of timers.current) {
          window.clearTimeout(timer);
          timers.current.delete(id);
          runSave(id, true);
        }
      },
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api<{ trips: Trip[] }>('/trips').then(
      ({ trips: loaded }) => {
        if (cancelled) return;
        actions.load(loaded);
        setLoading(false);
      },
      (err: ApiError) => {
        if (cancelled) return;
        if (err.status === 401) return callbacks.current.expireSession();
        setLoadError(err.message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [actions, loadAttempt]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') actions.flush();
    };
    window.addEventListener('pagehide', actions.flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', actions.flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [actions]);

  const sortedTrips = useMemo(() => sortTrips(trips), [trips]);

  const value = useMemo<TripsContextValue>(
    () => ({
      trips: sortedTrips,
      loading,
      loadError,
      syncStatus: offline ? 'offline' : pendingCount > 0 ? 'saving' : 'saved',
      createTrip: actions.createTrip,
      updateTrip: actions.updateTrip,
      deleteTrip: actions.deleteTrip,
      retryLoad: () => setLoadAttempt((attempt) => attempt + 1),
    }),
    [sortedTrips, loading, loadError, offline, pendingCount, actions],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}
