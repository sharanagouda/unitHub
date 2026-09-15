import { evaluateClaim, type TenancySnapshot } from './claimTenantInvite';

const NOW = new Date('2026-09-15T00:00:00Z');
const PHONE = '+919876543210';

function tenancy(over: Partial<TenancySnapshot> = {}): TenancySnapshot {
  return {
    status: 'active',
    tenantUserId: null,
    tenantPhone: PHONE,
    createdAt: new Date('2026-09-01T00:00:00Z'), // 14 days before NOW
    inviteToken: null,
    inviteSentAt: null,
    ...over,
  };
}

describe('evaluateClaim', () => {
  it('accepts a matching phone on a fresh tenancy, no token needed', () => {
    const decision = evaluateClaim({ callerPhone: PHONE, inviteToken: undefined, now: NOW }, tenancy());
    expect(decision.ok).toBe(true);
  });

  it('rejects when the caller has no verified phone number', () => {
    const decision = evaluateClaim({ callerPhone: undefined, inviteToken: undefined, now: NOW }, tenancy());
    expect(decision).toEqual({
      ok: false,
      error: { code: 'failed-precondition', message: expect.stringContaining('verified phone') },
    });
  });

  it('rejects a nonexistent tenancy', () => {
    const decision = evaluateClaim({ callerPhone: PHONE, inviteToken: undefined, now: NOW }, null);
    expect(decision).toEqual({ ok: false, error: { code: 'not-found', message: expect.any(String) } });
  });

  it('rejects an ended tenancy', () => {
    const decision = evaluateClaim(
      { callerPhone: PHONE, inviteToken: undefined, now: NOW },
      tenancy({ status: 'ended' }),
    );
    expect(decision.ok).toBe(false);
  });

  it('rejects an already-claimed tenancy', () => {
    const decision = evaluateClaim(
      { callerPhone: PHONE, inviteToken: undefined, now: NOW },
      tenancy({ tenantUserId: 'someone-else' }),
    );
    expect(decision).toEqual({ ok: false, error: { code: 'already-exists', message: expect.any(String) } });
  });

  it("rejects when the caller's phone does not match the tenancy", () => {
    const decision = evaluateClaim(
      { callerPhone: '+910000000000', inviteToken: undefined, now: NOW },
      tenancy(),
    );
    expect(decision).toEqual({ ok: false, error: { code: 'permission-denied', message: expect.any(String) } });
  });

  describe('recycled-number safety window', () => {
    const oldTenancy = tenancy({ createdAt: new Date('2026-06-01T00:00:00Z') }); // >30 days before NOW

    it('requires an invite token once a tenancy is older than 30 days', () => {
      const decision = evaluateClaim({ callerPhone: PHONE, inviteToken: undefined, now: NOW }, oldTenancy);
      expect(decision).toEqual({ ok: false, error: { code: 'failed-precondition', message: expect.any(String) } });
    });

    it('accepts a valid, unexpired token on an old tenancy', () => {
      const decision = evaluateClaim(
        { callerPhone: PHONE, inviteToken: 'tok123', now: NOW },
        { ...oldTenancy, inviteToken: 'tok123', inviteSentAt: new Date('2026-09-10T00:00:00Z') }, // 5 days ago
      );
      expect(decision.ok).toBe(true);
    });

    it('rejects a token that does not match', () => {
      const decision = evaluateClaim(
        { callerPhone: PHONE, inviteToken: 'wrong', now: NOW },
        { ...oldTenancy, inviteToken: 'tok123', inviteSentAt: new Date('2026-09-10T00:00:00Z') },
      );
      expect(decision).toEqual({ ok: false, error: { code: 'permission-denied', message: expect.any(String) } });
    });

    it('rejects a token older than 7 days', () => {
      const decision = evaluateClaim(
        { callerPhone: PHONE, inviteToken: 'tok123', now: NOW },
        { ...oldTenancy, inviteToken: 'tok123', inviteSentAt: new Date('2026-09-01T00:00:00Z') }, // 14 days ago
      );
      expect(decision).toEqual({ ok: false, error: { code: 'failed-precondition', message: expect.any(String) } });
    });
  });

  it('validates a supplied token even on a fresh tenancy (defense in depth)', () => {
    const decision = evaluateClaim(
      { callerPhone: PHONE, inviteToken: 'wrong', now: NOW },
      tenancy({ inviteToken: 'tok123', inviteSentAt: new Date('2026-09-10T00:00:00Z') }),
    );
    expect(decision).toEqual({ ok: false, error: { code: 'permission-denied', message: expect.any(String) } });
  });
});
