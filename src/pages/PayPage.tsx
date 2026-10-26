import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { UpiPayPanel } from '../components/UpiPay';
import { EmptyState, Logo } from '../components/ui';
import { parsePayPage } from '../lib/upi';

export function PayPage() {
  const { search } = useLocation();
  const payment = useMemo(() => parsePayPage(search), [search]);

  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
        <Logo className="size-7" />
        Expense Manager
      </Link>
      {payment ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
          <h1 className="mb-4 text-center text-lg font-semibold">Pay {payment.name}</h1>
          <UpiPayPanel payment={payment} />
        </div>
      ) : (
        <div className="mt-16">
          <EmptyState emoji="🔗" title="This payment link isn't valid" body="Ask for a new link, or pay using their UPI ID directly." />
        </div>
      )}
    </div>
  );
}
