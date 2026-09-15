import { z } from 'zod';
import {
  zCalendarDate,
  zPaise,
  zPeriodKey,
  zRentPeriodId,
  zTenancyId,
  zUserId,
} from './primitives';

/**
 * The Firestore shape of a rent period: every field `@domain/types`'s
 * `RentPeriod` declares, plus the fields that exist only for queries and
 * rules — `ownerId` / `tenantUserId` (see firestore.rules and
 * firestore.indexes.json), and `paidPaise` / `status`, a cache of what
 * `computeLedger` derives from payments. `@domain/rent/ledger`'s comment on
 * `computeLedger` is the source of truth this cache must agree with; it is
 * never itself the source of truth.
 */
export const rentPeriodDocSchema = z.object({
  id: zRentPeriodId,
  tenancyId: zTenancyId,
  ownerId: zUserId,
  tenantUserId: zUserId.nullable(),

  key: zPeriodKey,
  from: zCalendarDate,
  to: zCalendarDate,
  dueDate: zCalendarDate,

  rentPaise: zPaise,
  lineItems: z.array(
    z.object({
      label: z.string().min(1),
      amountPaise: zPaise,
    }),
  ),
  expectedPaise: zPaise,

  paidPaise: zPaise,
  status: z.enum(['paid', 'partial', 'pending']),
});

export type RentPeriodDoc = z.infer<typeof rentPeriodDocSchema>;
