/**
 * Player Highlight Utility Functions
 * 
 * Computes interesting, relevant, and recent statistics for a player
 * to display as a highlight in the player card header.
 * Candidates are scored by priority and one is randomly selected from the top tier.
 */

import type { PlayerSeriesData, CampSeries, WinSeries, LossSeries, DeathSeries, SurvivalSeries, DeathT1Series } from '../utils/playerSeries/playerSeriesTypes';
import type { GameLogData } from '../useCombinedRawData';
import type { AchievementsData, PlayerAchievements } from '../../types/achievements';

const SOLO_ROLES = [
  'Amoureux', 'Idiot du Village', 'Agent', 'Espion', 'Contrebandier',
  'Kidnappeur', 'Scientifique', 'Mercenaire', 'Cultiste', 'La Bête',
  'Chasseur de primes', 'Vaudou',
] as const;

const MIN_STREAK_TO_HIGHLIGHT = 3;
const MIN_PARTICIPATION_RATIO = 0.40;
const WIN_RATE_TREND_MIN_GAMES = 20;
const WIN_RATE_TREND_MIN_DELTA = 10; // percentage points

export interface PlayerHighlight {
  text: string;
  emoji: string;
  type: string;
  priority: number;
  /** Optional navigation target when clicked */
  navigateTo?: string;
}

type AnySeriesEntry = CampSeries | WinSeries | LossSeries | DeathSeries | SurvivalSeries | DeathT1Series;

// --- Streak highlights ---

function findPlayerCurrentSeries<T extends AnySeriesEntry>(
  currentSeries: T[],
  playerName: string
): T | null {
  return currentSeries.find(s => s.player === playerName) || null;
}

function findPlayerBestSeries<T extends AnySeriesEntry>(
  allSeries: T[],
  playerName: string
): T | null {
  return allSeries.find(s => s.player === playerName) || null;
}

function getRankAmongAll<T extends AnySeriesEntry>(
  allSeries: T[],
  length: number
): { rank: number; total: number } {
  const sorted = [...allSeries].sort((a, b) => b.seriesLength - a.seriesLength);
  const rank = sorted.findIndex(s => s.seriesLength <= length) + 1;
  return { rank: rank || sorted.length + 1, total: sorted.length };
}

export function computeCurrentStreaks(
  playerName: string,
  seriesData: PlayerSeriesData | null
): PlayerHighlight[] {
  if (!seriesData) return [];

  const highlights: PlayerHighlight[] = [];

  const streakTypes: {
    key: string;
    label: string;
    current: AnySeriesEntry[];
    all: AnySeriesEntry[];
    isBad: boolean;
  }[] = [
    { key: 'villageois', label: 'Villageois', current: seriesData.currentVillageoisSeries, all: seriesData.allVillageoisSeries, isBad: false },
    { key: 'loups', label: 'Loups', current: seriesData.currentLoupsSeries, all: seriesData.allLoupsSeries, isBad: false },
    { key: 'nowolf', label: 'Sans Loups', current: seriesData.currentNoWolfSeries, all: seriesData.allNoWolfSeries, isBad: false },
    { key: 'solo', label: 'Rôles Solos', current: seriesData.currentSoloSeries, all: seriesData.allSoloSeries, isBad: false },
    { key: 'wins', label: 'victoires', current: seriesData.currentWinSeries, all: seriesData.allWinSeries, isBad: false },
    { key: 'losses', label: 'défaites', current: seriesData.currentLossSeries, all: seriesData.allLossSeries, isBad: true },
    { key: 'deaths', label: 'morts consécutives', current: seriesData.currentDeathSeries, all: seriesData.allDeathSeries, isBad: true },
    { key: 'survival', label: 'survies', current: seriesData.currentSurvivalSeries, all: seriesData.allSurvivalSeries, isBad: false },
    { key: 'deathT1', label: 'morts T1', current: seriesData.currentDeathT1Series, all: seriesData.allDeathT1Series, isBad: true },
  ];

  for (const type of streakTypes) {
    const current = findPlayerCurrentSeries(type.current, playerName);
    if (!current || current.seriesLength < MIN_STREAK_TO_HIGHLIGHT) continue;

    const best = findPlayerBestSeries(type.all, playerName);
    const isPersonalRecord = best ? current.seriesLength >= best.seriesLength : true;
    const { rank, total } = getRankAmongAll(type.all, current.seriesLength);

    let text = `Série de ${current.seriesLength} ${type.label}`;
    const extras: string[] = [];

    if (isPersonalRecord) {
      extras.push('record perso');
    }
    if (rank <= 3 && total > 5) {
      const ordinals = ['', '1ère', '2ème', '3ème'];
      extras.push(`${ordinals[rank]} meilleure de tous`);
    }
    if (extras.length > 0) {
      text += ` (${extras.join(', ')})`;
    } else {
      text += ' en cours';
    }

    // Priority: personal record streaks are most interesting
    let priority = 50;
    if (isPersonalRecord) priority = 95;
    if (rank <= 3 && total > 5) priority = 100;
    if (type.isBad) priority -= 10; // Bad streaks are less fun but still notable

    highlights.push({ text, emoji: '🔥', type: `streak-${type.key}`, priority, navigateTo: 'series' });
  }

  return highlights;
}

// --- Recent achievement highlights ---

export function computeRecentAchievements(
  playerAchievements: PlayerAchievements | null,
  achievementsData: AchievementsData | null,
  last10GameIds: string[]
): PlayerHighlight[] {
  if (!playerAchievements || !achievementsData || last10GameIds.length === 0) return [];

  const highlights: PlayerHighlight[] = [];
  const last10Set = new Set(last10GameIds);

  for (const achievement of playerAchievements.achievements) {
    for (const level of achievement.unlockedLevels) {
      if (level.unlockedAtGame && last10Set.has(level.unlockedAtGame)) {
        const def = achievementsData.achievementDefinitions.find(d => d.id === achievement.id);
        if (!def) continue;

        // Tier emoji display: ⭐ for bronze/argent/or, 🐺 for lycans
        const tierEmojis: Record<string, string> = { bronze: '⭐', argent: '⭐⭐', or: '⭐⭐⭐', lycans: '🐺' };
        const tierDisplay = tierEmojis[level.tier] || level.tier;

        // Compute ranking: how many players have reached at least this value for this achievement
        const allPlayerValues: number[] = [];
        for (const playerData of Object.values(achievementsData.players)) {
          const playerAch = playerData.achievements.find(a => a.id === achievement.id);
          if (playerAch && playerAch.currentValue > 0) {
            allPlayerValues.push(playerAch.currentValue);
          }
        }
        allPlayerValues.sort((a, b) => b - a);
        const rank = allPlayerValues.findIndex(v => v <= achievement.currentValue) + 1;
        const total = allPlayerValues.length;
        const rankLabel = rank === 1 ? '1er' : `${rank}ème`;
        const rankDisplay = total > 1 ? ` (${rankLabel}/${total})` : '';

        const explanationWithValue = def.explanation.replace(/\bX\b/g, String(achievement.currentValue));
        const text = `${def.name} ${tierDisplay}${rankDisplay} — ${explanationWithValue}`;

        // Higher tiers are more impressive
        const tierPriority: Record<string, number> = { bronze: 55, argent: 58, or: 60, lycans: 62 };
        const priority = tierPriority[level.tier] || 60;

        highlights.push({ text, emoji: '🏆', type: 'achievement', priority, navigateTo: 'achievements' });
      }
    }
  }

  return highlights;
}

// --- Monthly ranking highlights ---

export function computeMonthlyRanking(
  playerName: string,
  gameLogData: GameLogData | null
): PlayerHighlight[] {
  if (!gameLogData) return [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Get games from current month
  const monthGames = gameLogData.GameStats.filter(game => {
    const date = new Date(game.StartDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  if (monthGames.length < 3) return []; // Not enough games this month

  // Calculate stats for all players in current month
  const playerStats = new Map<string, { wins: number; games: number }>();

  for (const game of monthGames) {
    for (const ps of game.PlayerStats) {
      const name = ps.Username;
      const stats = playerStats.get(name) || { wins: 0, games: 0 };
      stats.games++;
      if (ps.Victorious) stats.wins++;
      playerStats.set(name, stats);
    }
  }

  // Check eligibility
  const minGames = Math.ceil(monthGames.length * MIN_PARTICIPATION_RATIO);
  const playerStat = playerStats.get(playerName);
  if (!playerStat || playerStat.games < minGames) return [];

  // Rank eligible players
  const eligible = Array.from(playerStats.entries())
    .filter(([_, s]) => s.games >= minGames)
    .map(([name, s]) => ({ name, winRate: (s.wins / s.games) * 100, games: s.games }))
    .sort((a, b) => b.winRate - a.winRate);

  const rank = eligible.findIndex(p => p.name === playerName) + 1;
  if (rank === 0 || rank > 5) return [];

  const playerWinRate = eligible[rank - 1].winRate;
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthLabel = `${monthNames[currentMonth]} ${currentYear}`;

  const ordinals = ['', '1er', '2ème', '3ème', '4ème', '5ème'];
  const text = `${ordinals[rank]} au classement de ${monthLabel} (${playerWinRate.toFixed(0)}% victoires)`;

  const priority = rank === 1 ? 92 : rank <= 3 ? 85 : 78;

  return [{ text, emoji: '📊', type: 'monthly-ranking', priority }];
}

// --- Record kills highlights ---

export function computeRecentKillRecord(
  playerName: string,
  gameLogData: GameLogData | null,
  last10GameIds: string[]
): PlayerHighlight[] {
  if (!gameLogData || last10GameIds.length === 0) return [];

  const last10Set = new Set(last10GameIds);

  // Compute kills per game for this player across ALL games
  let allTimeMax = 0;
  let recentMax = 0;
  let recentMaxGameId = '';

  for (const game of gameLogData.GameStats) {
    const playerInGame = game.PlayerStats.find(ps => ps.Username === playerName);
    if (!playerInGame) continue;

    // Count kills: how many other players have this player as KillerName
    const kills = game.PlayerStats.filter(ps =>
      ps.KillerName === playerName && ps.DeathTiming != null
    ).length;

    if (kills > allTimeMax) {
      allTimeMax = kills;
    }

    if (last10Set.has(game.Id) && kills > recentMax) {
      recentMax = kills;
      recentMaxGameId = game.DisplayedId;
    }
  }

  if (recentMax <= 0) return [];

  // Only highlight if it's a new all-time record or tied with it
  if (recentMax >= allTimeMax && allTimeMax >= 3) {
    const text = `Record de ${recentMax} kills en une partie (Partie #${recentMaxGameId})`;
    return [{ text, emoji: '⚔️', type: 'kill-record', priority: 85 }];
  }

  return [];
}

// --- Record loot highlights ---

export function computeRecentLootRecord(
  playerName: string,
  gameLogData: GameLogData | null,
  last10GameIds: string[]
): PlayerHighlight[] {
  if (!gameLogData || last10GameIds.length === 0) return [];

  const last10Set = new Set(last10GameIds);

  let allTimeMax = 0;
  let recentMax = 0;
  let recentMaxGameId = '';

  for (const game of gameLogData.GameStats) {
    const playerInGame = game.PlayerStats.find(ps => ps.Username === playerName);
    if (!playerInGame || playerInGame.TotalCollectedLoot == null) continue;

    const loot = playerInGame.TotalCollectedLoot;
    if (loot > allTimeMax) {
      allTimeMax = loot;
    }

    if (last10Set.has(game.Id) && loot > recentMax) {
      recentMax = loot;
      recentMaxGameId = game.DisplayedId;
    }
  }

  if (recentMax <= 0) return [];

  // Only highlight if it's a new all-time record
  if (recentMax >= allTimeMax && allTimeMax > 0) {
    const text = `Record de loot : ${recentMax} en une partie (Partie #${recentMaxGameId})`;
    return [{ text, emoji: '💎', type: 'loot-record', priority: 80 }];
  }

  return [];
}

// --- Win rate trend ---

export function computeWinRateTrend(
  playerName: string,
  gameLogData: GameLogData | null
): PlayerHighlight[] {
  if (!gameLogData) return [];

  // Get all games for this player sorted chronologically
  const playerGames: { won: boolean }[] = [];

  // Games are already sorted chronologically in gameLogData.GameStats
  for (const game of gameLogData.GameStats) {
    const playerInGame = game.PlayerStats.find(ps => ps.Username === playerName);
    if (playerInGame) {
      playerGames.push({ won: playerInGame.Victorious });
    }
  }

  if (playerGames.length < WIN_RATE_TREND_MIN_GAMES) return [];

  const careerWinRate = (playerGames.filter(g => g.won).length / playerGames.length) * 100;
  const last20 = playerGames.slice(-20);
  const last20WinRate = (last20.filter(g => g.won).length / last20.length) * 100;

  const delta = last20WinRate - careerWinRate;

  if (Math.abs(delta) < WIN_RATE_TREND_MIN_DELTA) return [];

  if (delta > 0) {
    const text = `En forme : ${last20WinRate.toFixed(0)}% de victoires sur les 20 dernières (vs ${careerWinRate.toFixed(0)}% en carrière)`;
    return [{ text, emoji: '📈', type: 'trend-up', priority: 72 }];
  } else {
    const text = `Passage difficile : ${last20WinRate.toFixed(0)}% sur les 20 dernières (vs ${careerWinRate.toFixed(0)}% en carrière)`;
    return [{ text, emoji: '📉', type: 'trend-down', priority: 65 }];
  }
}

// --- First solo role win ---

export function computeFirstSoloWin(
  playerName: string,
  gameLogData: GameLogData | null,
  last10GameIds: string[]
): PlayerHighlight[] {
  if (!gameLogData || last10GameIds.length === 0) return [];

  const last10Set = new Set(last10GameIds);

  // Track all solo wins for this player, noting which are in the last 10 games
  const soloWinsBeforeLast10 = new Set<string>();
  const soloWinsInLast10: { role: string; gameId: string }[] = [];

  for (const game of gameLogData.GameStats) {
    const playerInGame = game.PlayerStats.find(ps => ps.Username === playerName);
    if (!playerInGame) continue;

    const role = playerInGame.MainRoleInitial;
    if (!SOLO_ROLES.includes(role as typeof SOLO_ROLES[number])) continue;

    if (playerInGame.Victorious) {
      if (last10Set.has(game.Id)) {
        soloWinsInLast10.push({ role, gameId: game.Id });
      } else {
        soloWinsBeforeLast10.add(role);
      }
    }
  }

  // Find a solo win in last 10 that is the FIRST EVER for that role
  const highlights: PlayerHighlight[] = [];
  for (const win of soloWinsInLast10) {
    if (!soloWinsBeforeLast10.has(win.role)) {
      const text = `Première victoire en ${win.role} !`;
      highlights.push({ text, emoji: '🎭', type: 'first-solo-win', priority: 84 });
      break; // Only one
    }
  }

  return highlights;
}

// --- Main aggregator ---

export function computeAllHighlights(
  playerName: string,
  seriesData: PlayerSeriesData | null,
  achievementsData: AchievementsData | null,
  playerAchievements: PlayerAchievements | null,
  gameLogData: GameLogData | null,
  last10GameIds: string[]
): PlayerHighlight[] {
  const all: PlayerHighlight[] = [];

  all.push(...computeCurrentStreaks(playerName, seriesData));
  all.push(...computeRecentAchievements(playerAchievements, achievementsData, last10GameIds));
  all.push(...computeMonthlyRanking(playerName, gameLogData));
  all.push(...computeRecentKillRecord(playerName, gameLogData, last10GameIds));
  all.push(...computeRecentLootRecord(playerName, gameLogData, last10GameIds));
  all.push(...computeWinRateTrend(playerName, gameLogData));
  all.push(...computeFirstSoloWin(playerName, gameLogData, last10GameIds));

  return all;
}

/**
 * Select a highlight from candidates using a random seed.
 * Picks randomly among the top-tier candidates (within 15 priority points of the max).
 */
export function selectHighlight(
  candidates: PlayerHighlight[],
  randomSeed: number
): PlayerHighlight | null {
  if (candidates.length === 0) return null;

  const maxPriority = Math.max(...candidates.map(c => c.priority));
  const threshold = 15;
  const topCandidates = candidates.filter(c => c.priority >= maxPriority - threshold);

  if (topCandidates.length === 0) return null;

  const index = Math.abs(Math.floor(randomSeed * topCandidates.length)) % topCandidates.length;
  return topCandidates[index];
}
