import type { Category } from './types';

export const CATEGORIES: { id: Category; label: string; emoji: string; bar: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍽️', bar: 'bg-amber-500' },
  { id: 'stay', label: 'Stay', emoji: '🏨', bar: 'bg-sky-500' },
  { id: 'transport', label: 'Transport', emoji: '🚕', bar: 'bg-violet-500' },
  { id: 'activities', label: 'Activities', emoji: '🎟️', bar: 'bg-rose-500' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', bar: 'bg-teal-500' },
  { id: 'other', label: 'Other', emoji: '📦', bar: 'bg-zinc-400' },
];

export const CATEGORY_IDS: string[] = CATEGORIES.map((category) => category.id);

export const categoryOf = (id: Category | undefined) =>
  CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

const KEYWORDS: [Category, RegExp][] = [
  ['stay', /\b(hotel|villa|hostel|resort|airbnb|stay|room|homestay|camp|lodge|cottage)\b/i],
  ['transport', /\b(cab|taxi|uber|ola|rapido|flight|train|bus|metro|fuel|petrol|diesel|toll|parking|scooter|bike|car|ferry|auto|rickshaw|airport)\b/i],
  ['food', /\b(food|dinner|lunch|breakfast|brunch|snacks?|cafe|coffee|tea|chai|drinks?|beer|bar|restaurant|pizza|meal|groceries|grocery|water|dessert|shack|dhaba|biryani)\b/i],
  ['activities', /\b(tickets?|entry|museum|park|tour|trek|rafting|parasailing|kayak(ing)?|diving|snorkel(l?ing)?|show|movie|spa|massage|activity|safari|cruise|boat|club|paragliding)\b/i],
  ['shopping', /\b(shopping|souvenirs?|gifts?|clothes|shoes|market|mall|store)\b/i],
];

export function guessCategory(title: string): Category | null {
  for (const [category, pattern] of KEYWORDS) if (pattern.test(title)) return category;
  return null;
}
