/**
 * Achievement processor for kills and deaths statistics
 */

import type { Achievement } from '../../../types/achievements';
import type { DeathStatistics, KillerStats, PlayerDeathStats } from '../deathStatisticsUtils';

// Helper function to find top killers based on different criteria
function findTopKillers(
  killerStats: KillerStats[], 
  minGames: number = 1,
  sortBy: 'kills' | 'averageKillsPerGame' = 'kills'
): KillerStats[] {
  return killerStats
    .filter(killer => killer.gamesPlayed >= minGames)
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 10);
}

// Helper function to find top players who died the most
function findTopDeaths(
  playerDeathStats: PlayerDeathStats[], 
  sortBy: 'totalDeaths' | 'deathRate' = 'totalDeaths',
  minGames: number = 1
): PlayerDeathStats[] {
  return playerDeathStats
    .filter(player => {
      // For deathRate, we need to ensure they have enough games
      // We don't have direct access to games played, so we'll use a reasonable estimate
      // based on total deaths and death rate
      if (sortBy === 'deathRate') {
        return player.deathRate > 0 && player.totalDeaths >= minGames * 0.3; // Rough estimate
      }
      return true;
    })
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 10);
}

// Helper function to check if a player is in top 10 of killers
function findPlayerKillerRank(
  topKillers: KillerStats[], 
  playerName: string
): { rank: number; value: number; stats: KillerStats } | null {
  const index = topKillers.findIndex(killer => killer.killerName === playerName);
  if (index === -1) return null;
  
  const playerStats = topKillers[index];
  return {
    rank: index + 1,
    value: playerStats.kills,
    stats: playerStats
  };
}

// Helper function to check if a player is in top 10 of deaths
function findPlayerDeathRank(
  topDeaths: PlayerDeathStats[], 
  playerName: string,
  valueType: 'totalDeaths' | 'deathRate' = 'totalDeaths'
): { rank: number; value: number; stats: PlayerDeathStats } | null {
  const index = topDeaths.findIndex(death => death.playerName === playerName);
  if (index === -1) return null;
  
  const playerStats = topDeaths[index];
  return {
    rank: index + 1,
    value: valueType === 'totalDeaths' ? playerStats.totalDeaths : playerStats.deathRate,
    stats: playerStats
  };
}

// Helper to create kills achievement object
function createKillsAchievement(
  id: string,
  title: string,
  description: string,
  type: 'good' | 'bad',
  rank: number,
  value: number,
  redirectTo: Achievement['redirectTo']
): Achievement {
  return {
    id,
    title,
    description,
    type,
    category: 'kills',
    rank,
    value,
    redirectTo
  };
}

/**
 * Process kills and deaths achievements for a specific player
 */
export function processKillsAchievements(
  deathStats: DeathStatistics,
  playerName: string,
  suffix: string
): Achievement[] {
  if (!deathStats) return [];

  const achievements: Achievement[] = [];

  // GOOD ACHIEVEMENTS (Killer achievements)

  // 1. Top 10 killers (total kills)
  const topKillers = findTopKillers(deathStats.killerStats, 1, 'kills');
  const killerRank = findPlayerKillerRank(topKillers, playerName);
  if (killerRank) {
    achievements.push(createKillsAchievement(
      `top-killer-${suffix ? 'modded' : 'all'}`,
      `⚔️ Top ${killerRank.rank} Tueur${suffix}`,
      `${killerRank.rank}${killerRank.rank === 1 ? 'er' : 'ème'} plus grand tueur avec ${killerRank.value} éliminations`,
      'good',
      killerRank.rank,
      killerRank.value,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'killers'
      }
    ));
  }

  // 2. Top 10 killers (average per game, min. 20 games)
  const topKillersAverage = findTopKillers(deathStats.killerStats, 20, 'averageKillsPerGame');
  const killerAverageRank = findPlayerKillerRank(topKillersAverage, playerName);
  if (killerAverageRank) {
    achievements.push(createKillsAchievement(
      `top-killer-average-${suffix ? 'modded' : 'all'}`,
      `🎯 Top ${killerAverageRank.rank} Tueur Efficace${suffix}`,
      `${killerAverageRank.rank}${killerAverageRank.rank === 1 ? 'er' : 'ème'} meilleur ratio d'éliminations: ${killerAverageRank.stats.averageKillsPerGame.toFixed(2)} par partie (${killerAverageRank.stats.gamesPlayed} parties)`,
      'good',
      killerAverageRank.rank,
      parseFloat(killerAverageRank.stats.averageKillsPerGame.toFixed(2)),
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'killers-average'
      }
    ));
  }

  // 3. Top 10 killers as Loup (total kills)
  // Note: This would require filtering by camp - for now we'll implement a placeholder
  // const topLoupKillers = findTopKillersInCamp(gameData, 'Loup', 1, 'kills');
  // We'll need to enhance this when we have proper camp filtering

  // 4. Top 10 killers as Loup (average per game, min. 10 games)
  // Similar to above - needs camp filtering

  // 5. Top 10 killer of Loup/Solo as Villageois (needs implementation)
  // This is complex and needs specific death type filtering

  // 6. Top 10 killer of Loup/Solo as Villageois with Potion
  // Needs death type filtering for ASSASSIN_POTION and HAUNTED_POTION

  // 7. Top 10 killer of Loup/Solo as Villageois with Tir de Chasseur
  // Needs death type filtering for HUNTER_SHOT

  // BAD ACHIEVEMENTS (Death achievements)

  // 8. Top 10 killed (total deaths)
  const topDeaths = findTopDeaths(deathStats.playerDeathStats, 'totalDeaths', 1);
  const deathRank = findPlayerDeathRank(topDeaths, playerName, 'totalDeaths');
  if (deathRank) {
    achievements.push(createKillsAchievement(
      `top-killed-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${deathRank.rank} Victime${suffix}`,
      `${deathRank.rank}${deathRank.rank === 1 ? 'ère' : 'ème'} joueur le plus éliminé avec ${deathRank.value} morts`,
      'bad',
      deathRank.rank,
      deathRank.value,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'deaths'
      }
    ));
  }

  // 9. Top 10 killed (average per game, min. 25 games)
  const topDeathsAverage = findTopDeaths(deathStats.playerDeathStats, 'deathRate', 25);
  const deathAverageRank = findPlayerDeathRank(topDeathsAverage, playerName, 'deathRate');
  if (deathAverageRank) {
    achievements.push(createKillsAchievement(
      `top-killed-average-${suffix ? 'modded' : 'all'}`,
      `☠️ Top ${deathAverageRank.rank} Victime Récurrente${suffix}`,
      `${deathAverageRank.rank}${deathAverageRank.rank === 1 ? 'ère' : 'ème'} plus haut taux de mortalité: ${deathAverageRank.value.toFixed(2)} morts par partie (min. 25 parties)`,
      'bad',
      deathAverageRank.rank,
      parseFloat(deathAverageRank.value.toFixed(2)),
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'deaths-average'
      }
    ));
  }

  // 10. Top 10 killed as Villageois (needs camp filtering)
  // 11. Top 10 killed as Villageois (average per game, min. 25 games) (needs camp filtering)
  // 12. Top 10 killed as Loup (needs camp filtering)
  // 13. Top 10 killed as Loup (average per game, min. 10 games) (needs camp filtering)

  return achievements;
}

