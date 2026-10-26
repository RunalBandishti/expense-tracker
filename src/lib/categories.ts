import type { CategoryDef, Trip } from './types';

export const OTHER_CATEGORY = 'other';
export const MAX_CATEGORIES = 30;

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'stay', label: 'Stay', emoji: '🏨' },
  { id: 'transport', label: 'Transport', emoji: '🚕' },
  { id: 'activities', label: 'Activities', emoji: '🎟️' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: OTHER_CATEGORY, label: 'Other', emoji: '📦' },
];

export const CATEGORY_EMOJIS = ['🍽️', '🏨', '🚕', '🎟️', '🛍️', '⛽', '✈️', '🚆', '🍻', '☕', '🎁', '💊', '🧺', '📱', '🎉', '🧾', '📦'];

const BAR_COLORS = [
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-indigo-500',
  'bg-lime-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
];

type WithCategories = Pick<Trip, 'categories'>;

export const tripCategories = (trip: WithCategories) => trip.categories ?? DEFAULT_CATEGORIES;

export function categoryIdOf(trip: WithCategories, id: string | undefined) {
  return id && tripCategories(trip).some((category) => category.id === id) ? id : OTHER_CATEGORY;
}

export function categoryOf(trip: WithCategories, id: string | undefined) {
  const effectiveId = categoryIdOf(trip, id);
  return tripCategories(trip).find((category) => category.id === effectiveId) ?? DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}

export function barColor(trip: WithCategories, id: string) {
  if (id === OTHER_CATEGORY) return 'bg-zinc-400';
  const index = tripCategories(trip)
    .filter((category) => category.id !== OTHER_CATEGORY)
    .findIndex((category) => category.id === id);
  return BAR_COLORS[Math.max(index, 0) % BAR_COLORS.length];
}

/** Keeps Other last, where expenses of deleted categories collect. */
export function withCategory(categories: CategoryDef[], category: CategoryDef, index?: number) {
  const rest = categories.filter((candidate) => candidate.id !== OTHER_CATEGORY);
  const other = categories.filter((candidate) => candidate.id === OTHER_CATEGORY);
  rest.splice(Math.min(index ?? rest.length, rest.length), 0, category);
  return [...rest, ...other];
}

const KEYWORDS: [string, RegExp][] = [
  ['stay', /\b(hotel|villa|hostel|resort|airbnb|stay|room|homestay|camp|lodge|cottage)\b/i],
  ['transport', /\b(cab|taxi|uber|ola|rapido|flight|train|bus|metro|fuel|petrol|diesel|toll|parking|scooter|bike|car|ferry|auto|rickshaw|airport)\b/i],
  ['food', /\b(food|dinner|lunch|breakfast|brunch|snacks?|cafe|coffee|tea|chai|drinks?|beer|bar|restaurant|pizza|meal|groceries|grocery|water|dessert|shack|dhaba|biryani)\b/i],
  ['activities', /\b(tickets?|entry|museum|park|tour|trek|rafting|parasailing|kayak(ing)?|diving|snorkel(l?ing)?|show|movie|spa|massage|activity|safari|cruise|boat|club|paragliding)\b/i],
  ['shopping', /\b(shopping|souvenirs?|gifts?|clothes|shoes|market|mall|store)\b/i],
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function guessCategory(title: string, categories: CategoryDef[]) {
  const named = categories.find(
    (category) =>
      category.id !== OTHER_CATEGORY && new RegExp(`\\b${escapeRegExp(category.label)}\\b`, 'i').test(title),
  );
  if (named) return named.id;
  for (const [id, pattern] of KEYWORDS) {
    if (pattern.test(title) && categories.some((category) => category.id === id)) return id;
  }
  return null;
}
