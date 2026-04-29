/**
 * Map coordinate utilities for zone-based statistics
 * 
 * Provides coordinate transformation and zone classification
 * for Village map. Mirrors the logic from src/hooks/utils/deathLocationUtils.ts
 * and src/components/playerstats/playerhistory/playerhistorydeathmap/PlayerHistoryDeathMap.tsx
 */

// ============================================================================
// COORDINATE TRANSFORMATION CONSTANTS
// ============================================================================

/**
 * Raw → adjusted coordinate transformation parameters for Village map
 * Must stay in sync with src/hooks/utils/deathLocationUtils.ts VILLAGE_OFFSETS
 */
export const VILLAGE_OFFSETS = {
  x: 166.35,
  z: 176.22,
  multiplier: 5.45
};

// ============================================================================
// ZONE DEFINITIONS
// ============================================================================

/**
 * All Village map zones
 */
export const VILLAGE_ZONES = [
  'Village Principal',
  'Ferme',
  'Village Pêcheur',
  'Ruines',
  'Reste de la Carte'
];

// ============================================================================
// COORDINATE FUNCTIONS
// ============================================================================

/**
 * Transform raw game coordinates to adjusted coordinates for the Village map.
 * 
 * Formula:
 *   adjustedX = (rawX - offsetX) * multiplier
 *   adjustedZ = ((rawZ - offsetZ) * multiplier) * -1   (Z is inverted)
 * 
 * @param {number} rawX - Raw X coordinate from game data
 * @param {number} rawZ - Raw Z coordinate from game data
 * @returns {{ x: number, z: number }} - Adjusted coordinates
 */
export function adjustCoordinatesForVillage(rawX, rawZ) {
  const adjustedX = (rawX - VILLAGE_OFFSETS.x) * VILLAGE_OFFSETS.multiplier;
  const adjustedZ = ((rawZ - VILLAGE_OFFSETS.z) * VILLAGE_OFFSETS.multiplier) * -1;
  return { x: adjustedX, z: adjustedZ };
}

/**
 * Classify an adjusted coordinate pair into a Village zone.
 * 
 * Zone boundaries (adjusted coordinates):
 *   Village Principal: adjustedZ ∈ [-250, 100]  && adjustedX ∈ [-450, -120]
 *   Ferme:             adjustedZ ∈ [-550, -250] && adjustedX ∈ [-150, 150]
 *   Village Pêcheur:   adjustedZ ∈ [150, 500]   && adjustedX ∈ [-320, 80]
 *   Ruines:            adjustedZ ∈ [-220, 200]   && adjustedX ∈ [100, 450]
 *   Reste de la Carte: everything else
 * 
 * Must stay in sync with PlayerHistoryDeathMap.tsx getVillageZone()
 * 
 * @param {number} adjustedX - Adjusted X coordinate
 * @param {number} adjustedZ - Adjusted Z coordinate
 * @returns {string} - Zone name
 */
export function getVillageZone(adjustedX, adjustedZ) {
  // Village Principal: South area
  if (adjustedZ >= -250 && adjustedZ <= 100 && adjustedX >= -450 && adjustedX <= -120) {
    return 'Village Principal';
  }
  // Ferme: West area
  if (adjustedZ >= -550 && adjustedZ <= -250 && adjustedX >= -150 && adjustedX <= 150) {
    return 'Ferme';
  }
  // Village Pêcheur: East area
  if (adjustedZ >= 150 && adjustedZ <= 500 && adjustedX >= -320 && adjustedX <= 80) {
    return 'Village Pêcheur';
  }
  // Ruines: North area
  if (adjustedZ >= -220 && adjustedZ <= 200 && adjustedX >= 100 && adjustedX <= 450) {
    return 'Ruines';
  }
  // Rest of the map
  return 'Reste de la Carte';
}

/**
 * Convenience: transform raw coordinates and classify zone in one call
 * @param {number} rawX - Raw X coordinate from game data
 * @param {number} rawZ - Raw Z coordinate from game data
 * @returns {{ zone: string, adjustedX: number, adjustedZ: number }}
 */
export function getVillageZoneFromRaw(rawX, rawZ) {
  const { x: adjustedX, z: adjustedZ } = adjustCoordinatesForVillage(rawX, rawZ);
  const zone = getVillageZone(adjustedX, adjustedZ);
  return { zone, adjustedX, adjustedZ };
}

// ============================================================================
// SABOTAGE POSITION → NAME DEDUCTION
// ============================================================================

/**
 * Known sabotage target clusters for the Village map.
 * Each entry has a sabotage ActionName and a centroid (x, z) in raw game coordinates.
 * Centroids were computed from all known (ActionName + Position) sabotage actions.
 *
 * Note: There are multiple Portail and Puit locations on the map.
 *
 * Château map does not yet have enough labeled data to build clusters.
 */
const VILLAGE_SABOTAGE_CLUSTERS = [
  // 4 Portail locations
  { name: 'Portail', centroid: { x: 178.05, z: 127.94 } },
  { name: 'Portail', centroid: { x: 226.95, z: 186.87 } },
  { name: 'Portail', centroid: { x: 165.88, z: 270.77 } },
  { name: 'Portail', centroid: { x: 88.90, z: 191.80 } },
  // Bûches (single location)
  { name: 'Bûches', centroid: { x: 112.11, z: 173.48 } },
  // 3 Puit locations
  { name: 'Puit', centroid: { x: 163.65, z: 241.97 } },
  { name: 'Puit', centroid: { x: 116.66, z: 193.58 } },
  { name: 'Puit', centroid: { x: 150.50, z: 118.64 } },
  // Pillier rituel (single location)
  { name: 'Pillier rituel', centroid: { x: 198.10, z: 176.57 } },
  // Chaudron (single location)
  { name: 'Chaudron', centroid: { x: 155.56, z: 140.40 } },
];

/**
 * Maximum distance (in raw game coordinate units) from a cluster centroid
 * for a position to be classified. Observed cluster radii are ~3–5 units;
 * 10 provides a safe margin without risking cross-cluster misclassification.
 */
const SABOTAGE_MATCH_THRESHOLD = 10;

/**
 * Deduce a sabotage ActionName from its raw game Position using
 * nearest-centroid matching against known sabotage target locations.
 *
 * Currently only supports the Village map. Returns null for unknown maps
 * or positions that don't match any cluster within the threshold.
 *
 * @param {string} mapName - Map name from the game (e.g. "Village", "Château")
 * @param {{ x: number, y: number, z: number }} position - Raw game position
 * @returns {string|null} - Deduced ActionName or null if no match
 */
export function deduceSabotageNameFromPosition(mapName, position) {
  if (!position || !mapName) return null;

  const clusters = mapName === 'Village' ? VILLAGE_SABOTAGE_CLUSTERS : null;
  if (!clusters) return null;

  let bestName = null;
  let bestDist = Infinity;

  for (const cluster of clusters) {
    const dx = position.x - cluster.centroid.x;
    const dz = position.z - cluster.centroid.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = cluster.name;
    }
  }

  return bestDist <= SABOTAGE_MATCH_THRESHOLD ? bestName : null;
}

/**
 * Post-process an array of game stats to fill in missing sabotage ActionNames
 * from their positions. Mutates actions in-place.
 *
 * @param {Array} gameStats - Array of game objects with PlayerStats
 * @returns {number} - Number of sabotage names deduced
 */
export function deduceMissingSabotageNames(gameStats) {
  let count = 0;
  for (const game of gameStats) {
    for (const player of (game.PlayerStats || [])) {
      for (const action of (player.Actions || [])) {
        if (action.ActionType === 'Sabotage' && action.Position && !action.ActionName) {
          const deduced = deduceSabotageNameFromPosition(game.MapName, action.Position);
          if (deduced) {
            action.ActionName = deduced;
            count++;
          }
        }
      }
    }
  }
  return count;
}
