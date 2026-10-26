import { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { amountToInput, currencySymbol, formatMoney, parseAmount, sanitizeAmountInput } from '../lib/money';
import { allocate, expenseShares, findPersonByName, isReservedName } from '../lib/split';
import { COMMON, type Person, type Split } from '../lib/types';
import { Avatar, Button, cx, SegmentedControl } from './ui';

type Mode = 'equal' | 'shares' | 'percent' | 'exact';

const MODES: { value: Mode; label: string }[] = [
  { value: 'equal', label: 'Equally' },
  { value: 'shares', label: 'Shares' },
  { value: 'percent', label: '%' },
  { value: 'exact', label: 'Amounts' },
];

const modeOf = (split: Split): Mode => (split.mode === 'all' || split.mode === 'custom' ? 'equal' : split.mode);
const round2 = (value: number) => Math.round(value * 100) / 100;

function valueOf(split: Split, personId: string) {
  switch (split.mode) {
    case 'shares':
      return split.weights[personId] ?? 0;
    case 'percent':
      return split.percents[personId] ?? 0;
    case 'exact':
      return split.amounts[personId] ?? 0;
    default:
      return 0;
  }
}

function includedIds(split: Split, people: Person[]) {
  if (split.mode === 'all') return people.map((person) => person.id);
  if (split.mode === 'custom') return people.filter((person) => split.personIds.includes(person.id)).map((person) => person.id);
  return people.filter((person) => valueOf(split, person.id) > 0).map((person) => person.id);
}

function convertSplit(split: Split, mode: Mode, people: Person[], amount: number | null): Split {
  const current = includedIds(split, people);
  const ids = current.length ? current : people.map((person) => person.id);
  const evenly = (total: number) => allocate(total, ids.map(() => 1));
  switch (mode) {
    case 'equal':
      return ids.length === people.length ? { mode: 'all' } : { mode: 'custom', personIds: ids };
    case 'shares':
      return { mode: 'shares', weights: Object.fromEntries(ids.map((id) => [id, 1])) };
    case 'percent': {
      const basisPoints = evenly(10_000);
      return { mode: 'percent', percents: Object.fromEntries(ids.map((id, index) => [id, basisPoints[index] / 100])) };
    }
    case 'exact': {
      const parts = amount ? evenly(amount) : ids.map(() => 0);
      return { mode: 'exact', amounts: Object.fromEntries(ids.map((id, index) => [id, parts[index]])) };
    }
  }
}

function withValue(split: Split, personId: string, value: number): Split {
  switch (split.mode) {
    case 'shares':
      return { mode: 'shares', weights: { ...split.weights, [personId]: value } };
    case 'percent':
      return { mode: 'percent', percents: { ...split.percents, [personId]: value } };
    case 'exact':
      return { mode: 'exact', amounts: { ...split.amounts, [personId]: value } };
    default:
      return split;
  }
}

function NumberCell({
  value,
  format,
  parse,
  label,
  prefix,
  suffix,
  onChange,
}: {
  value: number;
  format: (value: number) => string;
  parse: (text: string) => number;
  label: string;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(() => format(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(format(value));
  }, [value, editing, format]);

  return (
    <span className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2 focus-within:ring-2 focus-within:ring-emerald-600/70">
      {prefix && <span className="text-sm text-zinc-400">{prefix}</span>}
      <input
        inputMode="decimal"
        aria-label={label}
        value={text}
        placeholder="0"
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(event) => {
          const next = sanitizeAmountInput(event.target.value);
          setText(next);
          onChange(parse(next));
        }}
        className="h-9 w-16 bg-transparent text-right text-base tabular-nums outline-none placeholder:text-zinc-400"
      />
      {suffix && <span className="text-sm text-zinc-400">{suffix}</span>}
    </span>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'grid size-5 shrink-0 place-items-center rounded-md border transition',
        checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 bg-white',
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

const formatShares = (value: number) => String(round2(value));
const formatPercent = (value: number) => String(round2(value));
const formatExact = (value: number) => (value ? amountToInput(value) : '');
const parseShares = (text: string) => Math.min(Number(text) || 0, 1000);
const parsePercent = (text: string) => Math.min(Number(text) || 0, 100);
const parseExact = (text: string) => parseAmount(text) ?? 0;

type Props = {
  people: Person[];
  split: Split;
  amount: number | null;
  currency: string;
  onChange: (split: Split) => void;
  onAddPerson: (name: string) => string;
};

export function SplitPicker({ people, split, amount, currency, onChange, onAddPerson }: Props) {
  const [adding, setAdding] = useState(people.length === 0);
  const [newName, setNewName] = useState('');
  const mode = modeOf(split);
  const shares = expenseShares({ amount: amount ?? 0, forId: COMMON, split }, people);
  const selectedIds = includedIds(split, people);
  const allSelected = people.length > 0 && selectedIds.length === people.length;

  const setEqual = (ids: string[]) => {
    const ordered = people.filter((person) => ids.includes(person.id)).map((person) => person.id);
    onChange(ordered.length === people.length ? { mode: 'all' } : { mode: 'custom', personIds: ordered });
  };

  const addPerson = () => {
    const name = newName.trim();
    if (!name || isReservedName(name)) return;
    const existing = findPersonByName(people, name);
    const id = existing?.id ?? onAddPerson(name);
    if (split.mode === 'custom' && !split.personIds.includes(id)) onChange({ mode: 'custom', personIds: [...split.personIds, id] });
    if (split.mode === 'shares' && !existing) onChange(withValue(split, id, 1));
    setNewName('');
  };

  const assignedPercent = people.reduce((sum, person) => sum + (split.mode === 'percent' ? valueOf(split, person.id) : 0), 0);
  const assignedAmount = people.reduce((sum, person) => sum + (split.mode === 'exact' ? valueOf(split, person.id) : 0), 0);
  const status =
    mode === 'percent'
      ? Math.abs(100 - assignedPercent) < 0.005
        ? { ok: true, text: 'Adds up to 100%' }
        : { ok: false, text: `${round2(Math.abs(100 - assignedPercent))}% ${assignedPercent < 100 ? 'left to assign' : 'too much'}` }
      : mode === 'exact' && amount
        ? assignedAmount === amount
          ? { ok: true, text: `All ${formatMoney(amount, currency)} assigned` }
          : {
              ok: false,
              text: `${formatMoney(Math.abs(amount - assignedAmount), currency)} ${assignedAmount < amount ? 'left to assign' : 'too much'}`,
            }
        : null;

  return (
    <div className="space-y-2">
      {people.length > 0 && (
        <SegmentedControl value={mode} options={MODES} onChange={(next) => onChange(convertSplit(split, next, people, amount))} />
      )}
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {mode === 'equal' && people.length > 0 && (
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected}
            onClick={() => onChange(allSelected ? { mode: 'custom', personIds: [] } : { mode: 'all' })}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
          >
            <Checkbox checked={allSelected} />
            <span className="flex-1 text-[15px] font-semibold">All people</span>
            <span className="text-sm text-zinc-400">{people.length}</span>
          </button>
        )}

        {people.map((person) => {
          const share = shares.get(person.id);
          const shareText = share && amount ? formatMoney(share, currency) : '—';
          if (mode === 'equal') {
            const checked = selectedIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() =>
                  setEqual(checked ? selectedIds.filter((id) => id !== person.id) : [...selectedIds, person.id])
                }
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-50"
              >
                <Checkbox checked={checked} />
                <Avatar person={person} size="sm" />
                <span className={cx('min-w-0 flex-1 truncate text-[15px]', !checked && 'text-zinc-400')}>{person.name}</span>
                <span className="text-sm tabular-nums text-zinc-500">{checked ? shareText : '—'}</span>
              </button>
            );
          }
          const value = valueOf(split, person.id);
          return (
            <div key={person.id} className="flex items-center gap-3 px-4 py-2">
              <Avatar person={person} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={cx('truncate text-[15px]', !value && 'text-zinc-400')}>{person.name}</p>
                {mode !== 'exact' && <p className="text-xs tabular-nums text-zinc-500">{shareText}</p>}
              </div>
              {mode === 'shares' && (
                <button
                  type="button"
                  aria-label={`One share less for ${person.name}`}
                  onClick={() => onChange(withValue(split, person.id, Math.max(0, value - 1)))}
                  className="grid size-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100"
                >
                  <Minus className="size-4" />
                </button>
              )}
              <NumberCell
                value={value}
                label={`${person.name}'s ${mode === 'shares' ? 'shares' : mode === 'percent' ? 'percentage' : 'amount'}`}
                format={mode === 'shares' ? formatShares : mode === 'percent' ? formatPercent : formatExact}
                parse={mode === 'shares' ? parseShares : mode === 'percent' ? parsePercent : parseExact}
                prefix={mode === 'exact' ? currencySymbol(currency) : undefined}
                suffix={mode === 'percent' ? '%' : undefined}
                onChange={(next) => onChange(withValue(split, person.id, next))}
              />
              {mode === 'shares' && (
                <button
                  type="button"
                  aria-label={`One more share for ${person.name}`}
                  onClick={() => onChange(withValue(split, person.id, value + 1))}
                  className="grid size-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
          );
        })}

        {adding ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              autoFocus={people.length > 0}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addPerson();
                }
              }}
              placeholder={people.length ? 'Name' : 'Add the people on this trip'}
              aria-label="New person's name"
              autoCapitalize="words"
              enterKeyHint="done"
              className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
            />
            <Button size="sm" onClick={addPerson} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-emerald-700 transition hover:bg-emerald-50/60"
          >
            <Plus className="size-5" />
            Add person
          </button>
        )}
      </div>
      {status && (
        <p className={cx('px-1 text-xs font-medium tabular-nums', status.ok ? 'text-emerald-700' : 'text-amber-800')}>
          {status.text}
        </p>
      )}
    </div>
  );
}
