/**
 * Wolf Transformation Statistics Computation
 * 
 * Computes transformation habits for players when playing wolf roles.
 * Calculates the ratio of transformations per night played as wolf.
 */

/**
 * Parse timing string to extract the night number
 * @param {string | null} timing - Timing string (e.g., "N2", "J3", "M1")
 * @returns {object | null} - Parsed timing with phase and number
 */
function parseTiming(timing) {
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
 * @param {string | null} deathTiming - Player's death timing
 * @param {string | null} endTiming - Game's end timing
 * @returns {number} - Number of nights the player was alive as wolf
 */
function calculateNightsAsWolf(deathTiming, endTiming) {
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
 * @param {string} mainRoleInitial - Player's initial main role
 * @returns {boolean} - True if player can transform as wolf
 */
function isWolfRole(mainRoleInitial) {
  const wolfRoles = ['Loup', 'Traître', 'Louveteau'];
  return wolfRoles.includes(mainRoleInitial);
}

/**
 * Compute wolf transformation statistics for all players
 * @param {Array} games - Array of game entries
 * @returns {object} - Statistics object with player stats
 */
export function computeWolfTransformStatistics(games) {
  const playerStatsMap = new Map();
  
  games.forEach(game => {
    if (!game.PlayerStats) return;
    
    const endTiming = game.EndTiming;
    
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      
      // Only process wolf roles
      if (!isWolfRole(player.MainRoleInitial)) return;
      
      // Calculate nights this player was alive as wolf
      const nightsAsWolf = calculateNightsAsWolf(player.DeathTiming, endTiming);
      
      // Skip if no nights (died before any transformation opportunity)
      if (nightsAsWolf < 1) return;
      
      // Count transformations and untransformations from Actions
      const actions = player.Actions || [];
      const transformCount = actions.filter(a => a.ActionType === 'Transform').length;
      const untransformCount = actions.filter(a => a.ActionType === 'Untransform').length;
      
      // Initialize player stats if needed
      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          playerId,
          playerName: player.Username,
          totalTransformations: 0,
          totalUntransformations: 0,
          totalNightsAsWolf: 0,
          gamesAsWolf: 0,
          gamesWithTransformData: 0
        });
      }
      
      const stats = playerStatsMap.get(playerId);
      stats.gamesAsWolf++;
      
      // Only count games where we have action data (Actions array exists and has data or player definitely has none)
      // If Actions is undefined and game is old, skip this game for transform stats
      if (player.Actions !== undefined) {
        stats.gamesWithTransformData++;
        stats.totalTransformations += transformCount;
        stats.totalUntransformations += untransformCount;
        stats.totalNightsAsWolf += nightsAsWolf;
      }
    });
  });
  
  // Calculate final ratios
  const playerStats = Array.from(playerStatsMap.values()).map(stats => {
    const transformsPerNight = stats.totalNightsAsWolf > 0 
      ? stats.totalTransformations / stats.totalNightsAsWolf 
      : 0;
    const untransformsPerNight = stats.totalNightsAsWolf > 0 
      ? stats.totalUntransformations / stats.totalNightsAsWolf 
      : 0;
    
    return {
      playerId: stats.playerId,
      playerName: stats.playerName,
      gamesAsWolf: stats.gamesAsWolf,
      gamesWithTransformData: stats.gamesWithTransformData,
      totalTransformations: stats.totalTransformations,
      totalUntransformations: stats.totalUntransformations,
      totalNightsAsWolf: stats.totalNightsAsWolf,
      transformsPerNight: transformsPerNight,
      untransformsPerNight: untransformsPerNight
    };
  });
  
  return {
    playerStats
  };
}
