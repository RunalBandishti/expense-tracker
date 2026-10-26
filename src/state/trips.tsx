import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { DEFAULT_CATEGORIES } from '../lib/categories';
import { tripTiming } from '../lib/dates';
import { newId } from '../lib/id';
import { applyOp, type Op } from '../lib/ops';
import { mergeSavedPeople, peopleTouchedBy, rememberPeople, type SavedPerson } from '../lib/savedPeople';
import { findPersonByName } from '../lib/split';
import { readStored, savedPeopleCacheKey, tripsCacheKey, USER_KEY, writeStored } from '../lib/storage';
import type { Person, Trip, TripDetails, User } from '../lib/types';
import { useAuth } from './auth';
import { useToast } from './toast';

const FLUSH_DELAY_MS = 300;
const BASE_RETRY_MS = 4000;
const MAX_RETRY_MS = 60_000;
const BATCH_SIZE = 50;
const REFRESH_THROTTLE_MS = 15_000;
const TIMING_RANK = { ongoing: 0, upcoming: 1, undated: 2, past: 3 } as const;

/** `confirmed` is the last copy the server returned; `pending` are local changes not yet acknowledged. */
type Entry = { confirmed: Trip | null; pending: Op[]; removal?: 'delete' | 'leave' };

export type SyncStatus = 'saved' | 'saving' | 'offline';

type TripsContextValue = {
  user: User;
  trips: Trip[];
  loading: boolean;
  loadError: string | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  /** Only people this account added itself, never ones friends added to shared events. */
  savedPeople: SavedPerson[];
  createTrip: (details: TripDetails, people: Person[]) => Trip;
  apply: (tripId: string, ...ops: Op[]) => void;
  removeTrip: (tripId: string) => void;
  receiveTrip: (trip: Trip) => void;
  refreshTrip: (tripId: string) => Promise<void>;
  runAction: (tripId: string, path: string, method: 'POST' | 'DELETE') => Promise<void>;
  retryLoad: () => void;
};

const TripsContext = createContext<TripsContextValue | null>(null);

export function useTrips() {
  const context = useContext(TripsContext);
  if (!context) throw new Error('useTrips must be used inside TripsProvider');
  return context;
}

export function useSavedPeople() {
  const { savedPeople } = useTrips();
  return useMemo(
    () =>
      savedPeople.map(
        ({ name, upiId }): Person => ({ id: `saved:${name.toLowerCase()}`, name, ...(upiId ? { upiId } : {}) }),
      ),
    [savedPeople],
  );
}

/** Makes a person for an event, reusing the UPI ID already saved for that name elsewhere. */
export function useNewPerson() {
  const savedPeople = useSavedPeople();
  return useCallback(
    (name: string, upiId?: string): Person => {
      const knownUpiId = upiId || findPersonByName(savedPeople, name)?.upiId;
      return { id: newId(), name, ...(knownUpiId ? { upiId: knownUpiId } : {}) };
    },
    [savedPeople],
  );
}

function sortTrips(trips: Trip[]) {
  const rank = (trip: Trip) => TIMING_RANK[tripTiming(trip.startDate, trip.endDate).kind];
  return trips.sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);
}

const statusOf = (err: unknown) => (err instanceof ApiError ? err.status : 0);

export function TripsProvider({ user, children }: { user: User; children: ReactNode }) {
  const { expireSession } = useAuth();
  const toast = useToast();
  const cacheKey = tripsCacheKey(user.id);
  const peopleKey = savedPeopleCacheKey(user.id);
  const [entries] = useState(() => new Map<string, Entry>(readStored<[string, Entry][]>(cacheKey) ?? []));
  const [savedPeople, setSavedPeople] = useState(() => readStored<SavedPerson[]>(peopleKey) ?? []);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(entries.size === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [inFlightCount, setInFlightCount] = useState(0);
  const callbacks = useRef({ expireSession, toast });
  useEffect(() => {
    callbacks.current = { expireSession, toast };
  });

  const engine = useMemo(() => {
    const timers = new Map<string, number>();
    const attempts = new Map<string, number>();
    const inFlight = new Set<string>();
    let lastRefresh = 0;

    // Written synchronously: a killed tab may never fire pagehide, and unsynced changes must survive it.
    const persistNow = () => {
      // After a logout the cache was wiped on purpose; unmount must not write it back.
      if (readStored<User>(USER_KEY)?.id === user.id) writeStored(cacheKey, [...entries]);
    };
    const commit = () => {
      setRevision((value) => value + 1);
      persistNow();
    };
    const acceptServerCopy = (trip: Trip) => {
      const entry = entries.get(trip.id);
      if (!entry) entries.set(trip.id, { confirmed: trip, pending: [] });
      else if (!entry.confirmed || trip.version >= entry.confirmed.version) entry.confirmed = trip;
    };

    function schedule(id: string, delay = FLUSH_DELAY_MS) {
      window.clearTimeout(timers.get(id));
      timers.set(id, window.setTimeout(() => void flush(id), delay));
    }

    async function flush(id: string) {
      timers.delete(id);
      const entry = entries.get(id);
      if (!entry || inFlight.has(id) || (!entry.removal && entry.pending.length === 0)) return;
      inFlight.add(id);
      setInFlightCount(inFlight.size);
      const batch = entry.pending.slice(0, BATCH_SIZE);
      let retry = false;
      try {
        if (entry.removal) {
          if (entry.confirmed) {
            await api(entry.removal === 'delete' ? `/trips/${id}` : `/trips/${id}/leave`, {
              method: entry.removal === 'delete' ? 'DELETE' : 'POST',
            });
          }
          entries.delete(id);
        } else {
          const { trip } = await api<{ trip: Trip }>(`/trips/${id}/ops`, { method: 'POST', json: { ops: batch } });
          const current = entries.get(id);
          if (current) {
            current.confirmed = trip;
            current.pending = current.pending.slice(batch.length);
          }
        }
        attempts.delete(id);
        setOffline(false);
      } catch (err) {
        const status = statusOf(err);
        if (status === 401) {
          callbacks.current.expireSession();
        } else if (status === 0 || status >= 500 || status === 409) {
          retry = true;
          setOffline(status === 0);
        } else if (status === 404 || status === 403) {
          entries.delete(id);
          if (!entry.removal) callbacks.current.toast({ message: 'That event is no longer shared with you', tone: 'error' });
        } else {
          const current = entries.get(id);
          if (current) current.pending = current.pending.slice(batch.length);
          callbacks.current.toast({ message: "Some changes couldn't be saved", tone: 'error' });
        }
      } finally {
        inFlight.delete(id);
        setInFlightCount(inFlight.size);
        commit();
        const current = entries.get(id);
        if (current && (current.removal || current.pending.length)) {
          if (retry) {
            const attempt = (attempts.get(id) ?? 0) + 1;
            attempts.set(id, attempt);
            schedule(id, Math.min(BASE_RETRY_MS * 2 ** (attempt - 1), MAX_RETRY_MS));
          } else {
            schedule(id, 0);
          }
        }
      }
    }

    const flushAll = () => {
      for (const [id, entry] of entries) if (entry.removal || entry.pending.length) schedule(id, 0);
    };

    async function refreshAll(force = false) {
      if (!force && Date.now() - lastRefresh < REFRESH_THROTTLE_MS) return;
      lastRefresh = Date.now();
      api<{ people: SavedPerson[] }>('/people').then(
        ({ people }) => setSavedPeople((list) => mergeSavedPeople(list, people)),
        () => undefined,
      );
      try {
        const { trips } = await api<{ trips: Trip[] }>('/trips');
        const seen = new Set(trips.map((trip) => trip.id));
        for (const trip of trips) acceptServerCopy(trip);
        // A trip that was on the server before but isn't any more was deleted, or you were removed from it.
        for (const [id, entry] of entries) if (!seen.has(id) && entry.confirmed && !entry.removal) entries.delete(id);
        setLoadError(null);
        setOffline(false);
        commit();
      } catch (err) {
        const status = statusOf(err);
        if (status === 401) callbacks.current.expireSession();
        else if (entries.size === 0) setLoadError((err as Error).message);
        if (status === 0) setOffline(true);
      } finally {
        setLoading(false);
      }
      flushAll();
    }

    return {
      persistNow,
      flushAll,
      refreshAll,
      createTrip(details: TripDetails, people: Person[]) {
        const now = Date.now();
        const trip: Trip = {
          ...details,
          id: newId(),
          people,
          expenses: [],
          settlements: [],
          categories: DEFAULT_CATEGORIES,
          members: [{ userId: user.id, username: user.username, role: 'owner', joinedAt: now }],
          ownerId: user.id,
          shareToken: null,
          inviteToken: null,
          version: 0,
          createdAt: now,
          updatedAt: now,
        };
        entries.set(trip.id, { confirmed: null, pending: [{ type: 'trip/create', trip }] });
        commit();
        schedule(trip.id, 0);
        setSavedPeople((list) => rememberPeople(list, people, now));
        return trip;
      },
      apply(tripId: string, ...ops: Op[]) {
        const entry = entries.get(tripId);
        if (!entry || entry.removal) return;
        entry.pending.push(...ops);
        commit();
        schedule(tripId);
        const trip = entry.pending.reduce<Trip | null>(applyOp, entry.confirmed);
        if (!trip) return;
        const { people, upiSetIds } = peopleTouchedBy(ops, trip);
        setSavedPeople((list) => rememberPeople(list, people, Date.now(), upiSetIds));
      },
      removeTrip(tripId: string) {
        const entry = entries.get(tripId);
        if (!entry) return;
        if (!entry.confirmed && !inFlight.has(tripId)) {
          entries.delete(tripId);
        } else {
          const ownerId = entry.confirmed?.ownerId ?? user.id;
          entry.removal = ownerId === user.id ? 'delete' : 'leave';
          entry.pending = [];
          schedule(tripId, 0);
        }
        commit();
      },
      receiveTrip(trip: Trip) {
        acceptServerCopy(trip);
        commit();
      },
      async refreshTrip(tripId: string) {
        if (inFlight.has(tripId)) return;
        try {
          const { trip } = await api<{ trip: Trip }>(`/trips/${tripId}`);
          acceptServerCopy(trip);
          setOffline(false);
          commit();
        } catch (err) {
          const status = statusOf(err);
          if (status === 404 && entries.get(tripId)?.confirmed) {
            entries.delete(tripId);
            commit();
          }
          if (status === 0) setOffline(true);
        }
      },
      async runAction(tripId: string, path: string, method: 'POST' | 'DELETE') {
        const { trip } = await api<{ trip: Trip }>(`/trips/${tripId}${path}`, { method });
        acceptServerCopy(trip);
        commit();
      },
    };
  }, [entries, cacheKey, user]);

  useEffect(() => {
    if (readStored<User>(USER_KEY)?.id === user.id) writeStored(peopleKey, savedPeople);
  }, [peopleKey, savedPeople, user.id]);

  useEffect(() => {
    void engine.refreshAll(true);
    const onOnline = () => {
      setOffline(false);
      void engine.refreshAll(true);
    };
    const onOffline = () => setOffline(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void engine.refreshAll();
      else engine.persistNow();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', engine.persistNow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      engine.persistNow();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', engine.persistNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [engine]);

  const { trips, pendingCount } = useMemo(() => {
    const list: Trip[] = [];
    let pending = 0;
    for (const entry of entries.values()) {
      pending += entry.pending.length + (entry.removal ? 1 : 0);
      if (entry.removal) continue;
      const trip = entry.pending.reduce<Trip | null>(applyOp, entry.confirmed);
      if (trip) list.push(trip);
    }
    return { trips: sortTrips(list), pendingCount: pending };
    // `revision` is the change signal for the mutable `entries` map.
  }, [entries, revision]);

  const value = useMemo<TripsContextValue>(
    () => ({
      user,
      trips,
      loading,
      loadError,
      syncStatus: offline ? 'offline' : pendingCount > 0 || inFlightCount > 0 ? 'saving' : 'saved',
      pendingCount,
      savedPeople,
      createTrip: engine.createTrip,
      apply: engine.apply,
      removeTrip: engine.removeTrip,
      receiveTrip: engine.receiveTrip,
      refreshTrip: engine.refreshTrip,
      runAction: engine.runAction,
      retryLoad: () => void engine.refreshAll(true),
    }),
    [user, trips, loading, loadError, offline, pendingCount, savedPeople, inFlightCount, engine],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}
