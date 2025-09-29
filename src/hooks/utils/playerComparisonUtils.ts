/**
 * Pure computation functions for player comparison metrics
 */

import type { PlayerStat } from '../../types/api';
import type { GameLogEntry } from '../useCombinedRawData';
import { calculateGameDuration, formatDuration, getPlayerCampFromRole } from '../../utils/gameUtils';


export interface PlayerComparisonMetrics {
  player: string;
  // Normalized metrics (0-100 scale)
  participationScore: number;       // Based on games played vs max
  winRateScore: number;             // Based on win rate vs average
  consistencyScore: number;         // Based on standard deviation of performance
  villageoisMastery: number;        // Success rate as Villageois
  loupsEfficiency: number;          // Success rate as Loups
  specialRoleAdaptability: number;  // Success with special roles
  
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
    // Same camp statistics
    sameCampGames: number;
    sameCampWins: number;
    averageSameCampDuration: string;
    // Loups team specific statistics
    sameLoupsGames: number;
    sameLoupsWins: number;
    averageSameLoupsDuration: string;
  };
}

/**
 * Calculate camp-specific performance for a player
 */
export function calculateCampSpecificPerformance(
  playerName: string,
  rawGameData: GameLogEntry[]
) {
  const playerGameHistory = rawGameData
    .filter(game => {
      return game.PlayerStats.some(p => p.Username.toLowerCase() === playerName.toLowerCase());
    })
    .map(game => {
      const playerStat = game.PlayerStats.find(p => p.Username.toLowerCase() === playerName.toLowerCase());
      if (!playerStat) return null;
      
      const playerCamp = getPlayerCampFromRole(playerStat.MainRoleFinal);
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
 */
export function calculateAdvancedConsistency(
  playerName: string,
  rawGameData: GameLogEntry[]
): number {
  // Get player's game history with enhanced context
  const playerGameHistory = rawGameData
    .filter(game => {
      return game.PlayerStats.some(p => p.Username.toLowerCase() === playerName.toLowerCase());
    })
    .map(game => {
      const playerStat = game.PlayerStats.find(p => p.Username.toLowerCase() === playerName.toLowerCase());
      if (!playerStat) return null;
      const playerCamp = getPlayerCampFromRole(playerStat.MainRoleFinal);
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
 */
export function generatePlayerComparison(
  player1Name: string,
  player2Name: string,
  playerStatsData: { playerStats: PlayerStat[] },
  rawGameData: GameLogEntry[]
): PlayerComparisonData | null {
  const player1Stats = playerStatsData.playerStats.find(p => p.player === player1Name);
  const player2Stats = playerStatsData.playerStats.find(p => p.player === player2Name);
  
  if (!player1Stats || !player2Stats) return null;

  // Calculate raw metrics for ALL players to establish ranges for dynamic scaling
  const allPlayersRawMetrics = playerStatsData.playerStats.map(playerStat => {
    const campPerformance = calculateCampSpecificPerformance(playerStat.player, rawGameData);
    const consistencyScore = calculateAdvancedConsistency(playerStat.player, rawGameData);
    
    return {
      player: playerStat.player,
      rawParticipation: playerStat.gamesPlayed,
      rawWinRate: (playerStat.wins / playerStat.gamesPlayed) * 100,
      rawConsistency: consistencyScore,
      rawVillageoisMastery: campPerformance.villageoisWinRate,
      rawLoupsEfficiency: campPerformance.loupsWinRate,
      rawSpecialRoleAdaptability: campPerformance.specialRoleWinRate,
      villageoisGames: rawGameData.filter(game => {
        const playerInGame = game.PlayerStats.find(p => p.Username.toLowerCase() === playerStat.player.toLowerCase());
        if (!playerInGame) return false;
        const playerCamp = getPlayerCampFromRole(playerInGame.MainRoleFinal);
        return playerCamp === 'Villageois';
      }).length,
      loupsGames: rawGameData.filter(game => {
        const playerInGame = game.PlayerStats.find(p => p.Username.toLowerCase() === playerStat.player.toLowerCase());
        if (!playerInGame) return false;
        const playerCamp = getPlayerCampFromRole(playerInGame.MainRoleFinal);
        return playerCamp === 'Loup';
      }).length,
      specialRoleGames: rawGameData.filter(game => {
        const playerInGame = game.PlayerStats.find(p => p.Username.toLowerCase() === playerStat.player.toLowerCase());
        if (!playerInGame) return false;
        const playerCamp = getPlayerCampFromRole(playerInGame.MainRoleFinal);
        return !['Villageois', 'Loup'].includes(playerCamp);
      }).length
    };
  }).filter(metrics => metrics.rawParticipation >= 30); // Only include players with meaningful participation (30+ games)

  // Calculate dynamic scaling ranges
  const participationValues = allPlayersRawMetrics.map(m => m.rawParticipation);
  const winRateValues = allPlayersRawMetrics.map(m => m.rawWinRate);
  const consistencyValues = allPlayersRawMetrics.map(m => m.rawConsistency);
  const villageoisValues = allPlayersRawMetrics.filter(m => m.villageoisGames >= 5).map(m => m.rawVillageoisMastery);
  const loupsValues = allPlayersRawMetrics.filter(m => m.loupsGames >= 3).map(m => m.rawLoupsEfficiency);
  const specialValues = allPlayersRawMetrics.filter(m => m.specialRoleGames >= 10).map(m => m.rawSpecialRoleAdaptability);

  // Create scaling functions
  const participationScaler = createScaler(participationValues);
  const winRateScaler = createScaler(winRateValues);
  const consistencyScaler = createScaler(consistencyValues);
  const villageoisScaler = createScaler(villageoisValues);
  const loupsScaler = createScaler(loupsValues);
  const specialRoleScaler = createSpecialRoleScaler(specialValues);

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
  let totalGameDurationSeconds = 0;
  let gamesWithDuration = 0;
  let totalOpposingGameDurationSeconds = 0;
  let opposingGamesWithDuration = 0;
  let totalSameCampDurationSeconds = 0;
  let sameCampGamesWithDuration = 0;
  let totalSameLoupsDurationSeconds = 0;
  let sameLoupsGamesWithDuration = 0;

  rawGameData.forEach(game => {
    const hasPlayer1 = game.PlayerStats.some(p => p.Username.toLowerCase() === player1Name.toLowerCase());
    const hasPlayer2 = game.PlayerStats.some(p => p.Username.toLowerCase() === player2Name.toLowerCase());
    
    if (hasPlayer1 && hasPlayer2) {
      commonGames.push(game);
      
      const player1Stat = game.PlayerStats.find(p => p.Username.toLowerCase() === player1Name.toLowerCase());
      const player2Stat = game.PlayerStats.find(p => p.Username.toLowerCase() === player2Name.toLowerCase());
      
      if (!player1Stat || !player2Stat) return;
      
      const player1Camp = getPlayerCampFromRole(player1Stat.MainRoleFinal);
      const player2Camp = getPlayerCampFromRole(player2Stat.MainRoleFinal);
      
      // Count wins in common games
      const player1Won = player1Stat.Victorious;
      const player2Won = player2Stat.Victorious;
      
      if (player1Won) player1CommonWins++;
      if (player2Won) player2CommonWins++;
      
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
        if (camp === 'Loup' || camp === 'Traître') {
          return 'Loup'; // Wolves team: Loups + Traître (only exception)
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
        
        if (game.StartDate && game.EndDate) {
          const duration = calculateGameDuration(game.StartDate, game.EndDate);
          if (duration) {
            totalOpposingGameDurationSeconds += duration;
            opposingGamesWithDuration++;
          }
        }
      } else if (player1MainCamp === player2MainCamp) {
        // Same camp affiliation (only possible for Loups+Traître or same exact role)
        sameCampGames.push(game);
        
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
  const calculateMetrics = (stats: PlayerStat): PlayerComparisonMetrics => {
    const campPerformance = calculateCampSpecificPerformance(stats.player, rawGameData);
    const consistencyScore = calculateAdvancedConsistency(stats.player, rawGameData);
    
    // Count games in each category for the player
    const playerVillageoisGames = rawGameData.filter(game => {
      const playerInGame = game.PlayerStats.find(p => p.Username.toLowerCase() === stats.player.toLowerCase());
      if (!playerInGame) return false;
      const playerCamp = getPlayerCampFromRole(playerInGame.MainRoleFinal);
      return playerCamp === 'Villageois';
    }).length;
    
    const playerLoupsGames = rawGameData.filter(game => {
      const playerInGame = game.PlayerStats.find(p => p.Username.toLowerCase() === stats.player.toLowerCase());
      if (!playerInGame) return false;
      const playerCamp = getPlayerCampFromRole(playerInGame.MainRoleFinal);
      return playerCamp === 'Loup';
    }).length;
    
    const playerSpecialRoleGames = rawGameData.filter(game => {
      const playerInGame = game.PlayerStats.find(p => p.Username.toLowerCase() === stats.player.toLowerCase());
      if (!playerInGame) return false;
      const playerCamp = getPlayerCampFromRole(playerInGame.MainRoleFinal);
      return !['Villageois', 'Loup'].includes(playerCamp);
    }).length;

    return {
      player: stats.player,
      participationScore: participationScaler(stats.gamesPlayed),
      winRateScore: winRateScaler((stats.wins / stats.gamesPlayed) * 100),
      consistencyScore: consistencyScaler(consistencyScore),
      villageoisMastery: playerVillageoisGames >= 5 ? villageoisScaler(campPerformance.villageoisWinRate) : 10,
      loupsEfficiency: playerLoupsGames >= 3 ? loupsScaler(campPerformance.loupsWinRate) : 10,
      specialRoleAdaptability: specialRoleScaler(campPerformance.specialRoleWinRate, playerSpecialRoleGames),
      gamesPlayed: stats.gamesPlayed,
      winRate: (stats.wins / stats.gamesPlayed) * 100,
      avgGameDuration: 0, // Could be calculated if needed
      commonGames: commonGames.length,
      winRateVsOpponent: commonGames.length > 0 
        ? (stats.player === player1Name ? player1CommonWins : player2CommonWins) / commonGames.length * 100 
        : 0
    };
  };

  const player1Metrics = calculateMetrics(player1Stats);
  const player2Metrics = calculateMetrics(player2Stats);

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
      sameCampGames: sameCampGames.length,
      sameCampWins: sameCampWins,
      averageSameCampDuration: sameCampGamesWithDuration > 0 
        ? formatDuration(totalSameCampDurationSeconds / sameCampGamesWithDuration)
        : "N/A",
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
