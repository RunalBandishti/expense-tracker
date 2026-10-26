import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ChevronLeft, Ellipsis, FileDown, LoaderCircle, LogOut, Pencil, Plus, Share2, Tags, Trash, UserRound } from 'lucide-react';
import { CategoriesSheet } from '../components/CategoriesSheet';
import { ClaimSheet } from '../components/ClaimSheet';
import { ExpenseSheet } from '../components/ExpenseSheet';
import { PersonSheet } from '../components/PersonSheet';
import { ReminderPrompt } from '../components/ReminderPrompt';
import { SettlementSheet } from '../components/SettlementSheet';
import { ShareSheet } from '../components/ShareSheet';
import { TripSheet } from '../components/TripSheet';
import { UpiPaySheet } from '../components/UpiPay';
import { BalancesPanel } from '../components/trip/BalancesPanel';
import { BudgetPanel } from '../components/trip/BudgetPanel';
import { ExpensesPanel } from '../components/trip/ExpensesPanel';
import { InsightsPanel } from '../components/trip/InsightsPanel';
import { Button, EmptyState, Menu, PageLoader, SegmentedControl, SyncBadge } from '../components/ui';
import { formatDateRange, pluralize, todayISO, tripTiming } from '../lib/dates';
import { newId } from '../lib/id';
import { formatMoney } from '../lib/money';
import { canNativeShare, nativeShare, whatsappUrl } from '../lib/share';
import { peopleLabel, summarizeTrip, type Transfer } from '../lib/split';
import type { Expense, Person, Trip } from '../lib/types';
import { payPageUrl, personPayment, transferPayment, type UpiPayment } from '../lib/upi';
import { useIsDesktop } from '../lib/useMediaQuery';
import { useToast } from '../state/toast';
import { useTrips } from '../state/trips';

const LIVE_REFRESH_MS = 15_000;

type Tab = 'expenses' | 'balances' | 'insights';

type OpenSheet =
  | { kind: 'expense'; expense?: Expense }
  | { kind: 'trip' }
  | { kind: 'person'; person: Person; focusUpi?: boolean }
  | { kind: 'settle'; transfer: Transfer }
  | { kind: 'upi'; payment: UpiPayment; transfer?: Transfer }
  | { kind: 'share' }
  | { kind: 'claim' }
  | { kind: 'categories' }
  | null;

export function TripPage() {
  const { tripId } = useParams();
  const { trips, loading } = useTrips();
  const navigate = useNavigate();
  const trip = trips.find((candidate) => candidate.id === tripId);

  if (loading) return <PageLoader />;
  if (!trip) {
    return (
      <div className="mx-auto max-w-md px-5 pt-24">
        <EmptyState
          emoji="🔍"
          title="Event not found"
          body="It may have been deleted, or you no longer have access."
          action={<Button onClick={() => navigate('/')}>Back to events</Button>}
        />
      </div>
    );
  }
  return <TripView key={trip.id} trip={trip} />;
}

function TripView({ trip }: { trip: Trip }) {
  const { user, syncStatus, pendingCount, apply, removeTrip, refreshTrip } = useTrips();
  const navigate = useNavigate();
  const toast = useToast();
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('expenses');
  const [sheet, setSheet] = useState<OpenSheet>(() => (searchParams.has('add') ? { kind: 'expense' } : null));
  const [exporting, setExporting] = useState(false);

  const summary = useMemo(() => summarizeTrip(trip), [trip]);
  const timing = tripTiming(trip.startDate, trip.endDate);
  const me = trip.members.find((member) => member.userId === user.id);
  const isOwner = trip.ownerId === user.id;
  const isShared = trip.members.length > 1;
  // An open invite means someone may join and edit before this copy knows they're a member.
  const refreshesLive = isShared || !!trip.inviteToken;
  const close = () => setSheet(null);
  const meta = [
    trip.startDate && trip.endDate && formatDateRange(trip.startDate, trip.endDate),
    timing.kind !== 'undated' && pluralize(timing.totalDays, 'day'),
    peopleLabel(trip.people.length),
    isShared && `${trip.members.length} members`,
  ]
    .filter(Boolean)
    .join(' · ');

  useEffect(() => {
    if (searchParams.has('add')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!refreshesLive) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refreshTrip(trip.id);
    };
    const timer = window.setInterval(tick, LIVE_REFRESH_MS);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [refreshesLive, trip.id, refreshTrip]);

  const handleExport = async () => {
    if (trip.expenses.length === 0) {
      toast({ message: 'Add an expense before exporting' });
      return;
    }
    setExporting(true);
    try {
      const { exportTripPdf } = await import('../lib/pdf');
      await exportTripPdf(trip);
    } catch (err) {
      console.error(err);
      toast({ message: "Couldn't create the PDF. Please try again.", tone: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleRemove = () => {
    const question = isOwner
      ? `Delete “${trip.name}” and all of its expenses for everyone? This can't be undone.`
      : `Leave “${trip.name}”? You'll need a new invite to rejoin.`;
    if (!window.confirm(question)) return;
    removeTrip(trip.id);
    navigate('/', { replace: true });
    toast({ message: isOwner ? `Deleted “${trip.name}”` : `Left “${trip.name}”` });
  };

  const deleteExpense = (expense: Expense) => {
    apply(trip.id, { type: 'expense/remove', id: expense.id });
    toast({
      message: `Deleted “${expense.title}”`,
      action: { label: 'Undo', run: () => apply(trip.id, { type: 'expense/upsert', expense }) },
    });
  };

  const nameOf = (id: string) => trip.people.find((person) => person.id === id)?.name ?? '';

  const markPaidByUpi = (transfer: Transfer) => {
    const settlement = { ...transfer, id: newId(), date: todayISO(), method: 'upi' as const, createdAt: Date.now() };
    apply(trip.id, { type: 'settlement/add', settlement });
    toast({
      message: `Recorded ${formatMoney(transfer.amount, trip.currency)} UPI payment to ${nameOf(transfer.toId)}`,
      action: { label: 'Undo', run: () => apply(trip.id, { type: 'settlement/remove', id: settlement.id }) },
    });
  };

  const openPay = (transfer: Transfer) => {
    const payment = transferPayment(trip, transfer);
    const payee = trip.people.find((person) => person.id === transfer.toId);
    if (payment) setSheet({ kind: 'upi', payment, transfer });
    else if (payee) setSheet({ kind: 'person', person: payee, focusUpi: true });
  };

  const requestPayment = async (transfer: Transfer) => {
    const payee = trip.people.find((person) => person.id === transfer.toId);
    if (!payee) return;
    const payment = personPayment(trip, payee, transfer.amount);
    if (!payment) {
      setSheet({ kind: 'person', person: payee, focusUpi: true });
      return;
    }
    const text = `Hi ${nameOf(transfer.fromId)}! Please pay ${formatMoney(transfer.amount, trip.currency)} for ${trip.name}.\nPay with UPI: ${payPageUrl(window.location.origin, payment)}`;
    const shared = canNativeShare() && (await nativeShare({ text }));
    if (!shared) window.open(whatsappUrl(text), '_blank', 'noopener');
  };

  const showQr = (person: Person) => {
    const payment = personPayment(trip, person);
    if (payment) setSheet({ kind: 'upi', payment });
  };

  const removeSettlement = (settlementId: string) => {
    const settlement = trip.settlements.find((candidate) => candidate.id === settlementId);
    if (!settlement) return;
    apply(trip.id, { type: 'settlement/remove', id: settlementId });
    toast({ message: 'Payment deleted', action: { label: 'Undo', run: () => apply(trip.id, { type: 'settlement/add', settlement }) } });
  };

  const budgetPanel = (
    <BudgetPanel trip={trip} total={summary.total} timing={timing} onSetBudget={() => setSheet({ kind: 'trip' })} />
  );
  const balancesPanel = (
    <BalancesPanel
      trip={trip}
      summary={summary}
      myPersonId={me?.personId}
      onSettle={(transfer) => setSheet({ kind: 'settle', transfer })}
      onPay={openPay}
      onRequest={(transfer) => void requestPayment(transfer)}
      onShowQr={showQr}
      onRemoveSettlement={removeSettlement}
      onEditPerson={(person) => setSheet({ kind: 'person', person })}
      onAddPerson={(name) => apply(trip.id, { type: 'person/add', person: { id: newId(), name } })}
    />
  );
  const expensesPanel = (
    <ExpensesPanel
      trip={trip}
      onAdd={() => setSheet({ kind: 'expense' })}
      onOpen={(expense) => setSheet({ kind: 'expense', expense })}
      onDelete={deleteExpense}
    />
  );
  const insightsPanel = <InsightsPanel trip={trip} onManageCategories={() => setSheet({ kind: 'categories' })} />;
  const expenseCount = trip.expenses.length ? `Expenses (${trip.expenses.length})` : 'Expenses';
  const desktopTab = tab === 'insights' ? 'insights' : 'expenses';
  const upiTransfer = sheet?.kind === 'upi' ? sheet.transfer : undefined;

  const reminderPrompt = (timing.kind === 'upcoming' || timing.kind === 'ongoing') && <ReminderPrompt />;

  const claimPrompt = me && me.personId === undefined && trip.people.length > 0 && (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <UserRound className="size-5 shrink-0 text-emerald-700" />
      <p className="min-w-0 flex-1 text-sm text-emerald-800">Which person are you? Balances will then show what you owe.</p>
      <Button size="sm" onClick={() => setSheet({ kind: 'claim' })}>
        Choose
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pb-36 pt-[calc(env(safe-area-inset-top)+1rem)] lg:px-10 lg:pb-16 lg:pt-8">
      <div className="flex items-center justify-between gap-2">
        {isDesktop ? (
          <span />
        ) : (
          <Link
            to="/"
            className="-ml-2 flex items-center gap-0.5 rounded-full px-2 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            <ChevronLeft className="size-4" />
            Events
          </Link>
        )}
        <div className="flex items-center gap-2">
          {!isDesktop && syncStatus !== 'saved' && <SyncBadge status={syncStatus} pendingCount={pendingCount} />}
          <Button variant="secondary" size="sm" onClick={() => setSheet({ kind: 'share' })}>
            <Share2 className="size-3.5" />
            Share
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting} aria-label="Export PDF">
            {exporting ? <LoaderCircle className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          {isDesktop && (
            <Button size="sm" onClick={() => setSheet({ kind: 'expense' })}>
              <Plus className="size-3.5" />
              Add expense
            </Button>
          )}
          <Menu
            label="Event options"
            items={[
              { label: 'Edit event', icon: <Pencil className="size-4" />, onSelect: () => setSheet({ kind: 'trip' }) },
              { label: 'Categories', icon: <Tags className="size-4" />, onSelect: () => setSheet({ kind: 'categories' }) },
              { label: 'Who are you?', icon: <UserRound className="size-4" />, onSelect: () => setSheet({ kind: 'claim' }) },
              isOwner
                ? { label: 'Delete event', icon: <Trash className="size-4" />, danger: true, onSelect: handleRemove }
                : { label: 'Leave event', icon: <LogOut className="size-4" />, danger: true, onSelect: handleRemove },
            ]}
            triggerClassName="grid size-8 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50"
          >
            <Ellipsis className="size-4" />
          </Menu>
        </div>
      </div>

      <header className="mt-5 flex items-center gap-3.5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-zinc-200">
          {trip.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight lg:text-[28px]">{trip.name}</h1>
          <p className="truncate text-sm text-zinc-500">{meta}</p>
        </div>
      </header>

      {isDesktop ? (
        <div className="mt-8 space-y-8">
          {claimPrompt}
          {reminderPrompt}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start gap-10">
            <div className="space-y-10">
              {budgetPanel}
              {balancesPanel}
            </div>
            <div className="space-y-5">
              <SegmentedControl
                value={desktopTab}
                onChange={setTab}
                options={[
                  { value: 'expenses', label: expenseCount },
                  { value: 'insights', label: 'Insights' },
                ]}
              />
              {desktopTab === 'insights' ? insightsPanel : expensesPanel}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {claimPrompt}
          {reminderPrompt}
          {budgetPanel}
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'expenses', label: expenseCount },
              { value: 'balances', label: 'Balances' },
              { value: 'insights', label: 'Insights' },
            ]}
          />
          {tab === 'expenses' ? expensesPanel : tab === 'balances' ? balancesPanel : insightsPanel}
        </div>
      )}

      {!isDesktop && (
        <button
          type="button"
          aria-label="Add expense"
          onClick={() => setSheet({ kind: 'expense' })}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-5 z-20 grid size-14 place-items-center rounded-full bg-zinc-900 text-white shadow-xl shadow-black/25 transition active:scale-95"
        >
          <Plus className="size-6" />
        </button>
      )}

      {sheet?.kind === 'expense' && (
        <ExpenseSheet trip={trip} expense={sheet.expense} myPersonId={me?.personId} onDelete={deleteExpense} onClose={close} />
      )}
      {sheet?.kind === 'categories' && <CategoriesSheet trip={trip} onClose={close} />}
      {sheet?.kind === 'trip' && <TripSheet trip={trip} onClose={close} />}
      {sheet?.kind === 'person' && <PersonSheet trip={trip} person={sheet.person} focusUpi={sheet.focusUpi} onClose={close} />}
      {sheet?.kind === 'upi' && (
        <UpiPaySheet
          payment={sheet.payment}
          onMarkPaid={upiTransfer && (() => markPaidByUpi(upiTransfer))}
          onClose={close}
        />
      )}
      {sheet?.kind === 'settle' && <SettlementSheet trip={trip} transfer={sheet.transfer} onClose={close} />}
      {sheet?.kind === 'share' && <ShareSheet trip={trip} onClose={close} onChooseIdentity={() => setSheet({ kind: 'claim' })} />}
      {sheet?.kind === 'claim' && <ClaimSheet trip={trip} onClose={close} />}
    </div>
  );
}
