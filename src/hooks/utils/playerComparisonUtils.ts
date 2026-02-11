/**
 * Pure computation functions for player comparison metrics
 */

import type { PlayerStat } from '../../types/api';
import type { GameLogEntry } from '../useCombinedRawData';
import { formatDuration } from '../../utils/gameUtils';
import { calculateGameDuration, getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { getPlayerId } from '../../utils/playerIdentification';


export interface PlayerComparisonMetrics {
  player: string;
  // Normalized metrics (0-100 scale)
  winRateScore: number;             // Overall win rate
  killsPerGameScore: number;        // Average kills per game
  survivalRateScore: number;        // Survival rate (games survived / total games)
  aggressivenessScore: number;      // Voting aggressiveness score
  harvestRateScore: number;         // Harvest collection per 60 minutes
  talkingPerformanceScore: number;  // Performance compared to players with similar talking time
  
  // Raw stats for detailed comparison
  gamesPlayed: number;
  winRate: number;
  avgGameDuration: number;      // If available
  
  // Head-to-head specific
  commonGames: number;          // Games played together with comparison target
  winRateVsOpponent: number;    // Win rate in games with comparison target
}

export interface PlayerComparisonData {
  player1: PlayerComparisonMetrics;
  player2: PlayerComparisonMetrics;
  headToHeadStats: {
    commonGames: number;
    player1Wins: number;
    player2Wins: number;
    averageGameDuration: string;
    // Opposing camp statistics
    opposingCampGames: number;
    player1WinsAsOpponent: number;
    player2WinsAsOpponent: number;
    averageOpposingGameDuration: string;
    // Kill statistics
    player1KilledPlayer2Count: number;
    player2KilledPlayer1Count: number;
    // Same camp statistics
    sameCampGames: number;
    sameCampWins: number;
    averageSameCampDuration: string;
    player1KilledPlayer2SameCamp: number;
    player2KilledPlayer1SameCamp: number;
    // Loups team specific statistics
    sameLoupsGames: number;
    sameLoupsWins: number;
    averageSameLoupsDuration: string;
  };
}

/**
 * Calculate kills per game for a player
 * @param playerIdentifier - Player name or ID to find
 * @param rawGameData - Array of game log entries
 */
export function calculateKillsPerGame(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
): number {
  let totalKills = 0;
  let gamesPlayed = 0;

  rawGameData.forEach(game => {
    const hasPlayer = game.PlayerStats.some(p => 
      getPlayerId(p) === playerIdentifier || 
      p.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );
    
    if (hasPlayer) {
      gamesPlayed++;
      // Count how many players were killed by this player
      const killsInGame = game.PlayerStats.filter(p => 
        p.KillerName && 
        (p.KillerName.toLowerCase() === playerIdentifier.toLowerCase())
      ).length;
      totalKills += killsInGame;
    }
  });

  return gamesPlayed > 0 ? totalKills / gamesPlayed : 0;
}

/**
 * Calculate survival rate for a player
 * @param playerIdentifier - Player name or ID to find
 * @param rawGameData - Array of game log entries
 */
export function calculateSurvivalRate(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
): number {
  let gamesPlayed = 0;
  let gamesSurvived = 0;

  rawGameData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => 
      getPlayerId(p) === playerIdentifier || 
      p.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );
    
    if (playerStat) {
      gamesPlayed++;
      if (!playerStat.DeathTiming) {
        gamesSurvived++;
      }
    }
  });

  return gamesPlayed > 0 ? (gamesSurvived / gamesPlayed) * 100 : 0;
}

/**
 * Calculate voting aggressiveness score for a player
 * @param playerIdentifier - Player name or ID to find
 * @param rawGameData - Array of game log entries
 */
export function calculateAggressivenessScore(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
): number {
  let totalMeetings = 0;
  let totalVotes = 0;
  let totalSkips = 0;
  let totalAbstentions = 0;

  rawGameData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => 
      getPlayerId(p) === playerIdentifier || 
      p.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );
    
    if (playerStat && playerStat.Votes && playerStat.Votes.length > 0) {
      // Group votes by meeting day
      const votesByDay = new Map<number, string>();
      playerStat.Votes.forEach(vote => {
        const day = (vote as any).Day;
        if (day !== undefined && day !== null) {
          votesByDay.set(day, vote.Target);
        }
      });
      
      const meetings = votesByDay.size;
      totalMeetings += meetings;
      
      votesByDay.forEach((target) => {
        if (target === 'Passé') {
          totalSkips++;
        } else {
          totalVotes++;
        }
      });
    }
  });

  if (totalMeetings === 0) return 0;
  
  const votingRate = (totalVotes / totalMeetings) * 100;
  const skippingRate = (totalSkips / totalMeetings) * 100;
  const abstentionRate = (totalAbstentions / totalMeetings) * 100;
  
  // Formula from copilot-instructions.md
  return votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7);
}

/**
 * Calculate harvest rate per 60 minutes for a player
 * Uses player-specific duration (death time if dead, game end time if alive)
 * to match the loot statistics chart calculation (lootStatsUtils.ts)
 * @param playerIdentifier - Player name or ID to find
 * @param rawGameData - Array of game log entries
 */
export function calculateHarvestRate(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
): number {
  let totalLoot = 0;
  let totalGameDurationSeconds = 0;
  let gamesWithLoot = 0;

  rawGameData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => 
      getPlayerId(p) === playerIdentifier || 
      p.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );
    
    if (playerStat && playerStat.TotalCollectedLoot !== undefined && playerStat.TotalCollectedLoot !== null) {
      // Use player-specific duration: if player died, use their death time; otherwise use game end time
      // This matches the calculation in lootStatsUtils.ts for consistent results
      const endTime = playerStat.DeathDateIrl || game.EndDate;
      const duration = calculateGameDuration(game.StartDate, endTime);
      
      if (duration && duration > 0) {
        totalLoot += playerStat.TotalCollectedLoot;
        totalGameDurationSeconds += duration;
        gamesWithLoot++;
      }
    }
  });

  if (gamesWithLoot === 0 || totalGameDurationSeconds === 0) return 0;
  
  // Normalize to per-hour rate
  const normalizationFactor = 3600 / totalGameDurationSeconds;
  return totalLoot * normalizationFactor;
}

/**
 * Calculate talking time consistency score between Villageois and Loup camps
 * Measures how consistently a player talks regardless of their camp assignment
 * Higher score = more consistent (better at not revealing their role through talking behavior)
 * @param playerIdentifier - Player name or ID to find
 * @param rawGameData - Array of game log entries
 */
export function calculateTalkingPerformanceScore(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
): number {
  // Calculate talking time per 60 min for each camp
  const villageoisData = {
    totalSeconds: 0,
    totalDuration: 0,
    gamesPlayed: 0
  };
  
  const loupsData = {
    totalSeconds: 0,
    totalDuration: 0,
    gamesPlayed: 0
  };

  rawGameData.forEach(game => {
    const playerStat = game.PlayerStats.find(p => 
      getPlayerId(p) === playerIdentifier || 
      p.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );
    
    if (playerStat) {
      const totalTalked = (playerStat.SecondsTalkedOutsideMeeting || 0) + (playerStat.SecondsTalkedDuringMeeting || 0);
      
      // Use player-specific duration (ends at death time if died early)
      const endTime = playerStat.DeathDateIrl || game.EndDate;
      const duration = game.StartDate && endTime ? calculateGameDuration(game.StartDate, endTime) : null;
      
      if (totalTalked > 0 && duration && duration > 0) {
        const playerCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));
        
        if (playerCamp === 'Villageois') {
          villageoisData.totalSeconds += totalTalked;
          villageoisData.totalDuration += duration;
          villageoisData.gamesPlayed++;
        } else if (playerCamp === 'Loup') {
          loupsData.totalSeconds += totalTalked;
          loupsData.totalDuration += duration;
          loupsData.gamesPlayed++;
        }
      }
    }
  });

  // Need minimum games in both camps to calculate consistency
  if (villageoisData.gamesPlayed < 5 || loupsData.gamesPlayed < 3) {
    return 10; // Default low score for insufficient data
  }
  
  // Calculate talking rate per 60 minutes for each camp
  const villageoisTalkingRate = (villageoisData.totalSeconds / villageoisData.totalDuration) * 3600;
  const loupsTalkingRate = (loupsData.totalSeconds / loupsData.totalDuration) * 3600;
  
  // Calculate the difference (smaller = better)
  const difference = Math.abs(villageoisTalkingRate - loupsTalkingRate);
  const averageRate = (villageoisTalkingRate + loupsTalkingRate) / 2;
  
  // Calculate percentage difference relative to average
  const percentageDifference = averageRate > 0 ? (difference / averageRate) * 100 : 0;
  
  // Convert to score (0% difference = 100 score, 100%+ difference = 0 score)
  // Using exponential decay for more granular scoring
  const score = Math.max(0, 100 * Math.exp(-percentageDifference / 50));
  
  return score;
}

/**
 * Calculate camp-specific performance for a player
 * @param playerIdentifier - Player name or ID to find
 */
export function calculateCampSpecificPerformance(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
) {
  const playerGameHistory = rawGameData
    .filter(game => {
      return game.PlayerStats.some(p => 
        getPlayerId(p) === playerIdentifier || 
        p.Username.toLowerCase() === playerIdentifier.toLowerCase()
      );
    })
    .map(game => {
      const playerStat = game.PlayerStats.find(p => 
        getPlayerId(p) === playerIdentifier || 
        p.Username.toLowerCase() === playerIdentifier.toLowerCase()
      );
      if (!playerStat) return null;

      const playerCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));
      const playerWon = playerStat.Victorious ? 1 : 0;
      
      return {
        gameNumber: parseInt(game.Id),
        playerCamp,
        playerWon
      };
    })
    .filter(Boolean) as Array<{
      gameNumber: number;
      playerCamp: string;
      playerWon: number;
    }>;

  const villageoisGames = playerGameHistory.filter(g => g.playerCamp === 'Villageois');
  const loupsGames = playerGameHistory.filter(g => g.playerCamp === 'Loup');
  const specialGames = playerGameHistory.filter(g => !['Villageois', 'Loup'].includes(g.playerCamp));

  const villageoisWinRate = villageoisGames.length > 0 
    ? (villageoisGames.reduce((sum, g) => sum + g.playerWon, 0) / villageoisGames.length) * 100 
    : 0;
  
  const loupsWinRate = loupsGames.length > 0 
    ? (loupsGames.reduce((sum, g) => sum + g.playerWon, 0) / loupsGames.length) * 100 
    : 0;
  
  const specialRoleWinRate = specialGames.length > 0 
    ? (specialGames.reduce((sum, g) => sum + g.playerWon, 0) / specialGames.length) * 100 
    : 0;

  return {
    villageoisWinRate,
    loupsWinRate,
    specialRoleWinRate
  };
}

/**
 * Calculate advanced consistency score for a player
 * @param playerIdentifier - Player name or ID to find
 */
export function calculateAdvancedConsistency(
  playerIdentifier: string,
  rawGameData: GameLogEntry[]
): number {
  // Get player's game history with enhanced context
  const playerGameHistory = rawGameData
    .filter(game => {
      return game.PlayerStats.some(p => 
        getPlayerId(p) === playerIdentifier || 
        p.Username.toLowerCase() === playerIdentifier.toLowerCase()
      );
    })
    .map(game => {
      const playerStat = game.PlayerStats.find(p => 
        getPlayerId(p) === playerIdentifier || 
        p.Username.toLowerCase() === playerIdentifier.toLowerCase()
      );
      if (!playerStat) return null;
      const playerCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));
      const playerWon = playerStat.Victorious ? 1 : 0;
      
      return {
        gameNumber: parseInt(game.Id),
        playerCamp,
        playerWon
      };
    })
    .filter(Boolean) as Array<{
      gameNumber: number;
      playerCamp: string;
      playerWon: number;
    }>;

  // Sort chronologically
  playerGameHistory.sort((a, b) => a.gameNumber - b.gameNumber);

  if (playerGameHistory.length < 30) return 25; // Very low score for insufficient data

  // 1. Overall consistency across all games
  const outcomes = playerGameHistory.map(g => g.playerWon);
  
  // 2. Camp-specific consistency analysis
  const villageoisGames = playerGameHistory.filter(g => g.playerCamp === 'Villageois');
  const loupsGames = playerGameHistory.filter(g => g.playerCamp === 'Loup');
  
  let campConsistencyScore = 50;
  
  // Analyze consistency within each camp
  if (villageoisGames.length >= 10) {
    const villageoisOutcomes = villageoisGames.map(g => g.playerWon);
    const villageoisWinRate = villageoisOutcomes.reduce((sum, outcome) => sum + outcome, 0) / villageoisOutcomes.length;
    const villageoisVariance = villageoisOutcomes.reduce((sum, outcome) => sum + Math.pow(outcome - villageoisWinRate, 2), 0) / villageoisOutcomes.length;
    campConsistencyScore += (1 - villageoisVariance) * 20; // Lower variance = higher consistency
  }
  
  if (loupsGames.length >= 10) {
    const loupsOutcomes = loupsGames.map(g => g.playerWon);
    const loupsWinRate = loupsOutcomes.reduce((sum, outcome) => sum + outcome, 0) / loupsOutcomes.length;
    const loupsVariance = loupsOutcomes.reduce((sum, outcome) => sum + Math.pow(outcome - loupsWinRate, 2), 0) / loupsOutcomes.length;
    campConsistencyScore += (1 - loupsVariance) * 20; // Lower variance = higher consistency
  }
  
  // 3. Temporal consistency (performance over time)
  let temporalConsistency = 50;
  if (playerGameHistory.length >= 25) {
    const halfwayPoint = Math.floor(playerGameHistory.length / 2);
    const firstHalf = outcomes.slice(0, halfwayPoint);
    const secondHalf = outcomes.slice(halfwayPoint);
    
    const firstHalfWinRate = firstHalf.reduce((sum, outcome) => sum + outcome, 0) / firstHalf.length;
    const secondHalfWinRate = secondHalf.reduce((sum, outcome) => sum + outcome, 0) / secondHalf.length;
    
    // Penalize large differences between halves
    const temporalStability = 1 - Math.abs(firstHalfWinRate - secondHalfWinRate);
    temporalConsistency = temporalStability * 100;
  }
  
  // 4. Streak analysis (refined)
  let maxStreak = 1;
  let currentStreak = 1;
  let streakChanges = 0;
  
  for (let i = 1; i < outcomes.length; i++) {
    if (outcomes[i] === outcomes[i-1]) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
      streakChanges++;
    }
  }
  
  const volatility = streakChanges / (outcomes.length - 1);
  
  // Balance between too streaky and too volatile
  const optimalVolatility = 0.4; // Some variation is normal
  const volatilityPenalty = Math.abs(volatility - optimalVolatility) * 60;
  
  // Combine all consistency factors
  const finalConsistency = Math.max(0, Math.min(100, 
    (campConsistencyScore * 0.4) + 
    (temporalConsistency * 0.3) + 
    ((100 - volatilityPenalty) * 0.3)
  ));
  
  return finalConsistency;
}

/**
 * Create scaling function for normalizing values to 0-100 range
 */
export function createScaler(values: number[]) {
  if (values.length === 0) return () => 50;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (max === min) return () => 50; // All values are the same
  
  return (val: number) => ((val - min) / (max - min)) * 100;
}

/**
 * Create special role scaler that provides scores from 10-100 for players with 10+ games
 */
export function createSpecialRoleScaler(values: number[]) {
  if (values.length === 0) return (_val: number, gamesCount: number) => gamesCount >= 10 ? 50 : 10;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (max === min) return (_val: number, gamesCount: number) => gamesCount >= 10 ? 50 : 10;
  
  return (val: number, gamesCount: number) => {
    if (gamesCount < 10) return 10; // Low baseline for insufficient data
    return 10 + (((val - min) / (max - min)) * 90); // Scale from 10 to 100
  };
}

/**
 * Generate player comparison data
 * @param player1Identifier - Player 1 name or ID
 * @param player2Identifier - Player 2 name or ID
 */
export function generatePlayerComparison(
  player1Identifier: string,
  player2Identifier: string,
  playerStatsData: { playerStats: PlayerStat[] },
  rawGameData: GameLogEntry[]
): PlayerComparisonData | null {
  // Find players by ID or name
  const player1Stats = playerStatsData.playerStats.find(p => 
    p.player === player1Identifier || 
    (p.player as any).id === player1Identifier // Support ID-based lookup if PlayerStat has id
  );
  const player2Stats = playerStatsData.playerStats.find(p => 
    p.player === player2Identifier || 
    (p.player as any).id === player2Identifier
  );
  
  if (!player1Stats || !player2Stats) return null;

  // Calculate raw metrics for ALL players to establish ranges for dynamic scaling
  const allPlayersRawMetrics = playerStatsData.playerStats.map(playerStat => {
    return {
      player: playerStat.player,
      rawWinRate: (playerStat.wins / playerStat.gamesPlayed) * 100,
      rawKillsPerGame: calculateKillsPerGame(playerStat.player, rawGameData),
      rawSurvivalRate: calculateSurvivalRate(playerStat.player, rawGameData),
      rawAggressiveness: calculateAggressivenessScore(playerStat.player, rawGameData),
      rawHarvestRate: calculateHarvestRate(playerStat.player, rawGameData),
      rawTalkingPerformance: calculateTalkingPerformanceScore(playerStat.player, rawGameData)
    };
  }).filter(metrics => playerStatsData.playerStats.find(p => p.player === metrics.player)!.gamesPlayed >= 30); // Only include players with meaningful participation (30+ games)

  // Calculate dynamic scaling ranges
  const winRateValues = allPlayersRawMetrics.map(m => m.rawWinRate);
  const killsPerGameValues = allPlayersRawMetrics.map(m => m.rawKillsPerGame);
  const survivalRateValues = allPlayersRawMetrics.map(m => m.rawSurvivalRate);
  const aggressivenessValues = allPlayersRawMetrics.map(m => m.rawAggressiveness);
  const harvestRateValues = allPlayersRawMetrics.filter(m => m.rawHarvestRate > 0).map(m => m.rawHarvestRate);
  // Note: talkingPerformance is NOT scaled - raw score is already meaningful (0-100 absolute)

  // Create scaling functions
  const winRateScaler = createScaler(winRateValues);
  const killsPerGameScaler = createScaler(killsPerGameValues);
  const survivalRateScaler = createScaler(survivalRateValues);
  const aggressivenessScaler = createScaler(aggressivenessValues);
  const harvestRateScaler = harvestRateValues.length > 0 ? createScaler(harvestRateValues) : () => 10;
  // No scaler for talking performance - use raw score directly

  // Find common games and head-to-head stats
  const commonGames: GameLogEntry[] = [];
  const opposingCampGames: GameLogEntry[] = [];
  const sameCampGames: GameLogEntry[] = [];
  const sameLoupsGames: GameLogEntry[] = [];
  let player1CommonWins = 0;
  let player2CommonWins = 0;
  let player1OpposingWins = 0;
  let player2OpposingWins = 0;
  let sameCampWins = 0;
  let sameLoupsWins = 0;
  let player1KilledPlayer2Count = 0;
  let player2KilledPlayer1Count = 0;
  let player1KilledPlayer2Opposing = 0;
  let player2KilledPlayer1Opposing = 0;
  let player1KilledPlayer2SameCamp = 0;
  let player2KilledPlayer1SameCamp = 0;
  let totalGameDurationSeconds = 0;
  let gamesWithDuration = 0;
  let totalOpposingGameDurationSeconds = 0;
  let opposingGamesWithDuration = 0;
  let totalSameCampDurationSeconds = 0;
  let sameCampGamesWithDuration = 0;
  let totalSameLoupsDurationSeconds = 0;
  let sameLoupsGamesWithDuration = 0;

  rawGameData.forEach(game => {
    const hasPlayer1 = game.PlayerStats.some(p => 
      getPlayerId(p) === player1Identifier || 
      p.Username.toLowerCase() === player1Identifier.toLowerCase()
    );
    const hasPlayer2 = game.PlayerStats.some(p => 
      getPlayerId(p) === player2Identifier || 
      p.Username.toLowerCase() === player2Identifier.toLowerCase()
    );
    
    if (hasPlayer1 && hasPlayer2) {
      commonGames.push(game);
      
      const player1Stat = game.PlayerStats.find(p => 
        getPlayerId(p) === player1Identifier || 
        p.Username.toLowerCase() === player1Identifier.toLowerCase()
      );
      const player2Stat = game.PlayerStats.find(p => 
        getPlayerId(p) === player2Identifier || 
        p.Username.toLowerCase() === player2Identifier.toLowerCase()
      );
      
      if (!player1Stat || !player2Stat) return;

      const player1Camp = getPlayerCampFromRole(getPlayerFinalRole(player1Stat.MainRoleInitial, player1Stat.MainRoleChanges || []));
      const player2Camp = getPlayerCampFromRole(getPlayerFinalRole(player2Stat.MainRoleInitial, player2Stat.MainRoleChanges || []));

      // Count wins in common games
      const player1Won = player1Stat.Victorious;
      const player2Won = player2Stat.Victorious;
      
      if (player1Won) player1CommonWins++;
      if (player2Won) player2CommonWins++;
      
      // Check for kills between the two players (all common games)
      if (player1Stat.KillerName && player1Stat.KillerName.toLowerCase() === player2Identifier.toLowerCase()) {
        player2KilledPlayer1Count++;
      }
      if (player2Stat.KillerName && player2Stat.KillerName.toLowerCase() === player1Identifier.toLowerCase()) {
        player1KilledPlayer2Count++;
      }
      
      // Duration calculation for common games
      if (game.StartDate && game.EndDate) {
        const duration = calculateGameDuration(game.StartDate, game.EndDate);
        if (duration) {
          totalGameDurationSeconds += duration;
          gamesWithDuration++;
        }
      }
      
      // Check if they were in opposing camps
      // Helper function to determine the main camp affiliation based on werewolf game rules
      const getMainCampAffiliation = (camp: string): string => {
        if (camp === 'Loup' || camp === 'Traître' || camp === 'Louveteau') {
          return 'Loup'; // Wolves team: Loups + Traître + Louveteau (only exception)
        } else {
          // Every other role works alone and is its own camp
          return camp;
        }
      };
      
      const player1MainCamp = getMainCampAffiliation(player1Camp);
      const player2MainCamp = getMainCampAffiliation(player2Camp);
      
      // Players are in opposing camps if they have different camp affiliations
      const isOpposingCamps = player1MainCamp !== player2MainCamp;
      
      if (isOpposingCamps) {
        opposingCampGames.push(game);
        
        if (player1Won) player1OpposingWins++;
        if (player2Won) player2OpposingWins++;
        
        // Track kills when in opposing camps
        if (player1Stat.KillerName && player1Stat.KillerName.toLowerCase() === player2Identifier.toLowerCase()) {
          player2KilledPlayer1Opposing++;
        }
        if (player2Stat.KillerName && player2Stat.KillerName.toLowerCase() === player1Identifier.toLowerCase()) {
          player1KilledPlayer2Opposing++;
        }
        
        if (game.StartDate && game.EndDate) {
          const duration = calculateGameDuration(game.StartDate, game.EndDate);
          if (duration) {
            totalOpposingGameDurationSeconds += duration;
            opposingGamesWithDuration++;
          }
        }
      } else if (player1MainCamp === player2MainCamp) {
        // Same camp affiliation (only possible for Loups+Traître+Louveteau or same exact role)
        sameCampGames.push(game);
        
        // Track kills when in same camp
        if (player1Stat.KillerName && player1Stat.KillerName.toLowerCase() === player2Identifier.toLowerCase()) {
          player2KilledPlayer1SameCamp++;
        }
        if (player2Stat.KillerName && player2Stat.KillerName.toLowerCase() === player1Identifier.toLowerCase()) {
          player1KilledPlayer2SameCamp++;
        }
        
        // Check if both are specifically in the Loups team
        const isBothLoupsTeam = player1MainCamp === 'Loup';
        if (isBothLoupsTeam) {
          sameLoupsGames.push(game);
        }
        
        // Count as team win if either player wins
        if (player1Won || player2Won) {
          sameCampWins++;
          if (isBothLoupsTeam) {
            sameLoupsWins++;
          }
        }
        
        if (game.StartDate && game.EndDate) {
          const duration = calculateGameDuration(game.StartDate, game.EndDate);
          if (duration) {
            totalSameCampDurationSeconds += duration;
            sameCampGamesWithDuration++;
            if (isBothLoupsTeam) {
              totalSameLoupsDurationSeconds += duration;
              sameLoupsGamesWithDuration++;
            }
          }
        }
      }
    }
  });

  // Calculate metrics for both players using dynamic scaling
  const calculateMetrics = (stats: PlayerStat, playerIdentifier: string): PlayerComparisonMetrics => {
    const rawWinRate = (stats.wins / stats.gamesPlayed) * 100;
    const rawKillsPerGame = calculateKillsPerGame(playerIdentifier, rawGameData);
    const rawSurvivalRate = calculateSurvivalRate(playerIdentifier, rawGameData);
    const rawAggressiveness = calculateAggressivenessScore(playerIdentifier, rawGameData);
    const rawHarvestRate = calculateHarvestRate(playerIdentifier, rawGameData);
    const rawTalkingPerformance = calculateTalkingPerformanceScore(playerIdentifier, rawGameData);

    return {
      player: stats.player,
      winRateScore: winRateScaler(rawWinRate),
      killsPerGameScore: killsPerGameScaler(rawKillsPerGame),
      survivalRateScore: survivalRateScaler(rawSurvivalRate),
      aggressivenessScore: aggressivenessScaler(rawAggressiveness),
      harvestRateScore: rawHarvestRate > 0 ? harvestRateScaler(rawHarvestRate) : 10,
      talkingPerformanceScore: rawTalkingPerformance, // Use raw score directly (already 0-100)
      gamesPlayed: stats.gamesPlayed,
      winRate: rawWinRate,
      avgGameDuration: 0, // Could be calculated if needed
      commonGames: commonGames.length,
      winRateVsOpponent: commonGames.length > 0 
        ? (playerIdentifier === player1Identifier ? player1CommonWins : player2CommonWins) / commonGames.length * 100 
        : 0
    };
  };

  const player1Metrics = calculateMetrics(player1Stats, player1Identifier);
  const player2Metrics = calculateMetrics(player2Stats, player2Identifier);

  return {
    player1: player1Metrics,
    player2: player2Metrics,
    headToHeadStats: {
      commonGames: commonGames.length,
      player1Wins: player1CommonWins,
      player2Wins: player2CommonWins,
      averageGameDuration: gamesWithDuration > 0 
        ? formatDuration(totalGameDurationSeconds / gamesWithDuration)
        : "N/A",
      opposingCampGames: opposingCampGames.length,
      player1WinsAsOpponent: player1OpposingWins,
      player2WinsAsOpponent: player2OpposingWins,
      averageOpposingGameDuration: opposingGamesWithDuration > 0 
        ? formatDuration(totalOpposingGameDurationSeconds / opposingGamesWithDuration)
        : "N/A",
      player1KilledPlayer2Count: player1KilledPlayer2Opposing,
      player2KilledPlayer1Count: player2KilledPlayer1Opposing,
      sameCampGames: sameCampGames.length,
      sameCampWins: sameCampWins,
      averageSameCampDuration: sameCampGamesWithDuration > 0 
        ? formatDuration(totalSameCampDurationSeconds / sameCampGamesWithDuration)
        : "N/A",
      player1KilledPlayer2SameCamp: player1KilledPlayer2SameCamp,
      player2KilledPlayer1SameCamp: player2KilledPlayer1SameCamp,
      sameLoupsGames: sameLoupsGames.length,
      sameLoupsWins: sameLoupsWins,
      averageSameLoupsDuration: sameLoupsGamesWithDuration > 0 
        ? formatDuration(totalSameLoupsDurationSeconds / sameLoupsGamesWithDuration)
        : "N/A"
    }
  };
}

/**
 * Get available players with meaningful participation (30+ games)
 */
export function getAvailablePlayersForComparison(playerStatsData: { playerStats: PlayerStat[] } | null): string[] {
  if (!playerStatsData?.playerStats) return [];
  
  return playerStatsData.playerStats
    .filter(player => player.gamesPlayed >= 30)
    .sort((a, b) => a.player.localeCompare(b.player)) // Alphabetical order
    .map(player => player.player);
}
