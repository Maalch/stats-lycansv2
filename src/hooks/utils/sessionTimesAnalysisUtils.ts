import type { GameLogEntry } from '../useCombinedRawData';

export interface SessionTimeEntry {
  date: string;         // "2025-10-09"
  label: string;        // "09/10" for display
  sessionStart: number; // minutes from midnight UTC (first game start)
  sessionEnd: number;   // minutes from midnight UTC (last game end)
  gamesCount: number;
  firstGameId: string;
  lastGameId: string;
}

export interface SessionTimeBucket {
  label: string;        // "11:00", "11:30", etc.
  minuteValue: number;  // 660, 690, etc.
  startCount: number;
  endCount: number;
}

export interface SessionTimesAnalysis {
  sessions: SessionTimeEntry[];
  avgStartMinutes: number;
  avgEndMinutes: number;
  minStartMinutes: number;
  maxStartMinutes: number;
  minEndMinutes: number;
  maxEndMinutes: number;
  totalSessions: number;
  distribution: SessionTimeBucket[];
}

/**
 * Returns true only for games that have an actual time component (not midnight placeholder)
 */
function hasRealTimestamp(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0;
}

/**
 * Convert a Date to minutes since midnight in Europe/Paris timezone (handles DST automatically)
 */
function toParisMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return get('hour') * 60 + get('minute') + get('second') / 60;
}

/**
 * Format minutes-since-midnight to "HH:MM"
 */
export function minutesToHHMM(minutes: number): string {
  const totalMins = Math.round(minutes);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

const BUCKET_SIZE_MINUTES = 30;

export function computeSessionTimesAnalysis(gameData: GameLogEntry[]): SessionTimesAnalysis | null {
  // Only keep games with actual timestamps
  const gamesWithTime = gameData.filter(
    (game) => game.StartDate && game.EndDate && hasRealTimestamp(game.StartDate)
  );

  if (gamesWithTime.length === 0) return null;

  // Group by UTC date
  const byDay: Record<string, GameLogEntry[]> = {};
  for (const game of gamesWithTime) {
    const dateKey = game.StartDate.slice(0, 10); // "2025-10-09"
    if (!byDay[dateKey]) byDay[dateKey] = [];
    byDay[dateKey].push(game);
  }

  // Build sessions sorted by date
  const sessions: SessionTimeEntry[] = Object.entries(byDay)
    .map(([date, games]) => {
      games.sort((a, b) => a.StartDate.localeCompare(b.StartDate));
      const first = games[0];
      const last = games[games.length - 1];

      const startDate = new Date(first.StartDate);
      const endDate = new Date(last.EndDate);

      const [, month, day] = date.split('-');
      return {
        date,
        label: `${day}/${month}`,
        sessionStart: toParisMinutes(startDate),
        sessionEnd: toParisMinutes(endDate),
        gamesCount: games.length,
        firstGameId: first.DisplayedId,
        lastGameId: last.DisplayedId,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const avgStartMinutes = sessions.reduce((s, e) => s + e.sessionStart, 0) / sessions.length;
  const avgEndMinutes = sessions.reduce((s, e) => s + e.sessionEnd, 0) / sessions.length;
  const minStartMinutes = Math.min(...sessions.map((s) => s.sessionStart));
  const maxStartMinutes = Math.max(...sessions.map((s) => s.sessionStart));
  const minEndMinutes = Math.min(...sessions.map((s) => s.sessionEnd));
  const maxEndMinutes = Math.max(...sessions.map((s) => s.sessionEnd));

  // Build distribution in BUCKET_SIZE_MINUTES-minute slots
  // Find overall min/max to determine bucket range
  const allMinutes = sessions.flatMap((s) => [s.sessionStart, s.sessionEnd]);
  const overallMin = Math.floor(Math.min(...allMinutes) / BUCKET_SIZE_MINUTES) * BUCKET_SIZE_MINUTES;
  const overallMax = Math.ceil(Math.max(...allMinutes) / BUCKET_SIZE_MINUTES) * BUCKET_SIZE_MINUTES;

  const buckets: SessionTimeBucket[] = [];
  for (let m = overallMin; m < overallMax; m += BUCKET_SIZE_MINUTES) {
    buckets.push({
      label: minutesToHHMM(m),
      minuteValue: m,
      startCount: 0,
      endCount: 0,
    });
  }

  for (const session of sessions) {
    const startBucket = Math.floor(session.sessionStart / BUCKET_SIZE_MINUTES) * BUCKET_SIZE_MINUTES;
    const endBucket = Math.floor(session.sessionEnd / BUCKET_SIZE_MINUTES) * BUCKET_SIZE_MINUTES;

    const sb = buckets.find((b) => b.minuteValue === startBucket);
    if (sb) sb.startCount++;

    const eb = buckets.find((b) => b.minuteValue === endBucket);
    if (eb) eb.endCount++;
  }

  return {
    sessions,
    avgStartMinutes,
    avgEndMinutes,
    minStartMinutes,
    maxStartMinutes,
    minEndMinutes,
    maxEndMinutes,
    totalSessions: sessions.length,
    distribution: buckets,
  };
}
