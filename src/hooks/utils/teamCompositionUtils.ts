import type { GameLogEntry } from '../useCombinedRawData';
import {
  getPlayerCampFromRole,
  getPlayerFinalRole,
} from '../../utils/datasyncExport';
import { getWinnerCampFromGame } from '../../utils/gameUtils';
import type {
  TeamCompositionResponse,
  CompositionByPlayerCount,
  TeamConfiguration,
} from '../../types/teamComposition';

interface ConfigMap {
  [configKey: string]: TeamConfiguration;
}

/**
 * Analyzes team composition for a single game
 * Returns wolf count (with breakdown), solo count, and villageois count
 */
function analyzeGameComposition(game: GameLogEntry) {
  const playerCount = game.PlayerStats.length;

  let pureWolfCount = 0;
  let traitreCount = 0;
  let louveteuCount = 0;

  const wolves = game.PlayerStats.filter((player) => {
    const finalRole = getPlayerFinalRole(
      player.MainRoleInitial,
      player.MainRoleChanges || []
    );
    const camp = getPlayerCampFromRole(finalRole, {
      regroupWolfSubRoles: false,
    });
    
    const isWolf = camp === 'Loup' || camp === 'Traître' || camp === 'Louveteau';
    
    if (isWolf) {
      // Count specific wolf types
      if (camp === 'Loup') {
        pureWolfCount++;
      } else if (camp === 'Traître') {
        traitreCount++;
      } else if (camp === 'Louveteau') {
        louveteuCount++;
      }
    }
    
    return isWolf;
  });

  const soloPlayers = game.PlayerStats.filter((player) => {
    const finalRole = getPlayerFinalRole(
      player.MainRoleInitial,
      player.MainRoleChanges || []
    );
    const camp = getPlayerCampFromRole(finalRole);
    // Solo roles are those that are NOT Villageois and NOT Loup
    return camp !== 'Villageois' && camp !== 'Loup';
  });

  return {
    playerCount,
    wolfCount: wolves.length,
    pureWolfCount,
    traitreCount,
    louveteuCount,
    soloCount: soloPlayers.length,
    villageoisCount: playerCount - wolves.length - soloPlayers.length,
  };
}

/**
 * Computes team composition statistics from game data
 * Groups games by player count, then by team configuration
 * Tracks appearances and win rates for each configuration
 */
export function computeTeamCompositionStats(
  gameData: GameLogEntry[]
): TeamCompositionResponse | null {
  if (gameData.length === 0) return null;

  // Group games by player count
  const configurationsByPlayerCount: Record<number, ConfigMap> = {};

  gameData.forEach((game) => {
    const composition = analyzeGameComposition(game);
    const { playerCount, wolfCount, pureWolfCount, traitreCount, louveteuCount, soloCount, villageoisCount } = composition;

    // Initialize player count group if needed
    if (!configurationsByPlayerCount[playerCount]) {
      configurationsByPlayerCount[playerCount] = {};
    }

    // Create a unique key that includes wolf breakdown
    const wolfBreakdownKey = `${pureWolfCount}L-${traitreCount}T-${louveteuCount}Lou`;
    const configKey = `${wolfCount}w-${soloCount}s-${wolfBreakdownKey}`;

    // Initialize configuration if needed
    if (!configurationsByPlayerCount[playerCount][configKey]) {
      configurationsByPlayerCount[playerCount][configKey] = {
        wolfCount,
        pureWolfCount,
        traitreCount,
        louveteuCount,
        soloCount,
        villageoisCount,
        appearances: 0,
        winsByWolves: 0,
        winsByVillageois: 0,
        winsBySolo: 0,
        wolfWinRate: 0,
        villageoisWinRate: 0,
        soloWinRate: 0,
        configKey,
        wolfBreakdownKey,
      };
    }

    // Increment appearance count
    configurationsByPlayerCount[playerCount][configKey].appearances++;

    // Determine winner camp and increment win count
    const winnerCamp = getWinnerCampFromGame(game);

    if (winnerCamp === 'Loup') {
      configurationsByPlayerCount[playerCount][configKey].winsByWolves++;
    } else if (winnerCamp === 'Villageois') {
      configurationsByPlayerCount[playerCount][configKey].winsByVillageois++;
    } else {
      // All other camps (Amoureux, Agent, etc.) are solo wins
      configurationsByPlayerCount[playerCount][configKey].winsBySolo++;
    }
  });

  // Convert to array format and calculate win rates
  const compositionsByPlayerCount: CompositionByPlayerCount[] = [];
  let configurationsWithMinAppearances = 0;

  Object.keys(configurationsByPlayerCount)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((playerCount) => {
      const configMap = configurationsByPlayerCount[playerCount];
      const configurations: TeamConfiguration[] = [];

      Object.values(configMap).forEach((config) => {
        // Calculate win rates
        const wolfWinRate =
          config.appearances > 0
            ? (config.winsByWolves / config.appearances) * 100
            : 0;
        const villageoisWinRate =
          config.appearances > 0
            ? (config.winsByVillageois / config.appearances) * 100
            : 0;
        const soloWinRate =
          config.appearances > 0
            ? (config.winsBySolo / config.appearances) * 100
            : 0;

        configurations.push({
          ...config,
          wolfWinRate,
          villageoisWinRate,
          soloWinRate,
        });

        // Count configurations with minimum appearances
        if (config.appearances >= 5) {
          configurationsWithMinAppearances++;
        }
      });

      // Sort configurations by appearance count (descending)
      configurations.sort((a, b) => b.appearances - a.appearances);

      // Find most common and best win rates (only configs with >= 5 appearances)
      const eligibleConfigs = configurations.filter((c) => c.appearances >= 5);

      const mostCommon =
        eligibleConfigs.length > 0 ? eligibleConfigs[0] : undefined;

      const bestWolfWinRate =
        eligibleConfigs.length > 0
          ? eligibleConfigs.reduce((best, config) =>
              config.wolfWinRate > best.wolfWinRate ? config : best
            )
          : undefined;

      const bestVillageoisWinRate =
        eligibleConfigs.length > 0
          ? eligibleConfigs.reduce((best, config) =>
              config.villageoisWinRate > best.villageoisWinRate ? config : best
            )
          : undefined;

      const totalGames = configurations.reduce(
        (sum, config) => sum + config.appearances,
        0
      );

      compositionsByPlayerCount.push({
        playerCount,
        totalGames,
        configurations,
        mostCommon,
        bestWolfWinRate,
        bestVillageoisWinRate,
      });
    });

  return {
    compositionsByPlayerCount,
    totalGamesAnalyzed: gameData.length,
    configurationsWithMinAppearances,
  };
}
