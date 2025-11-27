import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/datasyncExport';
import type { DeathType } from '../../types/deathTypes';

/**
 * Map image configuration - fixed coordinates for map alignment
 * Used for both scatter chart and heatmap visualizations
 */
export interface MapImageConfig {
  src: string;
  zMin: number;
  zMax: number;
  xMin: number;
  xMax: number;
}

export const MAP_IMAGES: Record<string, MapImageConfig> = {
  'Village': { src: '/Village.webp', zMin: -820, zMax: 820, xMin: -461, xMax: 461 },
  'Château': { src: '/Château.webp', zMin: -820, zMax: 820, xMin: -461, xMax: 461 },
  // Add more maps here as needed
};

/**
 * Get map configuration for a given map name
 */
export function getMapConfig(mapName: string): MapImageConfig | null {
  return MAP_IMAGES[mapName] || null;
}

/**
 * Death location data point
 */
export interface DeathLocationData {
  x: number;
  z: number;
  playerName: string;
  deathType: DeathType | null;
  mapName: string;
  killerName: string | null;
  camp: string;
  gameId: string;
  displayedGameId: string;
}

/**
 * Normalize death types by merging SURVIVALIST_NOT_SAVED into BY_WOLF
 * This ensures both death types are treated as "Tué par Loup" in all statistics
 */
function normalizeDeathTypeForStats(deathType: DeathType | null): DeathType | null {
  if (deathType === 'SURVIVALIST_NOT_SAVED') {
    return 'BY_WOLF';
  }
  return deathType;
}

/**
 * Compute death location statistics from game data
 * Extracts X/Z coordinates for 2D map visualization
 * Filters out legacy games without coordinate data
 */
export function computeDeathLocationStats(
  gameData: GameLogEntry[],
  campFilter?: string
): DeathLocationData[] {
  const deathLocations: DeathLocationData[] = [];

  // Village map coordinate offsets to center the map at (0, 0, 0)
  const VILLAGE_OFFSETS = {
    x: 166.35,
    y: 52.78,
    z: 176.22,
    multiplier: 5.45
  };

  // Château map coordinate offsets to center the map at (0, 0, 0)
  const CHATEAU_OFFSETS = {
    x: 403.32,
    y: 53.06,
    z: -121.11,
    multiplier: 18.4
  };

  gameData
    .forEach(game => {
      game.PlayerStats
        .filter(player => player.DeathPosition !== null)
        .filter(player => {
          // Apply camp filter if specified
          if (!campFilter || campFilter === 'Tous les camps') return true;
          const camp = getPlayerCampFromRole(player.MainRoleInitial, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupWolfSubRoles: true
          });
          return camp === campFilter;
        })
        .forEach(player => {
          if (player.DeathPosition) {
            const camp = getPlayerCampFromRole(player.MainRoleInitial, {
              regroupLovers: true,
              regroupVillagers: true,
              regroupWolfSubRoles: true
            });

              // Apply coordinate offsets for Village and Château maps to center at (0, 0, 0)
              let adjustedX = player.DeathPosition.x;
              let adjustedZ = player.DeathPosition.z;
              if (game.MapName === 'Village') {
                adjustedX = (adjustedX -VILLAGE_OFFSETS.x) * VILLAGE_OFFSETS.multiplier;
                adjustedZ = ((adjustedZ - VILLAGE_OFFSETS.z) * VILLAGE_OFFSETS.multiplier) * -1;
              } else if (game.MapName === 'Château') {
                adjustedX = (adjustedX - CHATEAU_OFFSETS.x) * CHATEAU_OFFSETS.multiplier;
                adjustedZ = ((adjustedZ - CHATEAU_OFFSETS.z) * CHATEAU_OFFSETS.multiplier) * -1;
              }

              deathLocations.push({
                x: adjustedX,
                z: adjustedZ, // Use Z for 2D vertical axis (Y is elevation)
                playerName: player.Username,
                deathType: normalizeDeathTypeForStats(player.DeathType as DeathType | null),
                mapName: game.MapName,
                killerName: player.KillerName || null,
                camp: camp,
                gameId: game.DisplayedId, // Sequential game number for display
                displayedGameId: game.DisplayedId // Kept for compatibility, same as gameId
              });
          }
        });
    });

  return deathLocations;
}

/**
 * Get available maps from game data that have death position information
 */
export function getAvailableMapsWithDeathData(gameData: GameLogEntry[]): string[] {
  const mapsSet = new Set<string>();

  gameData
    .forEach(game => {
      const hasDeathPosition = game.PlayerStats.some(player => player.DeathPosition !== null);
      if (hasDeathPosition && game.MapName) {
        mapsSet.add(game.MapName);
      }
    });

  return Array.from(mapsSet).sort();
}
