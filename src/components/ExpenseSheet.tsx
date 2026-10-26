import { useId, useState, type FormEvent } from 'react';
import { Trash } from 'lucide-react';
import { categoryIdOf, guessCategory, OTHER_CATEGORY, tripCategories } from '../lib/categories';
import { todayISO, tripTiming } from '../lib/dates';
import { newId } from '../lib/id';
import { amountToInput, formatMoney, parseAmount } from '../lib/money';
import { participantIds, splitProblem } from '../lib/split';
import { COMMON, type Expense, type Person, type Split, type Trip } from '../lib/types';
import { useNewPerson, useTrips } from '../state/trips';
import { CategoryPicker } from './CategoryPicker';
import { LabelCombobox } from './LabelCombobox';
import { SplitPicker } from './SplitPicker';
import { AmountInput, Button, FieldError, FormRow, rowDateInputClass, rowInputClass, SectionLabel, Sheet } from './ui';

function defaultDate(trip: Trip) {
  return tripTiming(trip.startDate, trip.endDate).kind === 'past' && trip.endDate ? trip.endDate : todayISO();
}

function keepPositive(values: Record<string, number>, people: Person[]) {
  return Object.fromEntries(people.filter((person) => (values[person.id] ?? 0) > 0).map((person) => [person.id, values[person.id]]));
}

/** Saved splits name people explicitly so adding someone to the trip later doesn't re-split past expenses. */
function snapshotSplit(split: Split, people: Person[]): Split {
  switch (split.mode) {
    case 'all':
      return { mode: 'custom', personIds: people.map((person) => person.id) };
    case 'custom':
      return { mode: 'custom', personIds: people.filter((person) => split.personIds.includes(person.id)).map((person) => person.id) };
    case 'shares':
      return { mode: 'shares', weights: keepPositive(split.weights, people) };
    case 'percent':
      return { mode: 'percent', percents: keepPositive(split.percents, people) };
    case 'exact':
      return { mode: 'exact', amounts: keepPositive(split.amounts, people) };
  }
}

type Props = {
  trip: Trip;
  expense?: Expense;
  myPersonId?: string | null;
  onDelete?: (expense: Expense) => void;
  onClose: () => void;
};

export function ExpenseSheet({ trip, expense, myPersonId, onDelete, onClose }: Props) {
  const { apply } = useTrips();
  const newPerson = useNewPerson();
  const formId = useId();
  const [amountText, setAmountText] = useState(expense ? amountToInput(expense.amount) : '');
  const [title, setTitle] = useState(expense?.title ?? '');
  const [category, setCategory] = useState<string | null>(expense ? categoryIdOf(trip, expense.category) : null);
  const [paidById, setPaidById] = useState<string | null>(() => {
    if (expense) return expense.paidById ?? null;
    return trip.people.some((person) => person.id === myPersonId) ? (myPersonId ?? null) : null;
  });
  const [forId, setForId] = useState<string | null>(expense?.forId ?? null);
  const [split, setSplit] = useState<Split>(expense?.split ?? { mode: 'all' });
  const [date, setDate] = useState(expense?.date ?? defaultDate(trip));
  const [submitted, setSubmitted] = useState(false);

  const amount = parseAmount(amountText);
  const shownCategory = category ?? guessCategory(title, tripCategories(trip)) ?? OTHER_CATEGORY;
  const errors = {
    amount: !amount ? 'Enter an amount' : null,
    title: !title.trim() ? 'Add a short description' : null,
    forId: !forId ? 'Choose who this expense is for' : null,
    split: forId === COMMON ? splitProblem(split, amount, trip.people, trip.currency) : null,
    date: !date ? 'Pick a date' : null,
  };

  const addPerson = (name: string) => {
    const person = newPerson(name);
    apply(trip.id, { type: 'person/add', person });
    return person.id;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !amount || !forId) return;
    const saved: Expense = {
      id: expense?.id ?? newId(),
      title: title.trim(),
      amount,
      date,
      forId,
      split: forId === COMMON ? snapshotSplit(split, trip.people) : undefined,
      paidById: paidById ?? undefined,
      category: shownCategory,
      createdAt: expense?.createdAt ?? Date.now(),
    };
    apply(trip.id, { type: 'expense/upsert', expense: saved });
    onClose();
  };

  const handleDelete = () => {
    if (!expense || !onDelete) return;
    onClose();
    onDelete(expense);
  };

  const equalIds = split.mode === 'all' || split.mode === 'custom' ? participantIds({ amount: 0, forId: COMMON, split }, trip.people) : [];
  const perPerson = amount && equalIds.length ? Math.floor(amount / equalIds.length) : null;

  return (
    <Sheet title={expense ? 'Edit expense' : 'New expense'} onClose={onClose} formId={formId} submitLabel={expense ? 'Save' : 'Add'}>
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
        <AmountInput
          value={amountText}
          onChange={setAmountText}
          currency={trip.currency}
          autoFocus={!expense}
          error={submitted ? errors.amount : null}
        />

        <div>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
            <FormRow label="Title" htmlFor={`${formId}-title`}>
              <input
                id={`${formId}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Dinner at the beach"
                maxLength={80}
                autoCapitalize="sentences"
                enterKeyHint="next"
                className={rowInputClass}
              />
            </FormRow>
            <FormRow label="Date" htmlFor={`${formId}-date`}>
              <input
                id={`${formId}-date`}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={rowDateInputClass}
              />
            </FormRow>
          </div>
          {submitted && (errors.title || errors.date) && <FieldError>{errors.title ?? errors.date}</FieldError>}
        </div>

        <section>
          <SectionLabel>Category</SectionLabel>
          <CategoryPicker
            trip={trip}
            value={shownCategory}
            onChange={setCategory}
            onCreate={(created) => apply(trip.id, { type: 'category/add', category: created })}
          />
        </section>

        <section>
          <SectionLabel aside={<span className="text-xs text-zinc-400">Optional · used to settle up</span>}>Paid by</SectionLabel>
          <LabelCombobox
            people={trip.people}
            value={paidById}
            onChange={setPaidById}
            onCreate={addPerson}
            onClear={() => setPaidById(null)}
            includeCommon={false}
            label="Who paid"
            placeholder="Who paid? Pick or type a name"
          />
        </section>

        <section>
          <SectionLabel>For</SectionLabel>
          <LabelCombobox
            people={trip.people}
            value={forId}
            onChange={setForId}
            onCreate={addPerson}
            invalid={submitted && !!errors.forId}
          />
          {submitted && errors.forId && <FieldError>{errors.forId}</FieldError>}
        </section>

        {forId === COMMON && (
          <section>
            <SectionLabel
              aside={
                perPerson !== null && (
                  <span className="text-xs font-semibold tabular-nums text-emerald-700">
                    {amount! % equalIds.length === 0 ? '' : '≈ '}
                    {formatMoney(perPerson, trip.currency)} each
                  </span>
                )
              }
            >
              Split between
            </SectionLabel>
            <SplitPicker
              people={trip.people}
              split={split}
              amount={amount}
              currency={trip.currency}
              onChange={setSplit}
              onAddPerson={addPerson}
            />
            {submitted && errors.split && <FieldError>{errors.split}</FieldError>}
          </section>
        )}

        <div className="space-y-2 pt-1">
          <Button type="submit" size="lg" className="w-full">
            {expense ? 'Save changes' : 'Add expense'}
          </Button>
          {expense && onDelete && (
            <Button variant="danger" size="lg" className="w-full" onClick={handleDelete}>
              <Trash className="size-4" />
              Delete expense
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
