/**
 * Achievement processor for player comparison/face-to-face statistics
 */

import type { Achievement } from '../../../types/achievements';
import { generatePlayerComparison } from '../playerComparisonUtils';
import type { PlayerStat } from '../../../types/api';
import type { GameLogEntry } from '../../useCombinedRawData';

// Interface for mate/opponent relationship data
interface PlayerRelationship {
  playerName: string;
  otherPlayerName: string;
  // Same camp (mate) statistics
  sameCampGames: number;
  sameCampWins: number;
  sameCampWinRate: number;
  // Opposing camp (matchup) statistics  
  opposingCampGames: number;
  opposingWins: number; // Wins when facing this opponent
  opposingWinRate: number;
}

// Helper to create comparison achievement object
function createComparisonAchievement(
  id: string,
  title: string,
  description: string,
  type: 'good' | 'bad',
  value: number,
  redirectTo: Achievement['redirectTo']
): Achievement {
  return {
    id,
    title,
    description,
    type,
    category: 'general', // These are special individual cards, not ranked achievements
    value,
    redirectTo
  };
}

/**
 * Compute all player relationships for a specific player
 */
function computePlayerRelationships(
  targetPlayer: string,
  playerStatsData: { playerStats: PlayerStat[] },
  rawGameData: GameLogEntry[],
  minGames: number = 10
): PlayerRelationship[] {
  const relationships: PlayerRelationship[] = [];
  
  // Get all other players who have enough games
  const otherPlayers = playerStatsData.playerStats
    .filter(p => p.player !== targetPlayer && p.gamesPlayed >= 30) // Only consider players with meaningful participation
    .map(p => p.player);

  otherPlayers.forEach(otherPlayer => {
    // Generate comparison data to get head-to-head stats
    const comparisonData = generatePlayerComparison(
      targetPlayer,
      otherPlayer,
      playerStatsData,
      rawGameData
    );

    if (!comparisonData) return;

    const sameCampGames = comparisonData.headToHeadStats.sameCampGames;
    const opposingCampGames = comparisonData.headToHeadStats.opposingCampGames;

    // Only include relationships with enough games
    if (sameCampGames >= minGames || opposingCampGames >= minGames) {
      const sameCampWins = comparisonData.headToHeadStats.sameCampWins;
      const opposingWins = comparisonData.headToHeadStats.player1WinsAsOpponent; // Wins when target player faces opponent

      relationships.push({
        playerName: targetPlayer,
        otherPlayerName: otherPlayer,
        sameCampGames,
        sameCampWins,
        sameCampWinRate: sameCampGames > 0 ? (sameCampWins / sameCampGames) * 100 : 0,
        opposingCampGames,
        opposingWins,
        opposingWinRate: opposingCampGames > 0 ? (opposingWins / opposingCampGames) * 100 : 0
      });
    }
  });

  return relationships;
}

/**
 * Process face-to-face achievements for a specific player
 */
export function processComparisonAchievements(
  playerStatsData: { playerStats: PlayerStat[] },
  rawGameData: GameLogEntry[],
  playerName: string,
  suffix: string
): Achievement[] {
  if (!playerStatsData || !rawGameData) return [];

  const achievements: Achievement[] = [];
  const relationships = computePlayerRelationships(playerName, playerStatsData, rawGameData, 10);

  if (relationships.length === 0) return achievements;

  // 1. Best mate (highest same camp win rate, min. 10 games together)
  const mateRelationships = relationships.filter(r => r.sameCampGames >= 10);
  if (mateRelationships.length > 0) {
    const bestMate = mateRelationships.reduce((best, current) => 
      current.sameCampWinRate > best.sameCampWinRate ? current : best
    );

    achievements.push(createComparisonAchievement(
      `best-mate-${suffix ? 'modded' : 'all'}`,
      `🤝 Meilleur Coéquipier${suffix}`,
      `Meilleur duo avec ${bestMate.otherPlayerName}: ${bestMate.sameCampWinRate.toFixed(1)}% de victoires en équipe (${bestMate.sameCampWins}/${bestMate.sameCampGames} parties)`,
      'good',
      bestMate.sameCampWinRate,
      {
        tab: 'players',
        subTab: 'comparison',
        chartSection: 'same-camp-games'
      }
    ));
  }

  // 2. Worst mate (lowest same camp win rate, min. 10 games together)
  if (mateRelationships.length > 1) {
    const bestMate = mateRelationships.reduce((best, current) => 
      current.sameCampWinRate > best.sameCampWinRate ? current : best
    );
    
    const worstMate = mateRelationships.reduce((worst, current) => 
      current.sameCampWinRate < worst.sameCampWinRate ? current : worst
    );

    // Only create "worst mate" achievement if it's different from best mate and significantly bad
    if (worstMate.otherPlayerName !== bestMate.otherPlayerName && worstMate.sameCampWinRate < 60) {
      achievements.push(createComparisonAchievement(
        `worst-mate-${suffix ? 'modded' : 'all'}`,
        `💔 Pire Coéquipier${suffix}`,
        `Duo le moins efficace avec ${worstMate.otherPlayerName}: ${worstMate.sameCampWinRate.toFixed(1)}% de victoires en équipe (${worstMate.sameCampWins}/${worstMate.sameCampGames} parties)`,
        'bad',
        worstMate.sameCampWinRate,
        {
          tab: 'players',
          subTab: 'comparison',
          chartSection: 'same-camp-games'
        }
      ));
    }
  }

  // 3. Best matchup (highest opposing win rate, min. 10 games against)
  const opponentRelationships = relationships.filter(r => r.opposingCampGames >= 10);
  if (opponentRelationships.length > 0) {
    const bestMatchup = opponentRelationships.reduce((best, current) => 
      current.opposingWinRate > best.opposingWinRate ? current : best
    );

    achievements.push(createComparisonAchievement(
      `best-matchup-${suffix ? 'modded' : 'all'}`,
      `⚔️ Meilleur Face-à-Face${suffix}`,
      `Domination contre ${bestMatchup.otherPlayerName}: ${bestMatchup.opposingWinRate.toFixed(1)}% de victoires en affrontement (${bestMatchup.opposingWins}/${bestMatchup.opposingCampGames} parties)`,
      'good',
      bestMatchup.opposingWinRate,
      {
        tab: 'players',
        subTab: 'comparison',
        chartSection: 'opposing-games'
      }
    ));
  }

  // 4. Worst matchup (lowest opposing win rate, min. 10 games against)
  if (opponentRelationships.length > 1) {
    const bestMatchup = opponentRelationships.reduce((best, current) => 
      current.opposingWinRate > best.opposingWinRate ? current : best
    );
    
    const worstMatchup = opponentRelationships.reduce((worst, current) => 
      current.opposingWinRate < worst.opposingWinRate ? current : worst
    );

    // Only create "worst matchup" achievement if it's different from best matchup and significantly bad
    if (worstMatchup.otherPlayerName !== bestMatchup.otherPlayerName && worstMatchup.opposingWinRate < 40) {
      achievements.push(createComparisonAchievement(
        `worst-matchup-${suffix ? 'modded' : 'all'}`,
        `💀 Pire Face-à-Face${suffix}`,
        `Faiblesse contre ${worstMatchup.otherPlayerName}: ${worstMatchup.opposingWinRate.toFixed(1)}% de victoires en affrontement (${worstMatchup.opposingWins}/${worstMatchup.opposingCampGames} parties)`,
        'bad',
        worstMatchup.opposingWinRate,
        {
          tab: 'players',
          subTab: 'comparison',
          chartSection: 'opposing-games'
        }
      ));
    }
  }

  return achievements;
}