/**
 * Death statistics computation functions
 */

import { getPlayerId, getPlayerCampFromRole, DeathTypeCode } from '../../../src/utils/datasyncExport.js';

/**
 * Extract deaths from a single game
 * @param {Object} game - Game log entry
 * @returns {Array} - Array of death records
 */
function extractDeathsFromGame(game) {
  const deaths = [];
  
  game.PlayerStats.forEach(player => {
    // Only include players who actually died (not survivors or unknowns)
    if (
      player.DeathType &&
      player.DeathType !== 'N/A' &&
      player.DeathType !== DeathTypeCode.SURVIVOR &&
      player.DeathType !== '' &&
      (player.DeathTiming || player.DeathType)
    ) {
      const deathTypeCode = player.DeathType;
      
      deaths.push({
        playerId: getPlayerId(player),
        playerName: player.Username,
        deathType: deathTypeCode,
        deathTiming: player.DeathTiming || null,
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
      const deathType = player.DeathType;
      
      // Only count direct kills (not votes, environmental deaths)
      // This matches the client-side logic in deathStatisticsUtils.ts
      if (
        deathType !== DeathTypeCode.VOTED &&
        deathType !== DeathTypeCode.STARVATION &&
        deathType !== DeathTypeCode.FALL &&
        deathType !== DeathTypeCode.BY_AVATAR_CHAIN &&
        deathType !== DeathTypeCode.SURVIVOR &&
        deathType !== '' &&
        deathType !== DeathTypeCode.UNKNOWN
      ) {
        // Find the killer player to get their Steam ID
        const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
        if (killerPlayer) {
          kills.push({
            killerId: getPlayerId(killerPlayer),
            killerName: player.KillerName,
            victimId: getPlayerId(player),
            victimName: player.Username,
            deathType: deathType,
            gameId: game.Id
          });
        }
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
export function computeDeathStatistics(gameData) {
  if (gameData.length === 0) {
    return null;
  }

  // Extract all deaths and track player game counts
  const allDeaths = [];
  const playerGameCounts = {};
  
  gameData.forEach(game => {
    const deaths = extractDeathsFromGame(game);
    deaths.forEach(death => {
      allDeaths.push({
        ...death,
        gameId: game.Id
      });
    });
    
    // Count total games per player using their ID
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      playerGameCounts[playerId] = (playerGameCounts[playerId] || 0) + 1;
    });
  });

  const totalDeaths = allDeaths.length;
  const totalGames = gameData.length;

  // Calculate killer statistics using death information
  // Group by killerId (Steam ID) to handle players with varying usernames
  const killerCountsById = {};
  const displayNameById = {}; // Track latest display name for each killer ID
  
  gameData.forEach(game => {
    const kills = extractKillsFromGame(game);
    kills.forEach(kill => {
      // Update latest display name
      displayNameById[kill.killerId] = kill.killerName;
      
      if (!killerCountsById[kill.killerId]) {
        killerCountsById[kill.killerId] = { 
          kills: 0, 
          killsByDeathType: {} 
        };
      }
      killerCountsById[kill.killerId].kills++;
      
      // Track kills by death type
      const deathType = kill.deathType;
      killerCountsById[kill.killerId].killsByDeathType[deathType] = 
        (killerCountsById[kill.killerId].killsByDeathType[deathType] || 0) + 1;
    });
  });

  // Convert to array and calculate percentages and averages
  const killerStats = Object.entries(killerCountsById).map(([killerId, data]) => {
    return {
      killerId,  // Steam ID as primary identifier
      killerName: displayNameById[killerId] || killerId, // Use latest display name
      kills: data.kills,
      percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0,
      gamesPlayed: playerGameCounts[killerId] || 0,
      averageKillsPerGame: (playerGameCounts[killerId] || 0) > 0 ? 
        data.kills / (playerGameCounts[killerId] || 1) : 0,
      killsByDeathType: data.killsByDeathType
    };
  }).sort((a, b) => b.kills - a.kills);

  /**
   * Parse death timing to extract day number
   * @param {string|null} deathTiming - Death timing string like "J1", "N1", "M1"
   * @returns {number|null} - Day number or null
   */
  function parseDeathTimingDay(deathTiming) {
    if (!deathTiming || deathTiming.trim() === '') {
      return null;
    }
    const trimmed = deathTiming.trim();
    const dayNumberStr = trimmed.slice(1);
    const dayNumber = parseInt(dayNumberStr, 10);
    return isNaN(dayNumber) || dayNumber < 1 ? null : dayNumber;
  }

  /**
   * Check if death occurred on Day 1 (J1, N1, or M1)
   * @param {string|null} deathTiming - Death timing string
   * @returns {boolean}
   */
  function isDay1Death(deathTiming) {
    const day = parseDeathTimingDay(deathTiming);
    return day === 1;
  }

  // Calculate player death statistics
  const playerDeathCounts = {};
  
  allDeaths.forEach(death => {
    const playerId = death.playerId;
    if (!playerDeathCounts[playerId]) {
      playerDeathCounts[playerId] = {
        playerName: death.playerName,
        totalDeaths: 0,
        day1Deaths: 0,
        deathsByType: {},
        killedBy: {}
      };
    }
    
    playerDeathCounts[playerId].totalDeaths++;
    
    // Track Day 1 deaths
    if (isDay1Death(death.deathTiming)) {
      playerDeathCounts[playerId].day1Deaths++;
    }
    
    playerDeathCounts[playerId].deathsByType[death.deathType] = 
      (playerDeathCounts[playerId].deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerName) {
      playerDeathCounts[playerId].killedBy[death.killerName] = 
        (playerDeathCounts[playerId].killedBy[death.killerName] || 0) + 1;
    }
  });

  const playerDeathStats = Object.entries(playerDeathCounts).map(([playerId, data]) => {
    const gamesPlayed = playerGameCounts[playerId] || 0;
    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
      totalDeaths: data.totalDeaths,
      day1Deaths: data.day1Deaths,
      survivalDay1Rate: gamesPlayed > 0 
        ? ((gamesPlayed - data.day1Deaths) / gamesPlayed) * 100 
        : null,
      deathsByType: data.deathsByType,
      killedBy: data.killedBy,
      gamesPlayed: gamesPlayed,
      deathRate: gamesPlayed > 0 ? data.totalDeaths / gamesPlayed : 0
    };
  }).sort((a, b) => b.totalDeaths - a.totalDeaths);

  // Compute camp-specific kill rates
  // Track kills made while playing each camp
  const campKills = new Map(); // playerId -> { villageois: {kills, games}, loups: {kills, games}, solo: {kills, games} }
  
  gameData.forEach(game => {
    if (!game.PlayerStats) return;
    
    // Build a map of player roles in this game
    const playerRolesInGame = new Map();
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const role = player.MainRoleInitial;
      const power = player.Power;
      const camp = getPlayerCampFromRole(role, { regroupWolfSubRoles: true }, power);
      playerRolesInGame.set(playerId, camp);
    });
    
    // Track games played per camp
    playerRolesInGame.forEach((camp, playerId) => {
      if (!campKills.has(playerId)) {
        campKills.set(playerId, {
          villageois: { kills: 0, games: 0 },
          loups: { kills: 0, games: 0 },
          solo: { kills: 0, games: 0 }
        });
      }
      const playerCampData = campKills.get(playerId);
      if (camp === 'Villageois') {
        playerCampData.villageois.games++;
      } else if (camp === 'Loup') {
        playerCampData.loups.games++;
      } else {
        playerCampData.solo.games++;
      }
    });
    
    // Track kills made in this game
    game.PlayerStats.forEach(player => {
      // Check if this player killed someone (same logic as extractKillsFromGame)
      if (player.DeathType && player.DeathType !== 'N/A' && player.KillerName) {
        const deathType = player.DeathType;
        
        if (
          deathType !== DeathTypeCode.VOTED &&
          deathType !== DeathTypeCode.STARVATION &&
          deathType !== DeathTypeCode.FALL &&
          deathType !== DeathTypeCode.BY_AVATAR_CHAIN &&
          deathType !== DeathTypeCode.SURVIVOR &&
          deathType !== '' &&
          deathType !== DeathTypeCode.UNKNOWN
        ) {
          // Find the killer in this game
          const killer = game.PlayerStats.find(p => p.Username === player.KillerName);
          if (killer) {
            const killerId = getPlayerId(killer);
            const killerCamp = playerRolesInGame.get(killerId);
            
            if (!campKills.has(killerId)) {
              campKills.set(killerId, {
                villageois: { kills: 0, games: 0 },
                loups: { kills: 0, games: 0 },
                solo: { kills: 0, games: 0 }
              });
            }
            
            const playerCampData = campKills.get(killerId);
            if (killerCamp === 'Villageois') {
              playerCampData.villageois.kills++;
            } else if (killerCamp === 'Loup') {
              playerCampData.loups.kills++;
            } else {
              playerCampData.solo.kills++;
            }
          }
        }
      }
    });
  });
  
  // Build camp kill rate stats
  const campKillRates = [];
  campKills.forEach((campData, playerId) => {
    campKillRates.push({
      player: playerId,
      killRateVillageois: campData.villageois.games >= 5 
        ? campData.villageois.kills / campData.villageois.games : null,
      killRateLoup: campData.loups.games >= 5 
        ? campData.loups.kills / campData.loups.games : null,
      killRateSolo: campData.solo.games >= 3 
        ? campData.solo.kills / campData.solo.games : null
    });
  });

  return {
    totalDeaths,
    totalGames,
    averageDeathsPerGame: totalGames > 0 ? totalDeaths / totalGames : 0,
    killerStats,
    playerDeathStats,
    campKillRates,
    mostDeadlyKiller: killerStats.length > 0 ? killerStats[0].killerName : null
  };
}
