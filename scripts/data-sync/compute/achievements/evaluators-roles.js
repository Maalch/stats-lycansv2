/**
 * Role-Specific Achievement Evaluators
 * 
 * Evaluators for specific roles: Agent, Bounty Hunter, Louveteau,
 * Idiot du Village, and solo role variety.
 */

import { isWolfCamp, isSoloCamp, isKilledByPlayer, isVoteTargetPlayer } from './helpers.js';
import { getPlayerId, getPlayerCampForAchievement, DeathTypeCode } from './helpers.js';

/**
 * Count wins as Agent where:
 * - Player personally killed the other Agent (victim.DeathType === OTHER_AGENT, killer is this player)
 * - Player won the game
 */
export function agentWinPerfectKill(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (playerStat.MainRoleInitial !== 'Agent') continue;
    if (!playerStat.Victorious) continue;

    // Must have personally killed the other Agent
    const killedOtherAgent = game.PlayerStats.some(victim =>
      isKilledByPlayer(game, victim, playerId)
    );
    if (!killedOtherAgent) continue;

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
 * Count how many different solo roles the player has won with
 * (Loup and Villageois are excluded because they are not solo roles)
 * Each solo role only counts once, regardless of how many times won with it.
 */
export function winWith9SoloRoles(playerGames, allGames, playerId, params) {

  // Gather solo roles this player has won with
  const wonSoloRoles = new Set();
  const gameIds = [];
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    const mainCamp = getPlayerCampForAchievement(playerStat, true, { regroupWolfSubRoles: true });
    if (isSoloCamp(mainCamp, playerStat.Power) && mainCamp !== 'Cannibale') {
      if (!wonSoloRoles.has(mainCamp)) {
        wonSoloRoles.add(mainCamp);
        gameIds.push(game.Id);
      }
    }
  }
  
  return { value: wonSoloRoles.size, gameIds };
}

/**
 * Count wins with a specific role/camp
 * Params: { role: string } - the camp/role to match (uses getPlayerCampForAchievement for proper final role resolution)
 */
export function roleWins(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    const roleCamp = getPlayerCampForAchievement(playerStat, true, { regroupWolfSubRoles: true });
    if (roleCamp !== params.role) continue;
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

/**
 * Count games where player survived as Idiot du Village while receiving at least 1 vote
 * Achievement: "Presque Idiot·e" (Almost an Idiot)
 */
export function idiotSurvivedWithVotes(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    // Must be Idiot du Village
    if (playerStat.MainRoleInitial !== 'Idiot du Village') continue;
    
    // Must have survived (not died)
    if (playerStat.DeathType || playerStat.DeathTiming) continue;
    
    // Count how many votes were cast against this player in all meetings
    const playerName = playerStat.Username;
    let votesAgainstPlayer = 0;
    
    for (const p of game.PlayerStats) {
      const votes = p.Votes || [];
      for (const vote of votes) {
        // Check if this vote targeted the player (using helper for proper player ID matching)
        if (isVoteTargetPlayer(game, vote.Target, playerId)) {
          votesAgainstPlayer++;
        }
      }
    }
    
    // If at least 1 vote was cast against them, count this game
    if (votesAgainstPlayer >= 1) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games where the player is in the Villageois camp, has a non-empty Power,
 * and at least one other player in the Villageois camp has the exact same Power.
 * Achievement: "Spider-Man Pointing at Spider-Man"
 */
export function samePowerAsAlly(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    // Player must be in Villageois camp
    const camp = getPlayerCampForAchievement(playerStat, true, { regroupWolfSubRoles: true });
    if (camp !== 'Villageois') continue;

    // Player must have a non-empty Power
    const power = playerStat.Power;
    if (!power) continue;

    // Another player in the Villageois camp must have the same Power
    const hasMatchingAlly = game.PlayerStats.some(other => {
      if (getPlayerId(other) === playerId) return false; // Skip self
      if (!other.Power || other.Power !== power) return false;
      const otherCamp = getPlayerCampForAchievement(other, true, { regroupWolfSubRoles: true });
      return otherCamp === 'Villageois';
    });

    if (hasMatchingAlly) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}
