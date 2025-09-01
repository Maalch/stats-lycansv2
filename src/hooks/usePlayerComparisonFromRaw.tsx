import { useMemo } from 'react';
import { usePlayerStatsFromRaw } from './usePlayerStatsFromRaw';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';
import type { PlayerStat } from '../types/api';
import { calculateGameDuration, splitAndTrim, formatDuration } from '../utils/gameUtils';

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
  };
}

/**
 * Hook for generating detailed player comparison metrics with dynamic scaling
 */
export function usePlayerComparisonFromRaw() {
  const { data: playerStatsData, isLoading: statsLoading, error: statsError } = usePlayerStatsFromRaw();
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const availablePlayers = useMemo(() => {
    if (!playerStatsData?.playerStats) return [];
    
    // Only include players with meaningful participation (>= 30 games)
    return playerStatsData.playerStats
      .filter(player => player.gamesPlayed >= 30)
      .sort((a, b) => a.player.localeCompare(b.player)) // Alphabetical order
      .map(player => player.player);
  }, [playerStatsData]);

  const generateComparison = useMemo(() => {
    return (player1Name: string, player2Name: string): PlayerComparisonData | null => {
      if (!playerStatsData?.playerStats || !rawGameData || !rawRoleData) return null;
      
      const player1Stats = playerStatsData.playerStats.find(p => p.player === player1Name);
      const player2Stats = playerStatsData.playerStats.find(p => p.player === player2Name);
      
      if (!player1Stats || !player2Stats) return null;

      // Helper function to determine player's camp in a specific game
      const getPlayerCamp = (playerName: string, gameNumber: number): string => {
        const roleData = rawRoleData.find(role => role.Game === gameNumber);
        if (!roleData) return 'Unknown';
        
        // Check all role categories
        const rolesToCheck = [
          'Loups', 'Traître', 'Idiot du village', 'Cannibale', 'Agent', 'Espion',
          'Scientifique', 'Amoureux', 'La Bête', 'Chasseur de primes', 'Vaudou'
        ];
        
        for (const role of rolesToCheck) {
          const roleValue = roleData[role as keyof typeof roleData];
          if (roleValue && typeof roleValue === 'string') {
            const playersInRole = splitAndTrim(roleValue);
            if (playersInRole.some(p => p.toLowerCase() === playerName.toLowerCase())) {
              // Determine camp based on role
              if (role === 'Loups' || role === 'Traître') return 'Loups';
              if (role === 'Amoureux') return 'Amoureux';
              return 'Solo'; // others special roles are solo-aligned
            }
          }
        }
        
        return 'Villageois'; // Default assumption for players without special roles
      };

      // Helper function to calculate actual camp-specific performance
      const calculateCampSpecificPerformance = (playerName: string) => {
        const playerGameHistory = rawGameData
          .filter(game => {
            const playerList = splitAndTrim(game["Liste des joueurs"]?.toString());
            return playerList.some(p => p.toLowerCase() === playerName.toLowerCase());
          })
          .map(game => {
            const playerCamp = getPlayerCamp(playerName, game.Game);
            const winningCamp = game["Camp victorieux"];
            const playerWon = playerCamp === winningCamp;
            
            return {
              gameNumber: game.Game,
              playerCamp,
              winningCamp,
              playerWon: playerWon ? 1 : 0
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
      };

      // Enhanced consistency calculation using camp alignment and win prediction
      const calculateAdvancedConsistency = (playerName: string): number => {
        // Get player's game history with enhanced context
        const playerGameHistory = rawGameData
          .filter(game => {
            const playerList = splitAndTrim(game["Liste des joueurs"]?.toString());
            return playerList.some(p => p.toLowerCase() === playerName.toLowerCase());
          })
          .map(game => {
            const playerCamp = getPlayerCamp(playerName, game.Game);
            const winningCamp = game["Camp victorieux"];
            const playerWon = playerCamp === winningCamp;
            
            return {
              gameNumber: game.Game,
              playerCamp,
              winningCamp,
              playerWon: playerWon ? 1 : 0,
              playerCount: game["Nombre de joueurs"],
              numberOfDays: game["Nombre de journées"],
              victoryType: game["Type de victoire"]
            };
          })
          .sort((a, b) => a.gameNumber - b.gameNumber); // Chronological order

        if (playerGameHistory.length < 30) return 25; // Very low score for insufficient data

        // 1. Overall consistency across all games
        const outcomes = playerGameHistory.map(g => g.playerWon);
        const overallWinRate = outcomes.reduce((sum, outcome) => sum + outcome, 0) / outcomes.length;
        
        // 2. Camp-specific consistency analysis
        const villageoisGames = playerGameHistory.filter(g => g.playerCamp === 'Villageois');
        const loupsGames = playerGameHistory.filter(g => g.playerCamp === 'Loups');
        
        let campConsistencyScore = 50;
        
        // Analyze consistency within each camp
        if (villageoisGames.length >= 10) {
          const villageoisOutcomes = villageoisGames.map(g => g.playerWon);
          const villageoisWinRate = villageoisOutcomes.reduce((sum, o) => sum + o, 0) / villageoisOutcomes.length;
          const villageoisVariance = villageoisOutcomes.reduce((sum, o) => sum + Math.pow(o - villageoisWinRate, 2), 0) / villageoisOutcomes.length;
          const villageoisConsistency = 100 - (Math.sqrt(villageoisVariance) * 200);
          campConsistencyScore += villageoisConsistency * 0.3;
        }
        
        if (loupsGames.length >= 10) {
          const loupsOutcomes = loupsGames.map(g => g.playerWon);
          const loupsWinRate = loupsOutcomes.reduce((sum, o) => sum + o, 0) / loupsOutcomes.length;
          const loupsVariance = loupsOutcomes.reduce((sum, o) => sum + Math.pow(o - loupsWinRate, 2), 0) / loupsOutcomes.length;
          const loupsConsistency = 100 - (Math.sqrt(loupsVariance) * 200);
          campConsistencyScore += loupsConsistency * 0.3;
        }
        
        // 3. Temporal consistency (performance over time)
        let temporalConsistency = 50;
        if (playerGameHistory.length >= 25) {
          const segmentSize = Math.floor(playerGameHistory.length / 3);
          const earlyGames = playerGameHistory.slice(0, segmentSize);
          const middleGames = playerGameHistory.slice(segmentSize, segmentSize * 2);
          const lateGames = playerGameHistory.slice(segmentSize * 2);
          
          const earlyWinRate = earlyGames.reduce((sum, g) => sum + g.playerWon, 0) / earlyGames.length;
          const middleWinRate = middleGames.reduce((sum, g) => sum + g.playerWon, 0) / middleGames.length;
          const lateWinRate = lateGames.reduce((sum, g) => sum + g.playerWon, 0) / lateGames.length;
          
          const temporalVariance = [earlyWinRate, middleWinRate, lateWinRate]
            .reduce((sum, rate) => sum + Math.pow(rate - overallWinRate, 2), 0) / 3;
          
          temporalConsistency = Math.max(10, 90 - (Math.sqrt(temporalVariance) * 180));
        }
        
        // 4. Streak analysis (refined)
        let maxStreak = 1;
        let currentStreak = 1;
        let streakChanges = 0;
        
        for (let i = 1; i < outcomes.length; i++) {
          if (outcomes[i] === outcomes[i - 1]) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 1;
            streakChanges++;
          }
        }
        
        const streakiness = maxStreak / outcomes.length;
        const volatility = streakChanges / (outcomes.length - 1);
        
        // Balance between too streaky and too volatile
        const optimalVolatility = 0.4; // Some variation is normal
        const volatilityPenalty = Math.abs(volatility - optimalVolatility) * 60;
        const streakPenalty = streakiness > 0.3 ? (streakiness - 0.3) * 100 : 0;
        
        // 5. Final calculation with weighted components
        const baseConsistency = Math.max(0, 100 - (Math.sqrt(
          outcomes.reduce((sum, o) => sum + Math.pow(o - overallWinRate, 2), 0) / outcomes.length
        ) * 200));
        
        const finalScore = (
          baseConsistency * 0.3 +
          (campConsistencyScore - 50) * 0.45 +
          temporalConsistency * 0.15 +
          Math.max(0, 90 - volatilityPenalty - streakPenalty) * 0.1
        );
        
        return Math.max(5, Math.min(95, Math.round(finalScore)));
      };

      // Calculate raw metrics for ALL players to establish ranges for dynamic scaling
      const allPlayersRawMetrics = playerStatsData.playerStats.map(playerStat => {
        // Calculate raw participation (games played)
        const rawParticipation = playerStat.gamesPlayed;
        
        // Calculate raw win rate
        const rawWinRate = parseFloat(playerStat.winPercent);
        
        // Calculate raw consistency using advanced algorithm
        const rawConsistency = calculateAdvancedConsistency(playerStat.player);
        
        // Calculate camp-specific raw performance
        const totalCampGames = Object.values(playerStat.camps).reduce((sum, count) => sum + count, 0);
        const villageoisGames = playerStat.camps["Villageois"] || 0;
        const loupsGames = playerStat.camps["Loups"] || 0;
        const specialRoleGames = totalCampGames - villageoisGames - loupsGames;
        
        // Calculate actual camp-specific win rates using role data
        const campSpecificStats = calculateCampSpecificPerformance(playerStat.player);
        
        return {
          player: playerStat.player,
          rawParticipation,
          rawWinRate,
          rawConsistency,
          rawVillageoisMastery: campSpecificStats.villageoisWinRate,
          rawLoupsEfficiency: campSpecificStats.loupsWinRate,
          rawSpecialRoleAdaptability: campSpecificStats.specialRoleWinRate,
          villageoisGames,
          loupsGames,
          specialRoleGames
        };
      }).filter(metrics => metrics.rawParticipation >= 30); // Only include players with meaningful participation (30+ games)

      // Calculate dynamic scaling ranges
      const participationValues = allPlayersRawMetrics.map(m => m.rawParticipation);
      const winRateValues = allPlayersRawMetrics.map(m => m.rawWinRate);
      const consistencyValues = allPlayersRawMetrics.map(m => m.rawConsistency);
      const villageoisValues = allPlayersRawMetrics.filter(m => m.villageoisGames >= 5).map(m => m.rawVillageoisMastery);
      const loupsValues = allPlayersRawMetrics.filter(m => m.loupsGames >= 3).map(m => m.rawLoupsEfficiency);
      const specialValues = allPlayersRawMetrics.filter(m => m.specialRoleGames >= 3).map(m => m.rawSpecialRoleAdaptability);

      // Create scaling functions (min-max normalization to 0-100)
      const createScaler = (values: number[]) => {
        if (values.length === 0) return (_val: number) => 50; // Default for empty arrays
        const min = Math.min(...values);
        const max = Math.max(...values);
        if (max === min) return (_val: number) => 50; // All values same
        return (val: number) => Math.round(((val - min) / (max - min)) * 100);
      };

      const participationScaler = createScaler(participationValues);
      const winRateScaler = createScaler(winRateValues);
      const consistencyScaler = createScaler(consistencyValues);
      const villageoisScaler = createScaler(villageoisValues);
      const loupsScaler = createScaler(loupsValues);
      const specialScaler = createScaler(specialValues);

      // Find common games and head-to-head stats
      const commonGames: any[] = [];
      const opposingCampGames: any[] = [];
      let player1CommonWins = 0;
      let player2CommonWins = 0;
      let player1OpposingWins = 0;
      let player2OpposingWins = 0;
      let totalGameDurationSeconds = 0;
      let gamesWithDuration = 0;
      let totalOpposingGameDurationSeconds = 0;
      let opposingGamesWithDuration = 0;

      rawGameData.forEach(game => {
        const playerList = splitAndTrim(game["Liste des joueurs"]?.toString());
        const winnerList = splitAndTrim(game["Liste des gagnants"]?.toString());
        
        const hasPlayer1 = playerList.some(p => p.toLowerCase() === player1Name.toLowerCase());
        const hasPlayer2 = playerList.some(p => p.toLowerCase() === player2Name.toLowerCase());
        
        if (hasPlayer1 && hasPlayer2) {
          // Get camps for both players in this game
          const player1Camp = getPlayerCamp(player1Name, game.Game);
          const player2Camp = getPlayerCamp(player2Name, game.Game);
          
          // Determine if they're on opposing camps
          const areOpposingCamps = (player1Camp !== player2Camp) && 
            (player1Camp !== 'Unknown' && player2Camp !== 'Unknown');
          
          if (areOpposingCamps) {
            // This is an opposing camp game
            opposingCampGames.push(game);
            
            // Check who won in opposing camp games
            const player1Won = winnerList.some(w => w.toLowerCase() === player1Name.toLowerCase());
            const player2Won = winnerList.some(w => w.toLowerCase() === player2Name.toLowerCase());
            
            if (player1Won) player1OpposingWins++;
            if (player2Won) player2OpposingWins++;
            
            // Calculate game duration for opposing games
            const gameDuration = calculateGameDuration(game["Début"], game["Fin"]);
            if (gameDuration !== null) {
              totalOpposingGameDurationSeconds += gameDuration;
              opposingGamesWithDuration++;
            }
          }
          
          // All games where both players participated (including opposing camp games)
          commonGames.push(game);
          
          // Check who won overall
          const player1Won = winnerList.some(w => w.toLowerCase() === player1Name.toLowerCase());
          const player2Won = winnerList.some(w => w.toLowerCase() === player2Name.toLowerCase());
          
          if (player1Won) player1CommonWins++;
          if (player2Won) player2CommonWins++;
          
          // Calculate game duration using YouTube URLs
          const gameDuration = calculateGameDuration(game["Début"], game["Fin"]);
          if (gameDuration !== null) {
            totalGameDurationSeconds += gameDuration;
            gamesWithDuration++;
          }
        }
      });

      // Calculate metrics for both players using dynamic scaling
      const calculateMetrics = (stats: PlayerStat): PlayerComparisonMetrics => {
        const winRate = parseFloat(stats.winPercent);
        
        // Get actual camp-specific performance
        const campStats = calculateCampSpecificPerformance(stats.player);
        
        // Use dynamic scalers for all metrics
        const dynamicParticipationScore = participationScaler(stats.gamesPlayed);
        const dynamicWinRateScore = winRateScaler(winRate);
        const dynamicConsistencyScore = consistencyScaler(calculateAdvancedConsistency(stats.player));
        
        // Scale camp-specific metrics, with fallback for insufficient data
        const villageoisGames = stats.camps["Villageois"] || 0;
        const loupsGames = stats.camps["Loups"] || 0;
        const specialRoleGames = Object.values(stats.camps).reduce((sum, count) => sum + count, 0) - villageoisGames - loupsGames;
        
        const dynamicVillageoisMastery = villageoisGames >= 5 
          ? villageoisScaler(campStats.villageoisWinRate)
          : Math.min(100, winRate * 1.1); // Fallback estimate
          
        const dynamicLoupsEfficiency = loupsGames >= 3 
          ? loupsScaler(campStats.loupsWinRate)
          : Math.min(100, winRate * 0.9); // Fallback estimate
          
        const dynamicSpecialRoleAdaptability = specialRoleGames >= 3 
          ? specialScaler(campStats.specialRoleWinRate)
          : Math.min(100, winRate * 1.05); // Fallback estimate
        
        return {
          player: stats.player,
          participationScore: dynamicParticipationScore,
          winRateScore: dynamicWinRateScore,
          consistencyScore: dynamicConsistencyScore,
          villageoisMastery: dynamicVillageoisMastery,
          loupsEfficiency: dynamicLoupsEfficiency,
          specialRoleAdaptability: dynamicSpecialRoleAdaptability,
          gamesPlayed: stats.gamesPlayed,
          winRate,
          avgGameDuration: gamesWithDuration > 0 ? totalGameDurationSeconds / gamesWithDuration : 0,
          commonGames: commonGames.length,
          winRateVsOpponent: commonGames.length > 0 ? winRate : 0 // Simplified - would need detailed analysis
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
          // Opposing camp statistics
          opposingCampGames: opposingCampGames.length,
          player1WinsAsOpponent: player1OpposingWins,
          player2WinsAsOpponent: player2OpposingWins,
          averageOpposingGameDuration: opposingGamesWithDuration > 0 
            ? formatDuration(totalOpposingGameDurationSeconds / opposingGamesWithDuration)
            : "N/A"
        }
      };
    };
  }, [playerStatsData, rawGameData, rawRoleData]);

  return {
    availablePlayers,
    generateComparison,
    isLoading: statsLoading || gameLoading || roleLoading,
    error: statsError || gameError || roleError
  };
}
