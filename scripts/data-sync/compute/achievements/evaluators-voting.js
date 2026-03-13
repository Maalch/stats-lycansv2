/**
 * Voting Achievement Evaluators
 * 
 * Evaluators for voting-related achievements: vote accuracy,
 * unanimous votes, passing behavior, sole voter eliminations, etc.
 */

import { getPlayerCampForAchievement, isAliveAtMeeting } from './helpers.js';
import { getPlayerId, DeathTypeCode } from './helpers.js';

/**
 * Count times voted out (VOTED death type) while being in a specific camp
 */
export function votedAsCamp(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
    const mainCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    const campMatch = (params.camp === 'Villageois' && mainCamp === 'Villageois') ||
                      (params.camp === 'Loup' && mainCamp === 'Loup');
    if (campMatch) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player voted correctly for a wolf/solo but got voted out themselves
 */
export function correctVoteButVoted(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    // Player must have been voted out
    if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
    
    const playerCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    if (playerCamp !== 'Villageois') continue;
    
    // Extract day number from death timing (e.g., "M2" -> 2)
    if (!playerStat.DeathTiming || !playerStat.DeathTiming.startsWith('M')) continue;
    const deathDay = parseInt(playerStat.DeathTiming.substring(1), 10);
    if (isNaN(deathDay)) continue;
    
    // Check if any of the player's votes on the death day targeted an enemy
    const votes = playerStat.Votes || [];
    let votedCorrectly = false;
    
    for (const vote of votes) {
      // Only check votes on the day they were voted out
      if (vote.Day !== deathDay) continue;
      if (vote.Target === 'Passé' || !vote.Target) continue;
      
      // Find the target player in the game
      const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
      if (!targetPlayer) continue;
      
      const targetCamp = getPlayerCampForAchievement(targetPlayer, false, { regroupWolfSubRoles: true });
      if (targetCamp !== 'Villageois') {
        votedCorrectly = true;
        break;
      }
    }
    
    if (votedCorrectly) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player was unanimously voted as villager
 */
export function unanimousVoteAsVillager(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  
  for (const { game, playerStat } of playerGames) {
    if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
    
    const playerCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    if (playerCamp !== 'Villageois') continue;
    
    // Find the meeting day when the player was voted out
    // The player was voted out — check if all other voters targeted them
    const playerName = playerStat.Username;
    
    // Go through each day's votes to find the vote that killed them
    // We need to check all votes in the game to find if ALL players voted for this player in a single meeting
    const voteDays = [...new Set((playerStat.Votes || []).map(v => v.Day))];
    
    // For each meeting day, check if all other voters unanimously voted for this player
    for (const day of voteDays) {
      const allVotesThisDay = [];
      for (const p of game.PlayerStats) {
        const pVotes = (p.Votes || []).filter(v => v.Day === day);
        allVotesThisDay.push(...pVotes.map(v => ({ voter: p.Username, target: v.Target })));
      }
      
      // Filter out passes/"Passé" and self-votes
      const realVotes = allVotesThisDay.filter(v => v.target !== 'Passé' && v.target);
      if (realVotes.length === 0) continue;
      
      // Check if all real votes targeted this player
      const allForPlayer = realVotes.every(v => v.target === playerName);
      if (allForPlayer && realVotes.length >= 3) { // At least 3 votes for unanimity
        value++;
        gameIds.push(game.Id);
        break; // Only count once per game
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player was the only Villageois to pass ("Passé") in a meeting, with at least 3  voters total
 */
export function onlyVillagerPasserInMeeting(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();
  
  for (const { game, playerStat } of playerGames) {
    const playerCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    if (playerCamp !== 'Villageois') continue;

    const votes = playerStat.Votes || [];
    
    for (const vote of votes) {
      if (vote.Target !== 'Passé') continue;
      
      // Check all votes for this day - was this player the only passer?
      let otherPassers = 0;
      let totalVotersThisDay = 0;
      
      for (const p of game.PlayerStats) {
        const pVotes = (p.Votes || []).filter(v => v.Day === vote.Day);
        for (const pv of pVotes) {
          totalVotersThisDay++;
          if (pv.Target === 'Passé' && getPlayerId(p) !== playerId) {
            otherPassers++;
          }
        }
      }
      
      if (otherPassers === 0 && totalVotersThisDay >= 3 && !countedGames.has(game.Id)) {
        value++;
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count meetings (across all games) where the player was alive but did not vote,
 * and all other players that meeting chose "Passé".
 * Thresholds are cumulative across all meetings in all games.
 */
export function loneNonVoterAllOthersPassed(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    const playerVoteDays = new Set((playerStat.Votes || []).map(v => v.Day));

    // Gather all meeting days that occurred in this game
    const allMeetingDays = new Set();
    for (const p of game.PlayerStats) {
      for (const v of (p.Votes || [])) {
        allMeetingDays.add(v.Day);
      }
    }

    for (const day of allMeetingDays) {
      // Player must be alive at this meeting
      if (!isAliveAtMeeting(playerStat, day)) continue;

      // Player must not have voted this meeting
      if (playerVoteDays.has(day)) continue;

      // Find all other players alive at this meeting
      const otherAlivePlayers = game.PlayerStats.filter(p => {
        if (getPlayerId(p) === playerId) return false; // Exclude target player
        return isAliveAtMeeting(p, day); // Must be alive
      });

      // If no other alive players (edge case), skip
      if (otherAlivePlayers.length === 0) continue;

      // Check if ALL other alive players voted "Passé" this meeting
      let allVotedPasse = true;
      for (const p of otherAlivePlayers) {
        const pVotes = (p.Votes || []).filter(v => v.Day === day);
        
        // If this player didn't vote at all, fail
        if (pVotes.length === 0) {
          allVotedPasse = false;
          break;
        }
        
        // If this player voted for something other than "Passé", fail
        if (pVotes.some(v => v.Target !== 'Passé')) {
          allVotedPasse = false;
          break;
        }
      }

      if (allVotedPasse) {
        value++;
        if (!countedGames.has(game.Id)) {
          gameIds.push(game.Id);
          countedGames.add(game.Id);
        }
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player was the sole voter for a target who got eliminated
 */
export function soleVoterElimination(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();
  
  for (const { game, playerStat } of playerGames) {
    const votes = playerStat.Votes || [];
    
    for (const vote of votes) {
      if (vote.Target === 'Passé' || !vote.Target) continue;
      
      // Check if the target was voted out (eliminated)
      const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
      if (!targetPlayer || targetPlayer.DeathType !== DeathTypeCode.VOTED) continue;
      
      // Extract death day from target's DeathTiming (e.g., "M3" -> 3)
      if (!targetPlayer.DeathTiming || !targetPlayer.DeathTiming.startsWith('M')) continue;
      const targetDeathDay = parseInt(targetPlayer.DeathTiming.substring(1), 10);
      if (isNaN(targetDeathDay)) continue;
      
      // Only check votes on the day the target was eliminated
      if (vote.Day !== targetDeathDay) continue;
      
      // Check if this player was the only one who voted for this target on the death day
      let otherVotersForTarget = 0;
      for (const p of game.PlayerStats) {
        if (getPlayerId(p) === playerId) continue;
        const pVotes = (p.Votes || []).filter(v => v.Day === targetDeathDay && v.Target === vote.Target);
        if (pVotes.length > 0) otherVotersForTarget++;
      }
      
      if (otherVotersForTarget === 0 && !countedGames.has(game.Id)) {
        value++;
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count times the player was the first to vote for someone who then got eliminated.
 * For each meeting, check if player voted first (earliest timestamp) for the eliminated target.
 */
export function firstVoterElimination(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();
  
  for (const { game, playerStat } of playerGames) {
    const playerVotes = playerStat.Votes || [];
    
    // Group votes by meeting day
    const meetingDays = [...new Set(playerVotes.map(v => v.Day))];
    
    for (const day of meetingDays) {
      // Find who was eliminated on this day
      const eliminatedPlayer = game.PlayerStats.find(p => 
        p.DeathType === DeathTypeCode.VOTED &&
        p.DeathTiming === `M${day}`
      );
      
      if (!eliminatedPlayer) continue;
      
      // Gather all votes for the eliminated player on this day from all players
      const votesForTarget = [];
      for (const p of game.PlayerStats) {
        const pVotes = (p.Votes || []).filter(v => 
          v.Day === day && 
          v.Target === eliminatedPlayer.Username &&
          v.Date  // Must have a timestamp
        );
        
        for (const vote of pVotes) {
          votesForTarget.push({
            voterId: getPlayerId(p),
            vote: vote,
            timestamp: new Date(vote.Date)
          });
        }
      }
      
      if (votesForTarget.length === 0) continue;
      
      // Sort by timestamp to find the first voter
      votesForTarget.sort((a, b) => a.timestamp - b.timestamp);
      
      // Check if this player was the first voter
      if (votesForTarget[0].voterId === playerId) {
        value++;
        if (!countedGames.has(game.Id)) {
          gameIds.push(game.Id);
          countedGames.add(game.Id);
        }
      }
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player (as Villageois) voted correctly for wolves/solo X times in a row within a game
 */
export function consecutiveCorrectVotes(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const minConsecutive = params.minConsecutive || 5;
  
  for (const { game, playerStat } of playerGames) {
    const playerCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    if (playerCamp !== 'Villageois') continue;
    
    const votes = (playerStat.Votes || []).sort((a, b) => a.Day - b.Day);
    let consecutive = 0;
    let achieved = false;
    
    for (const vote of votes) {
      if (vote.Target === 'Passé' || !vote.Target) {
        consecutive = 0;
        continue;
      }
      
      const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
      if (!targetPlayer) {
        consecutive = 0;
        continue;
      }
      
      const targetCamp = getPlayerCampForAchievement(targetPlayer, false, { regroupWolfSubRoles: true });
      if (targetCamp !== 'Villageois') {
        // Correct vote (voted for enemy)
        consecutive++;
        if (consecutive >= minConsecutive) {
          achieved = true;
        }
      } else {
        consecutive = 0;
      }
    }
    
    if (achieved) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games where player (as Villageois) only voted for enemies with minimum vote count
 * - Must be Villageois camp
 * - Must have voted at least minVotes times (excluding "Passé")
 * - ALL votes must be for enemy camps (Loup or solo roles)
 */
export function onlyEnemyVotes(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const minVotes = params.minVotes || 3;
  
  for (const { game, playerStat } of playerGames) {
    const playerCamp = getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true });
    if (playerCamp !== 'Villageois') continue;
    
    const votes = playerStat.Votes || [];
    const realVotes = votes.filter(v => v.Target && v.Target !== 'Passé');
    
    // Must have voted at least minVotes times
    if (realVotes.length < minVotes) continue;
    
    // Check if ALL votes are for enemies
    let allVotesCorrect = true;
    for (const vote of realVotes) {
      const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
      if (!targetPlayer) {
        allVotesCorrect = false;
        break;
      }
      
      const targetCamp = getPlayerCampForAchievement(targetPlayer, false, { regroupWolfSubRoles: true });
      // Vote is correct only if target is NOT in Villageois camp (must be Loup or solo)
      if (targetCamp === 'Villageois') {
        allVotesCorrect = false;
        break;
      }
    }
    
    if (allVotesCorrect) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}
