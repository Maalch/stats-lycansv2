/**
 * Achievement processor for player history/map-based statistics
 */

import { computePlayerGameHistory } from '../playerGameHistoryUtils';
import type { GameLogEntry } from '../../useCombinedRawData';
import type { Achievement } from '../../../types/achievements';

// Interface for map-based player statistics
export interface PlayerMapStat {
  player: string;
  villageWinRate: number;
  villageGames: number;
  chateauWinRate: number;
  chateauGames: number;
}

// Helper function to compute map statistics for all players
function computeAllPlayersMapStats(gameData: GameLogEntry[]): PlayerMapStat[] {
  const playerMap = new Map<string, {
    villageGames: number;
    villageWins: number;
    chateauGames: number;
    chateauWins: number;
  }>();

  // Get all unique players
  const allPlayers = new Set<string>();
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      allPlayers.add(playerStat.Username);
    });
  });

  // Initialize map for all players
  allPlayers.forEach(playerName => {
    playerMap.set(playerName, {
      villageGames: 0,
      villageWins: 0,
      chateauGames: 0,
      chateauWins: 0
    });
  });

  // Calculate stats for each player on each map
  allPlayers.forEach(playerName => {
    const playerHistory = computePlayerGameHistory(playerName, gameData);
    if (playerHistory && playerHistory.mapStats) {
      const stats = playerMap.get(playerName)!;
      
      if (playerHistory.mapStats['Village']) {
        stats.villageGames = playerHistory.mapStats['Village'].appearances;
        stats.villageWins = playerHistory.mapStats['Village'].wins;
      }
      
      if (playerHistory.mapStats['Château']) {
        stats.chateauGames = playerHistory.mapStats['Château'].appearances;
        stats.chateauWins = playerHistory.mapStats['Château'].wins;
      }
    }
  });

  // Convert to PlayerMapStat array
  return Array.from(playerMap.entries()).map(([player, stats]) => ({
    player,
    villageWinRate: stats.villageGames > 0 ? (stats.villageWins / stats.villageGames) * 100 : 0,
    villageGames: stats.villageGames,
    chateauWinRate: stats.chateauGames > 0 ? (stats.chateauWins / stats.chateauGames) * 100 : 0,
    chateauGames: stats.chateauGames
  }));
}

// Helper function to check if a player is in top 10 of a map-based sorted list
function findPlayerMapRank(sortedPlayers: PlayerMapStat[], playerName: string, mapType: 'village' | 'chateau'): { rank: number; value: number; games: number } | null {
  const index = sortedPlayers.findIndex(p => p.player === playerName);
  if (index === -1 || index >= 10) return null;
  
  const playerData = sortedPlayers[index];
  return {
    rank: index + 1,
    value: mapType === 'village' ? playerData.villageWinRate : playerData.chateauWinRate,
    games: mapType === 'village' ? playerData.villageGames : playerData.chateauGames
  };
}

// Helper to create achievement object
function createAchievement(
  id: string,
  title: string,
  description: string,
  type: 'good' | 'bad',
  rank: number,
  value: number,
  redirectTo?: Achievement['redirectTo'],
  category?: Achievement['category']
): Achievement {
  return {
    id,
    title,
    description,
    type,
    category: category || 'general',
    rank,
    value,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'playersGeneral'
    }
  };
}

/**
 * Compute map statistics from game data
 */
export function computeMapStats(gameData: GameLogEntry[]): PlayerMapStat[] {
  return computeAllPlayersMapStats(gameData);
}

/**
 * Process history/map-based achievements for a player
 */
export function processHistoryAchievements(
  mapStats: PlayerMapStat[],
  playerName: string,
  suffix: string
): Achievement[] {
  const achievements: Achievement[] = [];

  if (!mapStats || mapStats.length === 0) return achievements;

  // 1. Top 10 in best win rate (Village map)
  const eligibleForVillage = mapStats.filter(p => p.villageGames >= 10);
  if (eligibleForVillage.length > 0) {
    const byVillageWinRate = [...eligibleForVillage].sort((a, b) => b.villageWinRate - a.villageWinRate);
    const villageWinRateRank = findPlayerMapRank(byVillageWinRate, playerName, 'village');
    if (villageWinRateRank) {
      achievements.push(createAchievement(
        `village-winrate-${suffix ? 'modded' : 'all'}`,
        `🏘️ Top ${villageWinRateRank.rank} Village${suffix}`,
        `${villageWinRateRank.rank}${villageWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Village: ${villageWinRateRank.value.toFixed(1)}% (${villageWinRateRank.games} parties)`,
        'good',
        villageWinRateRank.rank,
        villageWinRateRank.value,
        {
          tab: 'players',
          subTab: 'history',
          chartSection: 'map-performance'
        },
        'history'
      ));
    }
  }

  // 2. Top 10 in best win rate (Château map)
  const eligibleForChateau = mapStats.filter(p => p.chateauGames >= 10);
  if (eligibleForChateau.length > 0) {
    const byChateauWinRate = [...eligibleForChateau].sort((a, b) => b.chateauWinRate - a.chateauWinRate);
    const chateauWinRateRank = findPlayerMapRank(byChateauWinRate, playerName, 'chateau');
    if (chateauWinRateRank) {
      achievements.push(createAchievement(
        `chateau-winrate-${suffix ? 'modded' : 'all'}`,
        `🏰 Top ${chateauWinRateRank.rank} Château${suffix}`,
        `${chateauWinRateRank.rank}${chateauWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Château: ${chateauWinRateRank.value.toFixed(1)}% (${chateauWinRateRank.games} parties)`,
        'good',
        chateauWinRateRank.rank,
        chateauWinRateRank.value,
        {
          tab: 'players',
          subTab: 'history',
          chartSection: 'map-performance'
        },
        'history'
      ));
    }
  }

  return achievements;
}