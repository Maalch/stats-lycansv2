/**
 * Pure computation functions for player comparison metrics
 */

import type { PlayerStat } from '../../types/api';
import type { GameLogEntry, RawRoleData } from '../useCombinedRawData';
import { 
  getPlayerCamp, 
  buildGamePlayerCampMap,
  didCampWin
} from './dataUtils';
import { calculateGameDuration, formatDuration } from '../../utils/gameUtils';

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
  rawGameData: GameLogEntry[],
  gamePlayerCampMap: Record<string, Record<string, string>>
) {
  const playerGameHistory = rawGameData
    .filter(game => {
      const playerList = game.PlayerStats.map(p => p.Username);
      return playerList.some(p => p.toLowerCase() === playerName.toLowerCase());
    })
    .map((game, index) => {
      const gameNumber = index + 1;
      const playerCamp = getPlayerCamp(gamePlayerCampMap, gameNumber.toString(), playerName);
      
      // Determine winning camp from PlayerStats
      const winners = game.PlayerStats.filter(p => p.Victorious);
      let winningCamp = '';
      
      if (winners.length > 0) {
        const winnerRoles = winners.map(w => w.MainRoleInitial);
        
        // Check for wolf/traitor victory
        if (winnerRoles.includes('Loup') || winnerRoles.includes('Traître')) {
          winningCamp = 'Loups';
        } 
        // Check for pure villager victory (only villagers win)
        else if (winnerRoles.every(role => role === 'Villageois')) {
          winningCamp = 'Villageois';
        }
        // Check for solo role victory
        else {
          const soloWinnerRoles = winnerRoles.filter(role => !['Villageois', 'Loup', 'Traître'].includes(role));
          if (soloWinnerRoles.length > 0) {
            winningCamp = soloWinnerRoles[0];
          } else {
            winningCamp = 'Villageois';
          }
        }
      }
      
      // Special case for Agent camp: only winners in the list actually won
      let playerWon = 0;
      if (winningCamp === "Agent" && playerCamp === "Agent") {
        const isPlayerWinner = game.PlayerStats.find(p => p.Username.toLowerCase() === playerName.toLowerCase())?.Victorious || false;
        playerWon = isPlayerWinner ? 1 : 0;
      } else {
        playerWon = didCampWin(playerCamp, winningCamp) ? 1 : 0;
      }
      
      return {
        gameNumber,
        playerCamp,
        playerWon
      };
    });

  const villageoisGames = playerGameHistory.filter(g => g.playerCamp === 'Villageois');
  const loupsGames = playerGameHistory.filter(g => g.playerCamp === 'Loups');
  const specialGames = playerGameHistory.filter(g => !['Villageois', 'Loups'].includes(g.playerCamp));

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
  rawGameData: GameLogEntry[],
  gamePlayerCampMap: Record<string, Record<string, string>>
): number {
  // Get player's game history with enhanced context
  const playerGameHistory = rawGameData
    .filter(game => {
      const playerList = game.PlayerStats.map(p => p.Username);
      return playerList.some(p => p.toLowerCase() === playerName.toLowerCase());
    })
    .map((game, index) => {
      const gameNumber = index + 1;
      const playerCamp = getPlayerCamp(gamePlayerCampMap, gameNumber.toString(), playerName);
      
      // Determine winning camp from PlayerStats
      const winners = game.PlayerStats.filter(p => p.Victorious);
      let winningCamp = '';
      
      if (winners.length > 0) {
        const winnerRoles = winners.map(w => w.MainRoleInitial);
        
        // Check for wolf/traitor victory
        if (winnerRoles.includes('Loup') || winnerRoles.includes('Traître')) {
          winningCamp = 'Loups';
        } 
        // Check for pure villager victory (only villagers win)
        else if (winnerRoles.every(role => role === 'Villageois')) {
          winningCamp = 'Villageois';
        }
        // Check for solo role victory
        else {
          const soloWinnerRoles = winnerRoles.filter(role => !['Villageois', 'Loup', 'Traître'].includes(role));
          if (soloWinnerRoles.length > 0) {
            winningCamp = soloWinnerRoles[0];
          } else {
            winningCamp = 'Villageois';
          }
        }
      }
      
      // Special case for Agent camp: only winners in the list actually won
      let playerWon = 0;
      if (winningCamp === "Agent" && playerCamp === "Agent") {
        const isPlayerWinner = game.PlayerStats.find(p => p.Username.toLowerCase() === playerName.toLowerCase())?.Victorious || false;
        playerWon = isPlayerWinner ? 1 : 0;
      } else {
        playerWon = didCampWin(playerCamp, winningCamp) ? 1 : 0;
      }
      
      return {
        gameNumber,
        playerCamp,
        playerWon
      };
    })
    .sort((a, b) => a.gameNumber - b.gameNumber); // Chronological order

  if (playerGameHistory.length < 30) return 25; // Very low score for insufficient data

  // 1. Overall consistency across all games
  const outcomes = playerGameHistory.map(g => g.playerWon);
  
  // 2. Camp-specific consistency analysis
  const villageoisGames = playerGameHistory.filter(g => g.playerCamp === 'Villageois');
  const loupsGames = playerGameHistory.filter(g => g.playerCamp === 'Loups');
  
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
  rawGameData: GameLogEntry[],
  rawRoleData: RawRoleData[]
): PlayerComparisonData | null {
  const player1Stats = playerStatsData.playerStats.find(p => p.player === player1Name);
  const player2Stats = playerStatsData.playerStats.find(p => p.player === player2Name);
  
  if (!player1Stats || !player2Stats) return null;

  // Build game-player-camp mapping once for efficient lookups
  const gamePlayerCampMap = buildGamePlayerCampMap(rawRoleData);

  // Calculate raw metrics for ALL players to establish ranges for dynamic scaling
  const allPlayersRawMetrics = playerStatsData.playerStats.map(playerStat => {
    const campPerformance = calculateCampSpecificPerformance(playerStat.player, rawGameData, gamePlayerCampMap);
    const consistencyScore = calculateAdvancedConsistency(playerStat.player, rawGameData, gamePlayerCampMap);
    
    return {
      player: playerStat.player,
      rawParticipation: playerStat.gamesPlayed,
      rawWinRate: (playerStat.wins / playerStat.gamesPlayed) * 100,
      rawConsistency: consistencyScore,
      rawVillageoisMastery: campPerformance.villageoisWinRate,
      rawLoupsEfficiency: campPerformance.loupsWinRate,
      rawSpecialRoleAdaptability: campPerformance.specialRoleWinRate,
      villageoisGames: rawGameData.filter((game, index) => {
        const playerList = game.PlayerStats.map(p => p.Username);
        if (!playerList.some(p => p.toLowerCase() === playerStat.player.toLowerCase())) return false;
        const playerCamp = getPlayerCamp(gamePlayerCampMap, (index + 1).toString(), playerStat.player);
        return playerCamp === 'Villageois';
      }).length,
      loupsGames: rawGameData.filter((game, index) => {
        const playerList = game.PlayerStats.map(p => p.Username);
        if (!playerList.some(p => p.toLowerCase() === playerStat.player.toLowerCase())) return false;
        const playerCamp = getPlayerCamp(gamePlayerCampMap, (index + 1).toString(), playerStat.player);
        return playerCamp === 'Loups';
      }).length,
      specialRoleGames: rawGameData.filter((game, index) => {
        const playerList = game.PlayerStats.map(p => p.Username);
        if (!playerList.some(p => p.toLowerCase() === playerStat.player.toLowerCase())) return false;
        const playerCamp = getPlayerCamp(gamePlayerCampMap, (index + 1).toString(), playerStat.player);
        return !['Villageois', 'Loups'].includes(playerCamp);
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
  const commonGames: any[] = [];
  const opposingCampGames: any[] = [];
  const sameCampGames: any[] = [];
  const sameLoupsGames: any[] = [];
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

  rawGameData.forEach((game, index) => {
    const gameNumber = index + 1;
    const playerList = game.PlayerStats.map(p => p.Username);
    const hasPlayer1 = playerList.some(p => p.toLowerCase() === player1Name.toLowerCase());
    const hasPlayer2 = playerList.some(p => p.toLowerCase() === player2Name.toLowerCase());
    
    if (hasPlayer1 && hasPlayer2) {
      commonGames.push(game);
      
      const player1Camp = getPlayerCamp(gamePlayerCampMap, gameNumber.toString(), player1Name);
      const player2Camp = getPlayerCamp(gamePlayerCampMap, gameNumber.toString(), player2Name);
      
      // Determine winning camp from PlayerStats
      const winners = game.PlayerStats.filter(p => p.Victorious);
      let winnerCamp = '';
      
      if (winners.length > 0) {
        const winnerRoles = winners.map(w => w.MainRoleInitial);
        
        // Check for wolf/traitor victory
        if (winnerRoles.includes('Loup') || winnerRoles.includes('Traître')) {
          winnerCamp = 'Loups';
        } 
        // Check for pure villager victory (only villagers win)
        else if (winnerRoles.every(role => role === 'Villageois')) {
          winnerCamp = 'Villageois';
        }
        // Check for solo role victory
        else {
          const soloWinnerRoles = winnerRoles.filter(role => !['Villageois', 'Loup', 'Traître'].includes(role));
          if (soloWinnerRoles.length > 0) {
            winnerCamp = soloWinnerRoles[0];
          } else {
            winnerCamp = 'Villageois';
          }
        }
      }
      
      // Count wins in common games with special Agent camp handling
      let player1Won = false;
      let player2Won = false;
      
      if (winnerCamp === "Agent") {
        // For Agent camp, check if each player actually won
        player1Won = player1Camp === "Agent" && game.PlayerStats.find(p => p.Username.toLowerCase() === player1Name.toLowerCase())?.Victorious || false;
        player2Won = player2Camp === "Agent" && game.PlayerStats.find(p => p.Username.toLowerCase() === player2Name.toLowerCase())?.Victorious || false;
      } else {
        // For other camps, use didCampWin to handle Traître-Loups alliance
        player1Won = didCampWin(player1Camp, winnerCamp);
        player2Won = didCampWin(player2Camp, winnerCamp);
      }
      
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
        if (camp === 'Loups' || camp === 'Traître') {
          return 'Loups'; // Wolves team: Loups + Traître (only exception)
        } else {
          // Every other role works alone and is its own camp
          // Villageois, Idiot du Village, Cannibale, Agent, Espion, Scientifique, 
          // La Bête, Chasseur de primes, Vaudou, Amoureux - all separate camps
          return camp;
        }
      };
      
      const player1MainCamp = getMainCampAffiliation(player1Camp);
      const player2MainCamp = getMainCampAffiliation(player2Camp);
      
      // Players are in opposing camps if they have different camp affiliations
      // e.g., 'Idiot du Village' vs 'Villageois' = opposing camps (different roles)
      //       'Villageois' vs 'Cannibale' = opposing camps (different roles)
      //       'Traître' vs 'Loups' = same camp (both wolves team)
      //       'Villageois' vs 'Villageois' = same camp (same role)
      const isOpposingCamps = player1MainCamp !== player2MainCamp;
      
      if (isOpposingCamps) {
        opposingCampGames.push(game);
        
        // Handle Agent camp wins correctly in opposing camps
        if (winnerCamp === "Agent") {
          // Check if each player won based on PlayerStats
          const player1Won = game.PlayerStats.find(p => p.Username.toLowerCase() === player1Name.toLowerCase())?.Victorious || false;
          const player2Won = game.PlayerStats.find(p => p.Username.toLowerCase() === player2Name.toLowerCase())?.Victorious || false;
          
          if (player1Camp === "Agent" && player1Won) {
            player1OpposingWins++;
          }
          if (player2Camp === "Agent" && player2Won) {
            player2OpposingWins++;
          }
        } else {
          if (didCampWin(player1Camp, winnerCamp)) player1OpposingWins++;
          if (didCampWin(player2Camp, winnerCamp)) player2OpposingWins++;
        }
        
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
        const isBothLoupsTeam = player1MainCamp === 'Loups';
        if (isBothLoupsTeam) {
          sameLoupsGames.push(game);
        }
        
        // Handle Agent camp wins correctly in same camp (both agents, but only one can win)
        if (winnerCamp === "Agent") {
          // Check if either player won based on PlayerStats
          const player1Won = game.PlayerStats.find(p => p.Username.toLowerCase() === player1Name.toLowerCase())?.Victorious || false;
          const player2Won = game.PlayerStats.find(p => p.Username.toLowerCase() === player2Name.toLowerCase())?.Victorious || false;
          
          // Count as team win if either player wins (since they're both agents)
          if ((player1Camp === "Agent" && player1Won) ||
              (player2Camp === "Agent" && player2Won)) {
            sameCampWins++;
          }
        } else {
          if (didCampWin(player1Camp, winnerCamp)) {
            sameCampWins++;
            if (isBothLoupsTeam) {
              sameLoupsWins++;
            }
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
    const campPerformance = calculateCampSpecificPerformance(stats.player, rawGameData, gamePlayerCampMap);
    const consistencyScore = calculateAdvancedConsistency(stats.player, rawGameData, gamePlayerCampMap);
    
    // Count games in each category for the player
    const playerVillageoisGames = rawGameData.filter((game, index) => {
      const playerList = game.PlayerStats.map(p => p.Username);
      if (!playerList.some(p => p.toLowerCase() === stats.player.toLowerCase())) return false;
      const playerCamp = getPlayerCamp(gamePlayerCampMap, (index + 1).toString(), stats.player);
      return playerCamp === 'Villageois';
    }).length;
    
    const playerLoupsGames = rawGameData.filter((game, index) => {
      const playerList = game.PlayerStats.map(p => p.Username);
      if (!playerList.some(p => p.toLowerCase() === stats.player.toLowerCase())) return false;
      const playerCamp = getPlayerCamp(gamePlayerCampMap, (index + 1).toString(), stats.player);
      return playerCamp === 'Loups';
    }).length;
    
    const playerSpecialRoleGames = rawGameData.filter((game, index) => {
      const playerList = game.PlayerStats.map(p => p.Username);
      if (!playerList.some(p => p.toLowerCase() === stats.player.toLowerCase())) return false;
      const playerCamp = getPlayerCamp(gamePlayerCampMap, (index + 1).toString(), stats.player);
      return !['Villageois', 'Loups'].includes(playerCamp);
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
