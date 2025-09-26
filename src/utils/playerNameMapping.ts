/**
 * Player Name Mapping Configuration
 * 
 * This file centralizes all player name mappings for easy maintenance.
 * When you find inconsistent player names in your data, add them here.
 * 
 * Format: 'VariantName': 'CanonicalName'
 * 
 * The system will automatically:
 * - Normalize all player names in game data (Username, KillerName, Vote targets)
 * - Normalize player names in BR battle royale data (Participants field)
 * - Apply case-insensitive matching
 * 
 * Examples:
 * - If you find 'LuttiLutti' and want it to be 'Lutti'
 * - If you find 'player_name' and want it to be 'PlayerName'
 * - If you find inconsistent capitalization
 */

export const PLAYER_NAME_MAPPING: Record<string, string> = {
  // Lutti variations
  'LuttiLutti': 'Lutti',
  'TL areliaNNNN': 'Areliann'
  
  // Add more player name mappings here as you discover them:
  // 'OldName1': 'NewName1',
  // 'player_variant': 'PlayerName',
  // 'inconsistent_caps': 'ConsistentCaps',
  
  // Example entries (remove these when you add real mappings):
  // 'JohnDoe123': 'JohnDoe',
  // 'jane_smith': 'JaneSmith',
};

/**
 * Helper function to check if a player name needs normalization
 * Useful for debugging and validation
 */
export function getPlayerNameMapping(playerName: string): string {
  
  // Try exact match first
  if (PLAYER_NAME_MAPPING[playerName]) {
    return PLAYER_NAME_MAPPING[playerName];
  }
  
  // Try case-insensitive match
  const lowerPlayerName = playerName.toLowerCase();
  for (const [variant, canonical] of Object.entries(PLAYER_NAME_MAPPING)) {
    if (variant.toLowerCase() === lowerPlayerName) {
      return canonical;
    }
  }
  
  return playerName; // No mapping found
}

/**
 * Get all variant names for a given canonical name
 * Useful for seeing what names map to a specific player
 */
export function getPlayerNameVariants(canonicalName: string): string[] {
  const variants: string[] = [];
  
  for (const [variant, canonical] of Object.entries(PLAYER_NAME_MAPPING)) {
    if (canonical.toLowerCase() === canonicalName.toLowerCase()) {
      variants.push(variant);
    }
  }
  
  return variants;
}

/**
 * Get all unique canonical player names from the mapping
 * Useful for seeing all the "final" player names
 */
export function getCanonicalPlayerNames(): string[] {
  const canonicalNames = new Set(Object.values(PLAYER_NAME_MAPPING));
  return Array.from(canonicalNames).sort();
}

