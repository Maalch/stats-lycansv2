/**
 * Comparison achievements processor - handles player relationship and matchup stats
 */

import { createComparisonAchievement } from '../helpers.js';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../../src/utils/datasyncExport.js';

/**
 * Generate player comparison data for head-to-head statistics
 * @param {string} player1Name - First player name
 * @param {string} player2Name - Second player name
 * @param {Array} rawGameData - Array of game log entries
 * @returns {Object|null} - Comparison data or null
 */
function generatePlayerComparison(player1Name, player2Name, rawGameData) {
  const commonGames = [];
  const opposingCampGames = [];
  const sameCampGames = [];
  let player1CommonWins = 0;
  let player2CommonWins = 0;
  let player1OpposingWins = 0;
  let player2OpposingWins = 0;
  let sameCampWins = 0;

  rawGameData.forEach(game => {
    const player1Stat = game.PlayerStats.find(p => p.Username.toLowerCase() === player1Name.toLowerCase());
    const player2Stat = game.PlayerStats.find(p => p.Username.toLowerCase() === player2Name.toLowerCase());
    
    if (!player1Stat || !player2Stat) return;
    
    commonGames.push(game);

    const player1Role = getPlayerFinalRole(player1Stat.MainRoleInitial, player1Stat.MainRoleChanges || []);
    const player2Role = getPlayerFinalRole(player2Stat.MainRoleInitial, player2Stat.MainRoleChanges || []);

    // Use regroupWolfSubRoles: true to automatically group Traître and Louveteau with Loup
    const player1Camp = getPlayerCampFromRole(player1Role, { regroupWolfSubRoles: true });
    const player2Camp = getPlayerCampFromRole(player2Role, { regroupWolfSubRoles: true });

    // Count wins in common games
    const player1Won = player1Stat.Victorious;
    const player2Won = player2Stat.Victorious;
    
    if (player1Won) player1CommonWins++;
    if (player2Won) player2CommonWins++;
    
    // Players are in opposing camps if they have different camp affiliations
    const isOpposingCamps = player1Camp !== player2Camp;
    
    if (isOpposingCamps) {
      opposingCampGames.push(game);
      
      if (player1Won) player1OpposingWins++;
      if (player2Won) player2OpposingWins++;
    } else if (player1Camp === player2Camp) {
      // Same camp affiliation
      sameCampGames.push(game);
      
      // Count as team win if either player wins
      if (player1Won || player2Won) {
        sameCampWins++;
      }
    }
  });

  return {
    headToHeadStats: {
      commonGames: commonGames.length,
      player1Wins: player1CommonWins,
      player2Wins: player2CommonWins,
      opposingCampGames: opposingCampGames.length,
      player1WinsAsOpponent: player1OpposingWins,
      player2WinsAsOpponent: player2OpposingWins,
      sameCampGames: sameCampGames.length,
      sameCampWins: sameCampWins
    }
  };
}

/**
 * Compute all player relationships for a specific player
 * @param {string} targetPlayerId - Target player ID (Steam ID)
 * @param {Array} playerStatsData - Array of player statistics
 * @param {Array} rawGameData - Array of game log entries
 * @param {number} minGames - Minimum games required for relationship
 * @returns {Array} - Array of player relationships
 */
function computePlayerRelationships(targetPlayerId, playerStatsData, rawGameData, minGames = 10) {
  const relationships = [];
  
  // Find the target player's name from stats
  const targetPlayerStats = playerStatsData.find(p => p.player === targetPlayerId);
  if (!targetPlayerStats) return relationships;
  
  const targetPlayerName = targetPlayerStats.playerName;
  
  // Get all other players who have enough games
  const otherPlayers = playerStatsData
    .filter(p => p.player !== targetPlayerId && p.gamesPlayed >= 30) // Only consider players with meaningful participation
    .map(p => ({ id: p.player, name: p.playerName }));

  otherPlayers.forEach(otherPlayer => {
    // Generate comparison data to get head-to-head stats (use names for game searching)
    const comparisonData = generatePlayerComparison(targetPlayerName, otherPlayer.name, rawGameData);

    if (!comparisonData) return;

    const sameCampGames = comparisonData.headToHeadStats.sameCampGames;
    const opposingCampGames = comparisonData.headToHeadStats.opposingCampGames;

    // Only include relationships with enough games
    if (sameCampGames >= minGames || opposingCampGames >= minGames) {
      const sameCampWins = comparisonData.headToHeadStats.sameCampWins;
      const opposingWins = comparisonData.headToHeadStats.player1WinsAsOpponent; // Wins when target player faces opponent

      relationships.push({
        playerName: targetPlayerName,
        otherPlayerName: otherPlayer.name,
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
 * @param {Array} playerStatsData - Array of player statistics
 * @param {Array} rawGameData - Array of game log entries
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
export function processComparisonAchievements(playerStatsData, rawGameData, playerId, suffix) {
  if (!playerStatsData || !rawGameData) return [];

  const achievements = [];
  const relationships = computePlayerRelationships(playerId, playerStatsData, rawGameData, 15);

  if (relationships.length === 0) return achievements;

  // 1. Best mate (highest same camp win rate, min. 15 games together)
  const mateRelationships = relationships.filter(r => r.sameCampGames >= 15);
  if (mateRelationships.length > 0) {
    const bestMate = mateRelationships.reduce((best, current) => 
      current.sameCampWinRate > best.sameCampWinRate ? current : best
    );

    achievements.push(createComparisonAchievement(
      `best-mate-${suffix ? 'modded' : 'all'}`,
      `🤝 Meilleur Coéquipier${suffix}`,
      `Meilleur duo avec ${bestMate.otherPlayerName}: ${bestMate.sameCampWinRate.toFixed(1)}% de victoires en équipe (${bestMate.sameCampWins}/${bestMate.sameCampGames} parties, min. 15)`,
      'good',
      bestMate.sameCampWinRate,
      {
        tab: 'rankings',
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
        `Duo le moins efficace avec ${worstMate.otherPlayerName}: ${worstMate.sameCampWinRate.toFixed(1)}% de victoires en équipe (${worstMate.sameCampWins}/${worstMate.sameCampGames} parties, min. 15)`,
        'bad',
        worstMate.sameCampWinRate,
        {
          tab: 'rankings',
          subTab: 'comparison',
          chartSection: 'same-camp-games'
        }
      ));
    }
  }

  // 3. Best matchup (highest opposing win rate, min. 15 games against)
  const opponentRelationships = relationships.filter(r => r.opposingCampGames >= 15);
  if (opponentRelationships.length > 0) {
    const bestMatchup = opponentRelationships.reduce((best, current) => 
      current.opposingWinRate > best.opposingWinRate ? current : best
    );

    achievements.push(createComparisonAchievement(
      `best-matchup-${suffix ? 'modded' : 'all'}`,
      `⚔️ Meilleur Face-à-Face${suffix}`,
      `Domination contre ${bestMatchup.otherPlayerName}: ${bestMatchup.opposingWinRate.toFixed(1)}% de victoires en affrontement (${bestMatchup.opposingWins}/${bestMatchup.opposingCampGames} parties, min. 15)`,
      'good',
      bestMatchup.opposingWinRate,
      {
        tab: 'rankings',
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
        `Faiblesse contre ${worstMatchup.otherPlayerName}: ${worstMatchup.opposingWinRate.toFixed(1)}% de victoires en affrontement (${worstMatchup.opposingWins}/${worstMatchup.opposingCampGames} parties, min. 15)`,
        'bad',
        worstMatchup.opposingWinRate,
        {
          tab: 'rankings',
          subTab: 'comparison',
          chartSection: 'opposing-games'
        }
      ));
    }
  }

  return achievements;
}
