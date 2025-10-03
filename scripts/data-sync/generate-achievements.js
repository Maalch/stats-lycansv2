import fs from 'fs/promises';
import path from 'path';
import { DeathTypeCode, codifyDeathType } from '../../src/utils/datasyncExport.js';

// Data directory relative to project root
const DATA_DIR = '../../data';
const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), DATA_DIR);

/**
 * Helper function to find a player's rank in a sorted list
 * @param {Array} sortedPlayers - Array of player stats sorted by the metric
 * @param {string} playerName - Name of the player to find
 * @param {Function} valueExtractor - Function to extract the value from player stat
 * @returns {Object|null} - Object with rank and value, or null if not found
 */
function findPlayerRank(sortedPlayers, playerName, valueExtractor) {
  const index = sortedPlayers.findIndex(p => p.player === playerName);
  if (index === -1) return null;
  
  return {
    rank: index + 1,
    value: valueExtractor(sortedPlayers[index])
  };
}

/**
 * Helper to create achievement object
 * @param {string} id - Unique achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @param {string} category - Achievement category
 * @returns {Object} - Achievement object
 */
function createAchievement(id, title, description, type, rank, value, totalRanked, redirectTo, category = 'general') {
  return {
    id,
    title,
    description,
    type,
    category,
    rank,
    value,
    totalRanked,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'playersGeneral'
    }
  };
}

/**
 * Process general statistics achievements for a player
 * @param {Array} playerStats - Array of player statistics
 * @param {string} playerName - Name of the player
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
function processGeneralAchievements(playerStats, playerName, suffix) {
  const achievements = [];

  if (!playerStats || playerStats.length === 0) return achievements;

  // 1. Participations ranking
  const byParticipations = [...playerStats].sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  const participationRank = findPlayerRank(byParticipations, playerName, p => p.gamesPlayed);
  if (participationRank) {
    achievements.push(createAchievement(
      `participation-${suffix ? 'modded' : 'all'}`,
      `🎯 Rang ${participationRank.rank} Participations${suffix}`,
      `${participationRank.rank}${participationRank.rank === 1 ? 'er' : 'ème'} joueur le plus actif avec ${participationRank.value} parties`,
      'good',
      participationRank.rank,
      participationRank.value,
      byParticipations.length
    ));
  }

  // 2. Best win rate ranking (min. 10 games)
  const eligibleFor10Games = playerStats.filter(p => p.gamesPlayed >= 10);
  const byWinRate10 = [...eligibleFor10Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
  const winRate10Rank = findPlayerRank(byWinRate10, playerName, p => parseFloat(p.winPercent));
  if (winRate10Rank) {
    achievements.push(createAchievement(
      `winrate-10-${suffix ? 'modded' : 'all'}`,
      `🏆 Rang ${winRate10Rank.rank} Taux de Victoire${suffix}`,
      `${winRate10Rank.rank}${winRate10Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate10Rank.value}% (min. 10 parties)`,
      'good',
      winRate10Rank.rank,
      winRate10Rank.value,
      byWinRate10.length
    ));
  }

  // 3. Best win rate ranking (min. 50 games)
  const eligibleFor50Games = playerStats.filter(p => p.gamesPlayed >= 50);
  if (eligibleFor50Games.length > 0) {
    const byWinRate50 = [...eligibleFor50Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
    const winRate50Rank = findPlayerRank(byWinRate50, playerName, p => parseFloat(p.winPercent));
    if (winRate50Rank) {
      achievements.push(createAchievement(
        `winrate-50-${suffix ? 'modded' : 'all'}`,
        `🌟 Rang ${winRate50Rank.rank} Taux de Victoire Expert${suffix}`,
        `${winRate50Rank.rank}${winRate50Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate50Rank.value}% (min. 50 parties)`,
        'good',
        winRate50Rank.rank,
        winRate50Rank.value,
        byWinRate50.length
      ));
    }
  }

  return achievements;
}

/**
 * Compute player statistics from game data
 * @param {Array} gameData - Array of game entries
 * @returns {Object} - Object with totalGames and playerStats array
 */
function computePlayerStats(gameData) {
  const playerStatsMap = new Map();

  // Process each game
  gameData.forEach(game => {
    // Determine winning camp
    let winningCamp = null;
    const campCounts = {
      'Villageois': 0,
      'Loups': 0,
      'Solo': 0
    };

    // Count victories by camp
    game.PlayerStats.forEach(player => {
      if (player.Victorious) {
        const role = player.MainRoleInitial;
        if (role === 'Villageois' || role === 'Chasseur' || role === 'Alchimiste') {
          campCounts.Villageois++;
        } else if (role === 'Loup' || role === 'Traître') {
          campCounts.Loups++;
        } else {
          campCounts.Solo++;
        }
      }
    });

    // Determine winning camp
    if (campCounts.Solo > 0) {
      winningCamp = 'Solo';
    } else if (campCounts.Loups > 0) {
      winningCamp = 'Loups';
    } else if (campCounts.Villageois > 0) {
      winningCamp = 'Villageois';
    }

    // Process each player in the game
    game.PlayerStats.forEach(player => {
      const playerName = player.Username;
      
      if (!playerStatsMap.has(playerName)) {
        playerStatsMap.set(playerName, {
          player: playerName,
          gamesPlayed: 0,
          wins: 0,
          camps: {
            villageois: { played: 0, won: 0 },
            loups: { played: 0, won: 0 },
            solo: { played: 0, won: 0 }
          }
        });
      }

      const stats = playerStatsMap.get(playerName);
      stats.gamesPlayed++;

      if (player.Victorious) {
        stats.wins++;
      }

      // Categorize by camp
      const role = player.MainRoleInitial;
      if (role === 'Villageois' || role === 'Chasseur' || role === 'Alchimiste') {
        stats.camps.villageois.played++;
        if (player.Victorious) stats.camps.villageois.won++;
      } else if (role === 'Loup' || role === 'Traître') {
        stats.camps.loups.played++;
        if (player.Victorious) stats.camps.loups.won++;
      } else {
        stats.camps.solo.played++;
        if (player.Victorious) stats.camps.solo.won++;
      }
    });
  });

  // Convert to array and calculate percentages
  const playerStats = Array.from(playerStatsMap.values()).map(stats => ({
    ...stats,
    gamesPlayedPercent: ((stats.gamesPlayed / gameData.length) * 100).toFixed(1),
    winPercent: stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0'
  }));

  return {
    totalGames: gameData.length,
    playerStats
  };
}

/**
 * Get player camp from role name
 * @param {string} roleName - Role name to categorize
 * @returns {string} - Camp name
 */
function getPlayerCampFromRole(roleName) {
  if (!roleName) return 'Villageois';
  
  // Handle Amoureux roles
  if (roleName === 'Amoureux Loup' || roleName === 'Amoureux Villageois') {
    return 'Amoureux';
  }
  
  // Handle Villager-type roles
  if (roleName === 'Villageois' || roleName === 'Chasseur' || roleName === 'Alchimiste') {
    return 'Villageois';
  }
  
  // Handle Loup-type roles
  if (roleName === 'Loup') {
    return 'Loups';
  }
  
  // Handle Traître (can be grouped with Loups or standalone)
  if (roleName === 'Traître') {
    return 'Loups'; // Group with Loups by default
  }
  
  // All other roles are solo
  return roleName;
}

/**
 * Compute player game history from game data
 * @param {string} playerName - Name of the player
 * @param {Array} gameData - Array of game entries
 * @returns {Object|null} - Player history data or null
 */
function computePlayerGameHistory(playerName, gameData) {
  if (!playerName || playerName.trim() === '' || gameData.length === 0) {
    return null;
  }

  const playerGames = [];

  gameData.forEach(game => {
    // Find the player in this game's PlayerStats
    const playerStat = game.PlayerStats.find(
      player => player.Username.toLowerCase() === playerName.toLowerCase()
    );

    if (playerStat) {
      // Get player's camp from their MainRoleFinal or MainRoleInitial
      const roleName = playerStat.MainRoleFinal || playerStat.MainRoleInitial;
      const playerCamp = getPlayerCampFromRole(roleName);
      
      // Player won if they are marked as Victorious
      const playerWon = playerStat.Victorious;

      playerGames.push({
        gameId: game.Id,
        date: game.StartDate,
        camp: playerCamp,
        won: playerWon,
        playersInGame: game.PlayerStats.length,
        mapName: game.MapName
      });
    }
  });

  // Calculate map distribution
  const mapStats = {};
  playerGames.forEach(game => {
    if (!mapStats[game.mapName]) {
      mapStats[game.mapName] = {
        appearances: 0,
        wins: 0,
        winRate: 0
      };
    }
    mapStats[game.mapName].appearances++;
    if (game.won) {
      mapStats[game.mapName].wins++;
    }
  });

  // Calculate win rates for each map
  Object.keys(mapStats).forEach(mapName => {
    const stats = mapStats[mapName];
    stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100) : 0;
  });

  return {
    playerName: playerName,
    totalGames: playerGames.length,
    games: playerGames,
    mapStats: mapStats
  };
}

/**
 * Compute map statistics for all players
 * @param {Array} gameData - Array of game entries
 * @returns {Array} - Array of player map statistics
 */
function computeMapStats(gameData) {
  // Get all unique players
  const allPlayers = new Set();
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      allPlayers.add(playerStat.Username);
    });
  });

  // Calculate stats for each player
  const playerMapStats = [];
  allPlayers.forEach(playerName => {
    const playerHistory = computePlayerGameHistory(playerName, gameData);
    if (playerHistory && playerHistory.mapStats) {
      const villageStats = playerHistory.mapStats['Village'] || { appearances: 0, wins: 0, winRate: 0 };
      const chateauStats = playerHistory.mapStats['Château'] || { appearances: 0, wins: 0, winRate: 0 };
      
      playerMapStats.push({
        player: playerName,
        villageWinRate: villageStats.winRate,
        villageGames: villageStats.appearances,
        chateauWinRate: chateauStats.winRate,
        chateauGames: chateauStats.appearances
      });
    }
  });

  return playerMapStats;
}

/**
 * Helper function to find a player's rank in a map-based sorted list
 * @param {Array} sortedPlayers - Array of player map stats sorted by the metric
 * @param {string} playerName - Name of the player to find
 * @param {string} mapType - 'village' or 'chateau'
 * @returns {Object|null} - Object with rank, value, and games, or null if not found
 */
function findPlayerMapRank(sortedPlayers, playerName, mapType) {
  const index = sortedPlayers.findIndex(p => p.player === playerName);
  if (index === -1) return null;
  
  const playerData = sortedPlayers[index];
  return {
    rank: index + 1,
    value: mapType === 'village' ? playerData.villageWinRate : playerData.chateauWinRate,
    games: mapType === 'village' ? playerData.villageGames : playerData.chateauGames
  };
}

/**
 * Process history/map-based achievements for a player
 * @param {Array} mapStats - Array of player map statistics
 * @param {string} playerName - Name of the player
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
function processHistoryAchievements(mapStats, playerName, suffix) {
  const achievements = [];

  if (!mapStats || mapStats.length === 0) return achievements;

  // 1. Best win rate ranking (Village map)
  const eligibleForVillage = mapStats.filter(p => p.villageGames >= 10);
  if (eligibleForVillage.length > 0) {
    const byVillageWinRate = [...eligibleForVillage].sort((a, b) => b.villageWinRate - a.villageWinRate);
    const villageWinRateRank = findPlayerMapRank(byVillageWinRate, playerName, 'village');
    if (villageWinRateRank) {
      achievements.push(createAchievement(
        `village-winrate-${suffix ? 'modded' : 'all'}`,
        `🏘️ Rang ${villageWinRateRank.rank} Village${suffix}`,
        `${villageWinRateRank.rank}${villageWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Village: ${villageWinRateRank.value.toFixed(1)}% (${villageWinRateRank.games} parties, min. 10)`,
        'good',
        villageWinRateRank.rank,
        villageWinRateRank.value,
        byVillageWinRate.length,
        {
          tab: 'players',
          subTab: 'history'
        },
        'history'
      ));
    }
  }

  // 2. Best win rate ranking (Château map)
  const eligibleForChateau = mapStats.filter(p => p.chateauGames >= 10);
  if (eligibleForChateau.length > 0) {
    const byChateauWinRate = [...eligibleForChateau].sort((a, b) => b.chateauWinRate - a.chateauWinRate);
    const chateauWinRateRank = findPlayerMapRank(byChateauWinRate, playerName, 'chateau');
    if (chateauWinRateRank) {
      achievements.push(createAchievement(
        `chateau-winrate-${suffix ? 'modded' : 'all'}`,
        `🏰 Rang ${chateauWinRateRank.rank} Château${suffix}`,
        `${chateauWinRateRank.rank}${chateauWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Château: ${chateauWinRateRank.value.toFixed(1)}% (${chateauWinRateRank.games} parties, min. 10)`,
        'good',
        chateauWinRateRank.rank,
        chateauWinRateRank.value,
        byChateauWinRate.length,
        {
          tab: 'players',
          subTab: 'history'
        },
        'history'
      ));
    }
  }

  return achievements;
}

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
    
    const player1Camp = getPlayerCampFromRole(player1Stat.MainRoleFinal);
    const player2Camp = getPlayerCampFromRole(player2Stat.MainRoleFinal);
    
    // Count wins in common games
    const player1Won = player1Stat.Victorious;
    const player2Won = player2Stat.Victorious;
    
    if (player1Won) player1CommonWins++;
    if (player2Won) player2CommonWins++;
    
    // Helper function to determine the main camp affiliation based on werewolf game rules
    const getMainCampAffiliation = (camp) => {
      if (camp === 'Loups' || camp === 'Traître') {
        return 'Loups'; // Wolves team: Loups + Traître (only exception)
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
    } else if (player1MainCamp === player2MainCamp) {
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
 * @param {string} targetPlayer - Target player name
 * @param {Array} playerStatsData - Array of player statistics
 * @param {Array} rawGameData - Array of game log entries
 * @param {number} minGames - Minimum games required for relationship
 * @returns {Array} - Array of player relationships
 */
function computePlayerRelationships(targetPlayer, playerStatsData, rawGameData, minGames = 10) {
  const relationships = [];
  
  // Get all other players who have enough games
  const otherPlayers = playerStatsData
    .filter(p => p.player !== targetPlayer && p.gamesPlayed >= 30) // Only consider players with meaningful participation
    .map(p => p.player);

  otherPlayers.forEach(otherPlayer => {
    // Generate comparison data to get head-to-head stats
    const comparisonData = generatePlayerComparison(targetPlayer, otherPlayer, rawGameData);

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
 * Helper to create comparison achievement object (non-ranked)
 * @param {string} id - Achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} value - Achievement value
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Achievement object
 */
function createComparisonAchievement(id, title, description, type, value, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'comparison', // Special comparison statistics, separate from achievements
    value,
    totalRanked: null, // Not applicable for comparison achievements
    redirectTo
  };
}

/**
 * Process face-to-face achievements for a specific player
 * @param {Array} playerStatsData - Array of player statistics
 * @param {Array} rawGameData - Array of game log entries
 * @param {string} playerName - Player name
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
function processComparisonAchievements(playerStatsData, rawGameData, playerName, suffix) {
  if (!playerStatsData || !rawGameData) return [];

  const achievements = [];
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
      `Meilleur duo avec ${bestMate.otherPlayerName}: ${bestMate.sameCampWinRate.toFixed(1)}% de victoires en équipe (${bestMate.sameCampWins}/${bestMate.sameCampGames} parties, min. 10)`,
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
        `Duo le moins efficace avec ${worstMate.otherPlayerName}: ${worstMate.sameCampWinRate.toFixed(1)}% de victoires en équipe (${worstMate.sameCampWins}/${worstMate.sameCampGames} parties, min. 10)`,
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
      `Domination contre ${bestMatchup.otherPlayerName}: ${bestMatchup.opposingWinRate.toFixed(1)}% de victoires en affrontement (${bestMatchup.opposingWins}/${bestMatchup.opposingCampGames} parties, min. 10)`,
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
        `Faiblesse contre ${worstMatchup.otherPlayerName}: ${worstMatchup.opposingWinRate.toFixed(1)}% de victoires en affrontement (${worstMatchup.opposingWins}/${worstMatchup.opposingCampGames} parties, min. 10)`,
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

/**
 * Extract deaths from a single game
 * @param {Object} game - Game log entry
 * @returns {Array} - Array of death records
 */
function extractDeathsFromGame(game) {
  const deaths = [];
  
  game.PlayerStats.forEach(player => {
    if (player.DeathType && player.DeathType !== 'N/A') {
      const deathTypeCode = codifyDeathType(player.DeathType);
      
      deaths.push({
        playerName: player.Username,
        deathType: deathTypeCode,
        killerName: player.KillerName || null,
        gameId: game.Id
      });
    }
  });
  
  return deaths;
}

/**
 * Extract kills from a single game using death information
 * @param {Object} game - Game log entry
 * @returns {Array} - Array of kill records
 */
function extractKillsFromGame(game) {
  const kills = [];
  
  // Derive kills from death information (DeathType + KillerName)
  game.PlayerStats.forEach(player => {
    if (player.DeathType && player.DeathType !== 'N/A' && player.KillerName) {
      const deathType = codifyDeathType(player.DeathType);
      
      // Only count direct kills (not votes, disconnects, environmental deaths)
      if (deathType !== DeathTypeCode.VOTE && 
          deathType !== DeathTypeCode.DISCONNECT && 
          deathType !== DeathTypeCode.SURVIVOR &&
          deathType !== DeathTypeCode.UNKNOWN) {
        kills.push({
          killerName: player.KillerName,
          victimName: player.Username,
          deathType: deathType,
          gameId: game.Id
        });
      }
    }
  });
  
  return kills;
}

/**
 * Calculate comprehensive death statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Death statistics object or null
 */
function computeDeathStatistics(gameData) {
  if (gameData.length === 0) {
    return null;
  }

  // Filter games to only include those with complete death information
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );

  if (filteredGameData.length === 0) {
    return null;
  }

  // Extract all deaths and track player game counts
  const allDeaths = [];
  const playerGameCounts = {};
  
  filteredGameData.forEach(game => {
    const deaths = extractDeathsFromGame(game);
    deaths.forEach(death => {
      allDeaths.push({
        ...death,
        gameId: game.Id
      });
    });
    
    // Count total games per player
    game.PlayerStats.forEach(player => {
      const playerName = player.Username;
      playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
    });
  });

  const totalDeaths = allDeaths.length;
  const totalGames = filteredGameData.length;

  // Calculate killer statistics using death information
  const killerCounts = {};
  
  filteredGameData.forEach(game => {
    const kills = extractKillsFromGame(game);
    kills.forEach(kill => {
      if (!killerCounts[kill.killerName]) {
        killerCounts[kill.killerName] = { 
          kills: 0, 
          victims: new Set(), 
          killsByDeathType: {} 
        };
      }
      killerCounts[kill.killerName].kills++;
      killerCounts[kill.killerName].victims.add(kill.victimName);
      
      // Track kills by death type
      const deathType = kill.deathType;
      killerCounts[kill.killerName].killsByDeathType[deathType] = 
        (killerCounts[kill.killerName].killsByDeathType[deathType] || 0) + 1;
    });
  });

  // Convert to array and calculate percentages and averages
  const killerStats = Object.entries(killerCounts).map(([killerName, data]) => ({
    killerName,
    kills: data.kills,
    victims: Array.from(data.victims),
    percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0,
    gamesPlayed: playerGameCounts[killerName] || 0,
    averageKillsPerGame: (playerGameCounts[killerName] || 0) > 0 ? 
      data.kills / (playerGameCounts[killerName] || 1) : 0,
    killsByDeathType: data.killsByDeathType
  })).sort((a, b) => b.kills - a.kills);

  // Calculate player death statistics
  const playerDeathCounts = {};
  
  allDeaths.forEach(death => {
    if (!playerDeathCounts[death.playerName]) {
      playerDeathCounts[death.playerName] = {
        totalDeaths: 0,
        deathsByType: {},
        killedBy: {}
      };
    }
    
    playerDeathCounts[death.playerName].totalDeaths++;
    playerDeathCounts[death.playerName].deathsByType[death.deathType] = 
      (playerDeathCounts[death.playerName].deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerName) {
      playerDeathCounts[death.playerName].killedBy[death.killerName] = 
        (playerDeathCounts[death.playerName].killedBy[death.killerName] || 0) + 1;
    }
  });

  const playerDeathStats = Object.entries(playerDeathCounts).map(([playerName, data]) => ({
    playerName,
    totalDeaths: data.totalDeaths,
    deathsByType: data.deathsByType,
    killedBy: data.killedBy,
    gamesPlayed: playerGameCounts[playerName] || 0,
    deathRate: (playerGameCounts[playerName] || 0) > 0 ? 
      data.totalDeaths / (playerGameCounts[playerName] || 1) : 0
  })).sort((a, b) => b.totalDeaths - a.totalDeaths);

  return {
    totalDeaths,
    totalGames,
    averageDeathsPerGame: totalGames > 0 ? totalDeaths / totalGames : 0,
    killerStats,
    playerDeathStats,
    mostDeadlyKiller: killerStats.length > 0 ? killerStats[0].killerName : null
  };
}

/**
 * Helper function to find top killers based on different criteria
 * @param {Array} killerStats - Array of killer statistics
 * @param {number} minGames - Minimum games required
 * @param {string} sortBy - Sort criteria ('kills' or 'averageKillsPerGame')
 * @returns {Array} - All killers sorted by criteria
 */
function findTopKillers(killerStats, minGames = 1, sortBy = 'kills') {
  return killerStats
    .filter(killer => killer.gamesPlayed >= minGames)
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

/**
 * Helper function to find top players who died the most
 * @param {Array} playerDeathStats - Array of player death statistics
 * @param {string} sortBy - Sort criteria ('totalDeaths' or 'deathRate')
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All players sorted by death criteria
 */
function findTopDeaths(playerDeathStats, sortBy = 'totalDeaths', minGames = 1) {
  return playerDeathStats
    .filter(player => {
      // For deathRate, we need to ensure they have enough games
      if (sortBy === 'deathRate') {
        return player.deathRate > 0 && player.totalDeaths >= minGames * 0.3; // Rough estimate
      }
      return true;
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

/**
 * Helper function to find top survivors (lowest death rates)
 * @param {Array} playerDeathStats - Array of player death statistics
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All players sorted by survival rate (lowest death rate first)
 */
function findTopSurvivors(playerDeathStats, minGames = 1) {
  return playerDeathStats
    .filter(player => player.gamesPlayed >= minGames)
    .sort((a, b) => a.deathRate - b.deathRate); // Sort by lowest death rate first
}

/**
 * Helper function to check if a player is in top 10 of killers
 * @param {Array} topKillers - Top killers array
 * @param {string} playerName - Player name to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerKillerRank(topKillers, playerName) {
  const index = topKillers.findIndex(killer => killer.killerName === playerName);
  if (index === -1) return null;
  
  const playerStats = topKillers[index];
  return {
    rank: index + 1,
    value: playerStats.kills,
    stats: playerStats
  };
}

/**
 * Helper function to check if a player is in top 10 of deaths
 * @param {Array} topDeaths - Top deaths array
 * @param {string} playerName - Player name to find
 * @param {string} valueType - Value type ('totalDeaths' or 'deathRate')
 * @returns {Object|null} - Rank info or null
 */
function findPlayerDeathRank(topDeaths, playerName, valueType = 'totalDeaths') {
  const index = topDeaths.findIndex(death => death.playerName === playerName);
  if (index === -1) return null;
  
  const playerStats = topDeaths[index];
  return {
    rank: index + 1,
    value: valueType === 'totalDeaths' ? playerStats.totalDeaths : playerStats.deathRate,
    stats: playerStats
  };
}

/**
 * Helper function to check if a player is in top survivors
 * @param {Array} topSurvivors - Top survivors array (sorted by lowest death rate)
 * @param {string} playerName - Player name to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerSurvivalRank(topSurvivors, playerName) {
  const index = topSurvivors.findIndex(survivor => survivor.playerName === playerName);
  if (index === -1) return null;
  
  const playerStats = topSurvivors[index];
  return {
    rank: index + 1,
    value: playerStats.deathRate,
    stats: playerStats
  };
}

/**
 * Helper to create kills achievement object
 * @param {string} id - Achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Achievement object
 */
function createKillsAchievement(id, title, description, type, rank, value, totalRanked, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'kills',
    rank,
    value,
    totalRanked,
    redirectTo
  };
}

/**
 * Process kills and deaths achievements for a specific player
 * @param {Object} deathStats - Death statistics object
 * @param {string} playerName - Player name
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
function processKillsAchievements(deathStats, playerName, suffix) {
  if (!deathStats) return [];

  const achievements = [];

  // GOOD ACHIEVEMENTS (Killer achievements)

  // 1. Killers ranking (total kills)
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
      topKillers.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'killers'
      }
    ));
  }

  // 2. Killers ranking (average per game, min. 20 games)
  const topKillersAverage = findTopKillers(deathStats.killerStats, 20, 'averageKillsPerGame');
  const killerAverageRank = findPlayerKillerRank(topKillersAverage, playerName);
  if (killerAverageRank) {
    achievements.push(createKillsAchievement(
      `top-killer-average-${suffix ? 'modded' : 'all'}`,
      `🎯 Top ${killerAverageRank.rank} Tueur Efficace${suffix}`,
      `${killerAverageRank.rank}${killerAverageRank.rank === 1 ? 'er' : 'ème'} meilleur ratio d'éliminations: ${killerAverageRank.stats.averageKillsPerGame.toFixed(2)} par partie (${killerAverageRank.stats.gamesPlayed} parties, min. 20)`,
      'good',
      killerAverageRank.rank,
      parseFloat(killerAverageRank.stats.averageKillsPerGame.toFixed(2)),
      topKillersAverage.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'killers-average'
      }
    ));
  }

  // BAD ACHIEVEMENTS (Death achievements)

  // 3. Most killed ranking (total deaths)
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
      topDeaths.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'deaths'
      }
    ));
  }

  // 4. Less killed ranking (lowest death rate, min. 25 games)
  const topSurvivors = findTopSurvivors(deathStats.playerDeathStats, 25);
  const survivalRank = findPlayerSurvivalRank(topSurvivors, playerName);
  if (survivalRank) {
    achievements.push(createKillsAchievement(
      `top-survivor-${suffix ? 'modded' : 'all'}`,
      `🛡️ Top ${survivalRank.rank} Survivant${suffix}`,
      `${survivalRank.rank}${survivalRank.rank === 1 ? 'er' : 'ème'} meilleur taux de survie: ${survivalRank.value.toFixed(2)} morts par partie (min. 25 parties)`,
      'good',
      survivalRank.rank,
      parseFloat(survivalRank.value.toFixed(2)),
      topSurvivors.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'survivors-average'
      }
    ));
  }

  return achievements;
}

// ========================================
// PERFORMANCE ACHIEVEMENTS
// ========================================

// Solo roles are camps that are not Villageois, Loup, or Amoureux
const SOLO_ROLES = [
  'Idiot du Village',
  'Agent', 
  'Espion',
  'Cannibale',
  'Scientifique',
  'La Bête',
  'Chasseur de primes',
  'Vaudou'
];

/**
 * Compute camp performance statistics from game log data
 * @param {Array} gameData - Array of game log entries
 * @returns {Array} - Array of player camp statistics
 */
function computePlayerCampPerformance(gameData) {
  if (gameData.length === 0) return [];

  // Calculate overall camp statistics (both participations and wins)
  const campStats = {};
  const playerCampPerformance = {};

  // First pass: count games and wins by camp
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    game.PlayerStats.forEach(player => {
      const camp = player.MainRoleInitial;
      const playerName = player.Username;
      const won = player.Victorious;

      // Initialize camp stats
      if (!campStats[camp]) {
        campStats[camp] = {
          totalGames: 0,
          wins: 0,
          winRate: 0,
          players: {}
        };
      }

      // Initialize player camp performance
      if (!playerCampPerformance[playerName]) {
        playerCampPerformance[playerName] = {
          totalGames: 0,
          camps: {}
        };
      }

      if (!playerCampPerformance[playerName].camps[camp]) {
        playerCampPerformance[playerName].camps[camp] = {
          games: 0,
          wins: 0,
          winRate: 0,
          performance: 0
        };
      }

      // Update counts
      campStats[camp].totalGames++;
      if (won) campStats[camp].wins++;

      playerCampPerformance[playerName].totalGames++;
      playerCampPerformance[playerName].camps[camp].games++;
      if (won) playerCampPerformance[playerName].camps[camp].wins++;
    });
  });

  // Calculate camp win rates
  Object.keys(campStats).forEach(camp => {
    if (campStats[camp].totalGames > 0) {
      campStats[camp].winRate = (campStats[camp].wins / campStats[camp].totalGames) * 100;
    }
  });

  // Calculate player win rates and performance vs camp average
  Object.keys(playerCampPerformance).forEach(playerName => {
    Object.keys(playerCampPerformance[playerName].camps).forEach(camp => {
      const playerCampStat = playerCampPerformance[playerName].camps[camp];
      
      if (playerCampStat.games > 0) {
        playerCampStat.winRate = (playerCampStat.wins / playerCampStat.games) * 100;

        // Calculate performance vs camp average
        if (campStats[camp] && campStats[camp].winRate) {
          playerCampStat.performance = playerCampStat.winRate - campStats[camp].winRate;
        }
      }
    });
  });

  // Convert to flat array format with minimum game threshold
  const allPlayerCampStats = [];
  const minGamesToInclude = 3;

  Object.keys(playerCampPerformance).forEach(playerName => {
    const playerData = playerCampPerformance[playerName];
    
    Object.keys(playerData.camps).forEach(camp => {
      const campData = playerData.camps[camp];
      
      // Only include if player has played this camp multiple times
      if (campData.games >= minGamesToInclude) {
        allPlayerCampStats.push({
          player: playerName,
          camp: camp,
          games: campData.games,
          wins: campData.wins,
          winRate: campData.winRate,
          performance: campData.performance,
          totalGames: playerData.totalGames
        });
      }
    });
  });

  return allPlayerCampStats;
}

/**
 * Find top performers for a specific camp
 * @param {Array} campStats - Array of player camp statistics
 * @param {string} targetCamp - Camp to filter by
 * @param {number} minGames - Minimum games required
 * @param {string} sortBy - Sort by 'winRate' or 'performance'
 * @returns {Array} - All performers for the camp
 */
function findTopCampPerformers(campStats, targetCamp, minGames, sortBy = 'performance') {
  return campStats
    .filter(stat => stat.camp === targetCamp && stat.games >= minGames)
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

/**
 * Find top solo role performers
 * @param {Array} campStats - Array of player camp statistics
 * @param {number} minGames - Minimum total solo games required
 * @returns {Array} - All solo role performers sorted by performance
 */
function findTopSoloRolePerformers(campStats, minGames) {
  // Get all solo role performances for each player
  const playerSoloPerformance = new Map();

  campStats
    .filter(stat => SOLO_ROLES.includes(stat.camp) && stat.games >= 3) // Min 3 games per solo role
    .forEach(stat => {
      if (!playerSoloPerformance.has(stat.player)) {
        playerSoloPerformance.set(stat.player, {
          totalSoloGames: 0,
          totalSoloWins: 0,
          avgPerformance: 0,
          camps: []
        });
      }
      
      const playerData = playerSoloPerformance.get(stat.player);
      playerData.totalSoloGames += stat.games;
      playerData.totalSoloWins += stat.wins;
      playerData.camps.push(stat);
    });

  // Calculate average performance and filter by minimum games
  const eligiblePlayers = [];
  
  playerSoloPerformance.forEach((data, playerName) => {
    if (data.totalSoloGames >= minGames) {
      // Calculate weighted average performance based on games played in each role
      const totalWeightedPerformance = data.camps.reduce((sum, camp) => 
        sum + (camp.performance * camp.games), 0
      );
      const avgPerformance = totalWeightedPerformance / data.totalSoloGames;
      const winRate = (data.totalSoloWins / data.totalSoloGames) * 100;

      eligiblePlayers.push({
        player: playerName,
        camp: 'Solo', // Virtual camp for display
        games: data.totalSoloGames,
        wins: data.totalSoloWins,
        winRate: winRate,
        performance: avgPerformance,
        totalGames: data.camps[0]?.totalGames || 0 // Use total games from first camp stat
      });
    }
  });

  return eligiblePlayers.sort((a, b) => b.performance - a.performance);
}

/**
 * Find top overall performers (Hall of Fame)
 * @param {Array} campStats - Array of player camp statistics
 * @param {number} minGames - Minimum total games required
 * @returns {Array} - All overall performers sorted by performance
 */
function findTopOverallPerformers(campStats, minGames) {
  // Group by player and calculate overall weighted performance
  const playerOverallPerformance = new Map();

  campStats.forEach(stat => {
    if (!playerOverallPerformance.has(stat.player)) {
      playerOverallPerformance.set(stat.player, {
        totalGames: stat.totalGames,
        totalWeightedPerformance: 0,
        overallPerformance: 0
      });
    }
    
    const playerData = playerOverallPerformance.get(stat.player);
    playerData.totalWeightedPerformance += stat.performance * stat.games;
  });

  // Calculate overall performance and filter by minimum games
  const eligiblePlayers = [];
  
  playerOverallPerformance.forEach((data, playerName) => {
    if (data.totalGames >= minGames) {
      const totalCampGames = campStats
        .filter(stat => stat.player === playerName)
        .reduce((sum, stat) => sum + stat.games, 0);
      
      const overallPerformance = data.totalWeightedPerformance / totalCampGames;

      eligiblePlayers.push({
        player: playerName,
        camp: 'Overall', // Virtual camp for display
        games: data.totalGames,
        wins: 0, // Not directly applicable for overall performance
        winRate: 0, // Not directly applicable for overall performance
        performance: overallPerformance,
        totalGames: data.totalGames
      });
    }
  });

  return eligiblePlayers.sort((a, b) => b.performance - a.performance);
}

/**
 * Check if a player's rank in camp performance
 * @param {Array} sortedPlayers - Sorted array of players
 * @param {string} playerName - Player name to find
 * @returns {Object|null} - Rank and performance data, or null if not found
 */
function findPlayerCampRank(sortedPlayers, playerName) {
  const index = sortedPlayers.findIndex(p => p.player === playerName);
  if (index === -1) return null;
  
  const playerData = sortedPlayers[index];
  return {
    rank: index + 1,
    value: playerData.winRate,
    games: playerData.games,
    performance: playerData.performance
  };
}

/**
 * Helper to create performance achievement object
 * @param {string} id - Achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @param {string} category - Achievement category
 * @returns {Object} - Achievement object
 */
function createPerformanceAchievement(id, title, description, type, rank, value, totalRanked, redirectTo, category = 'performance') {
  return {
    id,
    title,
    description,
    type,
    category,
    rank,
    value,
    totalRanked,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'playersGeneral'
    }
  };
}

/**
 * Process camp performance achievements for a player
 * @param {Array} campStats - Array of player camp statistics
 * @param {string} playerName - Player name
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
function processPerformanceAchievements(campStats, playerName, suffix) {
  const achievements = [];

  if (!campStats || campStats.length === 0) return achievements;

  // 1. Best "overperformer" ranking (min. 25 games) - Hall of Fame
  const topOverallPerformers = findTopOverallPerformers(campStats, 25);
  const overallPerformanceRank = findPlayerCampRank(topOverallPerformers, playerName);
  if (overallPerformanceRank) {
    achievements.push(createPerformanceAchievement(
      `hall-of-fame-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${overallPerformanceRank.rank} Hall of Fame${suffix}`,
      `${overallPerformanceRank.rank}${overallPerformanceRank.rank === 1 ? 'er' : 'ème'} meilleur overperformer: +${overallPerformanceRank.performance.toFixed(1)}% (${overallPerformanceRank.games} parties, min. 25)`,
      'good',
      overallPerformanceRank.rank,
      overallPerformanceRank.performance,
      topOverallPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'hall-of-fame'
      },
      'performance'
    ));
  }

  // 2. Best Villageois (min. 25 games)
  const topVillageoisPerformers = findTopCampPerformers(campStats, 'Villageois', 25, 'performance');
  const villageoisRank = findPlayerCampRank(topVillageoisPerformers, playerName);
  if (villageoisRank) {
    achievements.push(createPerformanceAchievement(
      `villageois-performance-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'er' : 'ème'} meilleur Villageois: ${villageoisRank.value.toFixed(1)}% (+${villageoisRank.performance.toFixed(1)}%) (${villageoisRank.games} parties, min. 25)`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      topVillageoisPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-villageois'
      },
      'performance'
    ));
  }

  // 3. Best Loup (min. 10 games)
  const topLoupPerformers = findTopCampPerformers(campStats, 'Loup', 10, 'performance');
  const loupRank = findPlayerCampRank(topLoupPerformers, playerName);
  if (loupRank) {
    achievements.push(createPerformanceAchievement(
      `loup-performance-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'er' : 'ème'} meilleur Loup: ${loupRank.value.toFixed(1)}% (+${loupRank.performance.toFixed(1)}%) (${loupRank.games} parties, min. 10)`,
      'good',
      loupRank.rank,
      loupRank.value,
      topLoupPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-loup'
      },
      'performance'
    ));
  }

  // 4. Best Idiot du Village (min. 5 games)
  const topIdiotPerformers = findTopCampPerformers(campStats, 'Idiot du Village', 5, 'performance');
  const idiotRank = findPlayerCampRank(topIdiotPerformers, playerName);
  if (idiotRank) {
    achievements.push(createPerformanceAchievement(
      `idiot-performance-${suffix ? 'modded' : 'all'}`,
      `🤡 Top ${idiotRank.rank} Idiot du Village${suffix}`,
      `${idiotRank.rank}${idiotRank.rank === 1 ? 'er' : 'ème'} meilleur Idiot du Village: ${idiotRank.value.toFixed(1)}% (+${idiotRank.performance.toFixed(1)}%) (${idiotRank.games} parties, min. 5)`,
      'good',
      idiotRank.rank,
      idiotRank.value,
      topIdiotPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-idiot'
      },
      'performance'
    ));
  }

  // 5. Best Amoureux (min. 5 games)
  const topAmoureuxPerformers = findTopCampPerformers(campStats, 'Amoureux', 5, 'performance');
  const amoureuxRank = findPlayerCampRank(topAmoureuxPerformers, playerName);
  if (amoureuxRank) {
    achievements.push(createPerformanceAchievement(
      `amoureux-performance-${suffix ? 'modded' : 'all'}`,
      `💕 Top ${amoureuxRank.rank} Amoureux${suffix}`,
      `${amoureuxRank.rank}${amoureuxRank.rank === 1 ? 'er' : 'ème'} meilleur Amoureux: ${amoureuxRank.value.toFixed(1)}% (+${amoureuxRank.performance.toFixed(1)}%) (${amoureuxRank.games} parties, min. 5)`,
      'good',
      amoureuxRank.rank,
      amoureuxRank.value,
      topAmoureuxPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-amoureux'
      },
      'performance'
    ));
  }

  // 6. Best solo role (min. 10 games)
  const topSoloPerformers = findTopSoloRolePerformers(campStats, 10);
  const soloRank = findPlayerCampRank(topSoloPerformers, playerName);
  if (soloRank) {
    achievements.push(createPerformanceAchievement(
      `solo-performance-${suffix ? 'modded' : 'all'}`,
      `⭐ Top ${soloRank.rank} Rôles Solo${suffix}`,
      `${soloRank.rank}${soloRank.rank === 1 ? 'er' : 'ème'} meilleur joueur solo: ${soloRank.value.toFixed(1)}% (+${soloRank.performance.toFixed(1)}%) (${soloRank.games} parties, min. 10)`,
      'good',
      soloRank.rank,
      soloRank.value,
      topSoloPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'solo-roles'
      },
      'performance'
    ));
  }

  return achievements;
}

// ========================================
// SERIES ACHIEVEMENTS
// ========================================

/**
 * Helper function to get player's main camp from role name
 * @param {string} roleName - Role name to categorize
 * @returns {'Villageois'|'Loup'|'Autres'} - Main camp category
 */
function getPlayerMainCampFromRole(roleName) {
  if (!roleName) return 'Villageois';
  
  // Use existing camp logic
  const camp = getPlayerCampFromRole(roleName);

  // Loups camp (note: getPlayerCampFromRole returns 'Loups' for Loup and Traître)
  if (['Loups'].includes(camp)) {
    return 'Loup';
  }
  else if (camp === 'Villageois') {
    return 'Villageois';
  }
  else {
    return 'Autres';
  }
}

/**
 * Get all unique players from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Set} - Set of player names
 */
function getAllPlayersFromGames(gameData) {
  const allPlayers = new Set();
  
  gameData.forEach(game => {
    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        allPlayers.add(playerStat.Username.trim());
      });
    }
  });
  
  return allPlayers;
}

/**
 * Initialize player series tracking state
 * @param {Set} allPlayers - Set of all player names
 * @returns {Object} - Player series state mapping
 */
function initializePlayerSeriesState(allPlayers) {
  const playerSeriesState = {};
  
  allPlayers.forEach(player => {
    playerSeriesState[player] = {
      currentVillageoisSeries: 0,
      currentLoupsSeries: 0,
      longestVillageoisSeries: null,
      longestLoupsSeries: null,
      currentWinSeries: 0,
      longestWinSeries: null,
      currentWinCamps: [],
      currentLossSeries: 0,
      longestLossSeries: null,
      currentLossCamps: [],
      lastCamp: null,
      lastWon: false,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      winSeriesStart: null,
      lossSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
      currentWinGameIds: [],
      currentLossGameIds: []
    };
  });
  
  return playerSeriesState;
}

/**
 * Process camp series for a player
 * @param {Object} playerStats - Player series state
 * @param {string} player - Player name
 * @param {'Villageois'|'Loup'|'Autres'} mainCamp - Main camp category
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processCampSeries(playerStats, player, mainCamp, gameDisplayedId, date) {
  if (mainCamp === 'Villageois' || mainCamp === 'Loup') {
    // Check Villageois series
    if (mainCamp === 'Villageois') {
      if (playerStats.lastCamp === 'Villageois') {
        playerStats.currentVillageoisSeries++;
        playerStats.currentVillageoisGameIds.push(gameDisplayedId);
      } else {
        playerStats.currentVillageoisSeries = 1;
        playerStats.villageoisSeriesStart = { game: gameDisplayedId, date };
        playerStats.currentVillageoisGameIds = [gameDisplayedId];
      }
      
      // Update longest if current is longer or equal
      if (!playerStats.longestVillageoisSeries || 
          playerStats.currentVillageoisSeries >= playerStats.longestVillageoisSeries.seriesLength) {
        playerStats.longestVillageoisSeries = {
          player,
          camp: 'Villageois',
          seriesLength: playerStats.currentVillageoisSeries,
          startGame: playerStats.villageoisSeriesStart?.game || gameDisplayedId,
          endGame: gameDisplayedId,
          startDate: playerStats.villageoisSeriesStart?.date || date,
          endDate: date,
          isOngoing: false,
          gameIds: [...playerStats.currentVillageoisGameIds]
        };
      }
      
      // Reset Loups series
      playerStats.currentLoupsSeries = 0;
      playerStats.loupsSeriesStart = null;
      playerStats.currentLoupsGameIds = [];
    }
    
    // Check Loups series
    if (mainCamp === 'Loup') {
      if (playerStats.lastCamp === 'Loup') {
        playerStats.currentLoupsSeries++;
        playerStats.currentLoupsGameIds.push(gameDisplayedId);
      } else {
        playerStats.currentLoupsSeries = 1;
        playerStats.loupsSeriesStart = { game: gameDisplayedId, date };
        playerStats.currentLoupsGameIds = [gameDisplayedId];
      }
      
      // Update longest if current is longer or equal
      if (!playerStats.longestLoupsSeries || 
          playerStats.currentLoupsSeries >= playerStats.longestLoupsSeries.seriesLength) {
        playerStats.longestLoupsSeries = {
          player,
          camp: 'Loups',
          seriesLength: playerStats.currentLoupsSeries,
          startGame: playerStats.loupsSeriesStart?.game || gameDisplayedId,
          endGame: gameDisplayedId,
          startDate: playerStats.loupsSeriesStart?.date || date,
          endDate: date,
          isOngoing: false,
          gameIds: [...playerStats.currentLoupsGameIds]
        };
      }
      
      // Reset Villageois series
      playerStats.currentVillageoisSeries = 0;
      playerStats.villageoisSeriesStart = null;
      playerStats.currentVillageoisGameIds = [];
    }
    
    playerStats.lastCamp = mainCamp;
  } else {
    // Playing as special role breaks both camp series
    playerStats.currentVillageoisSeries = 0;
    playerStats.currentLoupsSeries = 0;
    playerStats.villageoisSeriesStart = null;
    playerStats.loupsSeriesStart = null;
    playerStats.currentVillageoisGameIds = [];
    playerStats.currentLoupsGameIds = [];
    playerStats.lastCamp = 'Autres';
  }
}

/**
 * Process win series for a player
 * @param {Object} playerStats - Player series state
 * @param {string} player - Player name
 * @param {boolean} playerWon - Whether player won
 * @param {string} actualCamp - Actual camp played
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processWinSeries(playerStats, player, playerWon, actualCamp, gameDisplayedId, date) {
  if (playerWon) {
    if (playerStats.lastWon) {
      playerStats.currentWinSeries++;
      playerStats.currentWinCamps.push(actualCamp);
      playerStats.currentWinGameIds.push(gameDisplayedId);
    } else {
      playerStats.currentWinSeries = 1;
      playerStats.currentWinCamps = [actualCamp];
      playerStats.winSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentWinGameIds = [gameDisplayedId];
    }
    
    // Update longest win series if current is longer or equal
    if (!playerStats.longestWinSeries || 
        playerStats.currentWinSeries >= playerStats.longestWinSeries.seriesLength) {
      
      // Calculate camp counts
      const campCounts = {};
      playerStats.currentWinCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestWinSeries = {
        player,
        seriesLength: playerStats.currentWinSeries,
        startGame: playerStats.winSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.winSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false,
        gameIds: [...playerStats.currentWinGameIds]
      };
    }
    
    playerStats.lastWon = true;
  } else {
    // Losing breaks the win series
    playerStats.currentWinSeries = 0;
    playerStats.currentWinCamps = [];
    playerStats.winSeriesStart = null;
    playerStats.currentWinGameIds = [];
    playerStats.lastWon = false;
  }
}

/**
 * Process loss series for a player
 * @param {Object} playerStats - Player series state
 * @param {string} player - Player name
 * @param {boolean} playerWon - Whether player won
 * @param {string} actualCamp - Actual camp played
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processLossSeries(playerStats, player, playerWon, actualCamp, gameDisplayedId, date) {
  if (!playerWon) {
    // Player lost this game
    if (playerStats.currentLossSeries > 0) {
      // Continue existing loss series
      playerStats.currentLossSeries++;
      playerStats.currentLossCamps.push(actualCamp);
      playerStats.currentLossGameIds.push(gameDisplayedId);
    } else {
      // Start new loss series
      playerStats.currentLossSeries = 1;
      playerStats.currentLossCamps = [actualCamp];
      playerStats.lossSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentLossGameIds = [gameDisplayedId];
    }
    
    // Update longest loss series if current is longer or equal
    if (!playerStats.longestLossSeries || 
        playerStats.currentLossSeries >= playerStats.longestLossSeries.seriesLength) {
      
      // Calculate camp counts
      const campCounts = {};
      playerStats.currentLossCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestLossSeries = {
        player,
        seriesLength: playerStats.currentLossSeries,
        startGame: playerStats.lossSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.lossSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false,
        gameIds: [...playerStats.currentLossGameIds]
      };
    }
  } else {
    // Winning breaks the loss series
    playerStats.currentLossSeries = 0;
    playerStats.currentLossCamps = [];
    playerStats.lossSeriesStart = null;
    playerStats.currentLossGameIds = [];
  }
}

/**
 * Collect and sort series results
 * @param {Object} playerSeriesState - Player series state mapping
 * @returns {Object} - Sorted series arrays
 */
function collectSeriesResults(playerSeriesState) {
  const allVillageoisSeries = [];
  const allLoupsSeries = [];
  const allWinSeries = [];
  const allLossSeries = [];

  Object.values(playerSeriesState).forEach(stats => {
    if (stats.longestVillageoisSeries) {
      allVillageoisSeries.push(stats.longestVillageoisSeries);
    }
    if (stats.longestLoupsSeries) {
      allLoupsSeries.push(stats.longestLoupsSeries);
    }
    if (stats.longestWinSeries) {
      allWinSeries.push(stats.longestWinSeries);
    }
    if (stats.longestLossSeries) {
      allLossSeries.push(stats.longestLossSeries);
    }
  });

  // Sort by series length (descending)
  allVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allWinSeries,
    allLossSeries
  };
}

/**
 * Parse game ID to extract timestamp and trailing number
 * @param {string} gameId - Game ID like "Ponce-20231013000000-1"
 * @returns {Object} - Parsed timestamp and trailing number
 */
function parseGameId(gameId) {
  const parts = gameId.split('-');
  
  if (parts.length === 3) {
    // Legacy format: "Ponce-20231013000000-1"
    return { 
      timestamp: parts[1], 
      trailingNumber: parseInt(parts[2]) || 0 
    };
  } else if (parts.length === 2) {
    // New format: "Nales-20250912210715"
    return { 
      timestamp: parts[1], 
      trailingNumber: 0 
    };
  }
  
  // Fallback
  return { timestamp: '0', trailingNumber: 0 };
}

/**
 * Generate DisplayedId values for all games based on global chronological order
 * @param {Array} games - Array of game entries
 * @returns {Map} - Map from original ID to DisplayedId
 */
function generateDisplayedIds(games) {
  const displayedIdMap = new Map();
  
  // Sort all games globally by timestamp, then by trailing number
  const sortedGames = [...games].sort((a, b) => {
    const parsedA = parseGameId(a.Id);
    const parsedB = parseGameId(b.Id);
    
    // First compare by timestamp
    const timestampCompare = parsedA.timestamp.localeCompare(parsedB.timestamp);
    if (timestampCompare !== 0) {
      return timestampCompare;
    }
    
    // If timestamps are equal, compare by trailing number
    return parsedA.trailingNumber - parsedB.trailingNumber;
  });
  
  // Assign sequential global numbers
  sortedGames.forEach((game, index) => {
    const globalNumber = index + 1;
    displayedIdMap.set(game.Id, globalNumber.toString());
  });
  
  return displayedIdMap;
}

/**
 * Compute player series statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Player series data or null
 */
function computePlayerSeriesData(gameData) {
  if (gameData.length === 0) {
    return null;
  }

  // Generate DisplayedId mapping like the client-side does
  const displayedIdMap = generateDisplayedIds(gameData);

  // Sort games by DisplayedId to ensure chronological order (client-side compatible)
  const sortedGames = [...gameData].sort((a, b) => {
    const displayedIdA = parseInt(displayedIdMap.get(a.Id) || '0');
    const displayedIdB = parseInt(displayedIdMap.get(b.Id) || '0');
    return displayedIdA - displayedIdB;
  });

  // Get all unique players
  const allPlayers = getAllPlayersFromGames(sortedGames);

  // Initialize tracking for all players
  const playerSeriesState = initializePlayerSeriesState(allPlayers);

  // Process each game chronologically
  sortedGames.forEach(game => {
    const gameDisplayedId = displayedIdMap.get(game.Id) || game.Id;
    const date = new Date(game.StartDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        const player = playerStat.Username.trim();
        if (!player) return;

        const playerStats = playerSeriesState[player];
        const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleFinal);
        const playerWon = playerStat.Victorious;

        // Process camp series
        processCampSeries(playerStats, player, mainCamp, gameDisplayedId, date);

        // Process win series
        processWinSeries(playerStats, player, playerWon, mainCamp, gameDisplayedId, date);
        
        // Process loss series
        processLossSeries(playerStats, player, playerWon, mainCamp, gameDisplayedId, date);
      });
    }
  });

  // Collect and sort results
  const seriesResults = collectSeriesResults(playerSeriesState);

  // Mark ongoing series
  Object.values(playerSeriesState).forEach(stats => {
    // Check Villageois series
    if (stats.longestVillageoisSeries && 
        stats.currentVillageoisSeries === stats.longestVillageoisSeries.seriesLength &&
        stats.currentVillageoisSeries > 0) {
      stats.longestVillageoisSeries.isOngoing = true;
    }

    // Check Loups series
    if (stats.longestLoupsSeries && 
        stats.currentLoupsSeries === stats.longestLoupsSeries.seriesLength &&
        stats.currentLoupsSeries > 0) {
      stats.longestLoupsSeries.isOngoing = true;
    }

    // Check Win series
    if (stats.longestWinSeries && 
        stats.currentWinSeries === stats.longestWinSeries.seriesLength &&
        stats.currentWinSeries > 0) {
      stats.longestWinSeries.isOngoing = true;
    }

    // Check Loss series
    if (stats.longestLossSeries && 
        stats.currentLossSeries === stats.longestLossSeries.seriesLength &&
        stats.currentLossSeries > 0) {
      stats.longestLossSeries.isOngoing = true;
    }
  });

  return {
    ...seriesResults,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size
  };
}

/**
 * Helper function to find all performers for a specific series type
 * @param {Array} seriesData - Array of series data
 * @param {number} minLength - Minimum series length
 * @returns {Array} - All performers meeting minimum requirements
 */
function findTopSeriesPerformers(seriesData, minLength = 2) {
  return seriesData
    .filter(series => series.seriesLength >= minLength)
    .sort((a, b) => b.seriesLength - a.seriesLength);
}

/**
 * Helper function to check a player's rank in series
 * @param {Array} topSeries - Top series array
 * @param {string} playerName - Player name to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerSeriesRank(topSeries, playerName) {
  const index = topSeries.findIndex(series => series.player === playerName);
  if (index === -1) return null;
  
  const playerSeries = topSeries[index];
  return {
    rank: index + 1,
    value: playerSeries.seriesLength,
    series: playerSeries
  };
}

/**
 * Helper to create series achievement object
 * @param {string} id - Achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Achievement object
 */
function createSeriesAchievement(id, title, description, type, rank, value, totalRanked, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'series',
    rank,
    value,
    totalRanked,
    redirectTo
  };
}

/**
 * Process series achievements for a specific player
 * @param {Object} seriesData - Player series data
 * @param {string} playerName - Player name
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
function processSeriesAchievements(seriesData, playerName, suffix) {
  if (!seriesData) return [];

  const achievements = [];

  // 1. Longest Villageois series
  const topVillageoisSeries = findTopSeriesPerformers(seriesData.allVillageoisSeries, 3);
  const villageoisRank = findPlayerSeriesRank(topVillageoisSeries, playerName);
  if (villageoisRank) {
    achievements.push(createSeriesAchievement(
      `villageois-series-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Série Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'ère' : 'ème'} plus longue série Villageois: ${villageoisRank.value} parties consécutives (min. 3)`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      topVillageoisSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'villageois-series'
      }
    ));
  }

  // 2. Longest Loup series
  const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
  const loupRank = findPlayerSeriesRank(topLoupSeries, playerName);
  if (loupRank) {
    achievements.push(createSeriesAchievement(
      `loup-series-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Série Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'ère' : 'ème'} plus longue série Loup: ${loupRank.value} parties consécutives (min. 2)`,
      'good',
      loupRank.rank,
      loupRank.value,
      topLoupSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'loup-series'
      }
    ));
  }

  // 3. Longest win series
  const topWinSeries = findTopSeriesPerformers(seriesData.allWinSeries, 3);
  const winRank = findPlayerSeriesRank(topWinSeries, playerName);
  if (winRank) {
    achievements.push(createSeriesAchievement(
      `win-series-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${winRank.rank} Série de Victoires${suffix}`,
      `${winRank.rank}${winRank.rank === 1 ? 'ère' : 'ème'} plus longue série de victoires: ${winRank.value} parties consécutives (min. 3)`,
      'good',
      winRank.rank,
      winRank.value,
      topWinSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'win-series'
      }
    ));
  }

  // 4. Longest loss series (bad achievement)
  const topLossSeries = findTopSeriesPerformers(seriesData.allLossSeries, 3);
  const lossRank = findPlayerSeriesRank(topLossSeries, playerName);
  if (lossRank) {
    achievements.push(createSeriesAchievement(
      `loss-series-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${lossRank.rank} Série de Défaites${suffix}`,
      `${lossRank.rank}${lossRank.rank === 1 ? 'ère' : 'ème'} plus longue série de défaites: ${lossRank.value} parties consécutives (min. 3)`,
      'bad',
      lossRank.rank,
      lossRank.value,
      topLossSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'loss-series'
      }
    ));
  }

  return achievements;
}

/**
 * Generate achievements for all players
 * @param {Object} gameLogData - Game log data from JSON file
 * @returns {Object} - Object with achievements for all players
 */
function generateAllPlayerAchievements(gameLogData) {
  const allGames = gameLogData.GameStats || [];
  const moddedGames = allGames.filter(game => game.Modded === true);

  // Compute statistics
  const allGamesStats = computePlayerStats(allGames);
  const moddedOnlyStats = computePlayerStats(moddedGames);
  
  // Compute map statistics
  const allGamesMapStats = computeMapStats(allGames);
  const moddedOnlyMapStats = computeMapStats(moddedGames);

  // Compute death statistics
  const allGamesDeathStats = computeDeathStatistics(allGames);
  const moddedOnlyDeathStats = computeDeathStatistics(moddedGames);

  // Compute camp performance statistics
  const allGamesCampStats = computePlayerCampPerformance(allGames);
  const moddedOnlyCampStats = computePlayerCampPerformance(moddedGames);

  // Compute series statistics
  const allGamesSeriesData = computePlayerSeriesData(allGames);
  const moddedOnlySeriesData = computePlayerSeriesData(moddedGames);

  // Get all unique players
  const allPlayers = new Set();
  allGames.forEach(game => {
    game.PlayerStats.forEach(player => {
      allPlayers.add(player.Username);
    });
  });

  // Generate achievements for each player
  const playerAchievements = {};

  allPlayers.forEach(playerName => {
    const allGamesAchievements = [
      ...processGeneralAchievements(allGamesStats.playerStats, playerName, ''),
      ...processHistoryAchievements(allGamesMapStats, playerName, ''),
      ...processComparisonAchievements(allGamesStats.playerStats, allGames, playerName, ''),
      ...processKillsAchievements(allGamesDeathStats, playerName, ''),
      ...processPerformanceAchievements(allGamesCampStats, playerName, ''),
      ...processSeriesAchievements(allGamesSeriesData, playerName, '')
    ];
    
    const moddedOnlyAchievements = [
      ...processGeneralAchievements(moddedOnlyStats.playerStats, playerName, ' (Parties Moddées)'),
      ...processHistoryAchievements(moddedOnlyMapStats, playerName, ' (Parties Moddées)'),
      ...processComparisonAchievements(moddedOnlyStats.playerStats, moddedGames, playerName, ' (Parties Moddées)'),
      ...processKillsAchievements(moddedOnlyDeathStats, playerName, ' (Parties Moddées)'),
      ...processPerformanceAchievements(moddedOnlyCampStats, playerName, ' (Parties Moddées)'),
      ...processSeriesAchievements(moddedOnlySeriesData, playerName, ' (Parties Moddées)')
    ];

    playerAchievements[playerName] = {
      playerId: playerName,
      allGamesAchievements,
      moddedOnlyAchievements
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalPlayers: allPlayers.size,
    totalGames: allGames.length,
    totalModdedGames: moddedGames.length,
    achievements: playerAchievements
  };
}

/**
 * Main function to generate achievements
 */
async function main() {
  try {
    console.log('🏆 Starting achievements generation...');

    // Read game log data
    const gameLogPath = path.join(ABSOLUTE_DATA_DIR, 'gameLog.json');
    console.log(`📖 Reading game log from: ${gameLogPath}`);
    
    const gameLogContent = await fs.readFile(gameLogPath, 'utf-8');
    const gameLogData = JSON.parse(gameLogContent);

    console.log(`📊 Processing ${gameLogData.TotalRecords} games...`);

    // Generate achievements
    const achievementsData = generateAllPlayerAchievements(gameLogData);

    // Save achievements data
    const achievementsPath = path.join(ABSOLUTE_DATA_DIR, 'playerAchievements.json');
    await fs.writeFile(achievementsPath, JSON.stringify(achievementsData, null, 2));

    console.log(`✅ Achievements generated successfully!`);
    console.log(`   - Total players: ${achievementsData.totalPlayers}`);
    console.log(`   - Total games processed: ${achievementsData.totalGames}`);
    console.log(`   - Total modded games: ${achievementsData.totalModdedGames}`);
    console.log(`   - Achievements saved to: ${achievementsPath}`);

    // Generate summary for verification
    const samplePlayer = Object.keys(achievementsData.achievements)[0];
    if (samplePlayer) {
      const sampleAchievements = achievementsData.achievements[samplePlayer];
      console.log(`\n📝 Sample achievements for "${samplePlayer}":`);
      console.log(`   - All games: ${sampleAchievements.allGamesAchievements.length} achievements`);
      console.log(`   - Modded only: ${sampleAchievements.moddedOnlyAchievements.length} achievements`);
      
      if (sampleAchievements.allGamesAchievements.length > 0) {
        console.log(`   - Example: ${sampleAchievements.allGamesAchievements[0].title}`);
      }
    }

  } catch (error) {
    console.error('❌ Achievement generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-achievements.js')) {
  main();
}

export { 
  generateAllPlayerAchievements, 
  processGeneralAchievements, 
  processHistoryAchievements,
  processComparisonAchievements,
  processKillsAchievements,
  processPerformanceAchievements,
  processSeriesAchievements,
  computePlayerStats, 
  computeMapStats,
  computePlayerGameHistory,
  computeDeathStatistics,
  computePlayerCampPerformance,
  computePlayerSeriesData
};