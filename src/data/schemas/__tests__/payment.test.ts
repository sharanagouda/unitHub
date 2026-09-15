import type { Payment } from '@domain/types';
import { paymentDocSchema } from '../payment';

function rawPayment(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    tenancyId: 't1',
    ownerId: 'o1',
    tenantUserId: 'tenant1',
    amountPaise: 1_800_000,
    paidOn: '2026-03-12',
    method: 'upi',
    allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: 1_800_000 }],
    ...over,
  };
}

describe('paymentDocSchema', () => {
  it('parses a well-formed payment document', () => {
    const parsed = paymentDocSchema.parse(rawPayment());
    expect(parsed.allocations).toHaveLength(1);
    expect(parsed).not.toHaveProperty('note');
  });

  it('is usable anywhere a domain Payment is expected', () => {
    const parsed = paymentDocSchema.parse(rawPayment());
    // Compile-time check: computeLedger takes readonly Payment[].
    const asPayment: Payment = parsed;
    expect(asPayment.amountPaise).toBe(1_800_000);
  });

  it('parses optional note and receiptNo when present', () => {
    const parsed = paymentDocSchema.parse(rawPayment({ note: 'via GPay', receiptNo: 'UH-20260312-001' }));
    expect(parsed.note).toBe('via GPay');
    expect(parsed.receiptNo).toBe('UH-20260312-001');
  });

  it('rejects an unknown payment method', () => {
    expect(() => paymentDocSchema.parse(rawPayment({ method: 'cheque' }))).toThrow();
  });

  it('leaves non-negative-amount enforcement to allocatePayment, not schema shape', () => {
    // @domain/rent/allocation's allocatePayment throws on a negative amount;
    // this schema only validates document shape, so it should not duplicate
    // that business rule.
    const parsed = paymentDocSchema.parse(
      rawPayment({ allocations: [{ rentPeriodId: 't1_2026-03', amountPaise: -100 }] }),
    );
    expect(parsed.allocations[0]?.amountPaise).toBe(-100);
  });
});
