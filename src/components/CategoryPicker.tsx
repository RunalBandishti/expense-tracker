import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CATEGORY_EMOJIS, MAX_CATEGORIES, tripCategories } from '../lib/categories';
import { newId } from '../lib/id';
import type { CategoryDef, Trip } from '../lib/types';
import { Button, cx, IconButton } from './ui';

type FormProps = {
  initial?: CategoryDef;
  /** Labels already used by other categories. */
  taken: string[];
  submitLabel: string;
  onSubmit: (label: string, emoji: string) => void;
  onCancel: () => void;
};

export function CategoryForm({ initial, taken, submitLabel, onSubmit, onCancel }: FormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? CATEGORY_EMOJIS[0]);
  const trimmed = label.trim();
  const duplicate = taken.some((name) => name.toLowerCase() === trimmed.toLowerCase());
  const submit = () => {
    if (trimmed && !duplicate) onSubmit(trimmed, emoji);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div role="radiogroup" aria-label="Category icon" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
        {CATEGORY_EMOJIS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === emoji}
            onClick={() => setEmoji(option)}
            className={cx(
              'grid size-9 shrink-0 place-items-center rounded-lg text-lg transition',
              option === emoji ? 'bg-zinc-900/10 ring-2 ring-zinc-900' : 'hover:bg-zinc-900/5',
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }
          }}
          maxLength={24}
          placeholder="Category name"
          aria-label="Category name"
          autoCapitalize="words"
          enterKeyHint="done"
          className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
        />
        <Button size="sm" onClick={submit} disabled={!trimmed || duplicate}>
          {submitLabel}
        </Button>
        <IconButton aria-label="Cancel" onClick={onCancel} className="size-8">
          <X className="size-4" />
        </IconButton>
      </div>
      {duplicate && <p className="mt-2 px-1 text-xs text-zinc-500">“{trimmed}” already exists.</p>}
    </div>
  );
}

type PickerProps = {
  trip: Trip;
  value: string;
  onChange: (id: string) => void;
  onCreate: (category: CategoryDef) => void;
};

export function CategoryPicker({ trip, value, onChange, onCreate }: PickerProps) {
  const [adding, setAdding] = useState(false);
  const categories = tripCategories(trip);

  return (
    <>
      <div role="radiogroup" aria-label="Category" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {categories.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onChange(option.id)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
              value === option.id
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
            )}
          >
            <span aria-hidden>{option.emoji}</span>
            {option.label}
          </button>
        ))}
        {categories.length < MAX_CATEGORIES && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
          >
            <Plus className="size-4" />
            New
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-2">
          <CategoryForm
            taken={categories.map((category) => category.label)}
            submitLabel="Add"
            onCancel={() => setAdding(false)}
            onSubmit={(label, emoji) => {
              const category = { id: newId(), label, emoji };
              onCreate(category);
              onChange(category.id);
              setAdding(false);
            }}
          />
        </div>
      )}
    </>
  );
}
