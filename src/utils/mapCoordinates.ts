/**
 * Map configuration and coordinate transformation utilities
 * for displaying death locations on map backgrounds
 */

export interface MapConfig {
  name: string;
  imagePath: string;
  cameraOffset: {
    x: number;
    y: number;
    z: number;
  };
  offsetMultiplier: number;
  // Fine-tune pixel offsets for manual alignment
  manualOffsetX?: number;
  manualOffsetY?: number;
  // Image dimensions (actual display size)
  imageWidth: number;
  imageHeight: number;
}

/**
 * Configuration for scatter plot view
 */
export const MAP_CONFIGS_SCATTER: Record<string, MapConfig> = {
  'Village': {
    name: 'Village',
    imagePath: '/Village.webp',
    cameraOffset: {
      x: 170,     // World X coordinate at image center - ADJUST THIS to shift left/right
      y: 52.78,   // World Y coordinate (height) - not used for 2D heatmap
      z: 183      // World Z coordinate at image center - ADJUST THIS to shift up/down
    },
    offsetMultiplier: 2.4,  // Pixels per world unit - ADJUST THIS to zoom in/out
    // Smaller = zoom out (see more area), Larger = zoom in (more detail)
    // Fine-tune adjustments:
    manualOffsetX: 0,  // Additional pixel shift on X axis (positive = move dots right, negative = move dots left)
    manualOffsetY: 0,  // Additional pixel shift on Y axis (positive = move dots down, negative = move dots up)
    imageWidth: 900,   // Match original map proportions (wider than tall)
    imageHeight: 512   // Approximately 16:9 aspect ratio
  }
  // Add more maps here as they become available
};

/**
 * Configuration for heatmap canvas view
 */
export const MAP_CONFIGS_HEATMAP: Record<string, MapConfig> = {
  'Village': {
    name: 'Village',
    imagePath: '/Village.webp',
    cameraOffset: {
      x: 164,     // World X coordinate at image center - ADJUST THIS to shift left/right
      y: 52.78,   // World Y coordinate (height) - not used for 2D heatmap
      z: 175      // World Z coordinate at image center - ADJUST THIS to shift up/down
    },
    offsetMultiplier: 3,  // Pixels per world unit - ADJUST THIS to zoom in/out
    // Smaller = zoom out (see more area), Larger = zoom in (more detail)
    // Fine-tune adjustments:
    manualOffsetX: 0,  // Additional pixel shift on X axis (positive = move dots right, negative = move dots left)
    manualOffsetY: 0,  // Additional pixel shift on Y axis (positive = move dots down, negative = move dots up)
    imageWidth: 900,   // Match original map proportions (wider than tall)
    imageHeight: 512   // Approximately 16:9 aspect ratio
  }
  // Add more maps here as they become available
};

/**
 * Transform game world coordinates to image pixel coordinates
 * 
 * Formula from game engine:
 * - screenX = (worldX - cameraOffsetX) * offsetMultiplier
 * - screenY = (worldZ - cameraOffsetZ) * offsetMultiplier
 * 
 * The formula converts game world coordinates to pixel positions on the map image.
 * The cameraOffset determines the world position that maps to the center of the image.
 * The offsetMultiplier controls the scale (pixels per world unit).
 */
export function worldToImageCoordinates(
  worldX: number,
  worldZ: number,
  mapConfig: MapConfig
): { x: number; y: number } {
  const { cameraOffset, offsetMultiplier, imageWidth, imageHeight, manualOffsetX = 0, manualOffsetY = 0 } = mapConfig;
  
  // Transform world coordinates to screen pixels
  // Note: We center the image by adding half the image dimensions
  const screenX = ((worldX - cameraOffset.x) * offsetMultiplier) + (imageWidth / 2) + manualOffsetX;
  const screenY = ((worldZ - cameraOffset.z) * offsetMultiplier) + (imageHeight / 2) + manualOffsetY;
  
  return {
    x: screenX,
    y: screenY
  };
}

/**
 * Calculate the bounds of all death locations in screen coordinates
 * This helps us scale and center the map image appropriately
 */
export function calculateScreenBounds(
  deathLocations: Array<{ x: number; z: number }>,
  mapConfig: MapConfig
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (deathLocations.length === 0) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
  }
  
  const screenCoords = deathLocations.map(loc => 
    worldToImageCoordinates(loc.x, loc.z, mapConfig)
  );
  
  const minX = Math.min(...screenCoords.map(c => c.x));
  const maxX = Math.max(...screenCoords.map(c => c.x));
  const minY = Math.min(...screenCoords.map(c => c.y));
  const maxY = Math.max(...screenCoords.map(c => c.y));
  
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Get map configuration for a given map name and view type
 */
export function getMapConfig(mapName: string, viewType: 'scatter' | 'heatmap' = 'heatmap'): MapConfig | null {
  const configs = viewType === 'scatter' ? MAP_CONFIGS_SCATTER : MAP_CONFIGS_HEATMAP;
  return configs[mapName] || null;
}

/**
 * Check if a map has background image support
 */
export function hasMapBackground(mapName: string): boolean {
  return mapName in MAP_CONFIGS_HEATMAP || mapName in MAP_CONFIGS_SCATTER;
}
