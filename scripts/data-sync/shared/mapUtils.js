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
