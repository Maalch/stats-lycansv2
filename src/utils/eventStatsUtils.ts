import type { GameLogEntry } from '../hooks/useCombinedRawData';
import { getWinnerCampFromGame } from './gameUtils';

export interface EventNameInfo {
  frenchName: string;
  emoji: string;
}

/**
 * Maps gameLog DailyEventStart Name values to French display info.
 * Based on the events section of gameReference.json.
 */
export const EVENT_NAME_MAP: Record<string, EventNameInfo> = {
  Harvest:    { frenchName: 'Abondance',       emoji: '🌾' },
  Haste:      { frenchName: 'Hâte',            emoji: '⚡' },
  Fog:        { frenchName: 'Brouillard',       emoji: '🌫️' },
  Spellstorm: { frenchName: 'Tempête de sorts', emoji: '🌩️' },
  Eclipse:    { frenchName: 'Éclipse',          emoji: '🌑' },
  Plague:     { frenchName: 'Peste',            emoji: '☣️' },
  Protection: { frenchName: 'Protection',       emoji: '🛡️' },
  Tournament: { frenchName: 'Compétition',      emoji: '🏅' },
  FullMoon:   { frenchName: 'Pleine lune',      emoji: '🌕' },
  Rage:       { frenchName: 'Rage',             emoji: '😡' },
};

export interface EventCampWinRate {
  camp: string;
  winRate: number;   // 0–100
  winCount: number;
  delta: number;     // deviation from baseline (positive = better with this event)
}

export interface EventRow {
  eventName: string;
  frenchName: string;
  emoji: string;
  gameCount: number;
  lowSample: boolean;
  campRates: Record<string, EventCampWinRate>;
}

export interface BaselineCampRate {
  camp: string;
  winRate: number;   // 0–100
  winCount: number;
}

export interface EventStatsResult {
  events: EventRow[];
  baseline: Record<string, BaselineCampRate>;
  totalGames: number;
  displayCamps: string[];
}

/** Minimum number of games for an event to be considered statistically significant */
export const EVENT_LOW_SAMPLE_THRESHOLD = 5;

/** Only games on this version or later are counted (events + baseline) */
export const EVENT_MIN_VERSION = '0.288';

/**
 * Compare two dotted version strings part-by-part.
 * e.g. "0.29" < "0.288" because 29 < 288 as patch numbers.
 */
function isVersionAtLeast(version: string, minVersion: string): boolean {
  const a = version.split('.').map(Number);
  const b = minVersion.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true; // equal counts as "at least"
}

export function computeEventStats(gameData: GameLogEntry[]): EventStatsResult | null {
  if (!gameData || gameData.length === 0) return null;

  // Restrict to games on the minimum version or later
  const eligibleGames = gameData.filter(g => g.Version && isVersionAtLeast(g.Version, EVENT_MIN_VERSION));
  if (eligibleGames.length === 0) return null;

  const totalGames = eligibleGames.length;

  // Baseline: count wins per camp across ALL eligible games
  const baselineCounts: Record<string, number> = {};
  for (const game of eligibleGames) {
    const winner = getWinnerCampFromGame(game);
    baselineCounts[winner] = (baselineCounts[winner] || 0) + 1;
  }

  // Per-event aggregation: only eligible games that have GameEvents data
  const eventAgg: Record<string, { gameCount: number; winsBycamp: Record<string, number> }> = {};

  for (const game of eligibleGames) {
    if (!game.GameEvents || game.GameEvents.length === 0) continue;

    const winner = getWinnerCampFromGame(game);

    // Deduplicate event names within the same game (same event can occur on multiple days)
    const uniqueEventNames = new Set(
      game.GameEvents
        .filter(e => e.Type === 'DailyEventStart' && EVENT_NAME_MAP[e.Name])
        .map(e => e.Name)
    );

    for (const evName of uniqueEventNames) {
      if (!eventAgg[evName]) {
        eventAgg[evName] = { gameCount: 0, winsBycamp: {} };
      }
      eventAgg[evName].gameCount++;
      eventAgg[evName].winsBycamp[winner] = (eventAgg[evName].winsBycamp[winner] || 0) + 1;
    }
  }

  // Determine display camps: always Villageois and Loup; include Amoureux if it appears
  const displayCamps: string[] = ['Villageois', 'Loup'];
  if ((baselineCounts['Amoureux'] || 0) > 0) {
    displayCamps.push('Amoureux');
  }

  // Build baseline rates
  const baseline: Record<string, BaselineCampRate> = {};
  for (const camp of displayCamps) {
    const winCount = baselineCounts[camp] || 0;
    baseline[camp] = {
      camp,
      winRate: totalGames > 0 ? (winCount / totalGames) * 100 : 0,
      winCount,
    };
  }

  // Build event rows in the order defined by EVENT_NAME_MAP
  const events: EventRow[] = [];
  for (const [evName, info] of Object.entries(EVENT_NAME_MAP)) {
    const agg = eventAgg[evName];
    if (!agg) continue; // no games with this event in the current filter

    const campRates: Record<string, EventCampWinRate> = {};
    for (const camp of displayCamps) {
      const winCount = agg.winsBycamp[camp] || 0;
      const winRate = agg.gameCount > 0 ? (winCount / agg.gameCount) * 100 : 0;
      campRates[camp] = {
        camp,
        winRate,
        winCount,
        delta: winRate - (baseline[camp]?.winRate ?? 0),
      };
    }

    events.push({
      eventName: evName,
      frenchName: info.frenchName,
      emoji: info.emoji,
      gameCount: agg.gameCount,
      lowSample: agg.gameCount < EVENT_LOW_SAMPLE_THRESHOLD,
      campRates,
    });
  }

  // Sort by gameCount descending so the most common events appear first
  events.sort((a, b) => b.gameCount - a.gameCount);

  return { events, baseline, totalGames, displayCamps };
}
