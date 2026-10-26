import { useId, useState, type FormEvent } from 'react';
import { Trash } from 'lucide-react';
import { pluralize } from '../lib/dates';
import type { Op } from '../lib/ops';
import { countUsesOfPerson, findPersonByName, isReservedName } from '../lib/split';
import { MY_UPI_KEY, writeStored } from '../lib/storage';
import type { Person, Trip } from '../lib/types';
import { isValidUpiId, supportsUpi } from '../lib/upi';
import { useToast } from '../state/toast';
import { useSavedPeople, useTrips } from '../state/trips';
import { Avatar, Button, FieldError, FormRow, rowInputClass, Sheet } from './ui';

type Props = { trip: Trip; person: Person; focusUpi?: boolean; onClose: () => void };

export function PersonSheet({ trip, person, focusUpi = false, onClose }: Props) {
  const { user, apply } = useTrips();
  const savedPeople = useSavedPeople();
  const toast = useToast();
  const formId = useId();
  const savedUpiId = person.upiId ? undefined : findPersonByName(savedPeople, person.name)?.upiId;
  const [name, setName] = useState(person.name);
  const [upiId, setUpiId] = useState(person.upiId ?? savedUpiId ?? '');
  const [submitted, setSubmitted] = useState(false);

  const uses = countUsesOfPerson(trip, person.id);
  const trimmed = name.trim();
  const trimmedUpi = upiId.trim();
  const namesake = findPersonByName(trip.people, trimmed);
  const isMe = trip.members.some((member) => member.userId === user.id && member.personId === person.id);
  const nameError = !trimmed
    ? 'Enter a name'
    : isReservedName(trimmed) || (namesake && namesake.id !== person.id)
      ? 'That name is already used in this event'
      : null;
  const upiError = trimmedUpi && !isValidUpiId(trimmedUpi) ? 'Enter a UPI ID like name@okaxis' : null;
  const upiHint =
    savedUpiId && trimmedUpi === savedUpiId
      ? 'Filled in from your other events. Save to use it here.'
      : !focusUpi
        ? 'Lets others pay with Google Pay, PhonePe or Paytm in one tap.'
        : isMe
          ? 'Add your UPI ID so friends can pay you with one tap.'
          : `Add ${person.name}'s UPI ID to pay them with one tap.`;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (nameError || upiError) return;
    const ops: Op[] = [];
    if (trimmed !== person.name) ops.push({ type: 'person/update', id: person.id, name: trimmed });
    if (trimmedUpi !== (person.upiId ?? '')) ops.push({ type: 'person/setUpi', id: person.id, upiId: trimmedUpi || null });
    if (ops.length) apply(trip.id, ...ops);
    if (isMe && trimmedUpi) writeStored(MY_UPI_KEY, trimmedUpi);
    onClose();
  };

  const handleRemove = () => {
    apply(trip.id, { type: 'person/remove', id: person.id });
    onClose();
    toast({ message: `Removed ${person.name}` });
  };

  return (
    <Sheet title="Edit person" onClose={onClose} formId={formId}>
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="flex justify-center">
          <Avatar person={{ ...person, name: trimmed || person.name }} size="lg" />
        </div>
        <div>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
            <FormRow label="Name" htmlFor={`${formId}-name`}>
              <input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                autoCapitalize="words"
                className={rowInputClass}
              />
            </FormRow>
            {supportsUpi(trip) && (
              <FormRow label="UPI ID" htmlFor={`${formId}-upi`}>
                <input
                  id={`${formId}-upi`}
                  data-autofocus={focusUpi || undefined}
                  value={upiId}
                  onChange={(event) => setUpiId(event.target.value)}
                  placeholder="name@bank (optional)"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={100}
                  className={rowInputClass}
                />
              </FormRow>
            )}
          </div>
          {submitted && (nameError || upiError) && <FieldError>{nameError ?? upiError}</FieldError>}
          {supportsUpi(trip) && (
            <p className="mt-2 px-1 text-xs text-zinc-500">
              {upiHint}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full">
          Save
        </Button>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <Button variant="danger" className="w-full" disabled={uses > 0} onClick={handleRemove}>
            <Trash className="size-4" />
            Remove from event
          </Button>
          {uses > 0 && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              {person.name} is on {pluralize(uses, 'expense or payment', 'expenses or payments')}. Change or delete
              those first.
            </p>
          )}
        </div>
      </form>
    </Sheet>
  );
}
