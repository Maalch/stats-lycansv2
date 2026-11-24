import { useEffect, useState } from 'react';

const SESSION_DURATION = 12 * 60 * 60 * 1000;

export function isInCurrentSession(startDate: string, now: number): boolean {
  const start = Date.parse(startDate);
  return Number.isFinite(start) && start <= now && start >= now - SESSION_DURATION;
}

export function useSessionClock(enabled: boolean, games: { StartDate: string }[] | null): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const current = Date.now();
      setNow(current);
      let next = Infinity;
      for (const game of games || []) {
        const start = Date.parse(game.StartDate);
        if (!Number.isFinite(start)) continue;
        if (start > current) next = Math.min(next, start);
        const expiry = start + SESSION_DURATION + 1;
        if (expiry > current) next = Math.min(next, expiry);
      }
      if (Number.isFinite(next)) {
        timer = setTimeout(update, Math.min(next - current, 2147483647));
      }
    };
    update();
    return () => clearTimeout(timer);
  }, [enabled, games]);

  return now;
}
