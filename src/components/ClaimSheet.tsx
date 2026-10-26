import { useState } from 'react';
import { Check } from 'lucide-react';
import { newId } from '../lib/id';
import type { Op } from '../lib/ops';
import { findPersonByName, isReservedName } from '../lib/split';
import { MY_UPI_KEY, readStored, writeStored } from '../lib/storage';
import type { Trip } from '../lib/types';
import { isValidUpiId, supportsUpi } from '../lib/upi';
import { useTrips } from '../state/trips';
import { Avatar, Button, cx, FieldError, SectionLabel, Sheet } from './ui';

export function ClaimSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { user, apply } = useTrips();
  const myPersonId = trip.members.find((member) => member.userId === user.id)?.personId;
  const myPerson = trip.people.find((person) => person.id === myPersonId);
  const [name, setName] = useState(user.username);
  const [upiId, setUpiId] = useState(() => myPerson?.upiId ?? readStored<string>(MY_UPI_KEY) ?? '');
  const trimmedUpi = upiId.trim();
  const upiError = trimmedUpi && !isValidUpiId(trimmedUpi) ? 'Enter a UPI ID like name@okaxis, or leave it empty' : null;
  const showUpi = supportsUpi(trip);

  const upiOps = (personId: string): Op[] => {
    const current = trip.people.find((person) => person.id === personId)?.upiId;
    return showUpi && trimmedUpi && trimmedUpi !== current ? [{ type: 'person/setUpi', id: personId, upiId: trimmedUpi }] : [];
  };

  const finish = (...ops: Op[]) => {
    if (upiError) return;
    if (showUpi && trimmedUpi) writeStored(MY_UPI_KEY, trimmedUpi);
    apply(trip.id, ...ops);
    onClose();
  };

  const claim = (personId: string) =>
    finish({ type: 'member/claim', userId: user.id, personId }, ...upiOps(personId));

  const addMe = () => {
    const trimmed = name.trim();
    if (!trimmed || isReservedName(trimmed)) return;
    const existing = findPersonByName(trip.people, trimmed);
    if (existing) return claim(existing.id);
    const person = { id: newId(), name: trimmed, ...(showUpi && trimmedUpi ? { upiId: trimmedUpi } : {}) };
    finish({ type: 'person/add', person }, { type: 'member/claim', userId: user.id, personId: person.id });
  };

  return (
    <Sheet title="Who are you?" onClose={onClose}>
      <p className="px-1 text-sm text-zinc-500">
        Pick your name so balances can show what you owe, and new expenses default to you as the payer.
      </p>
      {showUpi && (
        <section className="mt-4">
          <SectionLabel aside={<span className="text-xs text-zinc-400">Optional · lets friends pay you</span>}>Your UPI ID</SectionLabel>
          <input
            value={upiId}
            onChange={(event) => setUpiId(event.target.value)}
            placeholder="name@okaxis"
            aria-label="Your UPI ID"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={100}
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
          />
          {upiError && <FieldError>{upiError}</FieldError>}
        </section>
      )}
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
        onClick={() => {
          apply(trip.id, { type: 'member/claim', userId: user.id, personId: null });
          onClose();
        }}
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
