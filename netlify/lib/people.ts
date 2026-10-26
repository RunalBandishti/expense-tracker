import { getStore } from '@netlify/blobs';
import type { Op } from '../../src/lib/ops';
import { mergeSavedPeople, peopleTouchedBy, rememberPeople, type SavedPerson } from '../../src/lib/savedPeople';
import type { Trip } from '../../src/lib/types';
import type { SessionUser } from './auth';
import { json } from './http';

type SavedPeopleDoc = { people: SavedPerson[]; seeded?: true };

const savedPeopleStore = () => getStore({ name: 'saved-people', consistency: 'strong' });

async function updateSavedPeople(userId: string, change: (doc: SavedPeopleDoc) => SavedPeopleDoc) {
  const store = savedPeopleStore();
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(userId, { type: 'json' });
    const doc = (current?.data as SavedPeopleDoc | undefined) ?? { people: [] };
    const next = change(doc);
    if (next === doc) return doc;
    const { modified } = await store.setJSON(userId, next, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
    if (modified) return next;
  }
  throw new Error('Saved people kept changing');
}

/** Best effort: the event change is already saved, so a failure here only costs a suggestion. */
export async function rememberSavedPeople(userId: string, ops: Op[], trip: Trip) {
  const { people, upiSetIds } = peopleTouchedBy(ops, trip);
  if (people.length === 0) return;
  try {
    await updateSavedPeople(userId, (doc) => ({ ...doc, people: rememberPeople(doc.people, people, Date.now(), upiSetIds) }));
  } catch (err) {
    console.error('Saving people failed', err);
  }
}

export async function listSavedPeople(user: SessionUser, eventsOf: (userId: string) => Promise<Trip[]>) {
  const stored = (await savedPeopleStore().get(user.id, { type: 'json' })) as SavedPeopleDoc | null;
  if (stored?.seeded) return json({ people: stored.people });
  // Shared events don't record who added whom, so only events no one else is in can seed the list.
  const soloEvents = (await eventsOf(user.id)).filter((trip) => trip.members.length === 1).sort((a, b) => a.updatedAt - b.updatedAt);
  const fromSoloEvents = soloEvents.reduce<SavedPerson[]>((list, trip) => rememberPeople(list, trip.people, trip.updatedAt), []);
  const doc = await updateSavedPeople(user.id, (current) =>
    current.seeded ? current : { people: mergeSavedPeople(fromSoloEvents, current.people), seeded: true },
  );
  return json({ people: doc.people });
}
