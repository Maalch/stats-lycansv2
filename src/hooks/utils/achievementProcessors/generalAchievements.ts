/**
 * Achievement processor for general player statistics (participations, win rates)
 */

import type { PlayerStat } from '../../../types/api';
import type { Achievement } from '../../../types/achievements';

// Helper function to check if a player is in top 10 of a sorted list
function findPlayerRank(sortedPlayers: PlayerStat[], playerName: string): { rank: number; value: number } | null {
  const index = sortedPlayers.findIndex(p => p.player === playerName);
  if (index === -1 || index >= 10) return null;
  
  return {
    rank: index + 1,
    value: getPlayerValue(sortedPlayers[index])
  };
}

// Helper to extract the relevant value from PlayerStat for different achievement types
function getPlayerValue(playerStat: PlayerStat): number {
  return playerStat.gamesPlayed; // Default, will be overridden in specific contexts
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
 * Process general statistics achievements for a player
 */
export function processGeneralAchievements(
  playerStats: PlayerStat[],
  playerName: string,
  suffix: string
): Achievement[] {
  const achievements: Achievement[] = [];

  if (!playerStats || playerStats.length === 0) return achievements;

  // 1. Top 10 in participations
  const byParticipations = [...playerStats].sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  const participationRank = findPlayerRank(byParticipations, playerName);
  if (participationRank) {
    achievements.push(createAchievement(
      `participation-${suffix ? 'modded' : 'all'}`,
      `🎯 Top ${participationRank.rank} Participations${suffix}`,
      `${participationRank.rank}${participationRank.rank === 1 ? 'er' : 'ème'} joueur le plus actif avec ${participationRank.value} parties`,
      'good',
      participationRank.rank,
      participationRank.value
    ));
  }

  // 2. Top 10 in best win rate (min. 10 games)
  const eligibleFor10Games = playerStats.filter(p => p.gamesPlayed >= 10);
  const byWinRate10 = [...eligibleFor10Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
  const winRate10Rank = findPlayerRank(byWinRate10, playerName);
  if (winRate10Rank) {
    const winRate = parseFloat(byWinRate10.find(p => p.player === playerName)?.winPercent || '0');
    achievements.push(createAchievement(
      `winrate-10-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${winRate10Rank.rank} Taux de Victoire${suffix}`,
      `${winRate10Rank.rank}${winRate10Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate}% (min. 10 parties)`,
      'good',
      winRate10Rank.rank,
      winRate
    ));
  }

  // 3. Top 10 in best win rate (min. 50 games)
  const eligibleFor50Games = playerStats.filter(p => p.gamesPlayed >= 50);
  if (eligibleFor50Games.length > 0) {
    const byWinRate50 = [...eligibleFor50Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
    const winRate50Rank = findPlayerRank(byWinRate50, playerName);
    if (winRate50Rank) {
      const winRate = parseFloat(byWinRate50.find(p => p.player === playerName)?.winPercent || '0');
      achievements.push(createAchievement(
        `winrate-50-${suffix ? 'modded' : 'all'}`,
        `🌟 Top ${winRate50Rank.rank} Taux de Victoire Expert${suffix}`,
        `${winRate50Rank.rank}${winRate50Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate}% (min. 50 parties)`,
        'good',
        winRate50Rank.rank,
        winRate
      ));
    }
  }

  // 4. Top 10 in lowest win rate (min. 10 games) - "bad" achievement
  const byWorstWinRate10 = [...eligibleFor10Games].sort((a, b) => parseFloat(a.winPercent) - parseFloat(b.winPercent));
  const worstWinRate10Rank = findPlayerRank(byWorstWinRate10, playerName);
  if (worstWinRate10Rank) {
    const winRate = parseFloat(byWorstWinRate10.find(p => p.player === playerName)?.winPercent || '0');
    achievements.push(createAchievement(
      `worst-winrate-10-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${worstWinRate10Rank.rank} Pire Taux de Victoire${suffix}`,
      `${worstWinRate10Rank.rank}${worstWinRate10Rank.rank === 1 ? 'er' : 'ème'} pire taux de victoire: ${winRate}% (min. 10 parties)`,
      'bad',
      worstWinRate10Rank.rank,
      winRate
    ));
  }

  // 5. Top 10 in lowest win rate (min. 50 games) - "bad" achievement
  if (eligibleFor50Games.length > 0) {
    const byWorstWinRate50 = [...eligibleFor50Games].sort((a, b) => parseFloat(a.winPercent) - parseFloat(b.winPercent));
    const worstWinRate50Rank = findPlayerRank(byWorstWinRate50, playerName);
    if (worstWinRate50Rank) {
      const winRate = parseFloat(byWorstWinRate50.find(p => p.player === playerName)?.winPercent || '0');
      achievements.push(createAchievement(
        `worst-winrate-50-${suffix ? 'modded' : 'all'}`,
        `☠️ Top ${worstWinRate50Rank.rank} Pire Taux de Victoire Expert${suffix}`,
        `${worstWinRate50Rank.rank}${worstWinRate50Rank.rank === 1 ? 'er' : 'ème'} pire taux de victoire: ${winRate}% (min. 50 parties)`,
        'bad',
        worstWinRate50Rank.rank,
        winRate
      ));
    }
  }

  return achievements;
}