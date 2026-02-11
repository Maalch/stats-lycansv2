/**
 * Wolf Transformation Utilities (Frontend)
 * Shared utilities for calculating wolf transformation statistics
 */

/**
 * Parse timing string to extract the phase and number
 * @param timing - Timing string (e.g., "N2", "J3", "M1")
 * @returns Parsed timing with phase and number, or null if invalid
 */
export function parseTiming(timing: string | null): { phase: string; number: number } | null {
  if (!timing || typeof timing !== 'string') return null;
  
  const trimmed = timing.trim().toUpperCase();
  if (trimmed.length < 2) return null;
  
  const phase = trimmed.charAt(0);
  const number = parseInt(trimmed.slice(1), 10);
  
  if (!['J', 'N', 'M', 'U'].includes(phase) || isNaN(number) || number < 1) {
    return null;
  }
  
  return { phase, number };
}

/**
 * Calculate the number of nights a wolf player could transform in
 * Based on their DeathTiming (or game EndTiming if they survived)
 * 
 * @param deathTiming - Player's death timing
 * @param endTiming - Game's end timing
 * @returns Number of nights the player was alive as wolf
 */
export function calculateNightsAsWolf(deathTiming: string | null, endTiming: string | null): number {
  // Use death timing if player died, otherwise use game end timing
  const timing = deathTiming || endTiming;
  
  if (!timing) return 0;
  
  const parsed = parseTiming(timing);
  if (!parsed) return 0;
  
  const { phase, number } = parsed;
  
  // Calculate nights played:
  // - N1 death: 0 nights completed (died during first night)
  // - J1 death: 0 nights (died during first day, before any night)
  // - M1 death: 0 nights (died during first meeting)
  // - N2 death: 1 night completed (lived through N1, died during N2)
  // - J2 death: 1 night completed (lived through N1)
  // - M2 death: 1 night completed
  // - N3 death: 2 nights completed
  // And so on...
  
  // Night phase: player dies DURING this night, so they completed (number - 1) full nights
  if (phase === 'N') {
    // If they die during N1, they had 1 opportunity to transform (during N1)
    // If they die during N2, they had 2 opportunities (N1 + part of N2)
    return number; // Count the night they're in as an opportunity
  }
  
  // Day or Meeting phase: player completed all previous nights
  // J2 = lived through N1 = 1 night opportunity
  // M2 = lived through N1 = 1 night opportunity
  // J3 = lived through N1, N2 = 2 night opportunities
  if (phase === 'J' || phase === 'M') {
    return number - 1; // Number of complete nights before this day/meeting
  }
  
  // Unknown timing (U): estimate based on day number
  if (phase === 'U') {
    // Conservative estimate: assume they lived through half the day cycles
    return Math.max(0, Math.floor((number - 1) / 2));
  }
  
  return 0;
}

/**
 * Check if a player has a wolf role that can transform
 * @param mainRoleInitial - Player's initial main role
 * @returns True if player can transform as wolf
 */
export function isWolfRole(mainRoleInitial: string): boolean {
  const wolfRoles = ['Loup'];
  return wolfRoles.includes(mainRoleInitial);
}
