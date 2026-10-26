import { CURRENCIES } from '../../src/lib/money';
import type { Op } from '../../src/lib/ops';
import { COMMON, type TripDetails } from '../../src/lib/types';
import { HttpError } from './http';

const ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MINOR = 1e13;
const MAX_OPS = 200;

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown) => typeof value === 'string' && ID_PATTERN.test(value);
const isText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const isDate = (value: unknown) => typeof value === 'string' && DATE_PATTERN.test(value);
const isAmount = (value: unknown, min = 1) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= MAX_MINOR;
const isNumberIn = (value: unknown, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const isRecordOf = (value: unknown, check: (entry: unknown) => boolean) =>
  isObject(value) && Object.keys(value).length <= 500 && Object.entries(value).every(([key, entry]) => ID_PATTERN.test(key) && check(entry));

function isSplit(value: unknown) {
  if (!isObject(value)) return false;
  switch (value.mode) {
    case 'all':
      return true;
    case 'custom':
      return Array.isArray(value.personIds) && value.personIds.length <= 500 && value.personIds.every(isId);
    case 'shares':
      return isRecordOf(value.weights, (weight) => isNumberIn(weight, 1e6));
    case 'percent':
      return isRecordOf(value.percents, (percent) => isNumberIn(percent, 100));
    case 'exact':
      return isRecordOf(value.amounts, (amount) => isAmount(amount, 0));
    default:
      return false;
  }
}

const isPerson = (value: unknown) => isObject(value) && isId(value.id) && isText(value.name, 40);

const isExpense = (value: unknown) =>
  isObject(value) &&
  isId(value.id) &&
  isText(value.title, 80) &&
  isAmount(value.amount) &&
  isDate(value.date) &&
  (value.forId === COMMON || isId(value.forId)) &&
  (value.split === undefined || isSplit(value.split)) &&
  (value.paidById === undefined || isId(value.paidById)) &&
  (value.category === undefined || isId(value.category)) &&
  typeof value.createdAt === 'number';

const isCategory = (value: unknown) =>
  isObject(value) &&
  isId(value.id) &&
  isText(value.label, 24) &&
  typeof value.emoji === 'string' &&
  value.emoji.length > 0 &&
  value.emoji.length <= 16;

const isSettlement = (value: unknown) =>
  isObject(value) &&
  isId(value.id) &&
  isId(value.fromId) &&
  isId(value.toId) &&
  value.fromId !== value.toId &&
  isAmount(value.amount) &&
  isDate(value.date) &&
  typeof value.createdAt === 'number';

const DETAIL_CHECKS: Record<keyof TripDetails, (value: unknown) => boolean> = {
  name: (value) => isText(value, 80),
  emoji: (value) => typeof value === 'string' && value.length <= 16,
  startDate: (value) => value === null || isDate(value),
  endDate: (value) => value === null || isDate(value),
  budget: (value) => value === null || isAmount(value),
  currency: (value) => typeof value === 'string' && CURRENCIES.includes(value),
};

const areDetails = (value: unknown, partial: boolean) =>
  isObject(value) &&
  Object.entries(DETAIL_CHECKS).every(([key, check]) => (partial && !(key in value)) || check(value[key]));

function isValidOp(op: unknown, userId: string) {
  if (!isObject(op)) return false;
  switch (op.type) {
    case 'trip/create':
      return (
        isObject(op.trip) &&
        isId(op.trip.id) &&
        areDetails(op.trip, false) &&
        Array.isArray(op.trip.people) &&
        op.trip.people.length <= 200 &&
        op.trip.people.every(isPerson)
      );
    case 'trip/update':
      return areDetails(op.details, true);
    case 'person/add':
      return isPerson(op.person);
    case 'person/update':
      return isId(op.id) && isText(op.name, 40);
    case 'person/remove':
    case 'expense/remove':
    case 'settlement/remove':
      return isId(op.id);
    case 'expense/upsert':
      return isExpense(op.expense);
    case 'settlement/add':
      return isSettlement(op.settlement);
    case 'member/claim':
      return op.userId === userId && (op.personId === null || isId(op.personId));
    case 'category/add':
      return isCategory(op.category) && (op.index === undefined || (Number.isInteger(op.index) && (op.index as number) >= 0));
    case 'category/update':
      return isCategory(op.category);
    case 'category/remove':
      return isId(op.id) && typeof op.deleteExpenses === 'boolean';
    default:
      return false;
  }
}

export function parseOps(body: unknown, userId: string): Op[] {
  const ops = isObject(body) && Array.isArray(body.ops) ? body.ops : null;
  if (!ops || ops.length === 0 || ops.length > MAX_OPS || !ops.every((op) => isValidOp(op, userId))) {
    throw new HttpError(400, 'Some changes were invalid');
  }
  return ops as Op[];
}
