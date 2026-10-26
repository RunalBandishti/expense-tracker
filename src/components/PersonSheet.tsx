import { useId, useState, type FormEvent } from 'react';
import { Trash } from 'lucide-react';
import { pluralize } from '../lib/dates';
import { countExpensesUsingPerson, findPersonByName, isReservedName } from '../lib/split';
import type { Person, Trip } from '../lib/types';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';
import { Avatar, Button, FieldError, FormRow, rowInputClass, Sheet } from './ui';

type Props = { trip: Trip; person: Person; onClose: () => void };

export function PersonSheet({ trip, person, onClose }: Props) {
  const { updateTrip } = useTrips();
  const toast = useToast();
  const formId = useId();
  const [name, setName] = useState(person.name);
  const [submitted, setSubmitted] = useState(false);

  const usedIn = countExpensesUsingPerson(trip, person.id);
  const trimmed = name.trim();
  const namesake = findPersonByName(trip.people, trimmed);
  const error = !trimmed
    ? 'Enter a name'
    : isReservedName(trimmed) || (namesake && namesake.id !== person.id)
      ? 'That name is already used on this trip'
      : null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (error) return;
    updateTrip(trip.id, (current) => ({
      ...current,
      people: current.people.map((existing) => (existing.id === person.id ? { ...existing, name: trimmed } : existing)),
    }));
    onClose();
  };

  const handleRemove = () => {
    updateTrip(trip.id, (current) => ({
      ...current,
      people: current.people.filter((existing) => existing.id !== person.id),
    }));
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
          <div className="rounded-2xl border border-zinc-200 bg-white">
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
          </div>
          {submitted && error && <FieldError>{error}</FieldError>}
        </div>
        <Button type="submit" size="lg" className="w-full">
          Save
        </Button>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <Button variant="danger" className="w-full" disabled={usedIn > 0} onClick={handleRemove}>
            <Trash className="size-4" />
            Remove from trip
          </Button>
          {usedIn > 0 && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              {person.name} is on {pluralize(usedIn, 'expense')}. Change or delete those first.
            </p>
          )}
        </div>
      </form>
    </Sheet>
  );
}
