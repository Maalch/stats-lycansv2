import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInCurrentSession, useSessionClock } from './useSessionClock';

afterEach(() => vi.useRealTimers());

describe('current session', () => {
  it('includes only valid game starts within the last 12 hours', () => {
    const now = Date.parse('2026-11-24T14:00:00Z');
    expect(isInCurrentSession('2026-11-24T02:00:00Z', now)).toBe(true);
    expect(isInCurrentSession('2026-11-24T01:59:59.999Z', now)).toBe(false);
    expect(isInCurrentSession('2026-11-24T14:00:00.001Z', now)).toBe(false);
    expect(isInCurrentSession('invalid', now)).toBe(false);
  });

  it('updates when a game enters or leaves the rolling window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T14:00:00Z'));
    const games = [
      { StartDate: '2026-11-24T02:00:00Z' },
      { StartDate: '2026-11-24T14:00:02Z' },
    ];
    const { result } = renderHook(() => useSessionClock(true, games));
    expect(games.filter(game => isInCurrentSession(game.StartDate, result.current))).toEqual([games[0]]);
    act(() => vi.advanceTimersByTime(1));
    expect(games.filter(game => isInCurrentSession(game.StartDate, result.current))).toEqual([]);
    act(() => vi.advanceTimersByTime(1999));
    expect(games.filter(game => isInCurrentSession(game.StartDate, result.current))).toEqual([games[1]]);
  });
});
