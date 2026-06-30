/**
 * Wolf Achievement Evaluators
 * 
 * Evaluators for wolf-camp specific achievements: kills, wins,
 * zombie/vaudou mechanics, necromancer, seer, sabotage.
 */

import { isWolfCamp, getPlayerCampForAchievement, isHunterRole, isAliveAtMeeting, isKilledByPlayer, isActionTargetPlayer, getDeathDay } from './helpers.js';
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
    if (!isWolfCamp(playerStat, true)) continue;
    
    // Count players killed by this wolf in this game
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
      if (victim.DeathType === DeathTypeCode.BY_ZOMBIE && isKilledByPlayer(game, victim, playerId)) {
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
      isKilledByPlayer(game, victim, playerId) &&
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
 * Count total UseGadget or DrinkPotion actions performed while the player is a Zombie.
 * Zombie status is determined by a MainRoleChanges entry with NewMainRole === 'Zombie'.
 * Only actions with a Date strictly after the RoleChangeDateIrl of the Zombie change count.
 * Each individual action counts toward the total (not each game).
 * gameIds records all games that had ≥1 qualifying action.
 */
export function zombieItemUses(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    const changes = playerStat.MainRoleChanges;
    if (!changes || changes.length === 0) continue;

    // Find the Zombie role change (use the first occurrence)
    const zombieChange = changes.find(rc => rc.NewMainRole === 'Zombie');
    if (!zombieChange || !zombieChange.RoleChangeDateIrl) continue;

    const zombieDate = new Date(zombieChange.RoleChangeDateIrl);

    // Count UseGadget or DrinkPotion actions done after becoming a Zombie
    const actions = playerStat.Actions;
    if (!actions || actions.length === 0) continue;

    const actionsAsZombie = actions.filter(a =>
      (a.ActionType === 'UseGadget' || a.ActionType === 'DrinkPotion') &&
      a.Date != null &&
      new Date(a.Date) > zombieDate
    );

    if (actionsAsZombie.length > 0) {
      value += actionsAsZombie.length;
      gameIds.push(game.Id);
    }
  }

  return { value, gameIds };
}
/**
 * Count games won as the last surviving wolf (only survivor in entire game)
 */
export function lastWolfStanding(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    if (!isWolfCamp(playerStat)) continue;

    // Check if player is the only survivor in the entire game (not just last wolf)
    const allSurvivors = game.PlayerStats.filter(p =>
      (!p.DeathType || p.DeathType === DeathTypeCode.SURVIVOR || p.DeathType === '')
    );
    
    if (allSurvivors.length === 1 && getPlayerId(allSurvivors[0]) === playerId) {
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
      const resurrectedId = getPlayerId(resurrected);
      const kills = game.PlayerStats.filter(victim =>
        victim.DeathType === DeathTypeCode.BY_WOLF &&
        isKilledByPlayer(game, victim, resurrectedId)
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
 * Count games where player (as wolf) made at least 2 SEER kills in that game.
 * - Wolf = isWolfCamp (includes Loup Devin and wolves using boule de cristal)
 * - A SEER kill = victim.DeathType === DeathTypeCode.SEER && killer is this player
 */
export function wolfSeerDoubleKill(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;

    const seerKills = game.PlayerStats.filter(victim =>
      victim.DeathType === DeathTypeCode.SEER &&
      isKilledByPlayer(game, victim, playerId)
    );

    if (seerKills.length >= 2) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count total correct role guesses (SEER kills) as wolf across all games.
 * - Wolf = isWolfCamp (includes Loup Devin and wolves using boule de cristal)
 * - A SEER kill = victim.DeathType === DeathTypeCode.SEER && killer is this player
 * Returns cumulative count, not number of games.
 */
export function wolfSeerTotalCorrectGuesses(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;

    const seerKills = game.PlayerStats.filter(victim =>
      victim.DeathType === DeathTypeCode.SEER &&
      isKilledByPlayer(game, victim, playerId)
    );

    if (seerKills.length > 0) {
      value += seerKills.length;
      if (!countedGames.has(game.Id)) {
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
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
 * Count games where:
 * - Player was in Loup camp
 * - Player lost (Victorious: false)
 * - A Chasseur was present in the game
 * - That Chasseur had a HunterShoot action targeting this player
 * - The player did NOT die from BULLET_WOLF (i.e. survived the shot)
 */
export function wolfSurvivedHunterShot(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    // Must be Loup camp
    if (!isWolfCamp(playerStat)) continue;

    // Must have lost
    if (playerStat.Victorious) continue;

    // Must NOT have died from a hunter bullet
    if (playerStat.DeathType === DeathTypeCode.BULLET_WOLF) continue;

    // There must be at least one Chasseur in the game
    const hunters = game.PlayerStats.filter(p => isHunterRole(p));
    if (hunters.length === 0) continue;

    // A Chasseur must have a HunterShoot action targeting this player
    let wasShot = false;
    for (const hunter of hunters) {
      if (!hunter.Actions) continue;
      for (const action of hunter.Actions) {
        if (action.ActionType === 'HunterShoot' && isActionTargetPlayer(game, action.ActionTarget, playerId)) {
          wasShot = true;
          break;
        }
      }
      if (wasShot) break;
    }

    if (!wasShot) continue;

    value++;
    gameIds.push(game.Id);
  }

  return { value, gameIds };
}

/**
 * Count wins as wolf by voting out the last Villageois in a 3-player final meeting.
 * Conditions:
 * - Player is Loup camp and won
 * - Game ended via meeting (EndTiming = MX)
 * - Exactly 3 players were alive at that final meeting
 * - A Villageois was voted out at that meeting
 */
export function wolfVotesLastVillagerInThree(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (getPlayerCampForAchievement(playerStat, false, { regroupWolfSubRoles: true }) !== 'Loup') continue;
    if (!playerStat.Victorious) continue;

    // Game must end via meeting (MX)
    const endTiming = game.EndTiming;
    if (!endTiming || !/^M\d+$/.test(endTiming)) continue;
    const lastMeetingDay = parseInt(endTiming.slice(1));

    // Exactly 3 players alive at that meeting
    const aliveCount = game.PlayerStats.filter(p => isAliveAtMeeting(p, lastMeetingDay)).length;
    if (aliveCount !== 3) continue;

    // A Villageois was voted out at that meeting
    const eliminatedVillager = game.PlayerStats.some(p =>
      p.DeathType === DeathTypeCode.VOTED &&
      p.DeathTiming === endTiming &&
      getPlayerCampForAchievement(p, false, { regroupWolfSubRoles: true }) === 'Villageois'
    );
    if (!eliminatedVillager) continue;

    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count games won as wolf where ALL BY_WOLF kills in the game were made by this player alone.
 * At least 1 kill must exist (zero-kill wins are already covered by wolfWinNoKills).
 * "Besoin de personne" — you carried all the kills yourself.
 */
export function wolfAllKillsSolo(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;
    if (!playerStat.Victorious) continue;

    // Collect all BY_WOLF kills in the game
    const wolfKillsInGame = game.PlayerStats.filter(
      victim => victim.DeathType === DeathTypeCode.BY_WOLF
    );

    // Must have made at least 1 kill
    if (wolfKillsInGame.length === 0) continue;

    // Every BY_WOLF kill must have been made by this player
    const allByThisPlayer = wolfKillsInGame.every(
      victim => isKilledByPlayer(game, victim, playerId)
    );

    if (allByThisPlayer) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count games won as wolf while having died before the first meeting (DeathTiming N1 or J1).
 * "Une game exemplaire" — the team won even though you died very early.
 */
export function wolfWinEarlyDeath(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;
    if (!playerStat.Victorious) continue;

    // Must have died before the first meeting: N1 or J1
    const timing = playerStat.DeathTiming;
    if (timing !== 'N1' && timing !== 'J1') continue;

    value++;
    gameIds.push(game.Id);
  }
  return { value, gameIds };
}

/**
 * Count nights where the player (Loup camp) transformed, killed at least one player,
 * and untransformed — all within the same night timing (e.g. N1, N2, ...).
 * Each qualifying night counts as 1 toward the total.
 * Untransform includes both 'Untransform' and 'UntransformInfecté'.
 * gameIds records the unique games in which at least one qualifying night occurred.
 */
export function wolfTransformKillNights(playerGames, allGames, playerId, params) {
  const gameIds = [];
  const countedGames = new Set();
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;

    const actions = playerStat.Actions;
    if (!actions || actions.length === 0) continue;

    // Collect unique night timings where the player transformed
    const transformNights = new Set(
      actions
        .filter(a => a.ActionType === 'Transform' && a.Timing && a.Timing.startsWith('N'))
        .map(a => a.Timing)
    );

    for (const timing of transformNights) {
      // Must have untransformed the same night
      const hasUntransform = actions.some(a =>
        (a.ActionType === 'Untransform' || a.ActionType === 'UntransformInfecté') &&
        a.Timing === timing
      );
      if (!hasUntransform) continue;

      // Must have killed at least one player that same night
      const hasKill = game.PlayerStats.some(v =>
        isKilledByPlayer(game, v, playerId) &&
        v.DeathType === DeathTypeCode.BY_WOLF &&
        v.DeathTiming === timing
      );
      if (!hasKill) continue;

      value++;
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
      isKilledByPlayer(game, victim, playerId) &&
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
 * Count wolf kills made on a day when an Eclipse event is active.
 * Only kills by wolf-camp players (BY_WOLF death type) are counted,
 * and only if the victim's death timing falls on the same day as the Eclipse event.
 */
export function wolfEclipseKills(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    // Player must be in wolf camp
    if (!isWolfCamp(playerStat, true)) continue;

    // Game must have a DailyEventStart Eclipse event
    if (!game.GameEvents || game.GameEvents.length === 0) continue;
    const eclipseEvents = game.GameEvents.filter(e => e.Type === 'DailyEventStart' && e.Name === 'Eclipse');
    if (eclipseEvents.length === 0) continue;

    // Collect the day numbers covered by eclipse events (e.g. "J3" → 3)
    const eclipseDays = new Set(
      eclipseEvents.map(e => getDeathDay(e.Timing)).filter(d => d !== null)
    );
    if (eclipseDays.size === 0) continue;

    // Count wolf kills whose victim died on an eclipse day
    let killsInGame = 0;
    for (const victim of game.PlayerStats) {
      if (victim.DeathType !== DeathTypeCode.BY_WOLF) continue;
      if (!isKilledByPlayer(game, victim, playerId)) continue;
      const victimDay = getDeathDay(victim.DeathTiming);
      if (victimDay !== null && eclipseDays.has(victimDay)) {
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

// ============================================================================
// WOLF FORM ITEM EVALUATORS
// ============================================================================

/**
 * Internal helper: returns all actions matching filterFn that were performed
 * while the player was in wolf form (between a Transform and its window end).
 *
 * The wolf form window for a given Transform event is determined as:
 *   1. Untransform (or UntransformInfecté) on the same Timing night → use its Date
 *   2. Else: player died the same Timing night (DeathTiming match) → use DeathDateIrl
 *   3. Else: first NewPhase GameEvent with Date strictly after the Transform Date
 *
 * Actions with no Date are ignored. Transform events with no Date are skipped.
 * Caller is responsible for verifying that the game has NewPhase events.
 *
 * @param {Object} playerStat - The player's stat object for a game
 * @param {Object} game       - The full game object (needs GameEvents)
 * @param {Function} filterFn - Predicate applied to each Action
 * @returns {Array} qualifying actions performed during wolf form
 */
function getActionsWhileInWolfForm(playerStat, game, filterFn) {
  const actions = playerStat.Actions || [];
  const result = [];

  for (const transform of actions) {
    if (transform.ActionType !== 'Transform') continue;
    if (!transform.Date) continue; // No date → skip this transform window
    if (!transform.Timing || !transform.Timing.startsWith('N')) continue;

    const nightTiming = transform.Timing;
    const transformDate = new Date(transform.Date);

    // Determine end of wolf form window
    let endDate = null;

    // Option 1: Untransform (or UntransformInfecté) the same night, with a date
    const untransform = actions.find(a =>
      (a.ActionType === 'Untransform' || a.ActionType === 'UntransformInfecté') &&
      a.Timing === nightTiming &&
      a.Date
    );
    if (untransform) {
      endDate = new Date(untransform.Date);
    } else if (playerStat.DeathTiming === nightTiming && playerStat.DeathDateIrl) {
      // Option 2: Player died during this same night
      endDate = new Date(playerStat.DeathDateIrl);
    } else {
      // Option 3: First NewPhase GameEvent after the Transform date
      const nextPhase = (game.GameEvents || [])
        .filter(e => e.Type === 'NewPhase' && e.Date && new Date(e.Date) > transformDate)
        .sort((a, b) => new Date(a.Date) - new Date(b.Date))[0];
      if (nextPhase) endDate = new Date(nextPhase.Date);
    }

    if (!endDate) continue; // Cannot determine window end — skip

    // Collect qualifying actions within [transformDate, endDate)
    for (const action of actions) {
      if (!action.Date) continue; // No date → ignore
      if (!filterFn(action)) continue;
      const actionDate = new Date(action.Date);
      if (actionDate >= transformDate && actionDate < endDate) {
        result.push(action);
      }
    }
  }

  return result;
}

/**
 * Count potions drunk while in wolf form (after Transform, before window end).
 * Each DrinkPotion action in a valid wolf-form window counts as +1.
 * Only games with at least one NewPhase event are considered (version >= 0.252).
 */
export function wolfDrinkPotions(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;

    // Skip games without NewPhase events (pre-0.252, dates unreliable)
    const hasNewPhase = (game.GameEvents || []).some(e => e.Type === 'NewPhase');
    if (!hasNewPhase) continue;

    const qualifying = getActionsWhileInWolfForm(
      playerStat, game,
      a => a.ActionType === 'DrinkPotion'
    );

    if (qualifying.length > 0) {
      value += qualifying.length;
      if (!countedGames.has(game.Id)) {
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }

  return { value, gameIds };
}

const PARCHEMIN_REGEX = /^Parchemin \(/;

/**
 * Count Parchemin or Livre de sorts uses ON a player while in wolf form.
 * - Parchemin: UseGadget where ActionName matches /^Parchemin \(/
 * - Livre de sorts: UseGadget where ActionName === 'Livre de sorts'
 * - Requires ActionTarget to be non-null (must have been cast on a player)
 * Only games with at least one NewPhase event are considered (version >= 0.252).
 */
export function wolfScrollUses(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  const countedGames = new Set();

  for (const { game, playerStat } of playerGames) {
    if (!isWolfCamp(playerStat)) continue;

    // Skip games without NewPhase events (pre-0.252, dates unreliable)
    const hasNewPhase = (game.GameEvents || []).some(e => e.Type === 'NewPhase');
    if (!hasNewPhase) continue;

    const qualifying = getActionsWhileInWolfForm(
      playerStat, game,
      a =>
        a.ActionType === 'UseGadget' &&
        a.ActionName &&
        (PARCHEMIN_REGEX.test(a.ActionName) || a.ActionName === 'Livre de sorts') &&
        a.ActionTarget // Must be cast on a player
    );

    if (qualifying.length > 0) {
      value += qualifying.length;
      if (!countedGames.has(game.Id)) {
        gameIds.push(game.Id);
        countedGames.add(game.Id);
      }
    }
  }

  return { value, gameIds };
}
