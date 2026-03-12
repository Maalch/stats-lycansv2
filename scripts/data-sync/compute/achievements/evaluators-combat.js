/**
 * Combat Achievement Evaluators
 * 
 * Evaluators for hunter kills, potion kills, same-color kills,
 * and other combat-related achievements.
 */

import { isHunterRole, isWolfCamp, getPlayerCampForAchievement, getDeathDay, isKilledByPlayer } from './helpers.js';
import { DeathTypeCode } from './helpers.js';

/**
 * Count deaths as a specific camp role by a specific death type
 * (e.g., wolf killed by Beast)
 */
export function roleDeathByType(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.DeathType !== params.deathType) continue;
    const mainCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    const campMatch = (params.roleCamp === 'Loup' && mainCamp === 'Loup') ||
                      (params.roleCamp === 'Villageois' && mainCamp === 'Villageois');
    if (campMatch) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count hunter kills against enemy camp
 */
export function hunterKillsEnemy(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!isHunterRole(playerStat)) continue;
    
    for (const victim of game.PlayerStats) {
      const isHunterKill = victim.DeathType === DeathTypeCode.BULLET ||
                           victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                           victim.DeathType === DeathTypeCode.BULLET_WOLF;
      if (!isHunterKill) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      
      // Check if victim is from an enemy camp
      const hunterCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
      const victimCamp = getPlayerCampForAchievement(victim, false, { regroupWolfSubRoles: true });
      
      if (hunterCamp !== victimCamp) {
        value++;
        gameIds.push(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player (as Villageois camp) killed 2+ Villageois camp allies outside of meetings
 */
export function villageoisDoubleAllyKill(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const minKills = params.minKills || 2;

  for (const { game, playerStat } of playerGames) {
    // Player must be Villageois camp. For simplicity, we'll remove the game where the player has changed camp, because he's much more likely to kill in Loup or Zombie camp
    if (getPlayerCampForAchievement(playerStat, true) !== 'Villageois') continue;

    // Count Villageois-camp allies killed by this player outside meetings
    let allyKills = 0;
    for (const victim of game.PlayerStats) {
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      if (victim.DeathType === DeathTypeCode.VOTED) continue;
      if (getPlayerCampForAchievement(victim, false) !== 'Villageois') continue;
      allyKills++;
    }

    if (allyKills >= minKills) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count hunter kills against ally camp (Villageois killing Villageois)
 */
export function hunterKillsAlly(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!isHunterRole(playerStat)) continue;
    
    for (const victim of game.PlayerStats) {
      const isHunterKill = victim.DeathType === DeathTypeCode.BULLET ||
                           victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                           victim.DeathType === DeathTypeCode.BULLET_WOLF;
      if (!isHunterKill) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      
      const hunterCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true }); //use initial camp (to avoid counting Chasseur being rezed as Loup or Zombie)
      const victimCamp = getPlayerCampForAchievement(victim, false, { regroupWolfSubRoles: true }); 
      
      if (hunterCamp === victimCamp) {
        value++;
        gameIds.push(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where hunter killed 2+ enemies in a single game
 */
export function hunterMultiKillsInGame(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const minKills = params.minKills || 2;
  
  for (const { game, playerStat } of playerGames) {
    if (!isHunterRole(playerStat)) continue;
    
    let enemyKillsInGame = 0;
    const hunterCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    
    for (const victim of game.PlayerStats) {
      const isHunterKill = victim.DeathType === DeathTypeCode.BULLET ||
                           victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                           victim.DeathType === DeathTypeCode.BULLET_WOLF;
      if (!isHunterKill) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      
      const victimCamp = getPlayerCampForAchievement(victim, false, { regroupWolfSubRoles: true });
      if (hunterCamp !== victimCamp) {
        enemyKillsInGame++;
      }
    }
    
    if (enemyKillsInGame >= minKills) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count times a hunter was killed by a wolf
 */
export function hunterKilledByWolf(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!isHunterRole(playerStat)) continue;
    if (playerStat.DeathType !== DeathTypeCode.BY_WOLF) continue;
    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count assassin potion kills (villager killing enemy or ally with potion)
 */
export function assassinPotionKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    // Look for victims killed by ASSASSIN potion where KillerName matches
    for (const victim of game.PlayerStats) {
      if (victim.DeathType !== DeathTypeCode.ASSASSIN) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      
      const killerCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
      const victimCamp = getPlayerCampForAchievement(victim, false, { regroupWolfSubRoles: true });
      
      if (params.targetCamp === 'enemy' && killerCamp !== victimCamp) {
        value++;
        gameIds.push(game.Id);
      } else if (params.targetCamp === 'ally' && killerCamp === victimCamp) {
        value++;
        gameIds.push(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player's killer also died the same day
 */
export function killerDiedSameDay(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.DeathTiming || !playerStat.KillerName) continue;
    
    // Find the killer
    const killer = game.PlayerStats.find(p => p.Username === playerStat.KillerName);
    if (!killer || !killer.DeathTiming) continue;
    
    // Compare death days (extract day number from timing like "N1", "J2")
    const playerDay = getDeathDay(playerStat.DeathTiming);
    const killerDay = getDeathDay(killer.DeathTiming);
    
    if (playerDay !== null && killerDay !== null && playerDay === killerDay) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count kills where the killer and victim had the same color
 * Any kill type counts (wolf kills, hunter kills, potion kills, etc.)
 */
export function sameColorKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedKillsPerGame = new Map(); // game.Id -> count of same-color kills
  
  for (const { game, playerStat } of playerGames) {
    // Player's color in this game
    const playerColor = playerStat.Color;
    if (!playerColor) continue;
    
    // Find all victims killed by this player
    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (!victim.KillerName) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      
      // Check if victim had the same color
      if (victim.Color === playerColor) {
        killsInGame++;
      }
    }
    
    if (killsInGame > 0) {
      value += killsInGame;
      if (!countedKillsPerGame.has(game.Id)) {
        gameIds.push(game.Id);
        countedKillsPerGame.set(game.Id, killsInGame);
      } else {
        countedKillsPerGame.set(game.Id, countedKillsPerGame.get(game.Id) + killsInGame);
      }
    }
  }
  return { value, gameIds };
}
/**
 * Count games won as Chasseur by killing the last wolf with a bullet.
 * Detection: game ends immediately (EndTiming = JX or NX, not MX) and
 * at least one wolf killed by this player's bullet has a DeathTiming
 * matching the game's EndTiming, meaning the bullet ended the game.
 */
export function hunterKillsLastWolf(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isHunterRole(playerStat)) continue;
    if (!playerStat.Victorious) continue;

    // Game must have ended outside a meeting (JX or NX)
    const endTiming = game.EndTiming;
    if (!endTiming || !/^[JN]\d+$/.test(endTiming)) continue;

    // Find wolves killed by this player's bullet at the exact game-end timing
    let bulletEndedGame = false;
    for (const victim of game.PlayerStats) {
      const isBulletKill = victim.DeathType === DeathTypeCode.BULLET ||
                           victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                           victim.DeathType === DeathTypeCode.BULLET_WOLF;
      if (!isBulletKill) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      if (!isWolfCamp(victim)) continue;
      // Victim's death timing must match the game's EndTiming
      if (victim.DeathTiming === endTiming) {
        // Additional check: if DeathDateIrl exists, verify it's within 5 seconds of EndDate
        if (victim.DeathDateIrl && game.EndDate) {
          const deathTime = new Date(victim.DeathDateIrl);
          const endTime = new Date(game.EndDate);
          const diffSeconds = Math.abs(endTime - deathTime) / 1000;
          if (diffSeconds > 5) {
            continue; // Death was too far from game end, likely not the killing blow
          }
        }
        bulletEndedGame = true;
        break;
      }
    }

    if (bulletEndedGame) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}