import type { GameLogEntry, PlayerStat } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { DEATH_TYPES, type DeathType } from '../../types/deathTypes';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';

// Villageois Élite powers (handles both new format and legacy format)
const ELITE_POWERS_LIST = ['Chasseur', 'Alchimiste', 'Protecteur', 'Disciple', 'Inquisiteur'];
const LEGACY_ELITE_ROLES_LIST = ['Chasseur', 'Alchimiste'];

/**
 * Get the effective Villageois Élite power of a player (handles both formats).
 * Returns null for non-elite players.
 */
function getEffectivePowerForPlayer(player: PlayerStat): string | null {
  if (player.MainRoleInitial === 'Villageois Élite') return player.Power || null;
  if (LEGACY_ELITE_ROLES_LIST.includes(player.MainRoleInitial)) return player.MainRoleInitial;
  return null;
}

/**
 * Check if a player matches a camp/role filter.
 * Handles both regular camp names and specific Villageois Élite power names.
 */
function matchesKillerRoleFilter(player: PlayerStat, campFilter: string): boolean {
  if (campFilter === 'Tous les camps') return true;
  // Check if this is a specific Villageois Élite power filter
  if (ELITE_POWERS_LIST.includes(campFilter)) {
    return getEffectivePowerForPlayer(player) === campFilter;
  }
  // Standard camp filter using final role
  const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
  const camp = getPlayerCampFromRole(finalRole, { regroupVillagers: true, regroupWolfSubRoles: true }, player.Power);
  return camp === campFilter;
}

/**
 * Data structure for max kills per game statistics
 */
export interface MaxKillsPerGame {
  playerName: string;
  maxKills: number;
  timesAchieved: number;
  gameIds: string[];
}

/**
 * Data structure for max kills per phase statistics
 * A phase is any game sequence: Day (J1), Night (N1), Meeting (M1), etc.
 */
export interface MaxKillsPerPhase {
  playerName: string;
  maxKills: number;
  timesAchieved: number;
  gameIds: string[];
}

/**
 * Comprehensive killer statistics
 */
export interface KillerStatistics {
  maxKillsPerGame: MaxKillsPerGame[];
  maxKillsPerPhase: MaxKillsPerPhase[];
}

/**
 * Helper function to process death types for display
 * Merges hunter kill types when victim camp filter is "Tous les camps"
 */
export function processDeathTypesForDisplay(
  deathTypes: DeathType[],
  victimCampFilter: string
): DeathType[] {
  if (victimCampFilter === 'Tous les camps') {
    // Remove BULLET_HUMAN and BULLET_WOLF, add BULLET if not present
    const filtered = deathTypes.filter(
      dt => dt !== DEATH_TYPES.BULLET_HUMAN && dt !== DEATH_TYPES.BULLET_WOLF
    );
    
    // Add BULLET if we have either BULLET_HUMAN or BULLET_WOLF in original data
    if (
      (deathTypes.includes(DEATH_TYPES.BULLET_HUMAN) || 
       deathTypes.includes(DEATH_TYPES.BULLET_WOLF)) &&
      !filtered.includes(DEATH_TYPES.BULLET)
    ) {
      filtered.push(DEATH_TYPES.BULLET);
    }
    
    return filtered;
  }
  return deathTypes;
}

/**
 * Helper function to merge hunter kills in killer data
 * Combines BULLET_HUMAN and BULLET_WOLF into BULLET when victim camp filter is "Tous les camps"
 */
export function mergeHunterKills(killerData: any, victimCampFilter: string) {
  if (victimCampFilter === 'Tous les camps') {
    const bulletHumanKills = killerData.killsByDeathType[DEATH_TYPES.BULLET_HUMAN] || 0;
    const bulletWolfKills = killerData.killsByDeathType[DEATH_TYPES.BULLET_WOLF] || 0;
    const bulletKills = killerData.killsByDeathType[DEATH_TYPES.BULLET] || 0;
    
    // Merge all hunter kills into BULLET
    const mergedKillsByDeathType = { ...killerData.killsByDeathType };
    mergedKillsByDeathType[DEATH_TYPES.BULLET] = bulletHumanKills + bulletWolfKills + bulletKills;
    delete mergedKillsByDeathType[DEATH_TYPES.BULLET_HUMAN];
    delete mergedKillsByDeathType[DEATH_TYPES.BULLET_WOLF];
    
    return {
      ...killerData,
      killsByDeathType: mergedKillsByDeathType
    };
  }
  return killerData;
}

/**
 * Calculate maximum kills per game for all players
 * @param gameData - Array of game log entries
 * @param killerCampFilter - Filter for killer's camp (e.g., 'Tous les camps', 'Villageois', 'Loups')
 * @param victimCampFilter - Filter for victim's camp (e.g., 'Tous les camps', 'Villageois', 'Loups', 'Roles solo')
 */
export function computeMaxKillsPerGame(
  gameData: GameLogEntry[],
  killerCampFilter: string = 'Tous les camps',
  victimCampFilter: string = 'Tous les camps'
): MaxKillsPerGame[] {
  // Map to store max kills and associated game IDs for each player
  const playerMaxKills = new Map<string, {
    playerName: string;
    maxKills: number;
    timesAchieved: number;
    gameIds: string[];
  }>();

  gameData.forEach((game: GameLogEntry) => {
    game.PlayerStats.forEach((player: PlayerStat) => {
      const playerId = getPlayerId(player);
      const playerName = getCanonicalPlayerName(player);

      // Check if killer matches the camp/role filter (supports Villageois Élite powers)
      if (!matchesKillerRoleFilter(player, killerCampFilter)) {
        return; // Skip this player if they don't match the killer camp/role filter
      }

      // Count how many kills this player made in this game (respecting victim camp filter)
      let killsInGame = 0;
      game.PlayerStats.forEach((victim: PlayerStat) => {
        if (victim.KillerName === player.Username && victim.DeathTiming) {
          // Check if victim matches the camp filter
          const victimFinalRole = getPlayerFinalRole(victim.MainRoleInitial, victim.MainRoleChanges || []);
          const victimCamp = getPlayerCampFromRole(victimFinalRole, { regroupVillagers: true, regroupWolfSubRoles: true }, victim.Power);
          
          // Apply victim camp filter
          if (victimCampFilter === 'Tous les camps') {
            killsInGame++;
          } else if (victimCampFilter === 'Roles solo') {
            // Solo roles: Amoureux, Vaudou, Idiot du Village, Agent, etc.
            if (victimCamp !== 'Villageois' && victimCamp !== 'Loups') {
              killsInGame++;
            }
          } else if (victimCamp === victimCampFilter) {
            killsInGame++;
          }
        }
      });

      if (killsInGame > 0) {
        const existing = playerMaxKills.get(playerId);
        if (!existing) {
          playerMaxKills.set(playerId, {
            playerName,
            maxKills: killsInGame,
            timesAchieved: 1,
            gameIds: [game.DisplayedId]
          });
        } else if (killsInGame > existing.maxKills) {
          existing.maxKills = killsInGame;
          existing.timesAchieved = 1;
          existing.gameIds = [game.DisplayedId];
        } else if (killsInGame === existing.maxKills) {
          existing.timesAchieved++;
          if (!existing.gameIds.includes(game.DisplayedId)) {
            existing.gameIds.push(game.DisplayedId);
          }
        }
      }
    });
  });

  // Convert to array and sort by max kills (desc), then by times achieved (desc)
  return Array.from(playerMaxKills.values())
    .sort((a, b) => {
      if (b.maxKills !== a.maxKills) return b.maxKills - a.maxKills;
      return b.timesAchieved - a.timesAchieved;
    });
}

/**
 * Calculate maximum kills per phase for all players
 * A phase is any game sequence: Day (J1), Night (N1), Meeting (M1), etc.
 * @param gameData - Array of game log entries
 * @param killerCampFilter - Filter for killer's camp (e.g., 'Tous les camps', 'Villageois', 'Loups')
 * @param victimCampFilter - Filter for victim's camp (e.g., 'Tous les camps', 'Villageois', 'Loups', 'Roles solo')
 */
export function computeMaxKillsPerPhase(
  gameData: GameLogEntry[],
  killerCampFilter: string = 'Tous les camps',
  victimCampFilter: string = 'Tous les camps'
): MaxKillsPerPhase[] {
  // Map to store max kills per phase and associated game IDs for each player
  const playerMaxKills = new Map<string, {
    playerName: string;
    maxKills: number;
    timesAchieved: number;
    gameIds: string[];
  }>();

  gameData.forEach((game: GameLogEntry) => {
    // Group kills by player and phase (with camp filtering)
    const killsByPlayerAndPhase = new Map<string, Map<string, number>>();

    game.PlayerStats.forEach((victim: PlayerStat) => {
      // Match any phase: N1, J1, M1, etc. (letter followed by digits)
      if (victim.KillerName && victim.DeathTiming && victim.DeathTiming.match(/^[A-Z]\d+$/)) {
        const killerName = victim.KillerName;
        const phase = victim.DeathTiming;

        // Find the killer player to check their camp
        const killerPlayer = game.PlayerStats.find((p: PlayerStat) => p.Username === killerName);
        if (!killerPlayer) return;

        // Check if killer matches the camp/role filter (supports Villageois Élite powers)
        if (!matchesKillerRoleFilter(killerPlayer, killerCampFilter)) {
          return; // Skip this kill if killer doesn't match the camp/role filter
        }

        // Check if victim matches the camp filter
        const victimFinalRole = getPlayerFinalRole(victim.MainRoleInitial, victim.MainRoleChanges || []);
        const victimCamp = getPlayerCampFromRole(victimFinalRole, { regroupVillagers: true, regroupWolfSubRoles: true }, victim.Power);
        
        // Apply victim camp filter
        let includeKill = false;
        if (victimCampFilter === 'Tous les camps') {
          includeKill = true;
        } else if (victimCampFilter === 'Roles solo') {
          // Solo roles: Amoureux, Vaudou, Idiot du Village, Agent, etc.
          includeKill = victimCamp !== 'Villageois' && victimCamp !== 'Loups';
        } else {
          includeKill = victimCamp === victimCampFilter;
        }

        if (!includeKill) return;

        if (!killsByPlayerAndPhase.has(killerName)) {
          killsByPlayerAndPhase.set(killerName, new Map<string, number>());
        }
        const playerPhases = killsByPlayerAndPhase.get(killerName)!;
        playerPhases.set(phase, (playerPhases.get(phase) || 0) + 1);
      }
    });

    // Find max kills for each player in this game
    killsByPlayerAndPhase.forEach((phases, killerName) => {
      const maxKillsThisGame = Math.max(...Array.from(phases.values()));

      // Find the corresponding player to get canonical name
      const killerPlayer = game.PlayerStats.find((p: PlayerStat) => p.Username === killerName);
      if (!killerPlayer) return;

      const playerId = getPlayerId(killerPlayer);
      const playerName = getCanonicalPlayerName(killerPlayer);

      const existing = playerMaxKills.get(playerId);
      if (!existing) {
        playerMaxKills.set(playerId, {
          playerName,
          maxKills: maxKillsThisGame,
          timesAchieved: 1,
          gameIds: [game.DisplayedId]
        });
      } else if (maxKillsThisGame > existing.maxKills) {
        existing.maxKills = maxKillsThisGame;
        existing.timesAchieved = 1;
        existing.gameIds = [game.DisplayedId];
      } else if (maxKillsThisGame === existing.maxKills) {
        existing.timesAchieved++;
        if (!existing.gameIds.includes(game.DisplayedId)) {
          existing.gameIds.push(game.DisplayedId);
        }
      }
    });
  });

  // Convert to array and sort by max kills (desc), then by times achieved (desc)
  return Array.from(playerMaxKills.values())
    .sort((a, b) => {
      if (b.maxKills !== a.maxKills) return b.maxKills - a.maxKills;
      return b.timesAchieved - a.timesAchieved;
    });
}

/**
 * Calculate comprehensive killer statistics from game data
 * @param gameData - Array of game log entries
 * @param killerCampFilter - Filter for killer's camp (e.g., 'Tous les camps', 'Villageois', 'Loups')
 * @param victimCampFilter - Filter for victim's camp (e.g., 'Tous les camps', 'Villageois', 'Loups', 'Roles solo')
 */
export function computeKillerStatistics(
  gameData: GameLogEntry[],
  killerCampFilter: string = 'Tous les camps',
  victimCampFilter: string = 'Tous les camps'
): KillerStatistics | null {
  if (gameData.length === 0) {
    return null;
  }

  return {
    maxKillsPerGame: computeMaxKillsPerGame(gameData, killerCampFilter, victimCampFilter),
    maxKillsPerPhase: computeMaxKillsPerPhase(gameData, killerCampFilter, victimCampFilter)
  };
}
