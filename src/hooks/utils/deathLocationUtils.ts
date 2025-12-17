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
 * Map coordinate offsets for transforming in-game coordinates to centered map coordinates
 */
export const VILLAGE_OFFSETS = {
  x: 166.35,
  y: 52.78,
  z: 176.22,
  multiplier: 5.45
};

export const CHATEAU_OFFSETS = {
  x: 403.32,
  y: 53.06,
  z: -121.11,
  multiplier: 18.4
};

/**
 * Apply coordinate offsets for map-specific transformations
 * Centers map coordinates at (0, 0, 0) and applies scaling
 */
export function adjustCoordinatesForMap(
  x: number,
  z: number,
  mapName: string
): { x: number; z: number } {
  let adjustedX = x;
  let adjustedZ = z;
  
  if (mapName === 'Village') {
    adjustedX = (x - VILLAGE_OFFSETS.x) * VILLAGE_OFFSETS.multiplier;
    adjustedZ = ((z - VILLAGE_OFFSETS.z) * VILLAGE_OFFSETS.multiplier) * -1;
  } else if (mapName === 'Château') {
    adjustedX = (x - CHATEAU_OFFSETS.x) * CHATEAU_OFFSETS.multiplier;
    adjustedZ = ((z - CHATEAU_OFFSETS.z) * CHATEAU_OFFSETS.multiplier) * -1;
  }
  
  return { x: adjustedX, z: adjustedZ };
}

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
  deathType: DeathType; // Never null - normalizeDeathTypeForStats converts null to UNKNOWN
  mapName: string;
  killerName: string | null;
  camp: string;
  gameId: string;
  displayedGameId: string;
}

/**
 * Normalize death types by merging SURVIVALIST_NOT_SAVED into BY_WOLF
 * and converting null/undefined to UNKNOWN
 * This ensures both death types are treated as "Tué par Loup" in all statistics
 * and null deaths are properly categorized
 */
function normalizeDeathTypeForStats(deathType: DeathType | null): DeathType {
  if (!deathType) {
    return 'UNKNOWN';
  }
  if (deathType === 'SURVIVALIST_NOT_SAVED') {
    return 'BY_WOLF';
  }
  return deathType;
}

/**
 * Generic location point interface for clustering
 */
export interface LocationPoint {
  x: number;
  z: number;
}

/**
 * Cluster result containing centroid and grouped items
 */
export interface ClusterResult<T extends LocationPoint> {
  centroidX: number;
  centroidZ: number;
  items: T[];
}

/**
 * Cluster nearby location points using spatial proximity
 * Uses incremental centroid calculation for efficient clustering
 * 
 * @param locations Array of location points with x and z coordinates
 * @param clusterRadius Maximum distance for points to be grouped together
 * @returns Array of clusters with centroids and grouped items
 */
export function clusterLocationPoints<T extends LocationPoint>(
  locations: T[],
  clusterRadius: number
): ClusterResult<T>[] {
  if (clusterRadius === 0) {
    // No clustering - each point is its own cluster
    return locations.map(loc => ({
      centroidX: loc.x,
      centroidZ: loc.z,
      items: [loc]
    }));
  }
  
  const clusters: ClusterResult<T>[] = [];
  
  locations.forEach(loc => {
    let addedToCluster = false;
    
    for (const cluster of clusters) {
      const distance = Math.sqrt(
        Math.pow(loc.x - cluster.centroidX, 2) + 
        Math.pow(loc.z - cluster.centroidZ, 2)
      );
      
      if (distance <= clusterRadius) {
        // Add to existing cluster and update centroid
        const n = cluster.items.length;
        cluster.centroidX = (cluster.centroidX * n + loc.x) / (n + 1);
        cluster.centroidZ = (cluster.centroidZ * n + loc.z) / (n + 1);
        cluster.items.push(loc);
        addedToCluster = true;
        break;
      }
    }
    
    if (!addedToCluster) {
      // Create a new cluster
      clusters.push({
        centroidX: loc.x,
        centroidZ: loc.z,
        items: [loc]
      });
    }
  });
  
  return clusters;
}

/**
 * Find the most common death type in a collection of items
 * 
 * @param items Array of items with deathType property
 * @returns The most frequently occurring death type
 */
export function getDominantDeathType<T extends { deathType: DeathType | null }>(
  items: T[]
): DeathType | null {
  if (items.length === 0) return null;
  
  const deathTypeCounts = new Map<DeathType | null, number>();
  items.forEach(item => {
    deathTypeCounts.set(item.deathType, (deathTypeCounts.get(item.deathType) || 0) + 1);
  });
  
  let dominantDeathType: DeathType | null = items[0].deathType;
  let maxCount = 0;
  deathTypeCounts.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count;
      dominantDeathType = type;
    }
  });
  
  return dominantDeathType;
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
              const adjusted = adjustCoordinatesForMap(
                player.DeathPosition.x,
                player.DeathPosition.z,
                game.MapName
              );

              deathLocations.push({
                x: adjusted.x,
                z: adjusted.z, // Use Z for 2D vertical axis (Y is elevation)
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
