/**
 * Wolf Achievement Evaluators
 * 
 * Evaluators for wolf-camp specific achievements: kills, wins,
 * zombie/vaudou mechanics, necromancer, seer, sabotage.
 */

import { isWolfCamp, getPlayerCampForAchievement } from './helpers.js';
import { getPlayerId, getPlayerFinalRole, getPlayerCampFromRole, DeathTypeCode } from './helpers.js';

/**
 * Count wolf kills across all games
 * A "wolf kill" = someone died BY_WOLF and the killer is this player
 */
export function wolfKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();
  
  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;
    
    // Count players killed by this wolf in this game
    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (victim.DeathType === DeathTypeCode.BY_WOLF && victim.KillerName === playerStat.Username) {
        killsInGame++;
      }
    }
    if (killsInGame > 0) {
      value += killsInGame;
      if (!countedGames.has(game.Id)) {
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count kills made while playing as Zombie (recruited by Vaudou after death).
 * Zombie is a final role (not a starting role), so getPlayerFinalRole must be used.
 */
export function zombieKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    // Zombie is a final role: check via getPlayerFinalRole, not MainRoleInitial
    const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
    if (finalRole !== 'Zombie') continue;

    // Count players killed by this Zombie in this game
    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (victim.DeathType === DeathTypeCode.BY_ZOMBIE && victim.KillerName === playerStat.Username) {
        killsInGame++;
      }
    }
    if (killsInGame > 0) {
      value += killsInGame;
      if (!countedGames.has(game.Id)) {
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player (as Vaudou) resurrected at least 3 players.
 * A resurrection = another player has a MainRoleChange with NewMainRole === 'Zombie'.
 */
export function vaudouTripleResurrect(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Vaudou') continue;

    const zombifiedCount = game.PlayerStats.filter(p =>
      getPlayerId(p) !== playerId &&
      p.MainRoleChanges &&
      p.MainRoleChanges.some(rc => rc.NewMainRole === 'Zombie')
    ).length;

    if (zombifiedCount >= 3) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games won as wolf without making any kills
 */
export function wolfWinNoKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    if (!isWolfCamp(playerStat)) continue;
    
    // Check if this wolf made any kills
    const madeKills = game.PlayerStats.some(victim =>
      victim.KillerName === playerStat.Username &&
      victim.DeathType === DeathTypeCode.BY_WOLF
    );
    
    if (!madeKills) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games won as the last surviving wolf
 */
export function lastWolfStanding(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    if (!isWolfCamp(playerStat)) continue;

    // Check if player is the only surviving wolf
    const survivingWolves = game.PlayerStats.filter(p =>
      isWolfCamp(p) && 
      (!p.DeathType || p.DeathType === DeathTypeCode.SURVIVOR || p.DeathType === '')
    );
    
    if (survivingWolves.length === 1 && getPlayerId(survivingWolves[0]) === playerId) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player (as Loup Nécromancien) resurrected a non-wolf player
 * who then made at least 2 BY_WOLF kills in that game.
 * - Nécromancien = isWolfCamp + Power === 'Nécromancien'
 * - Resurrected player = had MainRoleChanges with NewMainRole === 'Loup'
 *   AND was NOT originally wolf-camp (excludes Louveteau transformations)
 */
export function wolfNecromancerResurrect(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;
    if (playerStat.Power !== 'Nécromancien') continue;

    // Find players resurrected by the Nécromancien:
    // - had a role change to 'Loup'
    // - were NOT originally wolf-camp (distinguishes from Louveteau transformation)
    const resurrectedPlayers = game.PlayerStats.filter(p =>
      getPlayerId(p) !== playerId &&
      p.MainRoleChanges &&
      p.MainRoleChanges.some(rc => rc.NewMainRole === 'Loup') &&
      getPlayerCampFromRole(p.MainRoleInitial) !== 'Loup'
    );
    if (resurrectedPlayers.length === 0) continue;

    // Check if any resurrected player made at least 2 BY_WOLF kills in this game
    const anyResurrectedKilledTwo = resurrectedPlayers.some(resurrected => {
      const kills = game.PlayerStats.filter(victim =>
        victim.DeathType === DeathTypeCode.BY_WOLF &&
        victim.KillerName === resurrected.Username
      );
      return kills.length >= 2;
    });

    if (anyResurrectedKilledTwo) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player (as Loup Devin) made at least 2 SEER kills in that game.
 * - Loup Devin = isWolfCamp + Power === 'Devin'
 * - A SEER kill = victim.DeathType === DeathTypeCode.SEER && victim.KillerName === playerStat.Username
 */
export function wolfSeerDoubleKill(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;
    if (playerStat.Power !== 'Devin') continue;

    const seerKills = game.PlayerStats.filter(victim =>
      victim.DeathType === DeathTypeCode.SEER &&
      victim.KillerName === playerStat.Username
    );

    if (seerKills.length >= 2) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count sabotages performed as wolf
 */
export function wolfSabotages(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();
  
  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;
    
    const actions = playerStat.Actions || [];
    const sabotages = actions.filter(a => a.ActionType === 'Sabotage');
    
    if (sabotages.length > 0) {
      value += sabotages.length;
      if (!countedGames.has(game.Id)) {
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games lost by harvest as wolf without making any kills
 */
export function wolfLossHarvestNoKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    // Must be a wolf who lost
    if (playerStat.Victorious) continue;
    if (!isWolfCamp(playerStat)) continue;
    
    // Game must have ended by harvest (HarvestDone >= HarvestGoal)
    if (game.HarvestDone < game.HarvestGoal) continue;
    
    // Check if this wolf made any kills
    const madeKills = game.PlayerStats.some(victim =>
      victim.KillerName === playerStat.Username &&
      victim.DeathType === DeathTypeCode.BY_WOLF
    );
    
    if (!madeKills) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}
