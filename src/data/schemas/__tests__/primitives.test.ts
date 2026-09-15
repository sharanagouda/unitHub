import { zCalendarDate, zPaise, zPeriodKey, zTenancyId, zTimestamp } from '../primitives';

describe('zCalendarDate', () => {
  it('accepts a valid YYYY-MM-DD string', () => {
    expect(zCalendarDate.parse('2026-03-12')).toBe('2026-03-12');
  });

  it('rejects a malformed date, via the same check calendarDate() uses', () => {
    expect(() => zCalendarDate.parse('12/03/2026')).toThrow();
  });
});

describe('zPeriodKey', () => {
  it('accepts a valid YYYY-MM string', () => {
    expect(zPeriodKey.parse('2026-03')).toBe('2026-03');
  });

  it('rejects a full date', () => {
    expect(() => zPeriodKey.parse('2026-03-12')).toThrow();
  });
});

describe('zPaise', () => {
  it('accepts an integer', () => {
    expect(zPaise.parse(1_800_000)).toBe(1_800_000);
  });

  it('rejects a fractional amount — money is integer paise, never a float', () => {
    expect(() => zPaise.parse(1800.5)).toThrow();
  });
});

describe('zTenancyId', () => {
  it('brands a plain string', () => {
    expect(zTenancyId.parse('t1')).toBe('t1');
  });
});

describe('zTimestamp', () => {
  it('accepts anything with a toDate() method', () => {
    const fake = { toDate: () => new Date('2026-04-01') };
    expect(zTimestamp.parse(fake)).toBe(fake);
  });

  it('rejects a plain string', () => {
    expect(() => zTimestamp.parse('2026-04-01')).toThrow();
  });

  it('rejects null (use .nullable() at the call site for an optional timestamp)', () => {
    expect(() => zTimestamp.parse(null)).toThrow();
  });
});
