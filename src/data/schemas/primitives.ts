import { z } from 'zod';
import type { Timestamp } from '@react-native-firebase/firestore';
import { calendarDate, periodKey } from '@domain/dates';
import { paise } from '@domain/money';
import {
  asPaymentId,
  asRentPeriodId,
  asTenancyId,
  asUnitId,
  asUserId,
} from '@domain/ids';

/**
 * Firestore stores every branded domain value (Paise, CalendarDate, ids) as a
 * plain number or string. These schemas re-run the same domain constructors
 * used everywhere else in the app, so a malformed document fails to parse
 * instead of quietly producing an un-branded value the rent engine would
 * happily accept anyway.
 */
export const zCalendarDate = z.string().transform(calendarDate);
export const zPeriodKey = z.string().transform(periodKey);
export const zPaise = z.number().int().transform(paise);

export const zUserId = z.string().transform(asUserId);
export const zUnitId = z.string().transform(asUnitId);
export const zTenancyId = z.string().transform(asTenancyId);
export const zRentPeriodId = z.string().transform(asRentPeriodId);
export const zPaymentId = z.string().transform(asPaymentId);

/**
 * Duck-typed rather than `instanceof Timestamp`: importing the real class
 * from `@react-native-firebase/firestore` would pull in a native module at
 * schema-parse time, which this pure-node package tests deliberately avoid
 * (see the `data` jest project). Any object with `toDate()` — a real
 * Firestore Timestamp, or the emulator's equivalent — passes.
 */
const isTimestampLike = (v: unknown): v is Timestamp =>
  typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function';

export const zTimestamp = z.custom<Timestamp>(isTimestampLike, {
  message: 'Expected a Firestore Timestamp',
});

/**
 * zod infers an `.optional()` field as `field?: T | undefined` — under this
 * project's `exactOptionalPropertyTypes`, that is a wider type than the
 * domain interfaces' plain `field?: T` (e.g. `Payment.note`), even though
 * zod never actually sets the key to `undefined`: a missing optional input
 * key is omitted from the parsed output, not included as `undefined` (see
 * schemas/__tests__/primitives.test.ts). This strips the redundant
 * `| undefined` so a parsed doc's type lines up with the domain type it must
 * be usable as.
 */
export type ExactOptional<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
