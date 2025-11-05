/**
 * Hunter Statistics Computation Module
 * 
 * Computes statistics specific to the Chasseur (Hunter) role,
 * tracking kills, victim camps, and hunter performance metrics.
 */

import { getPlayerId, getPlayerFinalRole, getPlayerCampFromRole, DeathTypeCode } from '../../../src/utils/datasyncExport.js';

/**
 * Compute hunter-specific statistics
 * Tracks kills made by hunters (Chasseur role) and categorizes them
 * @param {Array} gameData - Array of game log entries
 * @param {string} selectedCamp - Optional camp filter
 * @returns {Object} - Hunter statistics object
 */
export function computeHunterStatistics(gameData, selectedCamp) {
  // Filter games to only include those with complete death information
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );

  const hunterKillsMap = {};
  const displayNameById = {};
  const totalGames = filteredGameData.length;

  // Hunter-related death types
  const hunterDeathTypes = [
    DeathTypeCode.BULLET,
    DeathTypeCode.BULLET_HUMAN,
    DeathTypeCode.BULLET_WOLF
  ];

  // Process each game
  filteredGameData.forEach(game => {
    // Track which players were hunters in this game (by ID)
    const huntersInGame = new Set();
    
    game.PlayerStats.forEach(player => {
      // Check if player was Chasseur (using MainRoleInitial OR final role)
      const initialRole = player.MainRoleInitial;
      const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      if (initialRole === 'Chasseur' || finalRole === 'Chasseur') {
        const hunterId = getPlayerId(player);
        displayNameById[hunterId] = player.Username;
        huntersInGame.add(hunterId);
        
        // Initialize hunter if not exists
        if (!hunterKillsMap[hunterId]) {
          hunterKillsMap[hunterId] = {
            kills: [],
            gamesPlayed: 0,
            victimsCamps: []
          };
        }
        hunterKillsMap[hunterId].gamesPlayed++;
      }
    });

    // Process deaths caused by hunters
    game.PlayerStats.forEach(victim => {
      const deathType = victim.DeathType;
      const killerName = victim.KillerName;
      
      // Resolve killer ID
      const killerPlayer = killerName ? game.PlayerStats.find(p => p.Username === killerName) : null;
      const killerId = killerPlayer ? getPlayerId(killerPlayer) : null;
      if (killerId && killerPlayer) {
        displayNameById[killerId] = killerPlayer.Username;
      }
      
      // Check if death was caused by a hunter
      if (deathType && hunterDeathTypes.includes(deathType) && killerId && huntersInGame.has(killerId)) {
        // Get victim's camp
        const victimCamp = getPlayerCampFromRole(victim.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupWolfSubRoles: false
        });
        
        // Apply camp filter if specified
        if (!selectedCamp || selectedCamp === 'Tous les camps' || victimCamp === selectedCamp) {
          hunterKillsMap[killerId].kills.push(deathType);
          hunterKillsMap[killerId].victimsCamps.push(victimCamp);
        }
      }
    });
  });

  // Process hunter statistics
  const hunterStats = Object.entries(hunterKillsMap)
    .map(([hunterId, data]) => {
      const totalKills = data.kills.length;
      
      // Count kills by death type
      const killsByDeathType = {};
      data.kills.forEach(deathType => {
        killsByDeathType[deathType] = (killsByDeathType[deathType] || 0) + 1;
      });
      
      // Count kills by victim camp
      const victimsByCamp = {};
      data.victimsCamps.forEach(camp => {
        victimsByCamp[camp] = (victimsByCamp[camp] || 0) + 1;
      });
      
      // Calculate non-Villageois kills
      const nonVillageoisKills = data.victimsCamps.filter(camp => camp !== 'Villageois').length;
      const villageoisKills = data.victimsCamps.filter(camp => camp === 'Villageois').length;
      
      const averageKillsPerGame = data.gamesPlayed > 0 ? totalKills / data.gamesPlayed : 0;
      const averageNonVillageoisKillsPerGame = data.gamesPlayed > 0 ? nonVillageoisKills / data.gamesPlayed : 0;
      
      return {
        hunterId: hunterId, // Add hunterId field for matching
        hunterName: displayNameById[hunterId] || hunterId,
        totalKills,
        nonVillageoisKills,
        villageoisKills,
        gamesPlayedAsHunter: data.gamesPlayed,
        averageKillsPerGame,
        averageNonVillageoisKillsPerGame,
        killsByDeathType,
        victimsByCamp
      };
    })
    .sort((a, b) => b.totalKills - a.totalKills);

  const bestHunter = hunterStats.length > 0 ? hunterStats[0].hunterName : null;
  const bestAverageHunter = hunterStats.length > 0 
    ? [...hunterStats].sort((a, b) => b.averageNonVillageoisKillsPerGame - a.averageNonVillageoisKillsPerGame)[0].hunterName 
    : null;

  return {
    totalHunters: hunterStats.length,
    totalGames,
    hunterStats,
    bestHunter,
    bestAverageHunter
  };
}
