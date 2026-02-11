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
  
  // Calculate nights played based on game flow: N1 → M1 → J1 → N2 → M2 → J2 → N3 → M3 ...
  // 
  // Night phase (N): Player dies DURING this night
  // - N1 death: 1 night opportunity (they're in N1, can transform before dying)
  // - N2 death: 2 night opportunities (N1 complete + N2 partial)
  // - N3 death: 3 night opportunities (N1, N2 complete + N3 partial)
  // 
  // Meeting phase (M): Player dies DURING meeting (AFTER the night of same number)
  // - M1 death: 1 night completed (lived through N1, died in meeting)
  // - M2 death: 2 nights completed (lived through N1, N2, died in meeting)
  // - M3 death: 3 nights completed (lived through N1, N2, N3, died in meeting)
  // 
  // Day phase (J): Player dies DURING day (AFTER the night and meeting of same number)
  // - J1 death: 1 night completed (lived through N1, M1, died during day)
  // - J2 death: 2 nights completed (lived through N1, N2, M1, M2, died during day)
  
  // Night phase: player is IN this night, count it as an opportunity
  if (phase === 'N') {
    return number;
  }
  
  // Meeting phase: player has completed all nights up to and including this number
  // M1 happens AFTER N1, so M1 death = lived through N1
  if (phase === 'M') {
    return number;
  }
  
  // Day phase: player has completed all nights up to and including this number
  // J1 happens AFTER N1 and M1, so J1 death = lived through N1
  if (phase === 'J') {
    return number;
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
