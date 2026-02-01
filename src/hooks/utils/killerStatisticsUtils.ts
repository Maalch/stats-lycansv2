import type { GameLogEntry, PlayerStat } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { DEATH_TYPES, type DeathType } from '../../types/deathTypes';

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
 * Data structure for max kills per night statistics
 */
export interface MaxKillsPerNight {
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
  maxKillsPerNight: MaxKillsPerNight[];
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
 */
export function computeMaxKillsPerGame(gameData: GameLogEntry[]): MaxKillsPerGame[] {
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

      // Count how many kills this player made in this game
      let killsInGame = 0;
      game.PlayerStats.forEach((victim: PlayerStat) => {
        if (victim.KillerName === player.Username && victim.DeathTiming) {
          killsInGame++;
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
 * Calculate maximum kills per night for all players
 */
export function computeMaxKillsPerNight(gameData: GameLogEntry[]): MaxKillsPerNight[] {
  // Map to store max kills per night and associated game IDs for each player
  const playerMaxKills = new Map<string, {
    playerName: string;
    maxKills: number;
    timesAchieved: number;
    gameIds: string[];
  }>();

  gameData.forEach((game: GameLogEntry) => {
    // Group kills by player and night
    const killsByPlayerAndNight = new Map<string, Map<string, number>>();

    game.PlayerStats.forEach((victim: PlayerStat) => {
      if (victim.KillerName && victim.DeathTiming && victim.DeathTiming.match(/^N\d+$/)) {
        const killerName = victim.KillerName;
        const night = victim.DeathTiming;

        if (!killsByPlayerAndNight.has(killerName)) {
          killsByPlayerAndNight.set(killerName, new Map<string, number>());
        }
        const playerNights = killsByPlayerAndNight.get(killerName)!;
        playerNights.set(night, (playerNights.get(night) || 0) + 1);
      }
    });

    // Find max kills for each player in this game
    killsByPlayerAndNight.forEach((nights, killerName) => {
      const maxKillsThisGame = Math.max(...Array.from(nights.values()));

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
 */
export function computeKillerStatistics(gameData: GameLogEntry[]): KillerStatistics | null {
  if (gameData.length === 0) {
    return null;
  }

  return {
    maxKillsPerGame: computeMaxKillsPerGame(gameData),
    maxKillsPerNight: computeMaxKillsPerNight(gameData)
  };
}
