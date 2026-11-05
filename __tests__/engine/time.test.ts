import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  addDays,
  diffDays,
  localDateInTz,
} from '@/engine/time';

// The time helpers are the injectable-clock boundary: every calendar decision in the streak engine
// is made on `YYYY-MM-DD` strings these produce, so their timezone correctness is load-bearing.

describe('time constants', () => {
  it('are the expected millisecond magnitudes', () => {
    expect(MINUTE_MS).toBe(60_000);
    expect(HOUR_MS).toBe(3_600_000);
    expect(DAY_MS).toBe(86_400_000);
  });
});

describe('localDateInTz', () => {
  const instant = new Date('2026-03-02T04:30:00Z').getTime();

  it('rolls back to the previous calendar day in a behind-UTC zone', () => {
    // 04:30 UTC is 23:30 the prior day in America/New_York (EST, UTC-5, pre-DST 2026).
    expect(localDateInTz(instant, 'America/New_York')).toBe('2026-03-01');
  });

  it('rolls forward in an ahead-of-UTC zone', () => {
    // UTC+14 => 18:30 the same evening.
    expect(localDateInTz(instant, 'Pacific/Kiritimati')).toBe('2026-03-02');
  });

  it('returns the same date at UTC noon', () => {
    const noon = new Date('2026-06-15T12:00:00Z').getTime();
    expect(localDateInTz(noon, 'UTC')).toBe('2026-06-15');
  });

  it('respects a daylight-saving offset', () => {
    // After US DST begins (2026-03-08), New York is UTC-4. 03:30 UTC => 23:30 prior day.
    const dst = new Date('2026-07-01T03:30:00Z').getTime();
    expect(localDateInTz(dst, 'America/New_York')).toBe('2026-06-30');
  });
});

describe('diffDays', () => {
  it('is 0 for the same date', () => {
    expect(diffDays('2026-01-01', '2026-01-01')).toBe(0);
  });
  it('counts consecutive days', () => {
    expect(diffDays('2026-01-01', '2026-01-02')).toBe(1);
  });
  it('crosses month boundaries', () => {
    expect(diffDays('2026-01-31', '2026-02-01')).toBe(1);
  });
  it('crosses year boundaries', () => {
    expect(diffDays('2025-12-31', '2026-01-01')).toBe(1);
  });
  it('is negative when `to` precedes `from`', () => {
    expect(diffDays('2026-01-02', '2026-01-01')).toBe(-1);
  });
  it('handles a leap-day span', () => {
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2); // 2028 is a leap year
  });
});

describe('addDays', () => {
  it('advances across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('goes backward across a month boundary', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('adds a non-leap year of days', () => {
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });
  it('is a no-op for zero', () => {
    expect(addDays('2026-05-05', 0)).toBe('2026-05-05');
  });
});
