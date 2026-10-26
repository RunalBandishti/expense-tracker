import { useState } from 'react';
import { Pencil, Plus, Trash } from 'lucide-react';
import { categoryIdOf, categoryOf, MAX_CATEGORIES, OTHER_CATEGORY, tripCategories } from '../lib/categories';
import { pluralize } from '../lib/dates';
import { newId } from '../lib/id';
import type { Op } from '../lib/ops';
import type { CategoryDef, Trip } from '../lib/types';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';
import { CategoryForm } from './CategoryPicker';
import { Button, CategoryTile, IconButton, Sheet } from './ui';

export function CategoriesSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { apply } = useTrips();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const categories = tripCategories(trip);
  const otherLabel = categoryOf(trip, OTHER_CATEGORY).label;
  const counts = new Map<string, number>();
  for (const expense of trip.expenses) {
    const id = categoryIdOf(trip, expense.category);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const labelsExcept = (id?: string) => categories.filter((category) => category.id !== id).map((category) => category.label);

  const remove = (category: CategoryDef, deleteExpenses: boolean) => {
    const index = categories.findIndex((candidate) => candidate.id === category.id);
    const affected = trip.expenses.filter((expense) => expense.category === category.id);
    apply(trip.id, { type: 'category/remove', id: category.id, deleteExpenses });
    setConfirmingId(null);
    const restore: Op[] = [
      { type: 'category/add', category, index },
      ...affected.map((expense): Op => ({ type: 'expense/upsert', expense })),
    ];
    toast({
      message:
        deleteExpenses && affected.length
          ? `Deleted ${category.label} and ${pluralize(affected.length, 'expense')}`
          : `Deleted ${category.label}`,
      action: { label: 'Undo', run: () => apply(trip.id, ...restore) },
    });
  };

  return (
    <Sheet title="Categories" onClose={onClose} cancelLabel="Done">
      <p className="px-1 text-sm text-zinc-500">Rename, add or delete the categories used on this trip.</p>
      <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {categories.map((category) => {
          const count = counts.get(category.id) ?? 0;
          if (editingId === category.id) {
            return (
              <li key={category.id} className="p-2">
                <CategoryForm
                  initial={category}
                  taken={labelsExcept(category.id)}
                  submitLabel="Save"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(label, emoji) => {
                    apply(trip.id, { type: 'category/update', category: { ...category, label, emoji } });
                    setEditingId(null);
                  }}
                />
              </li>
            );
          }
          return (
            <li key={category.id}>
              <div className="flex items-center gap-3 py-2.5 pl-4 pr-2">
                <CategoryTile emoji={category.emoji} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{category.label}</p>
                  <p className="text-xs text-zinc-500">{pluralize(count, 'expense')}</p>
                </div>
                <IconButton
                  aria-label={`Rename ${category.label}`}
                  onClick={() => {
                    setEditingId(category.id);
                    setConfirmingId(null);
                  }}
                  className="size-9"
                >
                  <Pencil className="size-4" />
                </IconButton>
                {category.id !== OTHER_CATEGORY && (
                  <IconButton
                    aria-label={`Delete ${category.label}`}
                    onClick={() => (count ? setConfirmingId(category.id) : remove(category, false))}
                    className="size-9 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="size-4" />
                  </IconButton>
                )}
              </div>
              {confirmingId === category.id && (
                <div className="border-t border-zinc-100 bg-zinc-50/70 px-4 py-3">
                  <p className="text-sm text-zinc-700">
                    {category.label} has {pluralize(count, 'expense')}. What should happen to {count === 1 ? 'it' : 'them'}?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => remove(category, false)}>
                      Move to {otherLabel}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(category, true)}>
                      <Trash className="size-3.5" />
                      Delete {count === 1 ? 'it' : `all ${count}`}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3">
        {editingId === 'new' ? (
          <CategoryForm
            taken={labelsExcept()}
            submitLabel="Add"
            onCancel={() => setEditingId(null)}
            onSubmit={(label, emoji) => {
              apply(trip.id, { type: 'category/add', category: { id: newId(), label, emoji } });
              setEditingId(null);
            }}
          />
        ) : (
          categories.length < MAX_CATEGORIES && (
            <Button variant="secondary" className="w-full" onClick={() => setEditingId('new')}>
              <Plus className="size-4" />
              Add category
            </Button>
          )
        )}
      </div>
      <p className="mt-4 px-1 text-xs text-zinc-500">
        {otherLabel} can't be deleted: expenses from deleted categories move there.
      </p>
    </Sheet>
  );
}
