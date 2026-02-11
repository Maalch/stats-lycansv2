/**
 * Wolf Transformation Statistics Computation
 * 
 * Computes transformation habits for players when playing wolf roles.
 * Calculates the ratio of transformations per night played as wolf.
 */

import { parseTiming, calculateNightsAsWolf, isWolfRole } from '../shared/wolf-transform-utils.js';

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
    const gameVersion = parseFloat(game.Version || '0');
    const hasGuaranteedTransformData = game.Modded && gameVersion >= 0.243;
    
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      
      // Only process wolf roles
      if (!isWolfRole(player.MainRoleInitial)) return;
      
      // Calculate nights this player was alive as wolf
      const nightsAsWolf = calculateNightsAsWolf(player.DeathTiming, endTiming);
      
      // Skip if no nights (died before any transformation opportunity)
      if (nightsAsWolf < 1) return;
      
      // Check if this player has reliable transformation data
      let playerHasTransformData = false;
      if (hasGuaranteedTransformData) {
        // Modded game v0.243+ - always has reliable data
        playerHasTransformData = true;
      } else {
        // Older game - only count if player has transform actions AND data is not incomplete
        const actions = player.Actions || [];
        const hasTransformActions = actions.some(a => a.ActionType === 'Transform' || a.ActionType === 'Untransform');
        const hasIncompleteData = player.LegacyActionsIncomplete === true;
        playerHasTransformData = hasTransformActions && !hasIncompleteData;
      }
      
      if (!playerHasTransformData) return;
      
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
      stats.gamesWithTransformData++;
      stats.totalTransformations += transformCount;
      stats.totalUntransformations += untransformCount;
      stats.totalNightsAsWolf += nightsAsWolf;
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
