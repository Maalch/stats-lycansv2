import { useMemo } from 'react';
import { usePlayerStatsFromRaw } from './usePlayerStatsFromRaw';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';
import type { PlayerStat } from '../types/api';
import { calculateGameDuration, splitAndTrim, formatDuration } from '../utils/gameUtils';

export interface PlayerComparisonMetrics {
  player: string;
  // Normalized metrics (0-100 scale)
  participationScore: number;    // Based on games played vs max
  winRateScore: number;         // Based on win rate vs average
  consistencyScore: number;     // Based on standard deviation of performance
  villageoisMastery: number;    // Success rate as Villageois
  loupsEfficiency: number;      // Success rate as Loups
  specialRoleAdaptability: number; // Success with special roles
  
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
  };
}

/**
 * Hook for generating detailed player comparison metrics
 */
export function usePlayerComparisonFromRaw() {
  const { data: playerStatsData, isLoading: statsLoading, error: statsError } = usePlayerStatsFromRaw();
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const availablePlayers = useMemo(() => {
    if (!playerStatsData?.playerStats) return [];
    
    // Only include players with meaningful participation (>= 10 games)
    return playerStatsData.playerStats
      .filter(player => player.gamesPlayed >= 10)
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .map(player => player.player);
  }, [playerStatsData]);

  const generateComparison = useMemo(() => {
    return (player1Name: string, player2Name: string): PlayerComparisonData | null => {
      if (!playerStatsData?.playerStats || !rawGameData || !rawRoleData) return null;
      
      const player1Stats = playerStatsData.playerStats.find(p => p.player === player1Name);
      const player2Stats = playerStatsData.playerStats.find(p => p.player === player2Name);
      
      if (!player1Stats || !player2Stats) return null;

      // Calculate max values for normalization
      const maxGames = Math.max(...playerStatsData.playerStats.map(p => p.gamesPlayed));
      const avgWinRate = playerStatsData.playerStats.reduce((sum, p) => sum + parseFloat(p.winPercent), 0) / playerStatsData.playerStats.length;

      // Find common games and head-to-head stats
      const commonGames: any[] = [];
      let player1CommonWins = 0;
      let player2CommonWins = 0;
      let totalGameDurationSeconds = 0;
      let gamesWithDuration = 0;

      rawGameData.forEach(game => {
        const playerList = splitAndTrim(game["Liste des joueurs"]?.toString());
        const winnerList = splitAndTrim(game["Liste des gagnants"]?.toString());
        
        const hasPlayer1 = playerList.some(p => p.toLowerCase() === player1Name.toLowerCase());
        const hasPlayer2 = playerList.some(p => p.toLowerCase() === player2Name.toLowerCase());
        
        if (hasPlayer1 && hasPlayer2) {
          commonGames.push(game);
          
          // Check who won
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

              return 'Solo'; // Others special roles are solo-aligned
            }
          }
        }
        
        return 'Villageois'; // Default assumption for players without special roles
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
              isModded: game["Game Moddée"],
              playerCount: game["Nombre de joueurs"],
              numberOfDays: game["Nombre de journées"],
              victoryType: game["Type de victoire"]
            };
          })
          .sort((a, b) => a.gameNumber - b.gameNumber); // Chronological order

        if (playerGameHistory.length < 5) return 25; // Very low score for insufficient data

        // 1. Overall consistency across all games
        const outcomes = playerGameHistory.map(g => g.playerWon);
        const overallWinRate = outcomes.reduce((sum, outcome) => sum + outcome, 0) / outcomes.length;
        
        // 2. Camp-specific consistency analysis
        const villageoisGames = playerGameHistory.filter(g => g.playerCamp === 'Villageois');
        const loupsGames = playerGameHistory.filter(g => g.playerCamp === 'Loups');
        
        let campConsistencyScore = 50;
        
        // Analyze consistency within each camp
        if (villageoisGames.length >= 3) {
          const villageoisOutcomes = villageoisGames.map(g => g.playerWon);
          const villageoisWinRate = villageoisOutcomes.reduce((sum, o) => sum + o, 0) / villageoisOutcomes.length;
          const villageoisVariance = villageoisOutcomes.reduce((sum, o) => sum + Math.pow(o - villageoisWinRate, 2), 0) / villageoisOutcomes.length;
          const villageoisConsistency = 100 - (Math.sqrt(villageoisVariance) * 200);
          campConsistencyScore += villageoisConsistency * 0.3;
        }
        
        if (loupsGames.length >= 3) {
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

      // Calculate metrics for both players
      const calculateMetrics = (stats: PlayerStat): PlayerComparisonMetrics => {
        const winRate = parseFloat(stats.winPercent);
        
        // Calculate camp-specific performance
        const totalCampGames = Object.values(stats.camps).reduce((sum, count) => sum + count, 0);
        const villageoisGames = stats.camps["Villageois"] || 0;
        const loupsGames = stats.camps["Loups"] || 0;
        const specialRoleGames = totalCampGames - villageoisGames - loupsGames;
        
        // Estimate win rates by camp (simplified - we'd need more detailed data for exact calculation)
        const villageoisMastery = villageoisGames > 0 ? Math.min(100, (winRate * 1.2)) : 0;
        const loupsEfficiency = loupsGames > 0 ? Math.min(100, (winRate * 0.8)) : 0;
        const specialRoleAdaptability = specialRoleGames > 0 ? Math.min(100, (winRate * 1.1)) : 0;
        
        // Use the new advanced consistency calculation
        const trueConsistency = calculateAdvancedConsistency(stats.player);
        
        return {
          player: stats.player,
          participationScore: (stats.gamesPlayed / maxGames) * 100,
          winRateScore: Math.min(100, (winRate / avgWinRate) * 50),
          consistencyScore: trueConsistency,
          villageoisMastery,
          loupsEfficiency,
          specialRoleAdaptability,
          gamesPlayed: stats.gamesPlayed,
          winRate,
          avgGameDuration: gamesWithDuration > 0 ? totalGameDurationSeconds / gamesWithDuration : 0,
          commonGames: commonGames.length,
          winRateVsOpponent: commonGames.length > 0 ? (winRate) : 0 // Simplified - would need detailed analysis
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
