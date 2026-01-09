import { useMemo } from 'react';
import { useGameLogData } from '../../hooks/useCombinedRawData';
import { useJoueursData } from '../../hooks/useJoueursData';
import { usePreCalculatedPlayerAchievements } from '../../hooks/usePreCalculatedPlayerAchievements';
import { computePlayerGameHistory } from '../../hooks/utils/playerGameHistoryUtils';
import { calculateAggregatedVotingStats } from '../../hooks/utils/votingStatsUtils';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import type { GameLogEntry, PlayerStat } from '../../hooks/useCombinedRawData';
import type { Player } from '../../types/joueurs';
import type { Achievement } from '../../types/achievements';

// =====================================================
// Configuration Constants
// =====================================================

// Voting style thresholds for aggressiveness score
const VOTING_STYLE_THRESHOLDS = {
  AGGRESSIVE: 60,
  STRATEGIC: 30,
} as const;

// Communication level thresholds (seconds per game average)
const COMMUNICATION_THRESHOLDS = {
  TALKATIVE: 120,
  MODERATE: 60,
} as const;

// Minimum games required for various calculations
const MIN_GAMES = {
  CAMP_STATS: 3,          // Minimum games to include in camp win rate rankings
  GLOBAL_STATS: 10,       // Minimum games for global average calculations
  TEAMMATE_STATS: 5,      // Minimum games together for teammate analysis
  FUN_FACT_STATS: 5,      // Minimum games for fun fact inclusion
  VOTE_STATS: 20,         // Minimum votes for accuracy calculations
  TARGET_STATS: 5,        // Minimum times targeted for survival rate
} as const;

// Strength/weakness thresholds (percentage difference from average)
const PERFORMANCE_THRESHOLDS = {
  STRENGTH: 10,           // Minimum % above average to be considered a strength
  WEAKNESS: 10,           // Minimum % below average to be considered a weakness
  MAP_STRENGTH: 15,       // Minimum % difference for map-specific insights
  SURVIVAL_STRONG: 60,    // Survival rate to be considered strong
  SURVIVAL_WEAK: 30,      // Survival rate to be considered weak
  VOTE_ACCURACY_STRONG: 70,
  VOTE_ACCURACY_WEAK: 40,
} as const;

// Fun fact thresholds
const FUN_FACT_THRESHOLDS = {
  MIN_KILL_COUNT: 10,     // Minimum wolf kills to show fun fact
  MIN_WIN_STREAK: 5,      // Minimum win streak to show fun fact
  MIN_NEMESIS_KILLS: 3,   // Minimum deaths by same player to show nemesis
  BEST_DAY_WIN_RATE: 60,  // Minimum win rate on best day
  BEST_TEAMMATE_WIN_RATE: 60, // Minimum win rate with best teammate
} as const;

// =====================================================
// Types
// =====================================================

export interface PlayerIdentity {
  name: string;
  steamId: string | null;
  avatar: string | null;
  socialLinks: { twitch?: string | null; youtube?: string | null };
  firstGameDate: string;
  lastGameDate: string;
  totalPlayTime: number;
  totalGames: number;
  totalWins: number;
  winRate: number;
  color: string | null;
}

export interface PlaystyleProfile {
  // Voting behavior
  votingStyle: 'aggressive' | 'cautious' | 'strategic' | 'unknown';
  votingRate: number;
  voteAccuracy: number;
  aggressivenessScore: number;
  
  // Communication
  communicationLevel: 'talkative' | 'moderate' | 'quiet' | 'unknown';
  talkingTimePerGame: number;
  talkingRatioMeetingVsOutside: number;
  
  // Survival
  averageSurvivalTiming: 'early-death' | 'mid-game' | 'late-game' | 'survivor' | 'unknown';
  survivalRate: number;
  survivalRateWhenTargeted: number;
  
  // Role preferences
  favoriteCamp: string;
  bestCamp: { camp: string; winRate: number };
  worstCamp: { camp: string; winRate: number };
}

export interface StrengthWeakness {
  type: 'strength' | 'weakness';
  category: 'camp' | 'map' | 'role' | 'voting' | 'survival' | 'general';
  description: string;
  value?: number;
  comparisonValue?: number;
}

export interface Comparison {
  metric: string;
  playerValue: number;
  globalAverage: number;
  percentile?: number;
  difference: number;
  unit?: string;
}

export interface FunFact {
  emoji: string;
  title: string;
  description: string;
  value?: string | number;
}

export interface PlayerInsights {
  identity: PlayerIdentity;
  playstyle: PlaystyleProfile;
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
  comparisons: Comparison[];
  funFacts: FunFact[];
  topAchievements: Achievement[];
}

// =====================================================
// Computation Functions
// =====================================================

function computeIdentity(
  playerName: string,
  gameData: GameLogEntry[],
  joueursInfo: Player | null
): PlayerIdentity | null {
  // Find all games where this player participated
  const playerGames: { game: GameLogEntry; playerStat: PlayerStat }[] = [];
  let steamId: string | null = null;
  
  gameData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat) {
      playerGames.push({ game, playerStat });
      if (!steamId && playerStat.ID) {
        steamId = playerStat.ID;
      }
    }
  });
  
  if (playerGames.length === 0) return null;
  
  // Calculate statistics
  const totalGames = playerGames.length;
  const totalWins = playerGames.filter(pg => pg.playerStat.Victorious).length;
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
  
  // Calculate total play time from talking time (rough approximation of engagement)
  const totalTalkingTime = playerGames.reduce((sum, pg) => {
    return sum + (pg.playerStat.SecondsTalkedOutsideMeeting || 0) + 
                 (pg.playerStat.SecondsTalkedDuringMeeting || 0);
  }, 0);
  
  // Get date range
  const gameDates = playerGames.map(pg => new Date(pg.game.StartDate)).sort((a, b) => a.getTime() - b.getTime());
  const firstGameDate = gameDates[0]?.toLocaleDateString('fr-FR') || '';
  const lastGameDate = gameDates[gameDates.length - 1]?.toLocaleDateString('fr-FR') || '';
  
  // Get most used color
  const colorCounts: Record<string, number> = {};
  playerGames.forEach(pg => {
    const color = pg.playerStat.Color;
    if (color) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  });
  const mostUsedColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  return {
    name: playerName,
    steamId,
    avatar: joueursInfo?.Image || null,
    socialLinks: {
      twitch: joueursInfo?.Twitch || null,
      youtube: joueursInfo?.Youtube || null,
    },
    firstGameDate,
    lastGameDate,
    totalPlayTime: totalTalkingTime,
    totalGames,
    totalWins,
    winRate,
    color: mostUsedColor,
  };
}

function computePlaystyle(
  playerName: string,
  gameData: GameLogEntry[]
): PlaystyleProfile {
  // Filter games where player participated
  const playerGames = gameData.filter(game => 
    game.PlayerStats.some(p => p.Username === playerName)
  );
  
  if (playerGames.length === 0) {
    return {
      votingStyle: 'unknown',
      votingRate: 0,
      voteAccuracy: 0,
      aggressivenessScore: 0,
      communicationLevel: 'unknown',
      talkingTimePerGame: 0,
      talkingRatioMeetingVsOutside: 0,
      averageSurvivalTiming: 'unknown',
      survivalRate: 0,
      survivalRateWhenTargeted: 0,
      favoriteCamp: 'Inconnu',
      bestCamp: { camp: 'Inconnu', winRate: 0 },
      worstCamp: { camp: 'Inconnu', winRate: 0 },
    };
  }
  
  // Calculate voting stats using existing utility
  const votingStats = calculateAggregatedVotingStats(playerGames);
  const playerBehavior = votingStats.playerBehaviorStats.find(p => p.playerName === playerName);
  const playerAccuracy = votingStats.playerAccuracyStats.find(p => p.playerName === playerName);
  const playerTargets = votingStats.playerTargetStats.find(p => p.playerName === playerName);
  
  // Determine voting style based on aggressiveness score
  let votingStyle: 'aggressive' | 'cautious' | 'strategic' | 'unknown' = 'unknown';
  const aggressiveness = playerBehavior?.aggressivenessScore || 0;
  if (aggressiveness > VOTING_STYLE_THRESHOLDS.AGGRESSIVE) votingStyle = 'aggressive';
  else if (aggressiveness > VOTING_STYLE_THRESHOLDS.STRATEGIC) votingStyle = 'strategic';
  else if (aggressiveness >= 0) votingStyle = 'cautious';
  
  // Calculate communication level
  let totalTalkingTime = 0;
  let totalMeetingTime = 0;
  let totalOutsideTime = 0;
  
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat) {
      const meetingTime = playerStat.SecondsTalkedDuringMeeting || 0;
      const outsideTime = playerStat.SecondsTalkedOutsideMeeting || 0;
      totalMeetingTime += meetingTime;
      totalOutsideTime += outsideTime;
      totalTalkingTime += meetingTime + outsideTime;
    }
  });
  
  const avgTalkingTimePerGame = playerGames.length > 0 ? totalTalkingTime / playerGames.length : 0;
  let communicationLevel: 'talkative' | 'moderate' | 'quiet' | 'unknown' = 'unknown';
  if (avgTalkingTimePerGame > COMMUNICATION_THRESHOLDS.TALKATIVE) communicationLevel = 'talkative';
  else if (avgTalkingTimePerGame > COMMUNICATION_THRESHOLDS.MODERATE) communicationLevel = 'moderate';
  else if (avgTalkingTimePerGame >= 0) communicationLevel = 'quiet';
  
  const talkingRatio = totalTalkingTime > 0 ? totalMeetingTime / totalTalkingTime : 0;
  
  // Calculate survival patterns
  let survived = 0;
  let diedEarly = 0;
  let diedMid = 0;
  let diedLate = 0;
  
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat) {
      if (!playerStat.DeathTiming) {
        survived++;
      } else {
        const timing = playerStat.DeathTiming.toUpperCase();
        const dayMatch = timing.match(/[NJM](\d+)/);
        const day = dayMatch ? parseInt(dayMatch[1]) : 0;
        if (day <= 2) diedEarly++;
        else if (day <= 4) diedMid++;
        else diedLate++;
      }
    }
  });
  
  let averageSurvivalTiming: 'early-death' | 'mid-game' | 'late-game' | 'survivor' | 'unknown' = 'unknown';
  const maxCategory = Math.max(survived, diedEarly, diedMid, diedLate);
  if (maxCategory === survived) averageSurvivalTiming = 'survivor';
  else if (maxCategory === diedEarly) averageSurvivalTiming = 'early-death';
  else if (maxCategory === diedMid) averageSurvivalTiming = 'mid-game';
  else if (maxCategory === diedLate) averageSurvivalTiming = 'late-game';
  
  const survivalRate = playerGames.length > 0 ? (survived / playerGames.length) * 100 : 0;
  
  // Calculate camp stats
  const campStats: Record<string, { games: number; wins: number }> = {};
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat) {
      const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const camp = getPlayerCampFromRole(finalRole, { regroupWolfSubRoles: true });
      if (!campStats[camp]) {
        campStats[camp] = { games: 0, wins: 0 };
      }
      campStats[camp].games++;
      if (playerStat.Victorious) {
        campStats[camp].wins++;
      }
    }
  });
  
  // Find favorite, best, and worst camps
  const campEntries = Object.entries(campStats);
  const favoriteCamp = campEntries.sort((a, b) => b[1].games - a[1].games)[0]?.[0] || 'Inconnu';
  
  const campWinRates = campEntries
    .filter(([_, stats]) => stats.games >= MIN_GAMES.CAMP_STATS)
    .map(([camp, stats]) => ({
      camp,
      winRate: (stats.wins / stats.games) * 100,
    }))
    .sort((a, b) => b.winRate - a.winRate);
  
  const bestCamp = campWinRates[0] || { camp: 'Inconnu', winRate: 0 };
  const worstCamp = campWinRates[campWinRates.length - 1] || { camp: 'Inconnu', winRate: 0 };
  
  return {
    votingStyle,
    votingRate: playerBehavior?.votingRate || 0,
    voteAccuracy: playerAccuracy?.accuracyRate || 0,
    aggressivenessScore: aggressiveness,
    communicationLevel,
    talkingTimePerGame: avgTalkingTimePerGame,
    talkingRatioMeetingVsOutside: talkingRatio,
    averageSurvivalTiming,
    survivalRate,
    survivalRateWhenTargeted: playerTargets?.survivalRate || 0,
    favoriteCamp,
    bestCamp,
    worstCamp,
  };
}

function computeStrengthsWeaknesses(
  playerName: string,
  gameData: GameLogEntry[],
  playstyle: PlaystyleProfile
): { strengths: StrengthWeakness[]; weaknesses: StrengthWeakness[] } {
  const strengths: StrengthWeakness[] = [];
  const weaknesses: StrengthWeakness[] = [];
  
  // Get player's history
  const playerHistory = computePlayerGameHistory(playerName, gameData);
  if (!playerHistory) return { strengths, weaknesses };
  
  const globalWinRate = parseFloat(playerHistory.winRate);
  
  // Calculate global averages for comparison
  const allPlayerStats: Record<string, { games: number; wins: number }> = {};
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const name = player.Username;
      if (!allPlayerStats[name]) {
        allPlayerStats[name] = { games: 0, wins: 0 };
      }
      allPlayerStats[name].games++;
      if (player.Victorious) {
        allPlayerStats[name].wins++;
      }
    });
  });
  
  const avgWinRates = Object.values(allPlayerStats)
    .filter(s => s.games >= 10)
    .map(s => (s.wins / s.games) * 100);
  const globalAvgWinRate = avgWinRates.length > 0 
    ? avgWinRates.reduce((a, b) => a + b, 0) / avgWinRates.length 
    : 50;
  
  // Camp-based strengths/weaknesses
  if (playstyle.bestCamp.winRate > globalAvgWinRate + PERFORMANCE_THRESHOLDS.STRENGTH) {
    const diff = playstyle.bestCamp.winRate - globalAvgWinRate;
    strengths.push({
      type: 'strength',
      category: 'camp',
      description: `Excelle en tant que ${playstyle.bestCamp.camp} (+${diff.toFixed(1)}% par rapport à la moyenne)`,
      value: playstyle.bestCamp.winRate,
      comparisonValue: globalAvgWinRate,
    });
  }
  
  if (playstyle.worstCamp.winRate < globalAvgWinRate - PERFORMANCE_THRESHOLDS.WEAKNESS && playstyle.worstCamp.camp !== 'Inconnu') {
    const diff = globalAvgWinRate - playstyle.worstCamp.winRate;
    weaknesses.push({
      type: 'weakness',
      category: 'camp',
      description: `Performances plus faibles en tant que ${playstyle.worstCamp.camp} (-${diff.toFixed(1)}% par rapport à la moyenne)`,
      value: playstyle.worstCamp.winRate,
      comparisonValue: globalAvgWinRate,
    });
  }
  
  // Survival-based
  if (playstyle.survivalRateWhenTargeted > PERFORMANCE_THRESHOLDS.SURVIVAL_STRONG) {
    strengths.push({
      type: 'strength',
      category: 'survival',
      description: `Fort taux de survie quand ciblé lors des votes (${playstyle.survivalRateWhenTargeted.toFixed(0)}%)`,
      value: playstyle.survivalRateWhenTargeted,
    });
  } else if (playstyle.survivalRateWhenTargeted < PERFORMANCE_THRESHOLDS.SURVIVAL_WEAK && playstyle.survivalRateWhenTargeted > 0) {
    weaknesses.push({
      type: 'weakness',
      category: 'survival',
      description: `Faible taux de survie quand ciblé lors des votes (${playstyle.survivalRateWhenTargeted.toFixed(0)}%)`,
      value: playstyle.survivalRateWhenTargeted,
    });
  }
  
  // Vote accuracy
  if (playstyle.voteAccuracy > PERFORMANCE_THRESHOLDS.VOTE_ACCURACY_STRONG) {
    strengths.push({
      type: 'strength',
      category: 'voting',
      description: `Excellente précision de vote contre le camp adverse (${playstyle.voteAccuracy.toFixed(0)}%)`,
      value: playstyle.voteAccuracy,
    });
  } else if (playstyle.voteAccuracy < PERFORMANCE_THRESHOLDS.VOTE_ACCURACY_WEAK && playstyle.voteAccuracy > 0) {
    weaknesses.push({
      type: 'weakness',
      category: 'voting',
      description: `Précision de vote à améliorer (${playstyle.voteAccuracy.toFixed(0)}% contre le camp adverse)`,
      value: playstyle.voteAccuracy,
    });
  }
  
  // Map-based
  Object.entries(playerHistory.mapStats).forEach(([mapName, stats]) => {
    if (stats.appearances >= 5) {
      const mapWinRate = parseFloat(stats.winRate);
      if (mapWinRate > globalWinRate + PERFORMANCE_THRESHOLDS.MAP_STRENGTH) {
        strengths.push({
          type: 'strength',
          category: 'map',
          description: `Très performant sur ${mapName} (${mapWinRate.toFixed(0)}% de victoires)`,
          value: mapWinRate,
          comparisonValue: globalWinRate,
        });
      } else if (mapWinRate < globalWinRate - PERFORMANCE_THRESHOLDS.MAP_STRENGTH) {
        weaknesses.push({
          type: 'weakness',
          category: 'map',
          description: `Moins à l'aise sur ${mapName} (${mapWinRate.toFixed(0)}% de victoires)`,
          value: mapWinRate,
          comparisonValue: globalWinRate,
        });
      }
    }
  });
  
  // Communication
  if (playstyle.communicationLevel === 'talkative' && playstyle.talkingTimePerGame > 150) {
    strengths.push({
      type: 'strength',
      category: 'general',
      description: `Joueur très communicatif (${Math.round(playstyle.talkingTimePerGame)}s de parole par partie en moyenne)`,
      value: playstyle.talkingTimePerGame,
    });
  }
  
  return { strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5) };
}

function computeComparisons(
  _playerName: string,
  gameData: GameLogEntry[],
  identity: PlayerIdentity,
  playstyle: PlaystyleProfile
): Comparison[] {
  const comparisons: Comparison[] = [];
  
  // Calculate global averages
  const allPlayerStats: Record<string, { games: number; wins: number; talkTime: number }> = {};
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const name = player.Username;
      if (!allPlayerStats[name]) {
        allPlayerStats[name] = { games: 0, wins: 0, talkTime: 0 };
      }
      allPlayerStats[name].games++;
      if (player.Victorious) {
        allPlayerStats[name].wins++;
      }
      allPlayerStats[name].talkTime += (player.SecondsTalkedDuringMeeting || 0) + 
                                        (player.SecondsTalkedOutsideMeeting || 0);
    });
  });
  
  const playersWithMinGames = Object.entries(allPlayerStats).filter(([_, s]) => s.games >= MIN_GAMES.GLOBAL_STATS);
  
  // Win rate comparison
  const avgWinRates = playersWithMinGames.map(([_, s]) => (s.wins / s.games) * 100);
  const globalAvgWinRate = avgWinRates.length > 0 
    ? avgWinRates.reduce((a, b) => a + b, 0) / avgWinRates.length 
    : 50;
  
  comparisons.push({
    metric: 'Taux de victoire',
    playerValue: identity.winRate,
    globalAverage: globalAvgWinRate,
    difference: identity.winRate - globalAvgWinRate,
    unit: '%',
  });
  
  // Voting accuracy comparison
  const votingStats = calculateAggregatedVotingStats(gameData);
  const allAccuracies = votingStats.playerAccuracyStats
    .filter(p => p.totalVotes >= MIN_GAMES.VOTE_STATS)
    .map(p => p.accuracyRate);
  const avgAccuracy = allAccuracies.length > 0 
    ? allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length 
    : 50;
  
  comparisons.push({
    metric: 'Précision des votes',
    playerValue: playstyle.voteAccuracy,
    globalAverage: avgAccuracy,
    difference: playstyle.voteAccuracy - avgAccuracy,
    unit: '%',
  });
  
  // Talking time comparison
  const avgTalkTimes = playersWithMinGames.map(([_, s]) => s.talkTime / s.games);
  const globalAvgTalkTime = avgTalkTimes.length > 0 
    ? avgTalkTimes.reduce((a, b) => a + b, 0) / avgTalkTimes.length 
    : 60;
  
  comparisons.push({
    metric: 'Temps de parole moyen',
    playerValue: playstyle.talkingTimePerGame,
    globalAverage: globalAvgTalkTime,
    difference: playstyle.talkingTimePerGame - globalAvgTalkTime,
    unit: 's/partie',
  });
  
  // Survival rate comparison
  const allSurvivalRates = votingStats.playerTargetStats
    .filter(p => p.totalTimesTargeted >= MIN_GAMES.TARGET_STATS)
    .map(p => p.survivalRate);
  const avgSurvivalRate = allSurvivalRates.length > 0 
    ? allSurvivalRates.reduce((a, b) => a + b, 0) / allSurvivalRates.length 
    : 50;
  
  comparisons.push({
    metric: 'Survie quand ciblé',
    playerValue: playstyle.survivalRateWhenTargeted,
    globalAverage: avgSurvivalRate,
    difference: playstyle.survivalRateWhenTargeted - avgSurvivalRate,
    unit: '%',
  });
  
  return comparisons;
}

function computeFunFacts(
  playerName: string,
  gameData: GameLogEntry[]
): FunFact[] {
  const funFacts: FunFact[] = [];
  
  // Filter games where player participated
  const playerGames = gameData.filter(game => 
    game.PlayerStats.some(p => p.Username === playerName)
  );
  
  if (playerGames.length === 0) return funFacts;
  
  // Color affinity
  const colorCounts: Record<string, { games: number; wins: number }> = {};
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat?.Color) {
      if (!colorCounts[playerStat.Color]) {
        colorCounts[playerStat.Color] = { games: 0, wins: 0 };
      }
      colorCounts[playerStat.Color].games++;
      if (playerStat.Victorious) {
        colorCounts[playerStat.Color].wins++;
      }
    }
  });
  
  const favoriteColor = Object.entries(colorCounts)
    .sort((a, b) => b[1].games - a[1].games)[0];
  
  if (favoriteColor && favoriteColor[1].games >= MIN_GAMES.FUN_FACT_STATS) {
    const winRate = (favoriteColor[1].wins / favoriteColor[1].games * 100).toFixed(0);
    funFacts.push({
      emoji: '🎨',
      title: 'Couleur préférée',
      description: `${favoriteColor[0]} (${favoriteColor[1].games} parties, ${winRate}% victoires)`,
    });
  }
  
  // Most killed by
  const killedByCounts: Record<string, number> = {};
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat?.KillerName && playerStat.KillerName !== playerName) {
      killedByCounts[playerStat.KillerName] = (killedByCounts[playerStat.KillerName] || 0) + 1;
    }
  });
  
  const nemesis = Object.entries(killedByCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (nemesis && nemesis[1] >= FUN_FACT_THRESHOLDS.MIN_NEMESIS_KILLS) {
    funFacts.push({
      emoji: '💀',
      title: 'Némésis',
      description: `Tué ${nemesis[1]} fois par ${nemesis[0]}`,
    });
  }
  
  // Best teammate (same team wins)
  const teammateWins: Record<string, { together: number; wins: number }> = {};
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (!playerStat) return;
    
    const playerCamp = getPlayerCampFromRole(
      getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []),
      { regroupWolfSubRoles: true }
    );
    
    game.PlayerStats.forEach(teammate => {
      if (teammate.Username === playerName) return;
      
      const teammateCamp = getPlayerCampFromRole(
        getPlayerFinalRole(teammate.MainRoleInitial, teammate.MainRoleChanges || []),
        { regroupWolfSubRoles: true }
      );
      
      if (playerCamp === teammateCamp) {
        if (!teammateWins[teammate.Username]) {
          teammateWins[teammate.Username] = { together: 0, wins: 0 };
        }
        teammateWins[teammate.Username].together++;
        if (playerStat.Victorious) {
          teammateWins[teammate.Username].wins++;
        }
      }
    });
  });
  
  const bestTeammate = Object.entries(teammateWins)
    .filter(([_, stats]) => stats.together >= MIN_GAMES.TEAMMATE_STATS)
    .map(([name, stats]) => ({
      name,
      winRate: (stats.wins / stats.together) * 100,
      together: stats.together,
    }))
    .sort((a, b) => b.winRate - a.winRate)[0];
  
  if (bestTeammate && bestTeammate.winRate > FUN_FACT_THRESHOLDS.BEST_TEAMMATE_WIN_RATE) {
    funFacts.push({
      emoji: '🤝',
      title: 'Meilleur coéquipier',
      description: `${bestTeammate.winRate.toFixed(0)}% de victoires avec ${bestTeammate.name} (${bestTeammate.together} parties)`,
    });
  }
  
  // Win streak (consecutive wins)
  let maxWinStreak = 0;
  let currentStreak = 0;
  const sortedGames = [...playerGames].sort((a, b) => 
    new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
  );
  
  sortedGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (playerStat?.Victorious) {
      currentStreak++;
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  if (maxWinStreak >= FUN_FACT_THRESHOLDS.MIN_WIN_STREAK) {
    funFacts.push({
      emoji: '🔥',
      title: 'Meilleure série de victoires',
      description: `${maxWinStreak} victoires consécutives`,
    });
  }
  
  // Day of the week performance
  const dayStats: Record<string, { games: number; wins: number }> = {};
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  
  playerGames.forEach(game => {
    const playerStat = game.PlayerStats.find(p => p.Username === playerName);
    if (!playerStat) return;
    
    const dayOfWeek = new Date(game.StartDate).getDay();
    const dayName = dayNames[dayOfWeek];
    
    if (!dayStats[dayName]) {
      dayStats[dayName] = { games: 0, wins: 0 };
    }
    dayStats[dayName].games++;
    if (playerStat.Victorious) {
      dayStats[dayName].wins++;
    }
  });
  
  const bestDay = Object.entries(dayStats)
    .filter(([_, stats]) => stats.games >= MIN_GAMES.FUN_FACT_STATS)
    .map(([day, stats]) => ({
      day,
      winRate: (stats.wins / stats.games) * 100,
      games: stats.games,
    }))
    .sort((a, b) => b.winRate - a.winRate)[0];
  
  if (bestDay && bestDay.winRate > FUN_FACT_THRESHOLDS.BEST_DAY_WIN_RATE) {
    funFacts.push({
      emoji: '📅',
      title: 'Meilleur jour',
      description: `${bestDay.winRate.toFixed(0)}% de victoires le ${bestDay.day}`,
    });
  }
  
  // Total kills as wolf
  let totalKillsAsWolf = 0;
  playerGames.forEach(game => {
    game.PlayerStats.forEach(victim => {
      if (victim.KillerName === playerName) {
        const playerStat = game.PlayerStats.find(p => p.Username === playerName);
        if (playerStat) {
          const camp = getPlayerCampFromRole(
            getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []),
            { regroupWolfSubRoles: true }
          );
          if (camp === 'Loup') {
            totalKillsAsWolf++;
          }
        }
      }
    });
  });
  
  if (totalKillsAsWolf >= FUN_FACT_THRESHOLDS.MIN_KILL_COUNT) {
    funFacts.push({
      emoji: '🐺',
      title: 'Victimes en tant que Loup',
      description: `${totalKillsAsWolf} joueurs éliminés en tant que Loup`,
    });
  }
  
  return funFacts.slice(0, 6);
}

// =====================================================
// Main Hook
// =====================================================

export function usePlayerInsights(playerName: string | null): {
  data: PlayerInsights | null;
  isLoading: boolean;
  error: string | null;
} {
  const { data: gameLogData, isLoading: gameLogLoading, error: gameLogError } = useGameLogData();
  const { joueursData, isLoading: joueursLoading, error: joueursError } = useJoueursData();
  const { data: achievements, isLoading: achievementsLoading } = usePreCalculatedPlayerAchievements(playerName);
  
  const insights = useMemo((): PlayerInsights | null => {
    if (!playerName || !gameLogData?.GameStats) return null;
    
    const gameData = gameLogData.GameStats;
    
    // Find joueurs info for this player
    const joueursInfo = joueursData?.Players?.find(p => p.Joueur === playerName) || null;
    
    // Compute identity
    const identity = computeIdentity(playerName, gameData, joueursInfo);
    if (!identity) return null;
    
    // Compute playstyle
    const playstyle = computePlaystyle(playerName, gameData);
    
    // Compute strengths and weaknesses
    const { strengths, weaknesses } = computeStrengthsWeaknesses(playerName, gameData, playstyle);
    
    // Compute comparisons
    const comparisons = computeComparisons(playerName, gameData, identity, playstyle);
    
    // Compute fun facts
    const funFacts = computeFunFacts(playerName, gameData);
    
    // Get top achievements (first 3)
    const topAchievements = achievements?.allGamesAchievements?.slice(0, 3) || [];
    
    return {
      identity,
      playstyle,
      strengths,
      weaknesses,
      comparisons,
      funFacts,
      topAchievements,
    };
  }, [playerName, gameLogData, joueursData, achievements]);
  
  return {
    data: insights,
    isLoading: gameLogLoading || joueursLoading || achievementsLoading,
    error: gameLogError || joueursError,
  };
}
