import type { Paise } from './money';
import type { CalendarDate, PeriodKey } from './dates';
import type {
  PaymentId,
  RentPeriodId,
  TenancyId,
  UnitId,
  UserId,
} from './ids';

// ---------------------------------------------------------------------------
// Rent cycle policy
//
// PRD §11 says "must not assume everyone joined on the 1st" but its own ledger
// table is keyed by calendar month, while §10 collects a separate due-day.
// Those are different models, so the choice is made explicit per tenancy
// rather than hardcoded.
// ---------------------------------------------------------------------------

/**
 * calendar-month: periods are Jan 1-31, Feb 1-28, ... regardless of move-in.
 *                 Due day is a day within that month. Matches the PRD ledger.
 * anniversary:    periods run move-in-day to move-in-day (12 Mar - 11 Apr).
 *                 Due date is the period start.
 */
export type RentCycle = 'calendar-month' | 'anniversary';

/**
 * full-month: a partial first/last month is billed in full.
 *             This is what PRD §10's worked example implies
 *             (moved in 12 Mar, expected ₹18,000, paid ₹10,000 -> ₹8,000 due).
 * prorated:   billed as rent x occupiedDays / daysInPeriod.
 *
 * Only meaningful for 'calendar-month'; anniversary periods are always whole.
 */
export type ProrationPolicy = 'full-month' | 'prorated';

/** How an unallocated payment is applied across open periods. */
export type AllocationPolicy = 'oldest-first';

export interface RentRevision {
  effectiveFrom: CalendarDate;
  rentPaise: Paise;
}

export interface Tenancy {
  id: TenancyId;
  ownerId: UserId;
  unitId: UnitId;

  /** Null until the tenant claims the invite. Present from v1 so the
   *  tenant portal needs no migration later. */
  tenantUserId: UserId | null;
  tenantName: string;
  tenantPhone: string;

  moveInDate: CalendarDate;
  moveOutDate: CalendarDate | null;
  status: 'active' | 'ended';

  /** Never a single `rentPaise`. Rent changes; closed periods must not move. */
  rentRevisions: RentRevision[];

  /** Nominal day of month rent falls due (1-31, clamped per month). */
  dueDay: number;
  depositPaise: Paise;

  cycle: RentCycle;
  proration: ProrationPolicy;
}

export type RentPeriodStatus = 'paid' | 'partial' | 'pending';

/** A non-rent charge on a period: electricity, water, maintenance. */
export interface LineItem {
  label: string;
  amountPaise: Paise;
}

export interface RentPeriod {
  id: RentPeriodId;
  tenancyId: TenancyId;
  /** "2026-09" for calendar-month; for anniversary, the key of the start date. */
  key: PeriodKey;
  from: CalendarDate;
  to: CalendarDate;
  dueDate: CalendarDate;
  /** Snapshot at generation time. Rent revisions never rewrite this. */
  rentPaise: Paise;
  lineItems: LineItem[];
  /** rentPaise + sum(lineItems). What the tenant owes for this period. */
  expectedPaise: Paise;
}

export interface Allocation {
  rentPeriodId: RentPeriodId;
  amountPaise: Paise;
}

export interface Payment {
  id: PaymentId;
  tenancyId: TenancyId;
  amountPaise: Paise;
  paidOn: CalendarDate;
  method: 'cash' | 'upi' | 'bank' | 'other';
  note?: string;
  receiptNo?: string;
  /**
   * A payment is split across the periods it settles. This is what makes
   * overpayment, lump sums and carry-forward expressible at all — a single
   * `rentMonth` field on the payment cannot represent them.
   */
  allocations: Allocation[];
}

export interface PeriodLedgerRow {
  period: RentPeriod;
  paidPaise: Paise;
  pendingPaise: Paise;
  status: RentPeriodStatus;
}

export interface Ledger {
  rows: PeriodLedgerRow[];
  totalExpectedPaise: Paise;
  totalPaidPaise: Paise;
  totalPendingPaise: Paise;
  /** Money received but not applied to any period — PRD §12 overpayment. */
  creditPaise: Paise;
}
