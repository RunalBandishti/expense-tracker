export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'AUD', 'CAD', 'JPY'];

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let numberFormat = formatters.get(key);
  if (!numberFormat) {
    numberFormat = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, numberFormat);
  }
  return numberFormat;
}

export function formatMoney(minor: number, currency: string) {
  return formatter(currency, minor % 100 === 0 ? 0 : 2).format(minor / 100);
}

export function currencySymbol(currency: string) {
  return formatter(currency, 0).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency;
}

export function sanitizeAmountInput(text: string) {
  const [whole, ...rest] = text.replace(/[^\d.]/g, '').split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(cleaned)) return null;
  const minor = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

export function amountToInput(minor: number) {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
