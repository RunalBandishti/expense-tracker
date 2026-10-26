import { useState } from 'react';
import { Copy, QrCode, TriangleAlert } from 'lucide-react';
import { formatMoney } from '../lib/money';
import { copyText } from '../lib/share';
import { UPI_APPS, UPI_LIMIT, upiLink, type UpiPayment } from '../lib/upi';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useToast } from '../state/toast';
import { UpiQr } from './UpiQr';
import { Button, Sheet } from './ui';

export function UpiPayPanel({ payment, onLaunch }: { payment: UpiPayment; onLaunch?: () => void }) {
  const toast = useToast();
  const isTouch = useMediaQuery('(pointer: coarse)');
  const [showQr, setShowQr] = useState(!isTouch);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-[40px] font-semibold leading-tight tracking-tight tabular-nums">
          {payment.amount ? formatMoney(payment.amount, 'INR') : 'Any amount'}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          to <span className="font-medium text-zinc-900">{payment.name}</span>
        </p>
        <button
          type="button"
          onClick={() => copyText(payment.upiId).then(() => toast({ message: 'UPI ID copied' }))}
          className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 font-mono text-sm text-zinc-700 transition hover:bg-zinc-200/70"
        >
          <span className="truncate">{payment.upiId}</span>
          <Copy className="size-3.5 shrink-0 text-zinc-400" />
        </button>
        {payment.note && <p className="mt-2 text-xs text-zinc-500">Note: {payment.note}</p>}
      </div>

      {(payment.amount ?? 0) > UPI_LIMIT && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          UPI apps usually allow up to ₹1,00,000 per payment. If yours refuses, pay in parts.
        </p>
      )}

      {isTouch && (
        <div className="grid grid-cols-2 gap-2">
          {UPI_APPS.map((app) => (
            <a
              key={app.id}
              href={upiLink(payment, app.scheme)}
              onClick={onLaunch}
              className="flex h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-3 text-center text-[15px] font-semibold transition hover:bg-zinc-50 active:scale-[0.98]"
            >
              {app.label}
            </a>
          ))}
        </div>
      )}

      {showQr ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <UpiQr value={upiLink(payment)} />
          <p className="text-center text-xs text-zinc-500">Scan with any UPI app</p>
        </div>
      ) : (
        <Button variant="ghost" className="w-full" onClick={() => setShowQr(true)}>
          <QrCode className="size-4" />
          Show QR code
        </Button>
      )}

      <p className="px-1 text-center text-xs text-zinc-500">Check the name and UPI ID in your app before you confirm.</p>
    </div>
  );
}

type SheetProps = { payment: UpiPayment; onMarkPaid?: () => void; onClose: () => void };

export function UpiPaySheet({ payment, onMarkPaid, onClose }: SheetProps) {
  const [launched, setLaunched] = useState(false);
  return (
    <Sheet title={`Pay ${payment.name}`} onClose={onClose} cancelLabel="Close">
      <UpiPayPanel payment={payment} onLaunch={() => setLaunched(true)} />
      {onMarkPaid && (
        <div className="mt-6 space-y-2">
          {launched && <p className="text-center text-sm text-zinc-600">Paid? Record it so everyone's balance updates.</p>}
          <Button
            size="lg"
            variant={launched ? 'primary' : 'secondary'}
            className="w-full"
            onClick={() => {
              onMarkPaid();
              onClose();
            }}
          >
            Mark as paid
          </Button>
        </div>
      )}
    </Sheet>
  );
}
