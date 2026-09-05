/**
 * Money is stored and computed as integer paise. Never a float.
 * ₹18,000 === 1_800_000 paise.
 *
 * Rationale: a rent ledger that accumulates float error produces balances
 * that are off by fractions of a rupee and never reconcile. Integers cannot.
 */

declare const PaiseBrand: unique symbol;
export type Paise = number & { readonly [PaiseBrand]: true };

export const ZERO = 0 as Paise;

/** Construct from a whole number of paise. */
export function paise(n: number): Paise {
  if (!Number.isInteger(n)) {
    throw new Error(`Paise must be an integer, got ${n}`);
  }
  return n as Paise;
}

/** Construct from rupees. Accepts up to 2 decimal places. */
export function rupees(n: number): Paise {
  return paise(Math.round(n * 100));
}

export const add = (a: Paise, b: Paise): Paise => (a + b) as Paise;
export const sub = (a: Paise, b: Paise): Paise => (a - b) as Paise;
export const min = (a: Paise, b: Paise): Paise => (a < b ? a : b);
export const max = (a: Paise, b: Paise): Paise => (a > b ? a : b);
export const sum = (xs: readonly Paise[]): Paise =>
  xs.reduce<Paise>((acc, x) => add(acc, x), ZERO);
export const isZero = (a: Paise): boolean => a === 0;
export const isPositive = (a: Paise): boolean => a > 0;

/** Clamp negatives to zero — used for "pending" which is never negative. */
export const floorZero = (a: Paise): Paise => (a < 0 ? ZERO : a);

/**
 * Indian digit grouping: 1,08,000 not 108,000.
 * Hand-rolled rather than via Intl because Hermes' Intl support for
 * en-IN grouping is inconsistent across Android versions.
 */
export function formatINR(p: Paise, opts: { paise?: boolean } = {}): string {
  const negative = p < 0;
  const abs = Math.abs(p);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;

  const s = String(whole);
  let grouped: string;
  if (s.length <= 3) {
    grouped = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }

  const showPaise = opts.paise ?? frac !== 0;
  const tail = showPaise ? '.' + String(frac).padStart(2, '0') : '';
  return `${negative ? '-' : ''}₹${grouped}${tail}`;
}
