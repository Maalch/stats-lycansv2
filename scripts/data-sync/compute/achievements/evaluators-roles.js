/**
 * Role-Specific Achievement Evaluators
 * 
 * Evaluators for specific roles: Agent, Bounty Hunter, Louveteau,
 * Idiot du Village, and solo role variety.
 */

import { isWolfCamp, isSoloCamp } from './helpers.js';
import { getPlayerId, DeathTypeCode } from './helpers.js';

/**
 * Count wins as Agent where:
 * - Player personally killed the other Agent (victim.DeathType === OTHER_AGENT, KillerName === player)
 * - Player won the game
 * - Player never received any vote during any meeting in the game
 */
export function agentPerfectKill(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Agent') continue;
    if (!playerStat.Victorious) continue;

    // Must have personally killed the other Agent
    const killedOtherAgent = game.PlayerStats.some(victim =>
      victim.DeathType === DeathTypeCode.OTHER_AGENT &&
      victim.KillerName === playerStat.Username
    );
    if (!killedOtherAgent) continue;

    // Must never have received any vote during any meeting
    const wasEverVoted = game.PlayerStats.some(voter =>
      getPlayerId(voter) !== playerId &&
      voter.Votes &&
      voter.Votes.some(v => v.Target === playerStat.Username)
    );
    if (wasEverVoted) continue;

    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count times voted out as Agent
 */
export function agentVoted(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Agent') continue;
    if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count wins as Chasseur de Primes
 */
export function bountyHunterWins(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Chasseur de primes') continue;
    if (!playerStat.Victorious) continue;
    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count wins as Louveteau when all other wolves are dead
 */
export function louveteauOrphanWin(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Louveteau') continue;
    if (!playerStat.Victorious) continue;
    
    // Check if all other wolves died
    const otherWolves = game.PlayerStats.filter(p =>
      getPlayerId(p) !== playerId && isWolfCamp(p)
    );
    const allOtherWolvesDead = otherWolves.length > 0 && otherWolves.every(p =>
      p.DeathType && p.DeathType !== DeathTypeCode.SURVIVOR && p.DeathType !== ''
    );
    
    if (allOtherWolvesDead) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Win with all available solo roles (check: 1 if complete, 0 otherwise)
 */
export function winWithAllSoloRoles(playerGames, allGames, playerId, params) {
  // Gather all solo roles seen in all games
  const allSoloRoles = new Set();
  for (const game of allGames) {
    for (const p of game.PlayerStats) {
      if (isSoloCamp(p.MainRoleInitial, p.Power)) {
        allSoloRoles.add(p.MainRoleInitial);
      }
    }
  }
  
  // Gather solo roles this player has won with
  const wonSoloRoles = new Set();
  const gameIds = [];
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    if (isSoloCamp(playerStat.MainRoleInitial, playerStat.Power)) {
      if (!wonSoloRoles.has(playerStat.MainRoleInitial)) {
        wonSoloRoles.add(playerStat.MainRoleInitial);
        gameIds.push(game.Id);
      }
    }
  }
  
  const allWon = allSoloRoles.size > 0 && allSoloRoles.size === wonSoloRoles.size;
  return { value: allWon ? 1 : 0, gameIds: allWon ? gameIds : [] };
}

/**
 * Count wins with a specific MainRoleInitial
 * Params: { role: string } - the MainRoleInitial to match
 */
export function roleWins(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== params.role) continue;
    if (!playerStat.Victorious) continue;
    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count deaths as Idiot du Village by a hunter bullet
 */
export function idiotKilledByHunter(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Idiot du Village') continue;
    
    const isHunterKill = playerStat.DeathType === DeathTypeCode.BULLET ||
                         playerStat.DeathType === DeathTypeCode.BULLET_HUMAN ||
                         playerStat.DeathType === DeathTypeCode.BULLET_WOLF;
    if (isHunterKill) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}
