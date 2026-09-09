/**
 * Social & Special Achievement Evaluators
 * 
 * Evaluators for talking-related, zone-based death, and clip-based achievements.
 */

import { getPlayerId } from './helpers.js';


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

/**
 * Count clips with a specific tag (default: "Musical") where the player is involved.
 * A player is considered involved if they are the POVPlayer or listed in OthersPlayers.
 * Uses canonical player name matching (Username is already normalized at this point).
 */
export function musicalClips(playerGames, allGames, playerId, params) {
  const tag = params.tag || 'Musical';
  const gameIds = [];
  const seenClipIds = new Set();

  for (const { game, playerStat } of playerGames) {
    const clips = game.Clips;
    if (!clips || clips.length === 0) continue;

    const playerName = playerStat.Username;

    for (const clip of clips) {
      // Skip if no tags or tag not present
      if (!clip.Tags || !clip.Tags.includes(tag)) continue;

      // Skip if we already counted this clip for this player
      if (seenClipIds.has(clip.ClipId)) continue;

      // Check if player is POVPlayer
      const isPOV = clip.POVPlayer === playerName;

      // Check if player is in OthersPlayers (comma-separated list)
      let isOther = false;
      if (clip.OthersPlayers) {
        const others = clip.OthersPlayers.split(',').map(n => n.trim());
        isOther = others.includes(playerName);
      }

      if (isPOV || isOther) {
        seenClipIds.add(clip.ClipId);
        gameIds.push(game.Id);
      }
    }
  }

  return { value: seenClipIds.size, gameIds };
}

/**
 * Count games where player spent more time immobile than moving
 * "1, 2, 3 Soleil !" - Vous faites concurrence aux statues vivantes
 * 
 * Immobile time = SecondsSpentImmobileStanding + SecondsSpentImmobileCrouched
 * Moving time = SecondsSpentWalkingStanding + SecondsSpentWalkingCrouched + SecondsSpentRunning
 */
export function immobileGreaterThanMoving(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    // Calculate total immobile time
    const immobileTime = (playerStat.SecondsSpentImmobileStanding || 0) + 
                          (playerStat.SecondsSpentImmobileCrouched || 0);
    
    // Calculate total moving time
    const movingTime = (playerStat.SecondsSpentWalkingStanding || 0) + 
                        (playerStat.SecondsSpentWalkingCrouched || 0) + 
                        (playerStat.SecondsSpentRunning || 0);
    
    // Check if player was more immobile than moving
    if (immobileTime > movingTime) {
      value++;
      gameIds.push(game.Id);
    }
  }

  return { value, gameIds };
}

/**
 * Count sessions (games with < 12h gap between them) where the player was alive
 * less than X% of the time in EVERY game of the session.
 * "Commentateur esport" - Alive percentage computed the same way as the client-side
 * getWorstTimeAliveStats (survivalStatisticsUtils.ts): requires game Version >= 0.201
 * (DeathDateIrl reliability) and a valid Start/EndDate duration. A session containing
 * any non-analyzable game is skipped since the criteria can't be confirmed for it.
 */
export function esportCommentator(playerGames, allGames, playerId, params) {
  const minGames = params.minGames ?? 2;
  const maxAlivePercentage = params.maxAlivePercentage ?? 50;
  const SESSION_GAP_MS = 12 * 60 * 60 * 1000;

  function parseVersionNumber(version) {
    if (!version) return null;
    const match = /^0\.(\d+)$/.exec(version);
    if (!match) return null;
    return parseInt(match[1], 10);
  }

  // Sort games chronologically
  const sorted = [...playerGames]
    .filter(({ game }) => game.StartDate && game.EndDate)
    .sort((a, b) => a.game.StartDate.localeCompare(b.game.StartDate));

  if (sorted.length === 0) return { value: 0, gameIds: [] };

  // Group into sessions by proximity (< 12h gap)
  const sessions = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(sorted[i - 1].game.EndDate).getTime();
    const curStart = new Date(sorted[i].game.StartDate).getTime();
    if (curStart - prevEnd < SESSION_GAP_MS) {
      sessions[sessions.length - 1].push(sorted[i]);
    } else {
      sessions.push([sorted[i]]);
    }
  }

  const gameIds = [];
  let value = 0;

  for (const session of sessions) {
    if (session.length < minGames) continue;

    let allBelowThreshold = true;
    for (const { game, playerStat } of session) {
      const versionNumber = parseVersionNumber(game.Version);
      if (versionNumber === null || versionNumber < 201) {
        allBelowThreshold = false;
        break;
      }

      const gameStart = new Date(game.StartDate).getTime();
      const gameEnd = new Date(game.EndDate).getTime();
      const gameDuration = gameEnd - gameStart;
      if (!gameDuration || gameDuration <= 0 || isNaN(gameDuration)) {
        allBelowThreshold = false;
        break;
      }

      let aliveDuration = gameDuration;
      if (playerStat.DeathDateIrl) {
        const deathTime = new Date(playerStat.DeathDateIrl).getTime();
        if (!isNaN(deathTime)) {
          aliveDuration = Math.max(0, Math.min(deathTime - gameStart, gameDuration));
        }
      }

      const percentageAlive = (aliveDuration / gameDuration) * 100;
      if (percentageAlive >= maxAlivePercentage) {
        allBelowThreshold = false;
        break;
      }
    }

    if (allBelowThreshold) {
      value++;
      gameIds.push(session[session.length - 1].game.Id);
    }
  }

  return { value, gameIds };
}
