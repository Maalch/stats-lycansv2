/**
 * Amoureux Achievement Evaluators
 * 
 * Evaluators for all lover-related (Amoureux) achievements,
 * including Amoureux Loup and Amoureux Villageois mechanics.
 */

import { isWolfCamp } from './helpers.js';
import { getPlayerId, DeathTypeCode } from './helpers.js';

/**
 * Count times killed by a wolf who was also an Amoureux
 */
export function killedByLoverWolf(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    if (playerStat.DeathType !== DeathTypeCode.BY_WOLF) continue;
    if (!playerStat.KillerName) continue;
    
    // Find the killer in this game
    const killer = game.PlayerStats.find(p => p.Username === playerStat.KillerName);
    if (!killer) continue;
    
    // Check if killer was Amoureux (as MainRoleInitial or SecondaryRole)
    const isLover = killer.MainRoleInitial === 'Amoureux' || 
                    killer.MainRoleInitial === 'Amoureux Loup' ||
                    killer.SecondaryRole === 'Amoureux';
    if (isLover) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count deaths as a wolf killed by an Amoureux Loup (another wolf)
 */
export function wolfKilledByAmoureuxLoup(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    // Player must be a wolf who died by wolf
    if (!isWolfCamp(playerStat)) continue;
    if (playerStat.DeathType !== DeathTypeCode.BY_WOLF) continue;
    if (!playerStat.KillerName) continue;
    
    // Find the killer in this game
    const killer = game.PlayerStats.find(p => p.Username === playerStat.KillerName);
    if (!killer) continue;
    
    // Check if killer was Amoureux Loup (wolf who is also a lover)
    const isAmoureuxLoup = killer.MainRoleInitial === 'Amoureux Loup' ||
                           (isWolfCamp(killer) && killer.SecondaryRole === 'Amoureux');
    if (isAmoureuxLoup) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count times player (as Amoureux Loup) killed their own partner (the other Amoureux in the game)
 */
export function amoureuxLoupKillsLover(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    // Player must be an Amoureux Loup (wolf camp + Amoureux)
    const isAmoureuxLoup = playerStat.MainRoleInitial === 'Amoureux Loup' ||
                           (isWolfCamp(playerStat) && playerStat.SecondaryRole === 'Amoureux');
    if (!isAmoureuxLoup) continue;

    // Find the other Amoureux player in this game (the partner)
    const partner = game.PlayerStats.find(p =>
      getPlayerId(p) !== playerId &&
      (p.MainRoleInitial === 'Amoureux' ||
       p.MainRoleInitial === 'Amoureux Loup' ||
       p.SecondaryRole === 'Amoureux')
    );
    if (!partner) continue;

    // Check if the partner was killed by this player (BY_WOLF, killer = this player's Username)
    if (partner.DeathType === DeathTypeCode.BY_WOLF &&
        partner.KillerName === playerStat.Username) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count total kills made while being Amoureux Loup (wolf + lover)
 */
export function amoureuxLoupTotalKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    const isAmoureuxLoup = playerStat.MainRoleInitial === 'Amoureux Loup' ||
                           (isWolfCamp(playerStat) && playerStat.SecondaryRole === 'Amoureux');
    if (!isAmoureuxLoup) continue;

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
 * Count games where player (as Amoureux Loup) killed at least 2 wolf-camp players
 * in a single game via BY_WOLF kills.
 */
export function amoureuxLoupKillsTwoWolves(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    const isAmoureuxLoup = playerStat.MainRoleInitial === 'Amoureux Loup' ||
                           (isWolfCamp(playerStat) && playerStat.SecondaryRole === 'Amoureux');
    if (!isAmoureuxLoup) continue;

    // Count wolf-camp victims killed by this player in this game
    let wolfKillsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (victim.DeathType !== DeathTypeCode.BY_WOLF) continue;
      if (victim.KillerName !== playerStat.Username) continue;
      if (isWolfCamp(victim)) wolfKillsInGame++;
    }
    if (wolfKillsInGame >= 2) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count out-of-meeting kills made while being Amoureux Villageois (villageois-camp lover).
 * "Hors meeting" = any kill that is NOT a VOTED death.
 * "Ennemi" = the victim is not an Amoureux partner (not in the Amoureux camp).
 */
export function amoureuxVillageoisKillsEnemy(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    // Must be Amoureux Villageois (not wolf camp)
    const isAmoureuxVillageois = playerStat.MainRoleInitial === 'Amoureux' ||
                                  (!isWolfCamp(playerStat) && playerStat.SecondaryRole === 'Amoureux');
    if (!isAmoureuxVillageois) continue;

    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      // Must be killed by this player
      if (victim.KillerName !== playerStat.Username) continue;
      // Must be a hors-meeting kill (not a vote)
      if (victim.DeathType === DeathTypeCode.VOTED) continue;
      // Victim must not be an Amoureux (i.e. not the partner)
      const victimIsAmoureux = victim.MainRoleInitial === 'Amoureux' ||
                                victim.MainRoleInitial === 'Amoureux Loup' ||
                                victim.SecondaryRole === 'Amoureux';
      if (victimIsAmoureux) continue;

      killsInGame++;
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
