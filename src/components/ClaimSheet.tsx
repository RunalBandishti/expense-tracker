import { useState } from 'react';
import { Check } from 'lucide-react';
import { newId } from '../lib/id';
import { findPersonByName, isReservedName } from '../lib/split';
import type { Trip } from '../lib/types';
import { useTrips } from '../state/trips';
import { Avatar, Button, cx, SectionLabel, Sheet } from './ui';

export function ClaimSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { user, apply } = useTrips();
  const [name, setName] = useState(user.username);
  const myPersonId = trip.members.find((member) => member.userId === user.id)?.personId;

  const claim = (personId: string | null) => {
    apply(trip.id, { type: 'member/claim', userId: user.id, personId });
    onClose();
  };

  const addMe = () => {
    const trimmed = name.trim();
    if (!trimmed || isReservedName(trimmed)) return;
    const existing = findPersonByName(trip.people, trimmed);
    if (existing) return claim(existing.id);
    const person = { id: newId(), name: trimmed };
    apply(trip.id, { type: 'person/add', person }, { type: 'member/claim', userId: user.id, personId: person.id });
    onClose();
  };

  return (
    <Sheet title="Who are you?" onClose={onClose}>
      <p className="px-1 text-sm text-zinc-500">
        Pick your name so balances can show what you owe, and new expenses default to you as the payer.
      </p>
      {trip.people.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {trip.people.map((person) => {
            const claimedBy = trip.members.find((member) => member.personId === person.id && member.userId !== user.id);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={!!claimedBy}
                  onClick={() => claim(person.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <Avatar person={person} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{person.name}</span>
                  {claimedBy && <span className="truncate text-xs text-zinc-500">{claimedBy.username}</span>}
                  {myPersonId === person.id && <Check className="size-4 text-emerald-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <section className="mt-6">
        <SectionLabel>Not listed?</SectionLabel>
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addMe();
            }}
            aria-label="Your name"
            maxLength={40}
            autoCapitalize="words"
            className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
          />
          <Button size="sm" onClick={addMe} disabled={!name.trim()}>
            Add me
          </Button>
        </div>
      </section>
      <button
        type="button"
        onClick={() => claim(null)}
        className={cx(
          'mt-6 w-full rounded-full py-3 text-sm font-medium transition hover:bg-zinc-900/5',
          myPersonId === null ? 'text-zinc-900' : 'text-zinc-500',
        )}
      >
        I'm not on this trip
      </button>
    </Sheet>
  );
}
