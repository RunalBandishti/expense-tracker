import { useId, useState, type FormEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { addDays, daysBetween, pluralize, todayISO } from '../lib/dates';
import { newId } from '../lib/id';
import { amountToInput, CURRENCIES, currencySymbol, parseAmount, sanitizeAmountInput } from '../lib/money';
import { findPersonByName, isReservedName } from '../lib/split';
import type { Person, Trip } from '../lib/types';
import { useTrips } from '../state/trips';
import { Avatar, Button, cx, FieldError, FormRow, rowDateInputClass, rowInputClass, SectionLabel, Sheet } from './ui';

const EMOJIS = ['✈️', '🏖️', '🏔️', '🏕️', '🚗', '🚆', '🛳️', '🎒', '🏨', '🍽️', '🎉', '💼'];

type Props = { trip?: Trip; onClose: () => void; onCreated?: (trip: Trip) => void };

export function TripSheet({ trip, onClose, onCreated }: Props) {
  const { createTrip, updateTrip } = useTrips();
  const formId = useId();
  const today = todayISO();
  const [name, setName] = useState(trip?.name ?? '');
  const [emoji, setEmoji] = useState(trip?.emoji ?? EMOJIS[0]);
  const [startDate, setStartDate] = useState(trip?.startDate ?? today);
  const [endDate, setEndDate] = useState(trip?.endDate ?? addDays(today, 2));
  const [budgetText, setBudgetText] = useState(trip?.budget != null ? amountToInput(trip.budget) : '');
  const [currency, setCurrency] = useState(trip?.currency ?? 'INR');
  const [people, setPeople] = useState<Person[]>([]);
  const [personName, setPersonName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const budget = budgetText.trim() ? parseAmount(budgetText) : null;
  const errors = {
    name: !name.trim() ? 'Give your trip a name' : null,
    dates: !startDate || !endDate ? 'Pick both dates' : endDate < startDate ? 'The trip must end after it starts' : null,
    budget: budgetText.trim() && !budget ? 'Enter a valid budget or leave it empty' : null,
  };
  const days = startDate && endDate && endDate >= startDate ? daysBetween(startDate, endDate) + 1 : null;

  const addPendingPerson = (list: Person[]) => {
    const trimmed = personName.trim();
    if (!trimmed || isReservedName(trimmed) || findPersonByName(list, trimmed)) return list;
    return [...list, { id: newId(), name: trimmed }];
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const details = { name: name.trim(), emoji, startDate, endDate, budget, currency };
    if (trip) {
      updateTrip(trip.id, (current) => ({ ...current, ...details }));
    } else {
      onCreated?.(createTrip({ ...details, people: addPendingPerson(people) }));
    }
    onClose();
  };

  return (
    <Sheet title={trip ? 'Edit trip' : 'New trip'} onClose={onClose} formId={formId} submitLabel={trip ? 'Save' : 'Create'}>
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="flex flex-col items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-white text-4xl shadow-sm ring-1 ring-zinc-200">{emoji}</span>
          <div className="-mx-5 mt-4 flex max-w-[calc(100%+2.5rem)] gap-1.5 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Trip icon">
            {EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === emoji}
                onClick={() => setEmoji(option)}
                className={cx(
                  'grid size-10 shrink-0 place-items-center rounded-xl text-xl transition',
                  option === emoji ? 'bg-zinc-900/10 ring-2 ring-zinc-900' : 'hover:bg-zinc-900/5',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-zinc-200 bg-white">
            <FormRow label="Name" htmlFor={`${formId}-name`}>
              <input
                id={`${formId}-name`}
                data-autofocus={trip ? undefined : true}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Goa Getaway"
                maxLength={80}
                autoCapitalize="words"
                className={rowInputClass}
              />
            </FormRow>
          </div>
          {submitted && errors.name && <FieldError>{errors.name}</FieldError>}
        </div>

        <section>
          <SectionLabel aside={days && <span className="text-xs font-semibold text-emerald-700">{pluralize(days, 'day')}</span>}>
            Trip dates
          </SectionLabel>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
            <FormRow label="Starts" htmlFor={`${formId}-start`}>
              <input
                id={`${formId}-start`}
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (event.target.value && endDate < event.target.value) setEndDate(event.target.value);
                }}
                className={rowDateInputClass}
              />
            </FormRow>
            <FormRow label="Ends" htmlFor={`${formId}-end`}>
              <input
                id={`${formId}-end`}
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={rowDateInputClass}
              />
            </FormRow>
          </div>
          {submitted && errors.dates && <FieldError>{errors.dates}</FieldError>}
        </section>

        <section>
          <SectionLabel>Budget</SectionLabel>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
            <FormRow label="Total budget" htmlFor={`${formId}-budget`}>
              <span className="mr-1 text-base text-zinc-400">{currencySymbol(currency)}</span>
              <input
                id={`${formId}-budget`}
                inputMode="decimal"
                value={budgetText}
                onChange={(event) => setBudgetText(sanitizeAmountInput(event.target.value))}
                placeholder="Optional"
                className={cx(rowInputClass, 'tabular-nums')}
              />
            </FormRow>
            <FormRow label="Currency" htmlFor={`${formId}-currency`}>
              <div className="relative flex items-center">
                <select
                  id={`${formId}-currency`}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="appearance-none bg-transparent pr-6 text-right text-base font-medium outline-none"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code} ({currencySymbol(code)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 size-4 text-zinc-400" />
              </div>
            </FormRow>
          </div>
          {submitted && errors.budget && <FieldError>{errors.budget}</FieldError>}
        </section>

        {!trip && (
          <section>
            <SectionLabel aside={<span className="text-xs text-zinc-400">Optional · you can add later</span>}>People</SectionLabel>
            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              {people.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {people.map((person) => (
                    <li key={person.id} className="flex items-center gap-2 rounded-full bg-zinc-100 py-1 pl-1 pr-2 text-sm font-medium">
                      <Avatar person={person} size="xs" />
                      {person.name}
                      <button
                        type="button"
                        aria-label={`Remove ${person.name}`}
                        onClick={() => setPeople((list) => list.filter((item) => item.id !== person.id))}
                        className="grid size-5 place-items-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={personName}
                  onChange={(event) => setPersonName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      setPeople(addPendingPerson);
                      setPersonName('');
                    }
                  }}
                  placeholder="Add a name"
                  aria-label="Person's name"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
                />
                <Button
                  size="sm"
                  disabled={!personName.trim()}
                  onClick={() => {
                    setPeople(addPendingPerson);
                    setPersonName('');
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </section>
        )}

        <Button type="submit" size="lg" className="w-full">
          {trip ? 'Save changes' : 'Create trip'}
        </Button>
      </form>
    </Sheet>
  );
}
