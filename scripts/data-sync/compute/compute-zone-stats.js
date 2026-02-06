/**
 * Zone statistics computation functions
 * 
 * Collects all player position data (DeathPosition + Action.Position) from
 * Village map games and classifies them into 5 zones. Computes per-player
 * zone distribution percentages and deviation from global average.
 * 
 * Zones (Village map only):
 *   - Village Principal, Ferme, Village Pêcheur, Ruines, Reste de la Carte
 */

import { getPlayerId } from '../../../src/utils/datasyncExport.js';
import { VILLAGE_ZONES, getVillageZoneFromRaw } from '../shared/mapUtils.js';

/**
 * Create an empty zone counts object
 * @returns {Object} - Zone counts initialized to 0
 */
function createEmptyZoneCounts() {
  const counts = {};
  VILLAGE_ZONES.forEach(zone => { counts[zone] = 0; });
  return counts;
}

/**
 * Collect all position data points for a player in a single Village game.
 * Sources:
 *   1. DeathPosition (if player died in this game)
 *   2. Actions[].Position (all actions with non-null positions)
 * 
 * @param {Object} player - PlayerStat object from game data
 * @returns {Array<{rawX: number, rawZ: number, source: string}>} - Position data points
 */
function collectPlayerPositions(player) {
  const positions = [];

  // Source 1: DeathPosition
  if (player.DeathPosition && 
      player.DeathPosition.x !== undefined && player.DeathPosition.x !== null &&
      player.DeathPosition.z !== undefined && player.DeathPosition.z !== null) {
    positions.push({
      rawX: player.DeathPosition.x,
      rawZ: player.DeathPosition.z,
      source: 'death'
    });
  }

  // Source 2: All actions with Position data
  if (player.Actions && Array.isArray(player.Actions)) {
    player.Actions.forEach(action => {
      if (action.Position && 
          action.Position.x !== undefined && action.Position.x !== null &&
          action.Position.z !== undefined && action.Position.z !== null) {
        positions.push({
          rawX: action.Position.x,
          rawZ: action.Position.z,
          source: 'action'
        });
      }
    });
  }

  return positions;
}

/**
 * Compute zone statistics for all players from Village map games.
 * 
 * For each player, collects all positions (deaths + actions), classifies them
 * into Village zones, and computes:
 *   - zoneCounts: raw count per zone
 *   - zonePercentages: percentage per zone
 *   - dominantZone: zone with highest count
 *   - dominantZonePercentage: percentage in dominant zone
 *   - zoneDeviations: difference from global average per zone
 *   - maxDeviation / maxDeviationZone: largest positive deviation
 * 
 * @param {Array} gameData - Array of game log entries (all games, function filters to Village)
 * @returns {Object|null} - { playerStats: [...], globalDistribution: {...} } or null
 */
export function computeZoneStatistics(gameData) {
  if (!gameData || !Array.isArray(gameData) || gameData.length === 0) {
    return null;
  }

  // Filter to Village map games only
  const villageGames = gameData.filter(game => game.MapName === 'Village');

  if (villageGames.length === 0) {
    console.log('  ⚠️  No Village map games found for zone statistics');
    return null;
  }

  console.log(`  Computing zone statistics from ${villageGames.length} Village games...`);

  // Accumulate zone data per player
  // Key: playerId, Value: { playerName, zoneCounts, totalPositions, villageGamesPlayed }
  const playerZoneData = new Map();

  // Global zone counts across all players
  const globalZoneCounts = createEmptyZoneCounts();
  let globalTotalPositions = 0;

  villageGames.forEach(game => {
    if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) return;

    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const playerName = player.Username;

      // Initialize player entry if needed
      if (!playerZoneData.has(playerId)) {
        playerZoneData.set(playerId, {
          playerId,
          playerName,
          zoneCounts: createEmptyZoneCounts(),
          totalPositions: 0,
          villageGamesPlayed: 0
        });
      }

      const playerData = playerZoneData.get(playerId);
      playerData.villageGamesPlayed++;

      // Collect all positions and classify them
      const positions = collectPlayerPositions(player);

      positions.forEach(pos => {
        const { zone } = getVillageZoneFromRaw(pos.rawX, pos.rawZ);
        playerData.zoneCounts[zone]++;
        playerData.totalPositions++;
        globalZoneCounts[zone]++;
        globalTotalPositions++;
      });
    });
  });

  if (globalTotalPositions === 0) {
    console.log('  ⚠️  No position data found in Village games');
    return null;
  }

  // Compute global average zone distribution
  const globalDistribution = {};
  VILLAGE_ZONES.forEach(zone => {
    globalDistribution[zone] = (globalZoneCounts[zone] / globalTotalPositions) * 100;
  });

  // Compute per-player statistics
  const playerStats = [];

  for (const [playerId, data] of playerZoneData) {
    // Skip players with no position data
    if (data.totalPositions === 0) continue;

    // Zone percentages
    const zonePercentages = {};
    VILLAGE_ZONES.forEach(zone => {
      zonePercentages[zone] = (data.zoneCounts[zone] / data.totalPositions) * 100;
    });

    // Dominant zone (zone with highest count)
    let dominantZone = VILLAGE_ZONES[0];
    let maxCount = 0;
    VILLAGE_ZONES.forEach(zone => {
      if (data.zoneCounts[zone] > maxCount) {
        maxCount = data.zoneCounts[zone];
        dominantZone = zone;
      }
    });

    const dominantZonePercentage = zonePercentages[dominantZone];

    // Zone deviations from global average
    const zoneDeviations = {};
    let maxDeviation = -Infinity;
    let maxDeviationZone = null;

    VILLAGE_ZONES.forEach(zone => {
      const deviation = zonePercentages[zone] - globalDistribution[zone];
      zoneDeviations[zone] = deviation;
      if (deviation > maxDeviation) {
        maxDeviation = deviation;
        maxDeviationZone = zone;
      }
    });

    playerStats.push({
      playerId,
      playerName: data.playerName,
      villageGamesPlayed: data.villageGamesPlayed,
      totalPositions: data.totalPositions,
      zoneCounts: data.zoneCounts,
      zonePercentages,
      dominantZone,
      dominantZonePercentage,
      zoneDeviations,
      maxDeviation,
      maxDeviationZone
    });
  }

  console.log(`  ✓ Zone statistics computed for ${playerStats.length} players (${globalTotalPositions} total positions)`);
  console.log(`  📍 Global distribution: ${VILLAGE_ZONES.map(z => `${z}: ${globalDistribution[z].toFixed(1)}%`).join(', ')}`);

  return {
    playerStats,
    globalDistribution,
    totalVillageGames: villageGames.length,
    totalPositions: globalTotalPositions
  };
}
