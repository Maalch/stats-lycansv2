import { describe, it, expect } from 'vitest';
import {
  formatSecondsToMinutesSeconds,
  formatDurationToMinutesSeconds,
  formatDurationWithDays,
} from './durationFormatters';

describe('formatSecondsToMinutesSeconds', () => {
  it.each([
    [0, '0m 0s'],
    [59, '0m 59s'],
    [60, '1m 0s'],
    [794, '13m 14s'],
  ])('formats %i seconds as "%s"', (seconds, expected) => {
    expect(formatSecondsToMinutesSeconds(seconds)).toBe(expected);
  });
});

describe('formatDurationToMinutesSeconds', () => {
  it('returns the input unchanged for an empty string', () => {
    expect(formatDurationToMinutesSeconds('')).toBe('');
  });

  it('parses a "YYmZZs" string', () => {
    expect(formatDurationToMinutesSeconds('13m14s')).toBe('13m 14s');
  });

  it('converts an "XXhYYmZZs" string into total minutes', () => {
    expect(formatDurationToMinutesSeconds('1h5m30s')).toBe('65m 30s');
  });
});

describe('formatDurationWithDays', () => {
  it('returns the original string unchanged when under 24 hours', () => {
    expect(formatDurationWithDays('5h30m0s')).toBe('5h30m0s');
  });

  it('formats a duration of exactly 1 day with no remaining hours', () => {
    expect(formatDurationWithDays('24h0m0s')).toBe('1 Jour');
  });

  it('formats multiple days with remaining hours (pluralized)', () => {
    expect(formatDurationWithDays('55h0m0s')).toBe('2 Jours 7 Heures');
  });
});
