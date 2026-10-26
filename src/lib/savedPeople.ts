import type { Op } from './ops';
import type { Person, Trip } from './types';

export type SavedPerson = { name: string; upiId?: string; savedAt: number };

const MAX_SAVED_PEOPLE = 500;

const newestFirst = (list: SavedPerson[]) => list.sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_SAVED_PEOPLE);

/** People these ops added, renamed or gave a UPI ID, as they stand in `trip` afterwards. */
export function peopleTouchedBy(ops: Op[], trip: Trip) {
  const ids = new Set<string>();
  const upiSetIds = new Set<string>();
  for (const op of ops) {
    if (op.type === 'trip/create') for (const person of op.trip.people) ids.add(person.id);
    else if (op.type === 'person/add') ids.add(op.person.id);
    else if (op.type === 'person/update') ids.add(op.id);
    else if (op.type === 'person/setUpi') {
      ids.add(op.id);
      upiSetIds.add(op.id);
    }
  }
  return { people: trip.people.filter((person) => ids.has(person.id)), upiSetIds };
}

/** Saves people by name. A saved UPI ID is only dropped when `upiSetIds` says it was removed on purpose. */
export function rememberPeople(saved: SavedPerson[], people: Person[], now: number, upiSetIds = new Set<string>()) {
  if (people.length === 0) return saved;
  const byName = new Map(saved.map((entry) => [entry.name.toLowerCase(), entry]));
  for (const person of people) {
    const key = person.name.toLowerCase();
    const upiId = person.upiId ?? (upiSetIds.has(person.id) ? undefined : byName.get(key)?.upiId);
    byName.set(key, { name: person.name, ...(upiId ? { upiId } : {}), savedAt: now });
  }
  return newestFirst([...byName.values()]);
}

export function mergeSavedPeople(...lists: SavedPerson[][]) {
  const byName = new Map<string, SavedPerson>();
  for (const entry of lists.flat()) {
    const key = entry.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || entry.savedAt > existing.savedAt) byName.set(key, entry);
  }
  return newestFirst([...byName.values()]);
}
