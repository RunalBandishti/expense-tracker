import type { Expense, Trip } from '../lib/types';
import { ExpenseDays } from './trip/ExpensesPanel';
import { Button, Sheet } from './ui';

type Props = { trip: Trip; onRestore: (expenses: Expense[]) => void; onClose: () => void };

export function ArchivedSheet({ trip, onRestore, onClose }: Props) {
  const archived = trip.archivedExpenses ?? [];
  return (
    <Sheet title="Archived" onClose={onClose} cancelLabel="Done">
      {archived.length > 0 ? (
        <>
          <p className="mb-5 px-1 text-sm text-zinc-500">Archived expenses are left out of totals and balances until you restore them.</p>
          <ExpenseDays
            trip={trip}
            expenses={archived}
            dayAction={(expenses) => (
              <button type="button" onClick={() => onRestore(expenses)} className="text-xs font-semibold text-emerald-700 hover:underline">
                Restore day
              </button>
            )}
            rowAction={(expense) => (
              <Button size="sm" variant="secondary" className="mr-3" aria-label={`Restore ${expense.title}`} onClick={() => onRestore([expense])}>
                Restore
              </Button>
            )}
          />
        </>
      ) : (
        <p className="py-12 text-center text-sm text-zinc-500">Nothing archived.</p>
      )}
    </Sheet>
  );
}
