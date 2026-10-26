import { jsPDF } from 'jspdf';
import { autoTable, type UserOptions } from 'jspdf-autotable';
import interRegularUrl from '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf?url';
import interBoldUrl from '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf?url';
import { categoryIdOf, categoryOf, tripCategories } from './categories';
import { formatDateRange, formatLongDate, formatShortDate, pluralize, todayISO, tripTiming } from './dates';
import { formatMoney } from './money';
import { participantIds, peopleLabel, perDayStat, summarizeTrip } from './split';
import { COMMON, type Expense, type Trip } from './types';

type Rgb = [number, number, number];

const INK: Rgb = [24, 24, 27];
const MUTED: Rgb = [113, 113, 122];
const LINE: Rgb = [228, 228, 231];
const PAPER: Rgb = [246, 245, 241];
const GREEN: Rgb = [5, 150, 105];
const AMBER: Rgb = [245, 158, 11];
const RED: Rgb = [220, 38, 38];
const MARGIN = 40;

let fontsPromise: Promise<string[]> | undefined;

async function fetchBase64(url: string) {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

// The built-in PDF fonts can't draw ₹, so embed Inter.
function loadFonts() {
  fontsPromise ??= Promise.all([fetchBase64(interRegularUrl), fetchBase64(interBoldUrl)]).catch((err) => {
    fontsPromise = undefined;
    throw err;
  });
  return fontsPromise;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');

const byDate = (a: Expense, b: Expense) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt;

export async function exportTripPdf(trip: Trip) {
  const [regular, bold] = await loadFonts();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.addFileToVFS('Inter-Regular.ttf', regular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const money = (minor: number) => formatMoney(minor, trip.currency);
  const summary = summarizeTrip(trip);
  const timing = tripTiming(trip.startDate, trip.endDate);
  const nameOf = (id: string) => trip.people.find((person) => person.id === id)?.name ?? 'Removed person';
  const splitDescription = (expense: Expense) => {
    if (expense.forId !== COMMON) return nameOf(expense.forId);
    const ids = participantIds(expense, trip.people);
    const split = expense.split;
    if (ids.length === 0) return 'Nobody yet';
    if (split?.mode === 'shares') return ids.map((id) => `${nameOf(id)} ×${split.weights[id]}`).join(', ');
    if (split?.mode === 'percent') return ids.map((id) => `${nameOf(id)} ${split.percents[id]}%`).join(', ');
    if (split?.mode === 'exact') return ids.map((id) => `${nameOf(id)} ${money(split.amounts[id])}`).join(', ');
    return ids.length === trip.people.length ? `Everyone (${ids.length})` : ids.map(nameOf).join(', ');
  };
  let y = MARGIN;

  const setText = (size: number, weight: 'normal' | 'bold', color: Rgb) => {
    doc.setFont('Inter', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN - 24) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const sectionTitle = (title: string, aside?: string) => {
    ensureSpace(80);
    setText(12, 'bold', INK);
    doc.text(title, MARGIN, y);
    if (aside) {
      setText(10, 'bold', INK);
      doc.text(aside, pageWidth - MARGIN, y, { align: 'right' });
    }
    y += 10;
  };

  const table = (options: UserOptions) => {
    autoTable(doc, {
      theme: 'plain',
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: MARGIN + 24 },
      styles: {
        font: 'Inter',
        fontSize: 9,
        textColor: INK,
        lineColor: LINE,
        lineWidth: { bottom: 0.5 },
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      },
      headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: MUTED, fillColor: PAPER },
      footStyles: { fontStyle: 'bold', fillColor: PAPER },
      ...options,
      // columnStyles only reach body cells, so mirror their alignment onto the header and total rows.
      didParseCell: ({ section, column, cell }) => {
        const halign = options.columnStyles?.[column.index]?.halign;
        if (halign && section !== 'body') cell.styles.halign = halign;
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
  };

  const titleLines: string[] = doc.setFont('Inter', 'bold').setFontSize(22).splitTextToSize(trip.name, contentWidth - 150);
  setText(22, 'bold', INK);
  doc.text(titleLines, MARGIN, y + 16, { lineHeightFactor: 1.15 });
  y += 16 + (titleLines.length - 1) * 25;

  setText(7.5, 'bold', MUTED);
  doc.text('EXPENSE REPORT', pageWidth - MARGIN, MARGIN + 6, { align: 'right', charSpace: 0.8 });
  setText(9, 'normal', MUTED);
  doc.text(`Generated ${formatLongDate(todayISO())}`, pageWidth - MARGIN, MARGIN + 20, { align: 'right' });

  const meta = [
    trip.startDate && trip.endDate && formatDateRange(trip.startDate, trip.endDate),
    timing.kind !== 'undated' && pluralize(timing.totalDays, 'day'),
    peopleLabel(trip.people.length),
    pluralize(trip.expenses.length, 'expense'),
  ].filter(Boolean);
  setText(10, 'normal', MUTED);
  doc.text(meta.join('   ·   '), MARGIN, y + 18);
  y += 34;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 20;

  const remaining = trip.budget === null ? null : trip.budget - summary.total;
  const perDay = perDayStat(trip.budget, summary.total, timing);
  const cards: { label: string; value: string; color?: Rgb }[] = [
    { label: 'TOTAL SPENT', value: money(summary.total) },
    { label: 'BUDGET', value: trip.budget === null ? 'Not set' : money(trip.budget) },
    remaining === null
      ? { label: 'SHARED', value: money(summary.sharedTotal) }
      : { label: remaining >= 0 ? 'REMAINING' : 'OVER BUDGET', value: money(Math.abs(remaining)), color: remaining < 0 ? RED : GREEN },
    perDay
      ? { label: perDay.label.toUpperCase(), value: money(perDay.amount) }
      : { label: 'PERSONAL', value: money(summary.personalTotal) },
  ];
  const cardGap = 10;
  const cardWidth = (contentWidth - cardGap * (cards.length - 1)) / cards.length;
  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + cardGap);
    doc.setFillColor(...PAPER);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, cardWidth, 56, 8, 8, 'FD');
    setText(7, 'bold', MUTED);
    doc.text(card.label, x + 12, y + 19, { charSpace: 0.5 });
    setText(13, 'bold', card.color ?? INK);
    doc.text(card.value, x + 12, y + 40);
  });
  y += 56 + 18;

  if (trip.budget) {
    const ratio = summary.total / trip.budget;
    doc.setFillColor(...LINE);
    doc.roundedRect(MARGIN, y, contentWidth, 6, 3, 3, 'F');
    if (ratio > 0) {
      doc.setFillColor(...(ratio > 1 ? RED : ratio >= 0.85 ? AMBER : GREEN));
      doc.roundedRect(MARGIN, y, Math.max(contentWidth * Math.min(ratio, 1), 6), 6, 3, 3, 'F');
    }
    setText(8.5, 'normal', MUTED);
    doc.text(`${Math.round(ratio * 100)}% of the budget used`, MARGIN, y + 20);
    y += 46;
  } else {
    y += 10;
  }

  const hasPayers = summary.paidTotal > 0;
  if (trip.people.length > 0) {
    sectionTitle('Split summary');
    const balanceText = (balance: number) =>
      balance === 0 ? 'Settled' : `${balance > 0 ? 'Gets back' : 'Owes'} ${money(Math.abs(balance))}`;
    table({
      head: [['PERSON', 'PERSONAL', 'SHARED', 'TOTAL SHARE', ...(hasPayers ? ['PAID', 'BALANCE'] : ['OF TRIP'])]],
      body: summary.people.map(({ person, personal, shared, total, paid, balance }) => [
        person.name,
        money(personal),
        money(shared),
        money(total),
        ...(hasPayers
          ? [money(paid), balanceText(balance)]
          : [summary.total ? `${((total / summary.total) * 100).toFixed(1)}%` : '—']),
      ]),
      foot: [
        [
          'Total',
          money(summary.personalTotal),
          money(summary.sharedTotal - summary.unassigned),
          money(summary.total - summary.unassigned),
          ...(hasPayers ? [money(summary.paidTotal), ''] : ['']),
        ],
      ],
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right', textColor: hasPayers ? INK : MUTED },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  if (hasPayers) {
    sectionTitle('Settle up');
    if (summary.transfers.length) {
      table({
        head: [['WHO PAYS', 'TO', 'AMOUNT']],
        body: summary.transfers.map((transfer) => [nameOf(transfer.fromId), nameOf(transfer.toId), money(transfer.amount)]),
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
      });
    } else {
      setText(10, 'normal', GREEN);
      doc.text('Everyone is settled up.', MARGIN, y + 12);
      y += 40;
    }
  }

  if (trip.settlements.length) {
    sectionTitle('Payments made');
    table({
      head: [['DATE', 'FROM', 'TO', 'METHOD', 'AMOUNT']],
      body: [...trip.settlements]
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
        .map((settlement) => [
          formatShortDate(settlement.date),
          nameOf(settlement.fromId),
          nameOf(settlement.toId),
          settlement.method === 'upi' ? 'UPI' : settlement.method === 'cash' ? 'Cash' : '—',
          money(settlement.amount),
        ]),
      columnStyles: { 0: { cellWidth: 56, textColor: MUTED }, 3: { textColor: MUTED }, 4: { halign: 'right' } },
    });
  }

  const categoryTotals = tripCategories(trip)
    .map((category) => ({
      label: category.label,
      amount: trip.expenses
        .filter((expense) => categoryIdOf(trip, expense.category) === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((category) => category.amount > 0);
  sectionTitle('Spending by category');
  table({
    head: [['CATEGORY', 'AMOUNT', 'OF TOTAL']],
    body: categoryTotals
      .sort((a, b) => b.amount - a.amount)
      .map((category) => [category.label, money(category.amount), `${((category.amount / summary.total) * 100).toFixed(1)}%`]),
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right', textColor: MUTED } },
  });

  sectionTitle('All expenses');
  table({
    head: [['DATE', 'EXPENSE', 'CATEGORY', 'PAID BY', 'FOR / SPLIT', 'AMOUNT']],
    body: [...trip.expenses]
      .sort(byDate)
      .map((expense) => [
        formatShortDate(expense.date),
        expense.title,
        categoryOf(trip, expense.category).label,
        expense.paidById ? nameOf(expense.paidById) : '—',
        splitDescription(expense),
        money(expense.amount),
      ]),
    foot: [['', 'Total', '', '', '', money(summary.total)]],
    columnStyles: {
      0: { cellWidth: 48, textColor: MUTED },
      2: { cellWidth: 62, textColor: MUTED },
      3: { cellWidth: 62 },
      4: { cellWidth: 118, textColor: MUTED },
      5: { cellWidth: 72, halign: 'right', fontStyle: 'bold' },
    },
  });

  const peopleWithItems = summary.people.filter((entry) => entry.items.length > 0);
  if (peopleWithItems.length > 0) {
    ensureSpace(120);
    setText(14, 'bold', INK);
    doc.text('Per-person breakdown', MARGIN, y);
    y += 24;
    for (const { person, total, items } of peopleWithItems) {
      sectionTitle(person.name, money(total));
      table({
        head: [['DATE', 'EXPENSE', 'TYPE', 'SHARE']],
        body: [...items]
          .sort((a, b) => byDate(a.expense, b.expense))
          .map(({ expense, share, splitCount }) => [
            formatShortDate(expense.date),
            expense.title,
            expense.forId === COMMON ? `Shared · split ${splitCount} ways` : 'Personal',
            money(share),
          ]),
        foot: [['', 'Total', '', money(total)]],
        columnStyles: {
          0: { cellWidth: 56, textColor: MUTED },
          2: { cellWidth: 140, textColor: MUTED },
          3: { cellWidth: 90, halign: 'right' },
        },
      });
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    setText(8, 'normal', MUTED);
    doc.text(`${trip.name} · Expense report`, MARGIN, pageHeight - 24);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 24, { align: 'right' });
  }

  const fileName = `${slugify(trip.name) || 'trip'}-expenses.pdf`;
  const file = new File([doc.output('blob')], fileName, { type: 'application/pdf' });
  // On phones the share sheet (Files, WhatsApp, …) works better than a download, which standalone PWAs often block.
  if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${trip.name} expenses` });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
  }
  doc.save(fileName);
}
