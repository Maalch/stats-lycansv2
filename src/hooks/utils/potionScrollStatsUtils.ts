import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { getPlayerMainCampFromRole } from '../../utils/datasyncExport';

export type CampFilter = 'all' | 'villageois' | 'loup' | 'autres';
export type EffectFilter = 'all' | 'positive' | 'neutral' | 'negative';

const PARCHEMIN_REGEX = /^Parchemin \((.+)\)$/;

const POSITIVE_EFFECTS = new Set([
  'Audition+', 'Invisible', 'Vision vraie', 'Rassasié', 'Célérité',
  'Midas', 'Assassin', 'Clairvoyance', 'Énergie',
]);

const NEUTRAL_EFFECTS = new Set([
  'Géant', 'Téléportation', 'Vampire', 'Minuscule', 'Hanté', 'Puant', 'Chaos',
]);

const NEGATIVE_EFFECTS = new Set([
  'Flatulences', 'Lumineux', 'Paranoia', 'Paranoïa', 'Sourd', 'Myope', 'Muet',
]);

function getEffectCategory(actionName: string | null): 'positive' | 'neutral' | 'negative' | null {
  if (!actionName) return null;
  // Extract effect name from parchemin format "Parchemin (XXX)"
  const match = actionName.match(PARCHEMIN_REGEX);
  let effectName = match ? match[1] : actionName;
  // Handle "Blanche - XXX" potions (white potion that reveals its effect)
  if (effectName.startsWith('Blanche - ')) {
    effectName = effectName.substring('Blanche - '.length);
  } else if (effectName === 'Blanche') {
    return 'neutral'; // Unknown white potion with no revealed effect
  }
  if (POSITIVE_EFFECTS.has(effectName)) return 'positive';
  if (NEUTRAL_EFFECTS.has(effectName)) return 'neutral';
  if (NEGATIVE_EFFECTS.has(effectName)) return 'negative';
  return null;
}

function matchesEffectFilter(actionName: string | null, effectFilter: EffectFilter): boolean {
  if (effectFilter === 'all') return true;
  return getEffectCategory(actionName) === effectFilter;
}

export interface PlayerPotionStats {
  player: string;
  gamesPlayed: number;
  totalPotions: number;
  potionsPerGame: number;
}

export interface PlayerScrollUsageStats {
  player: string;
  gamesPlayed: number;
  totalScrollsUsed: number;
  scrollsPerGame: number;
}

export interface PlayerScrollTargetStats {
  player: string;
  gamesPlayed: number;
  timesTargeted: number;
  targetedPerGame: number;
}

export interface PotionScrollStatsData {
  potionStats: PlayerPotionStats[];
  scrollUsageStats: PlayerScrollUsageStats[];
  scrollTargetStats: PlayerScrollTargetStats[];
  gamesWithActionData: number;
  totalGames: number;
}

function isParchemin(actionName: string | null): boolean {
  if (!actionName) return false;
  return PARCHEMIN_REGEX.test(actionName);
}

/**
 * Check if a game has action data available
 */
function gameHasActionData(game: GameLogEntry): boolean {
  return game.PlayerStats.some(
    player => player.Actions !== undefined && player.Actions !== null
  );
}

/**
 * Resolve an ActionTarget username to a canonical player name
 * by finding the matching player in the same game's PlayerStats
 */
function resolveTargetName(game: GameLogEntry, targetName: string): { canonicalName: string; playerId: string } {
  const targetPlayer = game.PlayerStats.find(
    p => p.Username === targetName
  );
  if (targetPlayer) {
    return {
      canonicalName: getCanonicalPlayerName(targetPlayer),
      playerId: getPlayerId(targetPlayer)
    };
  }
  // Fallback: use the raw target name as both
  return { canonicalName: targetName, playerId: targetName };
}

/**
 * Compute per-player potion and parchemin statistics from game log data
 */
export function computePotionScrollStats(
  gameData: GameLogEntry[],
  campFilter: CampFilter = 'all',
  effectFilter: EffectFilter = 'all'
): PotionScrollStatsData | null {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  const gamesWithData = gameData.filter(gameHasActionData);

  if (gamesWithData.length === 0) {
    return {
      potionStats: [],
      scrollUsageStats: [],
      scrollTargetStats: [],
      gamesWithActionData: 0,
      totalGames: gameData.length,
    };
  }

  // Maps keyed by player ID
  const potionMap = new Map<string, { displayName: string; gamesPlayed: number; totalPotions: number }>();
  const scrollUsageMap = new Map<string, { displayName: string; gamesPlayed: number; totalScrollsUsed: number }>();
  const scrollTargetMap = new Map<string, { displayName: string; gamesPlayed: number; timesTargeted: number }>();

  // Track games played per player (for camp-filtered game counts)
  const playerGamesMap = new Map<string, { displayName: string; gamesPlayed: number }>();

  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);

      // Apply camp filter
      if (campFilter !== 'all') {
        const playerCamp = getPlayerMainCampFromRole(player.MainRoleInitial, player.Power);
        const campFilterMap: Record<CampFilter, string> = {
          'all': '',
          'villageois': 'Villageois',
          'loup': 'Loup',
          'autres': 'Autres'
        };
        if (playerCamp !== campFilterMap[campFilter]) {
          return;
        }
      }

      // Track games played
      if (!playerGamesMap.has(playerId)) {
        playerGamesMap.set(playerId, { displayName, gamesPlayed: 0 });
      }
      playerGamesMap.get(playerId)!.gamesPlayed++;

      const actions = player.Actions || [];

      // Count potions (DrinkPotion, excluding Parchemins which are UseGadget)
      let potionCount = 0;
      let scrollCount = 0;

      actions.forEach(action => {
        if (action.ActionType === 'DrinkPotion' && action.ActionName && matchesEffectFilter(action.ActionName, effectFilter)) {
          potionCount++;
        }
        if (action.ActionType === 'UseGadget' && isParchemin(action.ActionName) && matchesEffectFilter(action.ActionName, effectFilter)) {
          scrollCount++;

          // Track who was targeted
          if (action.ActionTarget) {
            const { canonicalName: targetName, playerId: targetId } = resolveTargetName(game, action.ActionTarget);
            if (!scrollTargetMap.has(targetId)) {
              scrollTargetMap.set(targetId, { displayName: targetName, gamesPlayed: 0, timesTargeted: 0 });
            }
            scrollTargetMap.get(targetId)!.timesTargeted++;
          }
        }
      });

      // Update potion stats
      if (!potionMap.has(playerId)) {
        potionMap.set(playerId, { displayName, gamesPlayed: 0, totalPotions: 0 });
      }
      const pStats = potionMap.get(playerId)!;
      pStats.gamesPlayed++;
      pStats.totalPotions += potionCount;

      // Update scroll usage stats
      if (!scrollUsageMap.has(playerId)) {
        scrollUsageMap.set(playerId, { displayName, gamesPlayed: 0, totalScrollsUsed: 0 });
      }
      const sStats = scrollUsageMap.get(playerId)!;
      sStats.gamesPlayed++;
      sStats.totalScrollsUsed += scrollCount;
    });
  });

  // Fill in gamesPlayed for scroll targets from playerGamesMap
  scrollTargetMap.forEach((stats, targetId) => {
    const playerGames = playerGamesMap.get(targetId);
    if (playerGames) {
      stats.gamesPlayed = playerGames.gamesPlayed;
      stats.displayName = playerGames.displayName;
    } else {
      // Target player might not pass camp filter — use total games across all data as approximation
      // Count how many games this player appeared in (regardless of camp filter)
      let gameCount = 0;
      gamesWithData.forEach(game => {
        if (game.PlayerStats.some(p => getPlayerId(p) === targetId)) {
          gameCount++;
        }
      });
      stats.gamesPlayed = gameCount || 1;
    }
  });

  // Build result arrays
  const potionStats: PlayerPotionStats[] = Array.from(potionMap.values()).map(s => ({
    player: s.displayName,
    gamesPlayed: s.gamesPlayed,
    totalPotions: s.totalPotions,
    potionsPerGame: s.gamesPlayed > 0 ? s.totalPotions / s.gamesPlayed : 0,
  }));

  const scrollUsageStats: PlayerScrollUsageStats[] = Array.from(scrollUsageMap.values()).map(s => ({
    player: s.displayName,
    gamesPlayed: s.gamesPlayed,
    totalScrollsUsed: s.totalScrollsUsed,
    scrollsPerGame: s.gamesPlayed > 0 ? s.totalScrollsUsed / s.gamesPlayed : 0,
  }));

  const scrollTargetStats: PlayerScrollTargetStats[] = Array.from(scrollTargetMap.values()).map(s => ({
    player: s.displayName,
    gamesPlayed: s.gamesPlayed,
    timesTargeted: s.timesTargeted,
    targetedPerGame: s.gamesPlayed > 0 ? s.timesTargeted / s.gamesPlayed : 0,
  }));

  return {
    potionStats,
    scrollUsageStats,
    scrollTargetStats,
    gamesWithActionData: gamesWithData.length,
    totalGames: gameData.length,
  };
}
