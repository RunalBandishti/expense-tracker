import { useId, useState, type FormEvent } from 'react';
import { todayISO } from '../lib/dates';
import { newId } from '../lib/id';
import { amountToInput, formatMoney, parseAmount } from '../lib/money';
import type { Transfer } from '../lib/split';
import type { Trip } from '../lib/types';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';
import { AmountInput, Button, FieldError, FormRow, rowDateInputClass, SelectInput, Sheet } from './ui';

type Props = { trip: Trip; transfer: Transfer; onClose: () => void };

export function SettlementSheet({ trip, transfer, onClose }: Props) {
  const { apply } = useTrips();
  const toast = useToast();
  const formId = useId();
  const [fromId, setFromId] = useState(transfer.fromId);
  const [toId, setToId] = useState(transfer.toId);
  const [amountText, setAmountText] = useState(amountToInput(transfer.amount));
  const [date, setDate] = useState(todayISO());
  const [submitted, setSubmitted] = useState(false);

  const amount = parseAmount(amountText);
  const error = !amount ? 'Enter an amount' : fromId === toId ? 'Pick two different people' : !date ? 'Pick a date' : null;
  const nameOf = (id: string) => trip.people.find((person) => person.id === id)?.name ?? '';
  const peopleOptions = trip.people.map((person) => ({ value: person.id, label: person.name }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (error || !amount) return;
    const settlement = { id: newId(), fromId, toId, amount, date, createdAt: Date.now() };
    apply(trip.id, { type: 'settlement/add', settlement });
    onClose();
    toast({
      message: `${nameOf(fromId)} paid ${nameOf(toId)} ${formatMoney(amount, trip.currency)}`,
      action: { label: 'Undo', run: () => apply(trip.id, { type: 'settlement/remove', id: settlement.id }) },
    });
  };

  return (
    <Sheet title="Record a payment" onClose={onClose} formId={formId}>
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
        <AmountInput value={amountText} onChange={setAmountText} currency={trip.currency} />
        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
          <FormRow label="Who paid" htmlFor={`${formId}-from`}>
            <SelectInput id={`${formId}-from`} value={fromId} onChange={setFromId} options={peopleOptions} />
          </FormRow>
          <FormRow label="To" htmlFor={`${formId}-to`}>
            <SelectInput id={`${formId}-to`} value={toId} onChange={setToId} options={peopleOptions} />
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
        <p className="px-1 text-sm text-zinc-500">
          {nameOf(transfer.fromId)} owes {nameOf(transfer.toId)} {formatMoney(transfer.amount, trip.currency)}. Lower the
          amount to record a partial payment.
        </p>
        {submitted && error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" className="w-full">
          Record payment
        </Button>
      </form>
    </Sheet>
  );
}
