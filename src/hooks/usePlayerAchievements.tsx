import { useMemo } from 'react';
import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerStats } from './utils/playerStatsUtils';
import { processGeneralAchievements } from './utils/achievementProcessors/generalAchievements';
import { processHistoryAchievements, computeMapStats } from './utils/achievementProcessors/historyAchievements';
import { processPerformanceAchievements, computeCampStats } from './utils/achievementProcessors/performanceAchievements';
import { processSeriesAchievements } from './utils/achievementProcessors/seriesAchievements';
import { processKillsAchievements } from './utils/achievementProcessors/killsAchievements';
import { processComparisonAchievements } from './utils/achievementProcessors/comparisonAchievements';
import { computePlayerSeries } from './utils/playerSeriesUtils';
import { computeDeathStatistics } from './utils/deathStatisticsUtils';
import { useGameLogData } from './useCombinedRawData';
import type { Achievement, PlayerAchievements } from '../types/achievements';

export function usePlayerAchievements(playerName: string | null): PlayerAchievements | null {
  // Get raw game data for comparison achievements
  const { data: rawGameData } = useGameLogData();
  
  // Get player stats for all games
  const { data: allGamesStats } = usePlayerStatsBase((gameData) => computePlayerStats(gameData));
  
  // Get player stats for modded games only
  const { data: moddedOnlyStats } = usePlayerStatsBase((gameData) => {
    const moddedGames = gameData.filter(game => game.Modded === true);
    return computePlayerStats(moddedGames);
  });

  // Get map-based statistics for all games
  const { data: allGamesMapStats } = usePlayerStatsBase((gameData) => computeMapStats(gameData));
  
  // Get map-based statistics for modded games only
  const { data: moddedOnlyMapStats } = usePlayerStatsBase((gameData) => {
    const moddedGames = gameData.filter(game => game.Modded === true);
    return computeMapStats(moddedGames);
  });

  // Get camp performance statistics for all games
  const { data: allGamesCampStats } = usePlayerStatsBase((gameData) => computeCampStats(gameData));
  
  // Get camp performance statistics for modded games only
  const { data: moddedOnlyCampStats } = usePlayerStatsBase((gameData) => {
    const moddedGames = gameData.filter(game => game.Modded === true);
    return computeCampStats(moddedGames);
  });

  // Get series statistics for all games
  const { data: allGamesSeriesStats } = usePlayerStatsBase((gameData) => computePlayerSeries(gameData));
  
  // Get series statistics for modded games only
  const { data: moddedOnlySeriesStats } = usePlayerStatsBase((gameData) => {
    const moddedGames = gameData.filter(game => game.Modded === true);
    return computePlayerSeries(moddedGames);
  });

  // Get death statistics for all games
  const { data: allGamesDeathStats } = usePlayerStatsBase((gameData) => computeDeathStatistics(gameData));
  
  // Get death statistics for modded games only
  const { data: moddedOnlyDeathStats } = usePlayerStatsBase((gameData) => {
    const moddedGames = gameData.filter(game => game.Modded === true);
    return computeDeathStatistics(moddedGames);
  });

  const achievements = useMemo(() => {
    if (!playerName || !allGamesStats || !moddedOnlyStats || !allGamesMapStats || !moddedOnlyMapStats || !allGamesCampStats || !moddedOnlyCampStats || !allGamesSeriesStats || !moddedOnlySeriesStats || !allGamesDeathStats || !moddedOnlyDeathStats || !rawGameData) return null;

    const allGamesAchievements: Achievement[] = [];
    const moddedOnlyAchievements: Achievement[] = [];

    // Process both all games and modded only
    const datasets = [
      { 
        stats: allGamesStats, 
        mapStats: allGamesMapStats, 
        campStats: allGamesCampStats, 
        seriesStats: allGamesSeriesStats,
        deathStats: allGamesDeathStats,
        gameData: rawGameData.GameStats,
        achievements: allGamesAchievements, 
        suffix: '' 
      },
      { 
        stats: moddedOnlyStats, 
        mapStats: moddedOnlyMapStats, 
        campStats: moddedOnlyCampStats, 
        seriesStats: moddedOnlySeriesStats,
        deathStats: moddedOnlyDeathStats,
        gameData: rawGameData.GameStats.filter((game: any) => game.Modded === true),
        achievements: moddedOnlyAchievements, 
        suffix: ' (Parties Moddées)' 
      }
    ];

    datasets.forEach(({ stats, mapStats, campStats, seriesStats, deathStats, gameData, achievements, suffix }) => {
      if (!stats || !stats.playerStats || !mapStats || !campStats || !seriesStats || !deathStats || !gameData) return;

      // Process general achievements (participations, win rates)
      const generalAchievements = processGeneralAchievements(stats.playerStats, playerName, suffix);
      achievements.push(...generalAchievements);

      // Process history/map achievements
      const historyAchievements = processHistoryAchievements(mapStats, playerName, suffix);
      achievements.push(...historyAchievements);

      // Process performance/camp achievements  
      const performanceAchievements = processPerformanceAchievements(campStats, playerName, suffix);
      achievements.push(...performanceAchievements);

      // Process series achievements
      const seriesAchievements = processSeriesAchievements(seriesStats, playerName, suffix);
      achievements.push(...seriesAchievements);

      // Process kills and deaths achievements
      const killsAchievements = processKillsAchievements(deathStats, playerName, suffix);
      achievements.push(...killsAchievements);

      // Process comparison achievements (face-to-face)
      const comparisonAchievements = processComparisonAchievements(stats, gameData, playerName, suffix);
      achievements.push(...comparisonAchievements);
    });

    return {
      playerId: playerName,
      allGamesAchievements,
      moddedOnlyAchievements
    };
  }, [playerName, allGamesStats, moddedOnlyStats, allGamesMapStats, moddedOnlyMapStats, allGamesCampStats, moddedOnlyCampStats, allGamesSeriesStats, moddedOnlySeriesStats, allGamesDeathStats, moddedOnlyDeathStats, rawGameData]);

  return achievements;
}