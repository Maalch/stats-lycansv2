/**
 * Achievement Computation Module
 * 
 * Evaluates all achievement definitions against game data for each player.
 * Unlike Rankings (comparative) or Titles (percentile), achievements use
 * absolute thresholds checked per-player across all their games.
 * 
 * Each evaluator receives:
 *   - playerGames: array of { game, playerStat } for the target player
 *   - allGames: full game log (for cross-player lookups)
 *   - playerId: the player's unique ID
 *   - params: evaluatorParams from the achievement definition
 *   - joueursData: joueurs.json data for name resolution
 *
 * Each evaluator returns: { value: number, gameIds: string[] }
 *   - value: the count/progress toward levels
 *   - gameIds: ordered list of game IDs where the condition was met (for unlocked-at tracking)
 */

import { getPlayerId, getPlayerMainCampFromRole, getPlayerCampFromRole, getPlayerFinalRole, DeathTypeCode } from '../../../src/utils/datasyncExport.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role is a "solo" camp (not Villageois, not Loup)
 */
function isSoloCamp(role, power) {
  const mainCamp = getPlayerMainCampFromRole(role, power);
  return mainCamp === 'Autres';
}

/**
 * Check if player was a hunter (Chasseur) in legacy or new format
 */
function isHunterRole(player) {
  const role = player.MainRoleInitial;
  const power = player.Power;
  const finalRole = getPlayerFinalRole(role, player.MainRoleChanges || []);
  return role === 'Chasseur' || finalRole === 'Chasseur' ||
         (role === 'Villageois Élite' && power === 'Chasseur');
}

/**
 * Check if player was a wolf (Loup camp)
 */
function isWolfCamp(player) {
  const camp = getPlayerMainCampFromRole(player.MainRoleInitial, player.Power);
  return camp === 'Loup';
}

/**
 * Extract timing day number from DeathTiming string (e.g., "N1" → "N1", "J3" → "J3")
 */
function getDeathDay(timing) {
  if (!timing) return null;
  // Extract the numeric part (e.g., "N1" → 1, "J3" → 3)
  const match = timing.match(/[NJ](\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Get the phase prefix from timing (N or J)
 */
function getDeathPhase(timing) {
  if (!timing) return null;
  return timing.charAt(0); // 'N' or 'J'
}


// ============================================================================
// EVALUATOR FUNCTIONS
// ============================================================================

const EVALUATORS = {

  /**
   * Count wins in a specific camp (Villageois or Loup)
   */
  campWins(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (!playerStat.Victorious) continue;
      const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
      const campMatch = (params.camp === 'Villageois' && mainCamp === 'Villageois') ||
                        (params.camp === 'Loup' && mainCamp === 'Loup');
      if (campMatch) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count losses in a specific camp
   */
  campLosses(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.Victorious) continue;
      const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
      const campMatch = (params.camp === 'Villageois' && mainCamp === 'Villageois') ||
                        (params.camp === 'Loup' && mainCamp === 'Loup');
      if (campMatch) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count solo camp wins (Amoureux, Agent, Idiot du Village, etc.)
   */
  soloWins(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (!playerStat.Victorious) continue;
      if (isSoloCamp(playerStat.MainRoleInitial, playerStat.Power)) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count deaths by a specific death type
   */
  deathByType(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.DeathType === params.deathType) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count deaths on a specific timing (e.g., "N1" for first night)
   */
  deathOnTiming(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.DeathTiming === params.timing) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count times voted out (VOTED death type) while being in a specific camp
   */
  votedAsCamp(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
      const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
      const campMatch = (params.camp === 'Villageois' && mainCamp === 'Villageois') ||
                        (params.camp === 'Loup' && mainCamp === 'Loup');
      if (campMatch) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count deaths as a specific camp role by a specific death type
   * (e.g., wolf killed by Beast)
   */
  roleDeathByType(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.DeathType !== params.deathType) continue;
      const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
      const campMatch = (params.roleCamp === 'Loup' && mainCamp === 'Loup') ||
                        (params.roleCamp === 'Villageois' && mainCamp === 'Villageois');
      if (campMatch) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count wolf kills across all games
   * A "wolf kill" = someone died BY_WOLF and the killer is this player
   */
  wolfKills(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count games won as wolf without making any kills
   */
  wolfWinNoKills(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count games won as the last surviving wolf
   */
  lastWolfStanding(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Win on all available maps (returns 1 if achieved, 0 otherwise)
   */
  winOnAllMaps(playerGames, allGames, playerId, params) {
    // First, gather all unique maps from all games
    const allMaps = new Set();
    for (const game of allGames) {
      if (game.MapName) allMaps.add(game.MapName);
    }
    
    // Gather maps won by the player
    const wonMaps = new Set();
    const gameIds = [];
    for (const { game, playerStat } of playerGames) {
      if (playerStat.Victorious && game.MapName && !wonMaps.has(game.MapName)) {
        wonMaps.add(game.MapName);
        gameIds.push(game.Id);
      }
    }
    
    // Check if player won on all maps
    const allWon = allMaps.size > 0 && allMaps.size === wonMaps.size;
    return { value: allWon ? 1 : 0, gameIds: allWon ? gameIds : [] };
  },

  /**
   * Win in a minimum number of distinct colors
   */
  winInColors(playerGames, allGames, playerId, params) {
    const wonColors = new Set();
    const gameIds = [];
    for (const { game, playerStat } of playerGames) {
      if (playerStat.Victorious && playerStat.Color && !wonColors.has(playerStat.Color)) {
        wonColors.add(playerStat.Color);
        gameIds.push(game.Id);
      }
    }
    const achieved = wonColors.size >= (params.minColors || 5);
    return { value: achieved ? 1 : 0, gameIds: achieved ? gameIds : [] };
  },

  /**
   * Count hunter kills against enemy camp
   */
  hunterKillsEnemy(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (!isHunterRole(playerStat)) continue;
      
      for (const victim of game.PlayerStats) {
        const isHunterKill = victim.DeathType === DeathTypeCode.BULLET ||
                             victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                             victim.DeathType === DeathTypeCode.BULLET_WOLF;
        if (!isHunterKill) continue;
        if (victim.KillerName !== playerStat.Username) continue;
        
        // Check if victim is from an enemy camp
        const hunterCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
        const victimCamp = getPlayerMainCampFromRole(victim.MainRoleInitial, victim.Power);
        
        if (hunterCamp !== victimCamp) {
          value++;
          gameIds.push(game.Id);
        }
      }
    }
    return { value, gameIds };
  },

  /**
   * Count hunter kills against ally camp (Villageois killing Villageois)
   */
  hunterKillsAlly(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (!isHunterRole(playerStat)) continue;
      
      for (const victim of game.PlayerStats) {
        const isHunterKill = victim.DeathType === DeathTypeCode.BULLET ||
                             victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                             victim.DeathType === DeathTypeCode.BULLET_WOLF;
        if (!isHunterKill) continue;
        if (victim.KillerName !== playerStat.Username) continue;
        
        const hunterCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
        const victimCamp = getPlayerMainCampFromRole(victim.MainRoleInitial, victim.Power);
        
        if (hunterCamp === victimCamp) {
          value++;
          gameIds.push(game.Id);
        }
      }
    }
    return { value, gameIds };
  },

  /**
   * Count games where hunter killed 2+ enemies in a single game
   */
  hunterMultiKillsInGame(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    const minKills = params.minKills || 2;
    
    for (const { game, playerStat } of playerGames) {
      if (!isHunterRole(playerStat)) continue;
      
      let enemyKillsInGame = 0;
      const hunterCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
      
      for (const victim of game.PlayerStats) {
        const isHunterKill = victim.DeathType === DeathTypeCode.BULLET ||
                             victim.DeathType === DeathTypeCode.BULLET_HUMAN ||
                             victim.DeathType === DeathTypeCode.BULLET_WOLF;
        if (!isHunterKill) continue;
        if (victim.KillerName !== playerStat.Username) continue;
        
        const victimCamp = getPlayerMainCampFromRole(victim.MainRoleInitial, victim.Power);
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
  },

  /**
   * Count times a hunter was killed by a wolf
   */
  hunterKilledByWolf(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (!isHunterRole(playerStat)) continue;
      if (playerStat.DeathType !== DeathTypeCode.BY_WOLF) continue;
      value++;
      gameIds.push(game.Id);
    }
    return { value, gameIds };
  },

  /**
   * Count assassin potion kills (villager killing enemy or ally with potion)
   */
  assassinPotionKills(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    
    for (const { game, playerStat } of playerGames) {
      // Look for victims killed by ASSASSIN potion where KillerName matches
      for (const victim of game.PlayerStats) {
        if (victim.DeathType !== DeathTypeCode.ASSASSIN) continue;
        if (victim.KillerName !== playerStat.Username) continue;
        
        const killerCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
        const victimCamp = getPlayerMainCampFromRole(victim.MainRoleInitial, victim.Power);
        
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
  },

  /**
   * Count times killed by a wolf who was also an Amoureux
   */
  killedByLoverWolf(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count times voted out as Agent
   */
  agentVoted(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.MainRoleInitial !== 'Agent') continue;
      if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
      value++;
      gameIds.push(game.Id);
    }
    return { value, gameIds };
  },

  /**
   * Count wins as Louveteau when all other wolves are dead
   */
  louveteauOrphanWin(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Win with all available solo roles (check: 1 if complete, 0 otherwise)
   */
  winWithAllSoloRoles(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count games where player talked >= X% of the total game time
   */
  talkingPercentage(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    const minPct = params.minPercentage || 50;
    
    for (const { game, playerStat } of playerGames) {
      const totalTalked = (playerStat.SecondsTalkedOutsideMeeting || 0) + (playerStat.SecondsTalkedDuringMeeting || 0);
      
      // Calculate total game talking time
      let totalGameTalking = 0;
      for (const p of game.PlayerStats) {
        totalGameTalking += (p.SecondsTalkedOutsideMeeting || 0) + (p.SecondsTalkedDuringMeeting || 0);
      }
      
      if (totalGameTalking > 0) {
        const pct = (totalTalked / totalGameTalking) * 100;
        if (pct >= minPct) {
          value++;
          gameIds.push(game.Id);
        }
      }
    }
    return { value, gameIds };
  },

  /**
   * Count games where player voted correctly for a wolf/solo but got voted out themselves
   */
  correctVoteButVoted(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    
    for (const { game, playerStat } of playerGames) {
      // Player must have been voted out
      if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
      
      const playerCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
      if (playerCamp !== 'Villageois') continue;
      
      // Check if any of the player's votes targeted an enemy
      const votes = playerStat.Votes || [];
      let votedCorrectly = false;
      
      for (const vote of votes) {
        if (vote.Target === 'Passé' || !vote.Target) continue;
        
        // Find the target player in the game
        const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
        if (!targetPlayer) continue;
        
        const targetCamp = getPlayerMainCampFromRole(targetPlayer.MainRoleInitial, targetPlayer.Power);
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
  },

  /**
   * Count games where player was unanimously voted as villager
   */
  unanimousVoteAsVillager(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    
    for (const { game, playerStat } of playerGames) {
      if (playerStat.DeathType !== DeathTypeCode.VOTED) continue;
      
      const playerCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
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
  },

  /**
   * Count games where player was the only one to pass ("Passé") in a meeting
   */
  onlyPasserInMeeting(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    const countedGames = new Set();
    
    for (const { game, playerStat } of playerGames) {
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
  },

  /**
   * Count games where player was the sole voter for a target who got eliminated
   */
  soleVoterElimination(playerGames, allGames, playerId, params) {
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
        
        // Check if this player was the only one who voted for this target in this meeting
        let otherVotersForTarget = 0;
        for (const p of game.PlayerStats) {
          if (getPlayerId(p) === playerId) continue;
          const pVotes = (p.Votes || []).filter(v => v.Day === vote.Day && v.Target === vote.Target);
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
  },

  /**
   * Count games where player (as Villageois) voted correctly for wolves/solo X times in a row within a game
   */
  consecutiveCorrectVotes(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    const minConsecutive = params.minConsecutive || 5;
    
    for (const { game, playerStat } of playerGames) {
      const playerCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
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
        
        const targetCamp = getPlayerMainCampFromRole(targetPlayer.MainRoleInitial, targetPlayer.Power);
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
  },

  /**
   * Count games where player's killer also died the same day
   */
  killerDiedSameDay(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count kills where the killer and victim had the same color
   * Any kill type counts (wolf kills, hunter kills, potion kills, etc.)
   */
  sameColorKills(playerGames, allGames, playerId, params) {
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
        if (victim.KillerName !== playerStat.Username) continue;
        
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
  },

  /**
   * Count deaths in all Village map zones
   * Returns the minimum death count across all 5 zones
   * (if you died 3 times in each zone, value = 3)
   * Only counts games played on Village map
   */
  deathsInAllZones(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count solo camp losses (Amoureux, Agent, Idiot du Village, etc.)
   */
  soloLosses(playerGames, allGames, playerId, params) {
    const gameIds = [];
    let value = 0;
    for (const { game, playerStat } of playerGames) {
      if (playerStat.Victorious) continue;
      if (isSoloCamp(playerStat.MainRoleInitial, playerStat.Power)) {
        value++;
        gameIds.push(game.Id);
      }
    }
    return { value, gameIds };
  },

  /**
   * Count deaths as a wolf killed by an Amoureux Loup (another wolf)
   */
  wolfKilledByAmoureuxLoup(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Return minimum wins per map (for "win X times on each map")
   */
  winsOnAllMaps(playerGames, allGames, playerId, params) {
    // Gather all unique maps from all games
    const allMaps = new Set();
    for (const game of allGames) {
      if (game.MapName) allMaps.add(game.MapName);
    }
    
    // Count wins per map
    const winsPerMap = {};
    for (const mapName of allMaps) {
      winsPerMap[mapName] = { count: 0, gameIds: [] };
    }
    
    for (const { game, playerStat } of playerGames) {
      if (playerStat.Victorious && game.MapName && winsPerMap[game.MapName]) {
        winsPerMap[game.MapName].count++;
        winsPerMap[game.MapName].gameIds.push(game.Id);
      }
    }
    
    // Return minimum wins across all maps
    const mapCounts = Object.values(winsPerMap).map(m => m.count);
    const minWins = mapCounts.length > 0 ? Math.min(...mapCounts) : 0;
    
    // Build gameIds list: collect game IDs up to minWins from each map
    const gameIds = [];
    const gameIdSet = new Set();
    
    for (const mapName of allMaps) {
      const mapGameIds = winsPerMap[mapName].gameIds.slice(0, minWins);
      for (const gid of mapGameIds) {
        if (!gameIdSet.has(gid)) {
          gameIds.push(gid);
          gameIdSet.add(gid);
        }
      }
    }
    
    return { value: minWins, gameIds };
  },

  /**
   * Count deaths as Idiot du Village by a hunter bullet
   */
  idiotKilledByHunter(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count sabotages performed as wolf
   */
  wolfSabotages(playerGames, allGames, playerId, params) {
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
  },

  /**
   * Count games lost by harvest as wolf without making any kills
   */
  wolfLossHarvestNoKills(playerGames, allGames, playerId, params) {
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
  },
};

// ============================================================================
// MAIN COMPUTATION
// ============================================================================

/**
 * Compute all achievements for all players
 * @param {Array} gameData - Full game log array
 * @param {Array} achievementDefs - Achievement definitions array
 * @param {Object|null} joueursData - Optional joueurs.json data
 * @returns {Object} - Map of playerId → computed achievements
 */
export function computeAllAchievements(gameData, achievementDefs, joueursData = null) {
  console.log(`  Computing achievements across ${gameData.length} games...`);
  
  // Build per-player game lists
  const playerGamesMap = new Map(); // playerId → [{ game, playerStat }]
  const playerNames = new Map();    // playerId → displayName
  
  for (const game of gameData) {
    for (const playerStat of game.PlayerStats) {
      const pid = getPlayerId(playerStat);
      
      if (!playerGamesMap.has(pid)) {
        playerGamesMap.set(pid, []);
      }
      playerGamesMap.get(pid).push({ game, playerStat });
      
      // Resolve canonical name
      if (joueursData?.Players) {
        const joueur = joueursData.Players.find(p => p.SteamID === pid || p.ID === pid);
        if (joueur) {
          playerNames.set(pid, joueur.Joueur);
        } else if (!playerNames.has(pid)) {
          playerNames.set(pid, playerStat.Username);
        }
      } else if (!playerNames.has(pid)) {
        playerNames.set(pid, playerStat.Username);
      }
    }
  }
  
  console.log(`  Processing ${playerGamesMap.size} players...`);
  
  const results = {};
  
  for (const [playerId, playerGames] of playerGamesMap) {
    const playerAchievements = [];
    
    for (const def of achievementDefs) {
      const evaluator = EVALUATORS[def.evaluator];
      if (!evaluator) {
        console.warn(`  ⚠️  Unknown evaluator: ${def.evaluator} for achievement ${def.id}`);
        continue;
      }
      
      const { value, gameIds } = evaluator(playerGames, gameData, playerId, def.evaluatorParams || {});
      
      if (value === 0) continue; // Skip achievements with no progress
      
      // Determine which levels are unlocked
      const unlockedLevels = [];
      let nextLevel = null;
      
      for (const level of def.levels) {
        if (value >= level.threshold) {
          // Find the game where this threshold was crossed
          const thresholdGameId = gameIds.length >= level.threshold ? gameIds[level.threshold - 1] : gameIds[gameIds.length - 1];
          unlockedLevels.push({
            tier: level.tier,
            subLevel: level.subLevel,
            threshold: level.threshold,
            unlockedAtGame: thresholdGameId || null,
          });
        } else if (!nextLevel) {
          nextLevel = { tier: level.tier, subLevel: level.subLevel, threshold: level.threshold };
        }
      }
      
      // Calculate progress toward next level
      const progress = nextLevel
        ? Math.min(value / nextLevel.threshold, 0.99)
        : 1.0;
      
      playerAchievements.push({
        id: def.id,
        currentValue: value,
        unlockedLevels,
        nextLevel,
        progress,
      });
    }
    
    results[playerId] = {
      playerId,
      playerName: playerNames.get(playerId) || playerId,
      totalUnlocked: playerAchievements.reduce((sum, a) => sum + a.unlockedLevels.length, 0),
      achievements: playerAchievements,
    };
  }
  
  return results;
}
