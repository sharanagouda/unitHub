import { z, type ZodType } from 'zod';
import {
  type ExactOptional,
  zCalendarDate,
  zPaise,
  zPaymentId,
  zRentPeriodId,
  zTenancyId,
  zTimestamp,
  zUserId,
} from './primitives';

const rawPaymentDocSchema = z.object({
  id: zPaymentId,
  tenancyId: zTenancyId,
  ownerId: zUserId,
  tenantUserId: zUserId.nullable(),
  // Mirrors TenancyDoc's field of the same name — see its doc comment.
  // Denormalized so firestore.rules' tenant-read check never needs a get().
  accessExpiresAt: zTimestamp.nullable(),

  amountPaise: zPaise,
  paidOn: zCalendarDate,
  method: z.enum(['cash', 'upi', 'bank', 'other']),
  note: z.string().min(1).optional(),
  receiptNo: z.string().min(1).optional(),

  allocations: z.array(
    z.object({
      rentPeriodId: zRentPeriodId,
      amountPaise: zPaise,
    }),
  ),
});

/**
 * The Firestore shape of a payment: every field `@domain/types`'s `Payment`
 * declares, plus `ownerId` / `tenantUserId` for the rules and query indexes
 * (see firestore.rules — payments are immutable from the client once
 * created, matching PRD Rules 3 & 5).
 */
export type PaymentDoc = ExactOptional<z.infer<typeof rawPaymentDocSchema>>;

// See ExactOptional's doc comment: retypes the schema's output without
// changing its runtime behaviour, so `.parse()` returns PaymentDoc directly.
export const paymentDocSchema = rawPaymentDocSchema as unknown as ZodType<PaymentDoc>;
