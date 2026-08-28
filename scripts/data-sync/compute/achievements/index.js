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

/** Number of most-recent player games used to compute recentValue per achievement */
export const RECENT_GAMES_COUNT = 15;

// General evaluators
import {
  campWins, campLosses, soloWins, soloLosses,
  deathByType, deathOnTiming,
  winOnAllMaps, winInColors, winsOnAllMaps,
  winsAgainstOnutrem, winningMonths,
  perfectSessions, topLootVillageoisGames, maxLootInSingleGame, resurrectedCount,
  speedRunWins, lostAfterCampSwitch,
} from './evaluators-general.js';

// Wolf evaluators
import {
  wolfKills, zombieKills, vaudouTripleResurrect,
  wolfWinNoKills, lastWolfStanding,
  wolfNecromancerResurrect, wolfSeerDoubleKill, wolfSeerTotalCorrectGuesses,
  wolfSabotages, wolfLossHarvestNoKills, wolfSurvivedHunterShot,
  wolfVotesLastVillagerInThree, wolfWinEarlyDeath, wolfAllKillsSolo,
  zombieItemUses, wolfTransformKillNights, wolfEclipseKills,
  wolfDrinkPotions, wolfScrollUses,
} from './evaluators-wolf.js';

// Combat evaluators
import {
  roleDeathByType,
  hunterKillsEnemy, villageoisDoubleAllyKill, hunterKillsAlly,
  hunterMultiKillsInGame, hunterKilledByWolf,
  assassinPotionKills, killerDiedSameDay, sameColorKills,
  hunterKillsLastWolf, revengeKill, consecutiveGameSameVictimKill,
} from './evaluators-combat.js';

// Role-specific evaluators
import {
  agentWinPerfectKill, agentVoted,
  winWith9SoloRoles, idiotKilledByHunter, idiotSurvivedWithVotes,
  roleWins, samePowerAsAlly, mayorEnemyWin,
} from './evaluators-roles.js';

// Amoureux evaluators
import {
  amoureuxLoupKillsLover, amoureuxLoupTotalKills,
  amoureuxLoupKillsWolf, amoureuxVillageoisKillsEnemy,
  loverSingleAtEnd,
} from './evaluators-amoureux.js';

// Voting evaluators
import {
  votedAsCamp, correctVoteButVoted, unanimousVoteAsVillager,
  onlyVillagerPasserInMeeting, loneNonVoterAllOthersPassed,
  soleVoterElimination, firstVoterElimination, consecutiveCorrectVotes, onlyEnemyVotes,
  stubbornConsecutiveVotes,
} from './evaluators-voting.js';

// Social/special evaluators
import {
  talkingPercentage, deathsInAllZones, collectionneur, justeUnDernierVerre,
  musicalClips, immobileGreaterThanMoving,
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
  wolfSeerTotalCorrectGuesses,
  wolfSabotages,
  wolfLossHarvestNoKills,
  wolfSurvivedHunterShot,
  wolfVotesLastVillagerInThree,
  wolfWinEarlyDeath,
  wolfAllKillsSolo,
  zombieItemUses,
  wolfTransformKillNights,
  wolfEclipseKills,
  wolfDrinkPotions,
  wolfScrollUses,

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
  revengeKill,
  consecutiveGameSameVictimKill,

  // Roles
  agentWinPerfectKill,
  agentVoted,
  winWith9SoloRoles,
  idiotKilledByHunter,
  idiotSurvivedWithVotes,
  roleWins,
  samePowerAsAlly,
  mayorEnemyWin,

  // Amoureux
  amoureuxLoupKillsLover,
  amoureuxLoupTotalKills,
  amoureuxLoupKillsWolf,
  amoureuxVillageoisKillsEnemy,
  loverSingleAtEnd,

  // Voting
  votedAsCamp,
  correctVoteButVoted,
  unanimousVoteAsVillager,
  onlyVillagerPasserInMeeting,
  loneNonVoterAllOthersPassed,
  soleVoterElimination,
  firstVoterElimination,
  consecutiveCorrectVotes,
  onlyEnemyVotes,
  stubbornConsecutiveVotes,

  // Social/Special
  talkingPercentage,
  deathsInAllZones,
  collectionneur,
  justeUnDernierVerre,
  musicalClips,
  immobileGreaterThanMoving,
  winsAgainstOnutrem,
  winningMonths,
  perfectSessions,
  topLootVillageoisGames,
  maxLootInSingleGame,
  resurrectedCount,
  speedRunWins,
  lostAfterCampSwitch,
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
 * Find the earliest chronological prefix of `items` whose cumulative value (as computed by
 * `computeValue`) reaches `threshold`, and return the ID of the last item in that prefix.
 *
 * This replaces indexing into an evaluator's `gameIds` array by `threshold - 1`, which silently
 * assumes exactly one gameId is pushed per +1 of value (breaks for any evaluator that can add
 * more than 1 to `value` from a single game, e.g. multi-kill games). Relies on achievement value
 * being monotonically non-decreasing as more of the player's chronological games are considered,
 * which holds for all achievement evaluators (progress never regresses).
 */
function findGameIdForThreshold(items, threshold, computeValue, getId) {
  if (items.length === 0) return null;
  let lo = 0, hi = items.length - 1, result = items.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (computeValue(items.slice(0, mid + 1)) >= threshold) {
      result = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return getId(items[result]);
}

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

    // Chronological copies used for threshold→game attribution (see findGameIdForThreshold)
    const chronoPlayerGames = [...playerGames].sort((a, b) => (a.game.StartDate || '').localeCompare(b.game.StartDate || ''));
    const chronoPlayerBRGames = [...playerBRGames].sort((a, b) => (a.Game ?? 0) - (b.Game ?? 0));
    
    for (const def of achievementDefs) {
      // Skip main-team-only achievements if no BR data available
      if (def.mainTeamOnly && !brData) {
        continue;
      }
      
      // Use BR evaluator for main-team-only achievements
      if (def.mainTeamOnly) {
        const brEvaluator = BR_EVALUATORS[def.evaluator];
        if (brEvaluator) {
        
        const { value } = brEvaluator(playerBRGames, brData, def.evaluatorParams || {});
        
        if (value === 0) continue;
        
        // Compute recent value (last RECENT_GAMES_COUNT BR games for this player)
        const recentPlayerBRGames = playerBRGames.slice(-RECENT_GAMES_COUNT);
        const { value: recentValue, gameIds: recentGameIds } = brEvaluator(recentPlayerBRGames, brData, def.evaluatorParams || {});
        
        // Determine which levels are unlocked
        const unlockedLevels = [];
        let nextLevel = null;
        
        for (const level of def.levels) {
          if (value >= level.threshold) {
            const thresholdGameId = findGameIdForThreshold(
              chronoPlayerBRGames,
              level.threshold,
              (prefix) => brEvaluator(prefix, brData, def.evaluatorParams || {}).value,
              (entry) => `BR-${entry.Game}`
            );
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
          recentValue,
          recentGameIds,
          unlockedLevels,
          nextLevel,
          progress,
        });
        
        continue;
        }
        // No BR evaluator found: mainTeamOnly but uses standard game data (e.g. musicalClips) — fall through
      }
      
      // Standard achievement evaluation
      const evaluator = EVALUATORS[def.evaluator];
      if (!evaluator) {
        console.warn(`  ⚠️  Unknown evaluator: ${def.evaluator} for achievement ${def.id}`);
        continue;
      }
      
      const { value } = evaluator(playerGames, gameData, playerId, def.evaluatorParams || {});
      
      if (value === 0) continue; // Skip achievements with no progress
      
      // Compute recent value (last RECENT_GAMES_COUNT games this player participated in)
      const recentPlayerGames = playerGames.slice(-RECENT_GAMES_COUNT);
      const { value: recentValue, gameIds: recentGameIds } = evaluator(recentPlayerGames, gameData, playerId, def.evaluatorParams || {});
      
      // Determine which levels are unlocked
      const unlockedLevels = [];
      let nextLevel = null;
      
      for (const level of def.levels) {
        if (value >= level.threshold) {
          // Find the game where this threshold was crossed
          const thresholdGameId = findGameIdForThreshold(
            chronoPlayerGames,
            level.threshold,
            (prefix) => evaluator(prefix, gameData, playerId, def.evaluatorParams || {}).value,
            (item) => item.game.Id
          );
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
        recentValue,
        recentGameIds,
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
