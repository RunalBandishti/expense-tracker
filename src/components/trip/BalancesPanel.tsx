import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CircleCheck, Link2, Pencil, QrCode, TriangleAlert, X } from 'lucide-react';
import { categoryOf } from '../../lib/categories';
import { formatShortDate, pluralize } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { categorySummaries, findPersonByName, isReservedName, type Transfer, type TripSummary } from '../../lib/split';
import { COMMON, type CategoryDef, type Person, type Trip } from '../../lib/types';
import { supportsUpi } from '../../lib/upi';
import { SavedPeopleSuggestions } from '../SavedPeopleSuggestions';
import { Avatar, Button, CategoryTile, cx, SectionLabel } from '../ui';
import { SettleCategoryMenu } from './SettleCategoryMenu';

type Props = {
  trip: Trip;
  summary: TripSummary;
  myPersonId?: string | null;
  onSettle?: (transfer: Transfer) => void;
  onSettleCategory?: (category: CategoryDef, transfers: Transfer[]) => void;
  onPay?: (transfer: Transfer) => void;
  onRequest?: (transfer: Transfer) => void;
  onShowQr?: (person: Person) => void;
  onRemoveSettlement?: (settlementId: string) => void;
  onEditPerson?: (person: Person) => void;
  onLinkPerson?: (person: Person) => void;
  onAddPerson?: (name: string) => void;
};

export function BalancesPanel({
  trip,
  summary,
  myPersonId,
  onSettle,
  onSettleCategory,
  onPay,
  onRequest,
  onShowQr,
  onRemoveSettlement,
  onEditPerson,
  onLinkPerson,
  onAddPerson,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const personOf = (id: string) => trip.people.find((person) => person.id === id);
  const nameOf = (id: string, startsSentence = false) =>
    id === myPersonId ? (startsSentence ? 'You' : 'you') : (personOf(id)?.name ?? 'Removed person');
  const hasPayers = summary.paidTotal > 0;
  const upiEnabled = supportsUpi(trip);
  const canAddUpi = !!onEditPerson;
  const byCategory = useMemo(() => categorySummaries(trip, summary), [trip, summary]);
  const showUncategorizedNote =
    trip.settlements.some((settlement) => !settlement.category) && byCategory.some(({ owed }) => owed.length > 0);

  const trimmed = newName.trim();
  const nameTaken = isReservedName(trimmed) || !!findPersonByName(trip.people, trimmed);
  const addPerson = () => {
    if (!trimmed || nameTaken || !onAddPerson) return;
    onAddPerson(trimmed);
    setNewName('');
  };

  return (
    <div className="space-y-8">
      <section aria-label="Settle up">
        <SectionLabel>Settle up</SectionLabel>
        {summary.unpaidCount > 0 && hasPayers && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {pluralize(summary.unpaidCount, 'expense has', 'expenses have')} no payer yet, so{' '}
            {summary.unpaidCount === 1 ? "it's" : "they're"} left out of settling up.
          </p>
        )}
        {!hasPayers ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-500">
            Set <span className="font-medium text-zinc-700">Paid by</span> on expenses to see who owes whom.
          </p>
        ) : summary.transfers.length === 0 ? (
          <p className="settled-banner sticker-sm flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-5 text-sm font-semibold text-emerald-700">
            <span className="settled-tada" aria-hidden>
              🎉
            </span>
            <CircleCheck className="size-5" />
            Everyone's settled up
          </p>
        ) : (
          <ul className="sticker-sm divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white">
            {summary.transfers.map((transfer) => {
              const from = personOf(transfer.fromId);
              const to = personOf(transfer.toId);
              // Without a known "me" (live view, or not picked yet) any viewer might be the payer.
              const canPay = upiEnabled && (!!to?.upiId || canAddUpi) && (myPersonId == null || transfer.fromId === myPersonId);
              const canRequest = upiEnabled && transfer.toId === myPersonId;
              return (
                <li key={`${transfer.fromId}-${transfer.toId}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="flex shrink-0 items-center gap-1">
                    {from && <Avatar person={from} size="sm" />}
                    <ArrowRight className="size-3.5 text-zinc-400" />
                    {to && <Avatar person={to} size="sm" />}
                  </div>
                  <div className="min-w-0 flex-1 basis-28">
                    <p className="truncate text-[15px] font-medium">
                      {nameOf(transfer.fromId, true)} {transfer.fromId === myPersonId ? 'pay' : 'pays'} {nameOf(transfer.toId)}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">{money(transfer.amount)}</p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    {onPay && canPay && (
                      <Button className="sticker-button" size="sm" onClick={() => onPay(transfer)}>
                        Pay
                      </Button>
                    )}
                    {onRequest && canRequest && (
                      <Button size="sm" variant="secondary" onClick={() => onRequest(transfer)}>
                        Request
                      </Button>
                    )}
                    {onSettle && (
                      <Button size="sm" variant="secondary" onClick={() => onSettle(transfer)}>
                        Settle
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {byCategory.length > 0 && (
        <section aria-label="By category">
          <SectionLabel>By category</SectionLabel>
          {showUncategorizedNote && (
            <p className="mb-3 px-1 text-xs text-zinc-500">Payments made from Settle up aren't tied to a category, so only the totals above include them.</p>
          )}
          <ul className="sticker-sm divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white">
            {byCategory.map(({ category, summary: categorySummary, owed }) => (
              <li key={category.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <CategoryTile emoji={category.emoji} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{category.label}</p>
                    <p className="text-xs tabular-nums text-zinc-500">{money(categorySummary.total)} spent</p>
                  </div>
                  {onSettleCategory && owed.length > 0 && (
                    <SettleCategoryMenu category={category} owed={owed} onSettle={onSettleCategory} />
                  )}
                </div>
                {owed.length === 0 ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <CircleCheck className="size-4" />
                    Settled
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {owed.map((transfer) => (
                      <li key={`${transfer.fromId}-${transfer.toId}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-zinc-600">
                          {nameOf(transfer.fromId, true)} {transfer.fromId === myPersonId ? 'pay' : 'pays'} {nameOf(transfer.toId)}
                        </span>
                        <span className="font-semibold tabular-nums">{money(transfer.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Balances">
        <SectionLabel>{hasPayers ? 'Balances' : "Each person's share"}</SectionLabel>
        {summary.unassigned > 0 && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {money(summary.unassigned)} of shared expenses isn't assigned to anyone yet.
          </p>
        )}
        {trip.people.length === 0 && (
          <p className="mb-3 px-1 text-sm text-zinc-500">Add the people in this event to split expenses between them.</p>
        )}
        <ul className="sticker-sm divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white">
          {summary.people.map(({ person, personal, shared, total, paid, balance, items }) => {
            const isOpen = expandedId === person.id;
            const linkedMember = trip.members.find((member) => member.personId === person.id);
            const detail = hasPayers
              ? `Share ${money(total)} · Paid ${money(paid)}`
              : [personal && `Personal ${money(personal)}`, shared && `Shared ${money(shared)}`].filter(Boolean).join(' · ') ||
              'No expenses yet';
            return (
              <li key={person.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : person.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
                >
                  <Avatar person={person} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {person.name}
                      {person.id === myPersonId && <span className="font-normal text-zinc-400"> (you)</span>}
                    </p>
                    <p className="truncate text-xs tabular-nums text-zinc-500">{detail}</p>
                  </div>
                  {hasPayers ? (
                    <div className="text-right">
                      <p
                        className={cx(
                          'text-[15px] font-semibold tabular-nums',
                          balance > 0 ? 'text-emerald-700' : balance < 0 ? 'text-red-600' : 'text-zinc-400',
                        )}
                      >
                        {balance === 0 ? 'Settled' : `${balance > 0 ? '+' : '−'}${money(Math.abs(balance))}`}
                      </p>
                      {balance !== 0 && <p className="text-[11px] text-zinc-500">{balance > 0 ? 'gets back' : 'owes'}</p>}
                    </div>
                  ) : (
                    <p className="text-[15px] font-semibold tabular-nums">{money(total)}</p>
                  )}
                  <ChevronDown className={cx('size-4 shrink-0 text-zinc-400 transition', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-100 bg-zinc-50/70 px-4 pb-3 pt-2">
                    <ul>
                      {[...items]
                        .sort((a, b) => a.expense.date.localeCompare(b.expense.date))
                        .map(({ expense, share, splitCount }) => (
                          <li key={expense.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                            <span className="min-w-0 truncate text-zinc-700">
                              {expense.title}
                              <span className="text-zinc-400">
                                {' · '}
                                {formatShortDate(expense.date)}
                                {expense.forId === COMMON && ` · split ${splitCount} ways`}
                              </span>
                            </span>
                            <span className="tabular-nums text-zinc-600">{money(share)}</span>
                          </li>
                        ))}
                    </ul>
                    {upiEnabled && person.upiId && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white py-1.5 pl-3 pr-1.5 text-sm ring-1 ring-zinc-200">
                        <span className="min-w-0 truncate">
                          <span className="text-zinc-500">UPI </span>
                          <span className="font-mono">{person.upiId}</span>
                        </span>
                        {onShowQr && (
                          <Button size="sm" variant="ghost" onClick={() => onShowQr(person)}>
                            <QrCode className="size-3.5" />
                            QR
                          </Button>
                        )}
                      </div>
                    )}
                    {upiEnabled && !person.upiId && onEditPerson && (
                      <button
                        type="button"
                        onClick={() => onEditPerson(person)}
                        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                      >
                        <span className="text-zinc-500">UPI ID not added</span>
                        <span className="font-medium text-emerald-700">Add</span>
                      </button>
                    )}
                    {linkedMember ? (
                      <p className="mt-2 flex items-center gap-1.5 px-1 text-sm text-zinc-500">
                        <Link2 className="size-3.5" />
                        Linked to @{linkedMember.username}
                      </p>
                    ) : (
                      onLinkPerson && (
                        <button
                          type="button"
                          onClick={() => onLinkPerson(person)}
                          className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                        >
                          <span className="text-zinc-500">Not linked to an account</span>
                          <span className="font-medium text-emerald-700">Link account</span>
                        </button>
                      )
                    )}
                    {onEditPerson && (
                      <button
                        type="button"
                        onClick={() => onEditPerson(person)}
                        className="mt-1.5 inline-flex items-center gap-1.5 py-1 text-sm font-medium text-emerald-700 hover:underline"
                      >
                        <Pencil className="size-3.5" />
                        Rename or remove {person.name}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {onAddPerson && (
            <li className="flex items-center gap-2 px-3 py-2.5">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addPerson();
                }}
                placeholder="Add a person"
                aria-label="New person's name"
                autoCapitalize="words"
                enterKeyHint="done"
                maxLength={40}
                className="h-10 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 text-base outline-none focus:ring-2 focus:ring-emerald-600/70"
              />
              <Button size="sm" onClick={addPerson} disabled={!trimmed || nameTaken}>
                Add
              </Button>
            </li>
          )}
        </ul>
        {onAddPerson && (
          <SavedPeopleSuggestions
            query={newName}
            exclude={trip.people}
            onPick={(name) => {
              onAddPerson(name);
              setNewName('');
            }}
          />
        )}
        {nameTaken && trimmed && <p className="mt-2 px-1 text-xs text-zinc-500">“{trimmed}” is already in this event.</p>}
        {trip.expenses.length > 0 && (
          <dl className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-sm tabular-nums">
            <div className="flex gap-1.5">
              <dt className="text-zinc-500">Shared</dt>
              <dd className="font-medium">{money(summary.sharedTotal)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-zinc-500">Personal</dt>
              <dd className="font-medium">{money(summary.personalTotal)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-zinc-500">Total</dt>
              <dd className="font-semibold">{money(summary.total)}</dd>
            </div>
          </dl>
        )}
      </section>

      {trip.settlements.length > 0 && (
        <section aria-label="Payments">
          <SectionLabel>Payments</SectionLabel>
          <ul className="sticker-sm divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white">
            {[...trip.settlements]
              .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
              .map((settlement) => (
                <li key={settlement.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">
                      {nameOf(settlement.fromId, true)} paid {nameOf(settlement.toId)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatShortDate(settlement.date)}
                      {settlement.method === 'upi' && ' · UPI'}
                      {settlement.category && ` · ${categoryOf(trip, settlement.category).label}`}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums">{money(settlement.amount)}</p>
                  {onRemoveSettlement && (
                    <button
                      type="button"
                      aria-label="Delete payment"
                      onClick={() => onRemoveSettlement(settlement.id)}
                      className="grid size-8 place-items-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
