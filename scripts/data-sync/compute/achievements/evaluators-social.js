/**
 * Social & Special Achievement Evaluators
 * 
 * Evaluators for talking-related and zone-based death achievements.
 */


/**
 * Count games where player talked >= X% of the game duration
 */
export function talkingPercentage(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const minPct = params.minPercentage || 50;
  
  for (const { game, playerStat } of playerGames) {
    const totalTalked = (playerStat.SecondsTalkedOutsideMeeting || 0) + (playerStat.SecondsTalkedDuringMeeting || 0);
    
    // Use game duration as the reference (not total talking time across all players)
    const gameDurationSec = (new Date(game.EndDate) - new Date(game.StartDate)) / 1000;
    
    if (gameDurationSec > 0) {
      const pct = (totalTalked / gameDurationSec) * 100;
      if (pct >= minPct) {
        value++;
        gameIds.push(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count deaths in all Village map zones
 * Returns the minimum death count across all 5 zones
 * (if you died 3 times in each zone, value = 3)
 * Only counts games played on Village map
 */
export function deathsInAllZones(playerGames, allGames, playerId, params) {
  // Village map coordinate offsets (from deathLocationUtils.ts)
  const VILLAGE_OFFSETS = {
    x: 166.35,
    z: 176.22,
    multiplier: 5.45
  };
  
  // Zone detection based on adjusted coordinates (from PlayerHistoryDeathMap.tsx)
  function getVillageZone(adjustedX, adjustedZ) {
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
    // Reste de la Carte: Rest of the map
    return 'Reste de la Carte';
  }
  
  // Track deaths per zone
  const zoneDeaths = {
    'Village Principal': { count: 0, gameIds: [] },
    'Ferme': { count: 0, gameIds: [] },
    'Village Pêcheur': { count: 0, gameIds: [] },
    'Ruines': { count: 0, gameIds: [] },
    'Reste de la Carte': { count: 0, gameIds: [] },
  };
  
  const allZones = Object.keys(zoneDeaths);
  
  for (const { game, playerStat } of playerGames) {
    // Only count Village map games
    if (game.MapName !== 'Village') continue;
    
    // Player must have died with position data
    if (!playerStat.DeathPosition) continue;
    if (!playerStat.DeathType || playerStat.DeathType === 'SURVIVOR') continue;
    
    const { x, z } = playerStat.DeathPosition;
    
    // Apply coordinate transformation
    const adjustedX = (x - VILLAGE_OFFSETS.x) * VILLAGE_OFFSETS.multiplier;
    const adjustedZ = ((z - VILLAGE_OFFSETS.z) * VILLAGE_OFFSETS.multiplier) * -1;
    
    const zone = getVillageZone(adjustedX, adjustedZ);
    
    zoneDeaths[zone].count++;
    zoneDeaths[zone].gameIds.push(game.Id);
  }
  
  // The achievement value is the minimum deaths across all zones
  // This ensures player died at least X times in EACH zone
  const minDeaths = Math.min(...allZones.map(z => zoneDeaths[z].count));
  
  // Build gameIds list: collect game IDs up to minDeaths from each zone
  const gameIds = [];
  const gameIdSet = new Set();
  
  for (const zone of allZones) {
    const zoneGameIds = zoneDeaths[zone].gameIds.slice(0, minDeaths);
    for (const gid of zoneGameIds) {
      if (!gameIdSet.has(gid)) {
        gameIds.push(gid);
        gameIdSet.add(gid);
      }
    }
  }
  
  return { value: minDeaths, gameIds };
}

/**
 * Count games where player drank at least X potions (DrinkPotion actions)
 * "Juste un dernier verre" - Vous arrêtez quand vous voulez...
 */
export function justeUnDernierVerre(playerGames, allGames, playerId, params) {
  const minPotions = params.minPotions || 10;
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    const actions = playerStat.Actions;
    if (!actions || actions.length === 0) continue;

    const potionCount = actions.filter(a => a.ActionType === 'DrinkPotion').length;

    if (potionCount >= minPotions) {
      value++;
      gameIds.push(game.Id);
    }
  }

  return { value, gameIds };
}

/**
 * Count games where player used at least 5 different items (UseGadget or DrinkPotion)
 * "Collectionneur" - Vous êtes prêt en toute circonstance
 */
export function collectionneur(playerGames, allGames, playerId, params) {
  const minDistinctItems = params.minDistinctItems || 5;
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    const actions = playerStat.Actions;
    if (!actions || actions.length === 0) continue;

    // Collect distinct item names from UseGadget and DrinkPotion actions
    const distinctItems = new Set();
    for (const action of actions) {
      if (
        (action.ActionType === 'UseGadget' || action.ActionType === 'DrinkPotion') &&
        action.ActionName
      ) {
        distinctItems.add(action.ActionName);
      }
    }

    if (distinctItems.size >= minDistinctItems) {
      value++;
      gameIds.push(game.Id);
    }
  }

  return { value, gameIds };
}
