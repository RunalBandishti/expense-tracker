import { useId, useState, type FormEvent } from 'react';
import { Trash } from 'lucide-react';
import { todayISO, tripTiming } from '../lib/dates';
import { newId } from '../lib/id';
import { amountToInput, currencySymbol, formatMoney, parseAmount, sanitizeAmountInput } from '../lib/money';
import { participantIds } from '../lib/split';
import { COMMON, type Expense, type Split, type Trip } from '../lib/types';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';
import { LabelCombobox } from './LabelCombobox';
import { SplitPicker } from './SplitPicker';
import { Button, FieldError, FormRow, rowDateInputClass, rowInputClass, SectionLabel, Sheet } from './ui';

function defaultDate(trip: Trip) {
  return tripTiming(trip.startDate, trip.endDate).kind === 'past' && trip.endDate ? trip.endDate : todayISO();
}

type Props = { trip: Trip; expense?: Expense; onClose: () => void };

export function ExpenseSheet({ trip, expense, onClose }: Props) {
  const { updateTrip } = useTrips();
  const toast = useToast();
  const formId = useId();
  const [amountText, setAmountText] = useState(expense ? amountToInput(expense.amount) : '');
  const [title, setTitle] = useState(expense?.title ?? '');
  const [forId, setForId] = useState<string | null>(expense?.forId ?? null);
  const [split, setSplit] = useState<Split>(expense?.split ?? { mode: 'all' });
  const [date, setDate] = useState(expense?.date ?? defaultDate(trip));
  const [submitted, setSubmitted] = useState(false);

  const amount = parseAmount(amountText);
  const splitIds = forId === COMMON ? participantIds({ forId, split }, trip.people) : [];
  const errors = {
    amount: !amount ? 'Enter an amount' : null,
    title: !title.trim() ? 'Add a short description' : null,
    forId: !forId ? 'Choose who this expense is for' : null,
    split: forId === COMMON && splitIds.length === 0 ? 'Pick at least one person to split with' : null,
    date: !date ? 'Pick a date' : null,
  };

  const addPerson = (name: string) => {
    const person = { id: newId(), name };
    updateTrip(trip.id, (current) => ({ ...current, people: [...current.people, person] }));
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
      // Saved as explicit people so adding someone to the trip later doesn't re-split past expenses.
      split: forId === COMMON ? { mode: 'custom', personIds: splitIds } : undefined,
      createdAt: expense?.createdAt ?? Date.now(),
    };
    updateTrip(trip.id, (current) => ({
      ...current,
      expenses: expense
        ? current.expenses.map((existing) => (existing.id === saved.id ? saved : existing))
        : [...current.expenses, saved],
    }));
    onClose();
  };

  const handleDelete = () => {
    if (!expense) return;
    const index = trip.expenses.findIndex((existing) => existing.id === expense.id);
    updateTrip(trip.id, (current) => ({
      ...current,
      expenses: current.expenses.filter((existing) => existing.id !== expense.id),
    }));
    onClose();
    toast({
      message: 'Expense deleted',
      action: {
        label: 'Undo',
        run: () =>
          updateTrip(trip.id, (current) => {
            const expenses = [...current.expenses];
            expenses.splice(Math.min(index, expenses.length), 0, expense);
            return { ...current, expenses };
          }),
      },
    });
  };

  const perPerson = amount && splitIds.length ? Math.floor(amount / splitIds.length) : null;
  const evenSplit = amount !== null && splitIds.length > 0 && amount % splitIds.length === 0;

  return (
    <Sheet title={expense ? 'Edit expense' : 'New expense'} onClose={onClose} formId={formId} submitLabel={expense ? 'Save' : 'Add'}>
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
        <label className="block text-center">
          <span className="flex items-baseline justify-center gap-1">
            <span className="text-[34px] font-semibold text-zinc-300 sm:text-[40px]">{currencySymbol(trip.currency)}</span>
            <input
              data-autofocus={expense ? undefined : true}
              inputMode="decimal"
              enterKeyHint="next"
              placeholder="0"
              aria-label="Amount"
              value={amountText}
              onChange={(event) => setAmountText(sanitizeAmountInput(event.target.value))}
              style={{ width: `${Math.max(amountText.length, 1) + 0.6}ch` }}
              className="max-w-full bg-transparent text-center text-[46px] font-semibold leading-tight tracking-tight tabular-nums outline-none placeholder:text-zinc-300 sm:text-[52px]"
            />
          </span>
          <span className="text-xs text-zinc-500">Amount</span>
          {submitted && errors.amount && <FieldError>{errors.amount}</FieldError>}
        </label>

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
                    {evenSplit ? '' : '≈ '}
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
          {expense && (
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
