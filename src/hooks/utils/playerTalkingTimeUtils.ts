import type { GameLogEntry, PlayerStat } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { getPlayerMainCampFromRole } from '../../utils/datasyncExport';
import { calculateGameDuration } from '../../utils/datasyncExport';
import { getRoleDisplayName } from '../../utils/roleUtils';

export type MainCamp = 'Villageois' | 'Loup' | 'Autres';

export interface CampTalkingStats {
  camp: MainCamp;
  gamesPlayed: number;
  totalSecondsOutside: number;
  totalSecondsDuring: number;
  totalSecondsAll: number;
  totalGameDurationSeconds: number;
  // Normalized per 60 minutes
  secondsOutsidePer60Min: number;
  secondsDuringPer60Min: number;
  secondsAllPer60Min: number;
  // Ratios
  meetingRatio: number; // Percentage of talk time during meetings
}

export interface PlayerTalkingTimeDetail {
  playerName: string;
  gamesPlayed: number;
  gamesWithTalkingData: number;
  // Overall stats
  totalSecondsOutside: number;
  totalSecondsDuring: number;
  totalSecondsAll: number;
  totalGameDurationSeconds: number;
  // Normalized per 60 minutes (overall)
  secondsOutsidePer60Min: number;
  secondsDuringPer60Min: number;
  secondsAllPer60Min: number;
  // Meeting ratio (overall)
  meetingRatio: number;
  // Breakdown by camp
  campBreakdown: CampTalkingStats[];
  // Comparison data
  globalAverageSecondsAllPer60Min: number;
  playerRank: number;
  totalPlayersWithData: number;
  percentile: number; // Top X% most talkative
  // Role-specific stats (top 5 roles by talking time)
  roleBreakdown: RoleTalkingStats[];
  // Win correlation
  winCorrelation: WinTalkingCorrelation;
}

export interface RoleTalkingStats {
  role: string;
  gamesPlayed: number;
  secondsAllPer60Min: number;
  totalSecondsAll: number;
}

export interface WinTalkingCorrelation {
  gamesAboveAverage: number;
  winsAboveAverage: number;
  winRateAboveAverage: number;
  gamesBelowAverage: number;
  winsBelowAverage: number;
  winRateBelowAverage: number;
}

export interface AllPlayersTalkingStats {
  playerStats: Map<string, {
    displayName: string;
    gamesPlayed: number;
    totalSecondsAll: number;
    totalGameDuration: number;
  }>;
  gamesWithTalkingData: number;
}

/**
 * Check if a game has talking time data
 */
function gameHasTalkingData(game: GameLogEntry): boolean {
  return game.PlayerStats.some(
    player =>
      player.SecondsTalkedOutsideMeeting > 0 ||
      player.SecondsTalkedDuringMeeting > 0
  );
}

/**
 * Calculate player-specific game duration (until death or game end)
 */
function getPlayerGameDuration(game: GameLogEntry, player: PlayerStat): number {
  const endTime = player.DeathDateIrl || game.EndDate;
  const duration = calculateGameDuration(game.StartDate, endTime);
  return duration && duration > 0 ? duration : 0;
}

/**
 * Compute global statistics for all players (used for ranking)
 */
function computeAllPlayersTalkingStats(gameData: GameLogEntry[]): AllPlayersTalkingStats {
  const gamesWithData = gameData.filter(gameHasTalkingData);
  const playerMap = new Map<string, {
    displayName: string;
    gamesPlayed: number;
    totalSecondsAll: number;
    totalGameDuration: number;
  }>();

  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);
      const duration = getPlayerGameDuration(game, player);

      if (duration <= 0) return;

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          displayName,
          gamesPlayed: 0,
          totalSecondsAll: 0,
          totalGameDuration: 0
        });
      }

      const stats = playerMap.get(playerId)!;
      stats.gamesPlayed++;
      stats.totalSecondsAll += (player.SecondsTalkedOutsideMeeting || 0) + (player.SecondsTalkedDuringMeeting || 0);
      stats.totalGameDuration += duration;
    });
  });

  return {
    playerStats: playerMap,
    gamesWithTalkingData: gamesWithData.length
  };
}

/**
 * Compute detailed talking time statistics for a specific player
 */
export function computePlayerTalkingTimeStats(
  playerName: string,
  gameData: GameLogEntry[]
): PlayerTalkingTimeDetail | null {
  if (!gameData || gameData.length === 0 || !playerName) {
    return null;
  }

  // First, compute global stats for ranking
  const allPlayersStats = computeAllPlayersTalkingStats(gameData);
  const gamesWithData = gameData.filter(gameHasTalkingData);

  if (gamesWithData.length === 0 || allPlayersStats.playerStats.size === 0) {
    return null;
  }

  // Find player's ID by matching name
  let targetPlayerId: string | null = null;
  for (const [playerId, stats] of allPlayersStats.playerStats) {
    if (stats.displayName === playerName) {
      targetPlayerId = playerId;
      break;
    }
  }

  if (!targetPlayerId) {
    return null;
  }

  // Initialize accumulators
  let totalGamesPlayed = 0;
  let totalSecondsOutside = 0;
  let totalSecondsDuring = 0;
  let totalGameDuration = 0;

  // Camp breakdown accumulators
  const campStats: Record<MainCamp, {
    gamesPlayed: number;
    secondsOutside: number;
    secondsDuring: number;
    gameDuration: number;
  }> = {
    Villageois: { gamesPlayed: 0, secondsOutside: 0, secondsDuring: 0, gameDuration: 0 },
    Loup: { gamesPlayed: 0, secondsOutside: 0, secondsDuring: 0, gameDuration: 0 },
    Autres: { gamesPlayed: 0, secondsOutside: 0, secondsDuring: 0, gameDuration: 0 }
  };

  // Role breakdown accumulators
  const roleStats = new Map<string, {
    gamesPlayed: number;
    totalSecondsAll: number;
    totalGameDuration: number;
  }>();

  // Win correlation accumulators
  let gamesAboveAvg = 0, winsAboveAvg = 0;
  let gamesBelowAvg = 0, winsBelowAvg = 0;

  // Process each game for this player
  gamesWithData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => getPlayerId(p) === targetPlayerId);
    if (!playerStat) return;

    const duration = getPlayerGameDuration(game, playerStat);
    if (duration <= 0) return;

    totalGamesPlayed++;
    const secondsOutside = playerStat.SecondsTalkedOutsideMeeting || 0;
    const secondsDuring = playerStat.SecondsTalkedDuringMeeting || 0;
    const secondsAll = secondsOutside + secondsDuring;

    totalSecondsOutside += secondsOutside;
    totalSecondsDuring += secondsDuring;
    totalGameDuration += duration;

    // Camp breakdown
    const camp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
    campStats[camp].gamesPlayed++;
    campStats[camp].secondsOutside += secondsOutside;
    campStats[camp].secondsDuring += secondsDuring;
    campStats[camp].gameDuration += duration;

    // Role breakdown - use display role (power for Villageois Élite)
    const role = getRoleDisplayName(playerStat);
    if (!roleStats.has(role)) {
      roleStats.set(role, { gamesPlayed: 0, totalSecondsAll: 0, totalGameDuration: 0 });
    }
    const roleStat = roleStats.get(role)!;
    roleStat.gamesPlayed++;
    roleStat.totalSecondsAll += secondsAll;
    roleStat.totalGameDuration += duration;

    // Win correlation: calculate per-game normalized talk time
    // This will be used later to compare against player's average
  });

  if (totalGamesPlayed === 0 || totalGameDuration <= 0) {
    return null;
  }

  // Calculate normalized stats (per 60 minutes)
  const normFactor = 3600 / totalGameDuration;
  const secondsOutsidePer60Min = totalSecondsOutside * normFactor;
  const secondsDuringPer60Min = totalSecondsDuring * normFactor;
  const secondsAllPer60Min = (totalSecondsOutside + totalSecondsDuring) * normFactor;
  const meetingRatio = (totalSecondsOutside + totalSecondsDuring) > 0
    ? (totalSecondsDuring / (totalSecondsOutside + totalSecondsDuring)) * 100
    : 0;

  // Build camp breakdown
  const campBreakdown: CampTalkingStats[] = [];
  for (const [camp, stats] of Object.entries(campStats)) {
    if (stats.gamesPlayed === 0) continue;
    
    const campNormFactor = stats.gameDuration > 0 ? 3600 / stats.gameDuration : 0;
    const campTotalAll = stats.secondsOutside + stats.secondsDuring;
    
    campBreakdown.push({
      camp: camp as MainCamp,
      gamesPlayed: stats.gamesPlayed,
      totalSecondsOutside: stats.secondsOutside,
      totalSecondsDuring: stats.secondsDuring,
      totalSecondsAll: campTotalAll,
      totalGameDurationSeconds: stats.gameDuration,
      secondsOutsidePer60Min: stats.secondsOutside * campNormFactor,
      secondsDuringPer60Min: stats.secondsDuring * campNormFactor,
      secondsAllPer60Min: campTotalAll * campNormFactor,
      meetingRatio: campTotalAll > 0 ? (stats.secondsDuring / campTotalAll) * 100 : 0
    });
  }

  // Sort camp breakdown by games played
  campBreakdown.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  // Build role breakdown (top 5 by talking time per 60min)
  const roleBreakdown: RoleTalkingStats[] = Array.from(roleStats.entries())
    .filter(([_, stats]) => stats.gamesPlayed >= 1)
    .map(([role, stats]) => ({
      role,
      gamesPlayed: stats.gamesPlayed,
      secondsAllPer60Min: stats.totalGameDuration > 0 
        ? (stats.totalSecondsAll / stats.totalGameDuration) * 3600 
        : 0,
      totalSecondsAll: stats.totalSecondsAll
    }))
    .sort((a, b) => b.secondsAllPer60Min - a.secondsAllPer60Min)
    .slice(0, 5);

  // Calculate global average and ranking
  const allPlayersNormalized: { id: string; name: string; per60: number }[] = [];
  for (const [playerId, stats] of allPlayersStats.playerStats) {
    if (stats.totalGameDuration > 0) {
      allPlayersNormalized.push({
        id: playerId,
        name: stats.displayName,
        per60: (stats.totalSecondsAll / stats.totalGameDuration) * 3600
      });
    }
  }
  allPlayersNormalized.sort((a, b) => b.per60 - a.per60);

  const globalSum = allPlayersNormalized.reduce((sum, p) => sum + p.per60, 0);
  const globalAverageSecondsAllPer60Min = allPlayersNormalized.length > 0 
    ? globalSum / allPlayersNormalized.length 
    : 0;

  const playerRank = allPlayersNormalized.findIndex(p => p.id === targetPlayerId) + 1;
  const totalPlayersWithData = allPlayersNormalized.length;
  const percentile = totalPlayersWithData > 0 
    ? Math.round((1 - (playerRank - 1) / totalPlayersWithData) * 100) 
    : 0;

  // Win correlation: re-process games to categorize by above/below player's average
  const playerAvgPer60 = secondsAllPer60Min;
  gamesWithData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => getPlayerId(p) === targetPlayerId);
    if (!playerStat) return;

    const duration = getPlayerGameDuration(game, playerStat);
    if (duration <= 0) return;

    const secondsAll = (playerStat.SecondsTalkedOutsideMeeting || 0) + (playerStat.SecondsTalkedDuringMeeting || 0);
    const gamePer60 = (secondsAll / duration) * 3600;

    if (gamePer60 >= playerAvgPer60) {
      gamesAboveAvg++;
      if (playerStat.Victorious) winsAboveAvg++;
    } else {
      gamesBelowAvg++;
      if (playerStat.Victorious) winsBelowAvg++;
    }
  });

  const winCorrelation: WinTalkingCorrelation = {
    gamesAboveAverage: gamesAboveAvg,
    winsAboveAverage: winsAboveAvg,
    winRateAboveAverage: gamesAboveAvg > 0 ? (winsAboveAvg / gamesAboveAvg) * 100 : 0,
    gamesBelowAverage: gamesBelowAvg,
    winsBelowAverage: winsBelowAvg,
    winRateBelowAverage: gamesBelowAvg > 0 ? (winsBelowAvg / gamesBelowAvg) * 100 : 0
  };

  return {
    playerName,
    gamesPlayed: totalGamesPlayed,
    gamesWithTalkingData: allPlayersStats.gamesWithTalkingData,
    totalSecondsOutside,
    totalSecondsDuring,
    totalSecondsAll: totalSecondsOutside + totalSecondsDuring,
    totalGameDurationSeconds: totalGameDuration,
    secondsOutsidePer60Min,
    secondsDuringPer60Min,
    secondsAllPer60Min,
    meetingRatio,
    campBreakdown,
    globalAverageSecondsAllPer60Min,
    playerRank,
    totalPlayersWithData,
    percentile,
    roleBreakdown,
    winCorrelation
  };
}
