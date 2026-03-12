/**
 * Amoureux Achievement Evaluators
 * 
 * Evaluators for all lover-related (Amoureux) achievements,
 * including Amoureux Loup and Amoureux Villageois mechanics.
 */

import { isWolfCamp, isKilledByPlayer, getKillerPlayerId } from './helpers.js';
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
    
    // Find the killer in this game by KillerName and check their role
    const killerPlayerId = getKillerPlayerId(game, playerStat);
    if (!killerPlayerId) continue;
    const killer = game.PlayerStats.find(p => getPlayerId(p) === killerPlayerId);
    if (!killer) continue;
    
    // Check if killer was Amoureux Loup (as MainRoleInitial)
    const isLover = killer.MainRoleInitial === 'Amoureux Loup';
    if (isLover) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count deaths as a wolf killed by an Amoureux Loup 
 */
export function wolfKilledByAmoureuxLoup(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    // Player must be a wolf who died by wolf
    if (!isWolfCamp(playerStat)) continue;
    if (playerStat.DeathType !== DeathTypeCode.BY_WOLF) continue;
    if (!playerStat.KillerName) continue;
    
    // Find the killer in this game by KillerName and check their role
    const killerPlayerId = getKillerPlayerId(game, playerStat);
    if (!killerPlayerId) continue;
    const killer = game.PlayerStats.find(p => getPlayerId(p) === killerPlayerId);
    if (!killer) continue;
    
    // Check if killer was Amoureux Loup 
    const isAmoureuxLoup = killer.MainRoleInitial === 'Amoureux Loup';
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
    // Player must be an Amoureux Loup
    const isAmoureuxLoup = playerStat.MainRoleInitial === 'Amoureux Loup';
    if (!isAmoureuxLoup) continue;

    // Find the other Amoureux player in this game (the partner)
    const partner = game.PlayerStats.find(p =>
      getPlayerId(p) !== playerId &&
      (p.MainRoleInitial === 'Amoureux Villageois')
    );
    if (!partner) continue;

    // Check if the partner was killed by this player (LOVER_DEATH, killer is this player)
    if (partner.DeathType === DeathTypeCode.LOVER_DEATH &&
        isKilledByPlayer(game, partner, playerId)) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count total kills made while being Amoureux Loup 
 */
export function amoureuxLoupTotalKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    const isAmoureuxLoup = playerStat.MainRoleInitial === 'Amoureux Loup';
    if (!isAmoureuxLoup) continue;

    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (victim.DeathType === DeathTypeCode.BY_WOLF && isKilledByPlayer(game, victim, playerId)) {
        killsInGame++;;
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
 * Count games where player (as Amoureux Loup) killed at least 1 wolf-camp player
 * in a single game via BY_WOLF kills.
 */
export function amoureuxLoupKillsWolf(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    const isAmoureuxLoup = playerStat.MainRoleInitial === 'Amoureux Loup';
    if (!isAmoureuxLoup) continue;

    // Count wolf-camp victims killed by this player in this game
    let wolfKillsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (victim.DeathType !== DeathTypeCode.BY_WOLF) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      if (isWolfCamp(victim)) wolfKillsInGame++;
    }
    if (wolfKillsInGame >= 1) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count out-of-meeting kills made while being Amoureux Villageois (villageois-camp lover).
 * "Ennemi" = the victim is not an Amoureux partner (not in the Amoureux camp).
 */
export function amoureuxVillageoisKillsEnemy(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    // Must be Amoureux Villageois (not wolf camp)
    const isAmoureuxVillageois = playerStat.MainRoleInitial === 'Amoureux Villageois';
    if (!isAmoureuxVillageois) continue;

    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      // Must be killed by this player
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      // Victim must not be an Amoureux (i.e. not the partner)
      const victimIsAmoureux = victim.MainRoleInitial === 'Amoureux Loup'; 
                                
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
