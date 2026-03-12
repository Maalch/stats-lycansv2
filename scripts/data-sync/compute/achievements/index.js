/**
 * Achievement Computation Module — Index
 * 
 * Aggregates all evaluators from split files and exports the main
 * `computeAllAchievements` function. This is the public API of the module.
 * 
 * Evaluators are split by domain:
 *   - evaluators-general:   Win/loss, death, map/color variety
 *   - evaluators-wolf:      Wolf-camp specific (kills, zombie, vaudou, etc.)
 *   - evaluators-combat:    Hunter kills, potion, same-color, etc.
 *   - evaluators-roles:     Agent, bounty hunter, louveteau, idiot, solo roles
 *   - evaluators-amoureux:  Amoureux/lover-related achievements
 *   - evaluators-voting:    Voting behavior achievements
 *   - evaluators-social:    Talking, death zones
 *   - evaluators-br:        Battle Royale achievements
 */

import { getPlayerId } from './helpers.js';

// General evaluators
import {
  campWins, campLosses, soloWins, soloLosses,
  deathByType, deathOnTiming,
  winOnAllMaps, winInColors, winsOnAllMaps,
  winsAgainstOnutrem, winningMonths,
  perfectSessions, topLootVillageoisGames, resurrectedCount,
} from './evaluators-general.js';

// Wolf evaluators
import {
  wolfKills, zombieKills, vaudouTripleResurrect,
  wolfWinNoKills, lastWolfStanding,
  wolfNecromancerResurrect, wolfSeerDoubleKill,
  wolfSabotages, wolfLossHarvestNoKills, wolfSurvivedHunterShot,
  wolfVotesLastVillagerInThree, wolfWinEarlyDeath, wolfAllKillsSolo,
  zombieItemUses, wolfTransformKillNights,
} from './evaluators-wolf.js';

// Combat evaluators
import {
  roleDeathByType,
  hunterKillsEnemy, villageoisDoubleAllyKill, hunterKillsAlly,
  hunterMultiKillsInGame, hunterKilledByWolf,
  assassinPotionKills, killerDiedSameDay, sameColorKills,
  hunterKillsLastWolf,
} from './evaluators-combat.js';

// Role-specific evaluators
import {
  agentWinPerfectKill, agentVoted,
  louveteauOrphanWin,
  winWith9SoloRoles, idiotKilledByHunter,
  roleWins,
} from './evaluators-roles.js';

// Amoureux evaluators
import {
  killedByLoverWolf, wolfKilledByAmoureuxLoup,
  amoureuxLoupKillsLover, amoureuxLoupTotalKills,
  amoureuxLoupKillsTwoWolves, amoureuxVillageoisKillsEnemy,
} from './evaluators-amoureux.js';

// Voting evaluators
import {
  votedAsCamp, correctVoteButVoted, unanimousVoteAsVillager,
  onlyVillagerPasserInMeeting, loneNonVoterAllOthersPassed,
  soleVoterElimination, consecutiveCorrectVotes, onlyEnemyVotes,
} from './evaluators-voting.js';

// Social/special evaluators
import {
  talkingPercentage, deathsInAllZones, collectionneur, justeUnDernierVerre,
} from './evaluators-social.js';

// BR evaluators
import {
  brWins, brParticipations, brTotalKills, brZeroKillGames,
  brHighKillGame, brTopKillsButLoss, brLuckyLuke, brOneShotVictory,
} from './evaluators-br.js';

// ============================================================================
// EVALUATOR MAPS
// ============================================================================

export const EVALUATORS = {
  // General
  campWins,
  campLosses,
  soloWins,
  soloLosses,
  deathByType,
  deathOnTiming,
  winOnAllMaps,
  winInColors,
  winsOnAllMaps,

  // Wolf
  wolfKills,
  zombieKills,
  vaudouTripleResurrect,
  wolfWinNoKills,
  lastWolfStanding,
  wolfNecromancerResurrect,
  wolfSeerDoubleKill,
  wolfSabotages,
  wolfLossHarvestNoKills,
  wolfSurvivedHunterShot,
  wolfVotesLastVillagerInThree,
  wolfWinEarlyDeath,
  wolfAllKillsSolo,
  zombieItemUses,
  wolfTransformKillNights,

  // Combat
  roleDeathByType,
  hunterKillsEnemy,
  villageoisDoubleAllyKill,
  hunterKillsAlly,
  hunterMultiKillsInGame,
  hunterKilledByWolf,
  assassinPotionKills,
  killerDiedSameDay,
  sameColorKills,
  hunterKillsLastWolf,

  // Roles
  agentWinPerfectKill,
  agentVoted,
  louveteauOrphanWin,
  winWith9SoloRoles,
  idiotKilledByHunter,
  roleWins,

  // Amoureux
  killedByLoverWolf,
  wolfKilledByAmoureuxLoup,
  amoureuxLoupKillsLover,
  amoureuxLoupTotalKills,
  amoureuxLoupKillsTwoWolves,
  amoureuxVillageoisKillsEnemy,

  // Voting
  votedAsCamp,
  correctVoteButVoted,
  unanimousVoteAsVillager,
  onlyVillagerPasserInMeeting,
  loneNonVoterAllOthersPassed,
  soleVoterElimination,
  consecutiveCorrectVotes,
  onlyEnemyVotes,

  // Social/Special
  talkingPercentage,
  deathsInAllZones,
  collectionneur,
  justeUnDernierVerre,
  winsAgainstOnutrem,
  winningMonths,
  perfectSessions,
  topLootVillageoisGames,
  resurrectedCount,
};

export const BR_EVALUATORS = {
  brWins,
  brParticipations,
  brTotalKills,
  brZeroKillGames,
  brHighKillGame,
  brTopKillsButLoss,
  brLuckyLuke,
  brOneShotVictory,
};

// ============================================================================
// MAIN COMPUTATION
// ============================================================================

/**
 * Compute all achievements for all players
 * @param {Array} gameData - Full game log array
 * @param {Array} achievementDefs - Achievement definitions array
 * @param {Object|null} joueursData - Optional joueurs.json data
 * @param {Array|null} brData - Optional BR participation data array (main team only)
 * @returns {Object} - Map of playerId → computed achievements
 */
export function computeAllAchievements(gameData, achievementDefs, joueursData = null, brData = null) {
  console.log(`  Computing achievements across ${gameData.length} games...`);
  if (brData) {
    console.log(`  BR data available: ${brData.length} BR entries`);
  }
  
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
  
  // Build per-player BR game lists (by player name since BR data uses names, not IDs)
  const playerBRGamesMap = new Map(); // playerName → [BR entries]
  if (brData) {
    for (const entry of brData) {
      const playerName = entry.Participants;
      if (!playerBRGamesMap.has(playerName)) {
        playerBRGamesMap.set(playerName, []);
      }
      playerBRGamesMap.get(playerName).push(entry);
    }
    console.log(`  BR players: ${playerBRGamesMap.size}`);
  }
  
  console.log(`  Processing ${playerGamesMap.size} players...`);
  
  const results = {};
  
  for (const [playerId, playerGames] of playerGamesMap) {
    const playerName = playerNames.get(playerId) || playerId;
    const playerAchievements = [];
    
    // Get BR games for this player (matched by canonical name)
    const playerBRGames = playerBRGamesMap.get(playerName) || [];
    
    for (const def of achievementDefs) {
      // Skip BR achievements if no BR data available
      if (def.requiresBRData && !brData) {
        continue;
      }
      
      // Use BR evaluator for BR achievements
      if (def.requiresBRData) {
        const brEvaluator = BR_EVALUATORS[def.evaluator];
        if (!brEvaluator) {
          console.warn(`  ⚠️  Unknown BR evaluator: ${def.evaluator} for achievement ${def.id}`);
          continue;
        }
        
        const { value, gameIds } = brEvaluator(playerBRGames, brData, def.evaluatorParams || {});
        
        if (value === 0) continue;
        
        // Determine which levels are unlocked
        const unlockedLevels = [];
        let nextLevel = null;
        
        for (const level of def.levels) {
          if (value >= level.threshold) {
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
        
        continue;
      }
      
      // Standard achievement evaluation
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
