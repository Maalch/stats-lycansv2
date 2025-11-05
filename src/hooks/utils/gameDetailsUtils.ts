import type { GameLogEntry } from '../useCombinedRawData';
import type { NavigationFilters, PlayerPairFilter, MultiPlayerFilter, CampFilter } from '../../context/NavigationContext';
import { getWinnerCampFromGame } from '../../utils/gameUtils';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
// Note: Player names are already normalized during data loading, so we can use Username directly


// Role entry interface for the new unified structure
export interface RoleEntry {
  roleName: string;
  players: string[];
}

// Standalone interface for game roles information
export interface GameRoles {
  roles: RoleEntry[];
}

/**
 * Create YouTube embed URL from timestamps
 */
function createYouTubeEmbedUrl(start: string | null, end: string | null): string | null {
  if (!start) return null;
  
  try {
    // Extract video ID and start timestamp from the start URL
    const startUrl = new URL(start);
    let videoId = '';
    let startTime = 0;
    
    // Handle different YouTube URL formats
    if (startUrl.hostname === 'youtu.be') {
      // Format: https://youtu.be/VIDEO_ID?t=TIMESTAMP
      videoId = startUrl.pathname.slice(1); // Remove leading '/'
      const tParam = startUrl.searchParams.get('t');
      if (tParam) {
        startTime = parseInt(tParam, 10) || 0;
      }
    } else if (startUrl.hostname === 'www.youtube.com' || startUrl.hostname === 'youtube.com') {
      // Format: https://www.youtube.com/watch?v=VIDEO_ID&t=TIMESTAMP
      videoId = startUrl.searchParams.get('v') || '';
      const tParam = startUrl.searchParams.get('t');
      if (tParam) {
        startTime = parseInt(tParam, 10) || 0;
      }
    }
    
    if (!videoId) return null;
    
    // Create embed URL with start time
    const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startTime}`;
    
    // If we have an end URL, try to extract the end time
    if (end) {
      try {
        const endUrl = new URL(end);
        let endTime = 0;
        
        if (endUrl.hostname === 'youtu.be') {
          const tParam = endUrl.searchParams.get('t');
          if (tParam) {
            endTime = parseInt(tParam, 10) || 0;
          }
        } else if (endUrl.hostname === 'www.youtube.com' || endUrl.hostname === 'youtube.com') {
          const tParam = endUrl.searchParams.get('t');
          if (tParam) {
            endTime = parseInt(tParam, 10) || 0;
          }
        }
        
        if (endTime > startTime) {
          return `${embedUrl}&end=${endTime}`;
        }
      } catch (endError) {
        // If end URL parsing fails, just use the start URL
        console.warn('Failed to parse end URL:', end, endError);
      }
    }
    
    return embedUrl;
  } catch (error) {
    console.warn('Failed to create YouTube embed URL:', start, error);
    return null;
  }
}

/**
 * Convert PlayerVODs object to embed URLs
 * Maps Steam IDs to YouTube embed URLs
 */
function convertPlayerVODsToEmbedUrls(playerVODs?: { [playerId: string]: string }): { [playerId: string]: string } | null {
  if (!playerVODs || Object.keys(playerVODs).length === 0) return null;
  
  const embedUrls: { [playerId: string]: string } = {};
  
  Object.entries(playerVODs).forEach(([playerId, vodUrl]) => {
    if (vodUrl && typeof vodUrl === 'string' && vodUrl.trim()) {
      // Convert the VOD URL to embed format (no end time for player VODs)
      const embedUrl = createYouTubeEmbedUrl(vodUrl, null);
      if (embedUrl) {
        embedUrls[playerId] = embedUrl;
      }
    }
  });
  
  return Object.keys(embedUrls).length > 0 ? embedUrls : null;
}

/**
 * Calculate game duration from ISO date strings
 */
function calculateGameDuration(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  
  try {
    // Parse ISO date strings
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Validate that the dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Invalid date format:', start, end);
      return null;
    }
    
    // Calculate duration in milliseconds, then convert to seconds
    const durationMs = endDate.getTime() - startDate.getTime();
    
    if (durationMs > 0) {
      return Math.round(durationMs / 1000); // Duration in seconds
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to calculate game duration:', start, end, error);
    return null;
  }
}

/**
 * Helper function to get player's camp from GameLogEntry PlayerStats
 * 
 * @param playerName - The name of the player to check
 * @param game - The GameLogEntry to check within  
 * @param excludeWolfSubRoles - If true, return the name of the subrole instead of 'Loup' for wolf sub-roles (Traître, Louveteau)
 * @param excludeVillagers - If true, return the specific villager role instead of 'Villageois' for villager sub-roles (Chasseur, Alchimiste, etc.)
 * @returns The player's camp/role from final role, or 'Villageois' if not found
 * 
 */
export function getPlayerCampFromGameLog(
  playerName: string, 
  game: GameLogEntry,
  excludeWolfSubRoles: boolean = false,
  excludeVillagers: boolean = false
): string {
  // Player names are already normalized, so we can compare directly
  const normalizedTarget = playerName.toLowerCase();
  const playerStat = game.PlayerStats.find(
    player => player.Username.toLowerCase() === normalizedTarget
  );
  
  if (!playerStat) return 'Villageois';
  
  // Use the improved getPlayerCampFromRole with regroupTraitor option based on excludeTraitor
  const playerRole = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []), {
    regroupLovers: true,
    regroupVillagers: !excludeVillagers, // If excludeVillagers is true, don't regroup villagers (keep as 'Villageois' or specific villager role)
    regroupWolfSubRoles: !excludeWolfSubRoles // If excludeWolfSubRoles is true, don't regroup wolf sub-roles (keep as 'Traître' or 'Louveteau')
  });
  
  return playerRole;
}

/**
 * Helper function to check if a player is in a specific camp for "Autres" filtering
 * 
 * @param playerName - The name of the player to check
 * @param campName - The camp name to check against  
 * @param game - The GameLogEntry to check within
 * @returns true if the player is in the specified camp in this game
 * 
 */
export function isPlayerInSmallCampFromGameLog(
  playerName: string,
  campName: string,
  game: GameLogEntry
): boolean {
  const selectedPlayer = playerName.toLowerCase();
  
  // Find the player in this game's PlayerStats
  const playerStat = game.PlayerStats.find(
    player => player.Username.toLowerCase() === selectedPlayer
  );
  
  if (!playerStat) return false;
  
  // Check if the player's final role matches the requested camp
  const playerCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));

  return playerCamp === campName;
}

/**
 * Filter games by selected player
 * 
 * @param games - Array of GameLogEntry to filter
 * @param selectedPlayer - The player name to filter by
 * @param winMode - Optional filter mode: 'wins-only' or 'all-assignments'
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByPlayerFromGameLog(
  games: GameLogEntry[], 
  selectedPlayer: string, 
  winMode?: 'wins-only' | 'all-assignments'
): GameLogEntry[] {
  // First filter games where the player participated
  const playerFilteredGames = games.filter(game => 
    game.PlayerStats.some(player => 
      player.Username.toLowerCase() === selectedPlayer.toLowerCase()
    )
  );

  // If no win mode specified, return all games with the player
  if (!winMode || winMode === 'all-assignments') {
    return playerFilteredGames;
  }

  // For 'wins-only' mode, filter to only games where the player won
  if (winMode === 'wins-only') {
    return playerFilteredGames.filter(game => 
      game.PlayerStats.some(player => 
        player.Username.toLowerCase() === selectedPlayer.toLowerCase() && 
        player.Victorious
      )
    );
  }

  return playerFilteredGames;
}

/**
 * Filter games by selected game ID
 * 
 * @param games - Array of GameLogEntry to filter
 * @param selectedGame - The DisplayedId to filter by 
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByGameFromGameLog(games: GameLogEntry[], selectedGame: string): GameLogEntry[] {
  return games.filter(game => game.DisplayedId === selectedGame);
}

/**
 * Filter games by multiple game IDs (for series navigation)
 * 
 * @param games - Array of GameLogEntry to filter
 * @param selectedGameIds - Array of DisplayedIds to filter by 
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByGameIdsFromGameLog(games: GameLogEntry[], selectedGameIds: string[]): GameLogEntry[] {
  return games.filter(game => selectedGameIds.includes(game.DisplayedId));
}

/**
 * Filter games by date (supports both full date and month/year)
 * 
 * @param games - Array of GameLogEntry to filter
 * @param selectedDate - Date string to filter by (DD/MM/YYYY or MM/YYYY format)
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByDateFromGameLog(games: GameLogEntry[], selectedDate: string): GameLogEntry[] {
  return games.filter(game => {
    // Convert StartDate (ISO format) to DD/MM/YYYY format for comparison
    const gameDate = new Date(game.StartDate);
    const formattedGameDate = gameDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    if (selectedDate.includes('/') && selectedDate.split('/').length === 2) {
      // Month/year format (MM/YYYY)
      const [month, year] = selectedDate.split('/');
      const gameDateParts = formattedGameDate.split('/');
      if (gameDateParts.length === 3) {
        const [, gameMonth, gameYear] = gameDateParts;
        return gameMonth === month && gameYear === year;
      }
    } else {
      // Full date format (DD/MM/YYYY)
      return formattedGameDate === selectedDate;
    }
    
    return false;
  });
}

/**
 * Filter games by victory type
 */
export function filterByVictoryType(games: GameLogEntry[], victoryType: string): GameLogEntry[] {
  return games.filter(game => game.LegacyData?.VictoryType === victoryType);
}

/**
 * Filter games by map name (with support for "Autres" grouping)
 * 
 * @param games - Array of GameLogEntry to filter
 * @param selectedMapName - Map name to filter by (Village, Château, or Autres)
 * @returns Filtered array of GameLogEntry
 */
export function filterByMapNameFromGameLog(games: GameLogEntry[], selectedMapName: string): GameLogEntry[] {
  return games.filter(game => {
    if (selectedMapName === 'Village' || selectedMapName === 'Château') {
      // Direct match for main maps
      return game.MapName === selectedMapName;
    } else if (selectedMapName === 'Autres') {
      // Filter for all maps that are not Village or Château
      return game.MapName !== 'Village' && game.MapName !== 'Château';
    } else {
      // Direct match for any other specific map name
      return game.MapName === selectedMapName;
    }
  });
}

/**
 * Filter games by harvest range
 * 
 * @param games - Array of GameLogEntry to filter
 * @param harvestRange - Harvest percentage range to filter by
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByHarvestRangeFromGameLog(games: GameLogEntry[], harvestRange: string): GameLogEntry[] {
  return games.filter(game => {
    const harvestGoal = game.HarvestGoal;
    const harvestDone = game.HarvestDone;
    
    if (harvestGoal === null || harvestGoal === undefined || 
        harvestDone === null || harvestDone === undefined || harvestGoal === 0) {
      return false;
    }
    
    const percentageValue = (harvestDone / harvestGoal) * 100;
    
    switch (harvestRange) {
      case "0-25%":
        return percentageValue >= 0 && percentageValue <= 25;
      case "26-50%":
        return percentageValue > 25 && percentageValue <= 50;
      case "51-75%":
        return percentageValue > 50 && percentageValue <= 75;
      case "76-99%":
        return percentageValue > 75 && percentageValue <= 99;
      case "100%":
        return percentageValue >= 100;
      default:
        return true;
    }
  });
}

/**
 * Filter games by game duration (number of days)
 * 
 * @param games - Array of GameLogEntry to filter
 * @param gameDuration - Number of days/nights to filter by
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByGameDurationFromGameLog(games: GameLogEntry[], gameDuration: number): GameLogEntry[] {
  return games.filter(game => {
    if (!game.EndTiming) return false;
    
    // Parse EndTiming to extract the day/night number
    // Format examples: "Nuit 5 --> N5", "Jour 6 --> J6"
    const timingMatch = game.EndTiming.match(/(?:Nuit|Jour)\s+(\d+)/);
    if (!timingMatch) return false;
    
    const gameDays = parseInt(timingMatch[1], 10);
    return gameDays === gameDuration;
  });
}

/**
 * Camp filtering logic
 * 
 * @param games - Array of GameLogEntry to filter
 * @param campFilter - Camp filter configuration
 * @param selectedPlayer - Optional specific player to filter by
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByCampFromGameLog(
  games: GameLogEntry[],
  campFilter: CampFilter,
  selectedPlayer?: string
): GameLogEntry[] {
  const { selectedCamp, campFilterMode, _smallCamps: smallCamps, excludeWolfSubRoles } = campFilter;
  
  return games.filter(game => {
    if (selectedPlayer) {
      // Handle "Autres" category for specific player
      if (selectedCamp === 'Autres' && smallCamps) {
        const isInSmallCamp = smallCamps.some(camp => 
          isPlayerInSmallCampFromGameLog(selectedPlayer, camp, game)
        );
        
        if (!isInSmallCamp) return false;
        
        // If wins-only mode, also check if player was victorious
        if (campFilterMode === 'wins-only') {
          const playerStat = game.PlayerStats.find(p => 
            p.Username.toLowerCase() === selectedPlayer.toLowerCase()
          );
          return playerStat?.Victorious === true;
        }
        
        return true;
      }

      // Check specific camp for specific player
      const playerCamp = getPlayerCampFromGameLog(selectedPlayer, game, excludeWolfSubRoles);
      
      // First check if player is in the selected camp
      let isInSelectedCamp = false;

      // Special handling for "Loup" with excludeWolfSubRoles flag
      if (selectedCamp === 'Loup' && excludeWolfSubRoles) {
        // Only include games where player was a regular wolf 
        isInSelectedCamp = playerCamp === 'Loup' && 
               !game.PlayerStats.some(p => 
                 p.Username.toLowerCase() === selectedPlayer.toLowerCase() && 
                 (getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || []) === 'Traître' || getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || []) === 'Louveteau')
               );
      } else {
        isInSelectedCamp = playerCamp === selectedCamp;
      }
      
      if (!isInSelectedCamp) return false;
      
      // If wins-only mode, also check if player was victorious
      if (campFilterMode === 'wins-only') {
        const playerStat = game.PlayerStats.find(p => 
          p.Username.toLowerCase() === selectedPlayer.toLowerCase()
        );
        return playerStat?.Victorious === true;
      }
      
      return true;
    } else {
      // Filter by camp without specific player
      if (campFilterMode === 'wins-only') {
        // Find winning camp by checking which camp has victorious players
        const winningCamp = getWinnerCampFromGame(game);
        
        if (selectedCamp === 'Autres' && smallCamps) {
          return smallCamps.includes(winningCamp);
        }
        return winningCamp === selectedCamp;
      } else {
        // Check if any player was assigned to this camp (all-assignments mode)
        if (selectedCamp === 'Autres' && smallCamps) {
          return smallCamps.some(camp => {
            return game.PlayerStats.some(player => {
              const playerRole = getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []));
              return playerRole === camp;
            });
          });
        }

        // Check specific camp assignment
        return game.PlayerStats.some(player => {
          const playerRole = getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []));
          return playerRole === selectedCamp;
        });
      }
    }
  });
}

/**
 * Filter games by multiple players with specific filtering modes
 * 
 * @param games - Array of GameLogEntry to filter
 * @param multiPlayerFilter - Multi-player filter configuration
 * @param campFilter - Optional camp filter configuration
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByMultiplePlayersFromGameLog(
  games: GameLogEntry[],
  multiPlayerFilter: MultiPlayerFilter,
  campFilter?: CampFilter
): GameLogEntry[] {
  const { selectedPlayers, playersFilterMode, winnerPlayer } = multiPlayerFilter;

  return games.filter(game => {
    // First check if all selected players are in this game
    const gamePlayersList = game.PlayerStats
      .flatMap(p => [p.Username.toLowerCase(), (p.ID ?? p.Username).toLowerCase()]);
    const hasAllPlayers = selectedPlayers.every(player => 
      gamePlayersList.includes(player.toLowerCase())
    );

    if (!hasAllPlayers) return false;

    // Get camps for each selected player. Exclude wolf sub-roles from wolf camp if specified
    const playerCamps = selectedPlayers.map(player => {
      const term = player.toLowerCase();
      const ps = game.PlayerStats.find(p => {
        const id = (p.ID ?? p.Username).toLowerCase();
        return p.Username.toLowerCase() === term || id === term;
      });
      const role = getPlayerFinalRole(ps?.MainRoleInitial || '', ps?.MainRoleChanges || []);
      return getPlayerCampFromRole(role, { regroupWolfSubRoles: campFilter?.excludeWolfSubRoles || false });
    });

    // Apply filtering based on mode
    switch (playersFilterMode) {
      case 'all-common-games':
        // Include all games where these players participated together
        // If winnerPlayer is specified, filter by games where that player won
        if (winnerPlayer) {
          const winTerm = winnerPlayer.toLowerCase();
          const winnerPlayerStat = game.PlayerStats.find(p => {
            const id = (p.ID ?? p.Username).toLowerCase();
            return p.Username.toLowerCase() === winTerm || id === winTerm;
          });
          return winnerPlayerStat?.Victorious === true;
        }
        return true;

      case 'opposing-camps':
        // Include only games where players were in different camps

        const uniqueCamps = [...new Set(playerCamps)];
        const areInOpposingCamps = uniqueCamps.length > 1;
        
        if (!areInOpposingCamps) return false;
        
        // If winnerPlayer is specified, check if that player's camp won
        if (winnerPlayer) {
          const winnerPlayerIndex = selectedPlayers.findIndex(player => 
            player.toLowerCase() === winnerPlayer.toLowerCase()
          );
          
          if (winnerPlayerIndex !== -1) {
            const winnerPlayerCamp = playerCamps[winnerPlayerIndex];
            const gameWinningCamp = getWinnerCampFromGame(game);
            
            // Special handling for Agent camp - check if specific player is victorious
            if (winnerPlayerCamp === 'Agent' && gameWinningCamp === 'Agent') {
              const winnerPlayerStat = game.PlayerStats.find(p => 
                p.Username.toLowerCase() === winnerPlayer.toLowerCase()
              );
              return winnerPlayerStat?.Victorious === true;
            }
            
            return winnerPlayerCamp === gameWinningCamp;
          }
        }
        
        return true;

      case 'same-camp':
        // Include only games where players were in the same camp 
        const uniqueCampsForSame = [...new Set(playerCamps)];
        const areInSameCamp = uniqueCampsForSame.length === 1;
        
        if (!areInSameCamp) return false;
        
        const sameCamp = playerCamps[0];
        
        // If campFilter is specified, ensure the shared camp matches the required camp
        if (campFilter && campFilter.selectedCamp) {
          const requiredCamp = campFilter.selectedCamp;          
          
          // Ensure the shared camp matches the required camp
          if (sameCamp !== requiredCamp) return false;
        }
        
        // If winnerPlayer is specified, check if their camp won
        if (winnerPlayer) {
          const gameWinningCamp = getWinnerCampFromGame(game);
          
          // Special handling for Agent camp - both players need to be winners for Agent camp
          if (sameCamp === 'Agent' && gameWinningCamp === 'Agent') {
            return selectedPlayers.every(player => {
              const playerStat = game.PlayerStats.find(p => 
                p.Username.toLowerCase() === player.toLowerCase()
              );
              return playerStat?.Victorious === true;
            });
          }
          
          return sameCamp === gameWinningCamp;
        }
        
        return true;

      default:
        return true;
    }
  });
}

/**
 * Filter games by player pair with specific role relationship
 * 
 * @param games - Array of GameLogEntry to filter
 * @param playerPairFilter - Player pair filter configuration
 * @returns Filtered array of GameLogEntry
 * 
 */
export function filterByPlayerPairFromGameLog(
  games: GameLogEntry[],
  playerPairFilter: PlayerPairFilter
): GameLogEntry[] {
  const { selectedPlayerPair, selectedPairRole } = playerPairFilter;
  if (selectedPlayerPair.length !== 2) return games;

  return games.filter(game => {
    // Check if both players are in this game
    const gamePlayersList = game.PlayerStats
      .flatMap(p => [p.Username.toLowerCase(), (p.ID ?? p.Username).toLowerCase()]);
    const hasBothPlayers = selectedPlayerPair.every(player => 
      gamePlayersList.includes(player.toLowerCase())
    );

    if (!hasBothPlayers) return false;

    switch (selectedPairRole) {
      case 'wolves':
        // Check if both players are wolves in this game
        return selectedPlayerPair.every(player => {
          const term = player.toLowerCase();
          const playerStat = game.PlayerStats.find(p => {
            const id = (p.ID ?? p.Username).toLowerCase();
            return p.Username.toLowerCase() === term || id === term;
          });
          return getPlayerCampFromRole(getPlayerFinalRole(playerStat?.MainRoleInitial || '', playerStat?.MainRoleChanges || [])) === 'Loup';
        });

      case 'lovers':
        // Check if both players are lovers in this game
        return selectedPlayerPair.every(player => {
          const term = player.toLowerCase();
          const playerStat = game.PlayerStats.find(p => {
            const id = (p.ID ?? p.Username).toLowerCase();
            return p.Username.toLowerCase() === term || id === term;
          });
          return getPlayerCampFromRole(getPlayerFinalRole(playerStat?.MainRoleInitial || '', playerStat?.MainRoleChanges || [])) === 'Amoureux';
        });

      default:
        return true;
    }
  });
}

/**
 * Apply navigation filters to game data
 * 
 * @param gameData - Array of GameLogEntry to filter
 * @param filters - Navigation filters to apply
 * @returns Filtered array of GameLogEntry
 *
 */
export function applyNavigationFiltersFromGameLog(
  gameData: GameLogEntry[],
  filters?: NavigationFilters,
  highlightedPlayer?: string | null
): GameLogEntry[] {
  // Check if filters object exists and has any meaningful filter properties
  const hasFilters = filters && (
    filters.selectedPlayer ||
    filters.selectedGame ||
    filters.selectedVictoryType ||
    filters.selectedDate ||
    filters.selectedHarvestRange ||
    filters.selectedGameDuration ||
    (filters.selectedGameIds && filters.selectedGameIds.length > 0) ||
    filters.selectedMapName ||
    filters.campFilter ||
    filters.playerPairFilter ||
    filters.multiPlayerFilter
  );

  // If no meaningful navigation filters but we have a highlighted player, filter by highlighted player only
  if (!hasFilters && highlightedPlayer) {
    return filterByPlayerFromGameLog(gameData, highlightedPlayer, 'all-assignments');
  }

  // If we have no filters at all, return all data
  if (!hasFilters) return gameData;

  let filteredGames = [...gameData];

  // Apply filters sequentially
  if (filters.selectedPlayer) {
    filteredGames = filterByPlayerFromGameLog(
      filteredGames, 
      filters.selectedPlayer, 
      filters.selectedPlayerWinMode
    );
  }

  if (filters.selectedGame) {
    filteredGames = filterByGameFromGameLog(filteredGames, filters.selectedGame);
  }

  if (filters.selectedGameIds) {
    filteredGames = filterByGameIdsFromGameLog(filteredGames, filters.selectedGameIds);
  }

  if (filters.campFilter) {
    filteredGames = filterByCampFromGameLog(
      filteredGames,
      filters.campFilter,
      filters.selectedPlayer
    );
  }

  if (filters.selectedDate) {
    filteredGames = filterByDateFromGameLog(filteredGames, filters.selectedDate);
  }

  if (filters.selectedHarvestRange) {
    filteredGames = filterByHarvestRangeFromGameLog(filteredGames, filters.selectedHarvestRange);
  }

  if (filters.selectedVictoryType) {
    filteredGames = filterByVictoryType(filteredGames, filters.selectedVictoryType);
  }

  if (filters.selectedGameDuration) {
    filteredGames = filterByGameDurationFromGameLog(filteredGames, filters.selectedGameDuration);
  }

  if (filters.selectedMapName) {
    filteredGames = filterByMapNameFromGameLog(filteredGames, filters.selectedMapName);
  }

  // Apply multi-player filters (for player comparison scenarios)
  if (filters.multiPlayerFilter) {
    filteredGames = filterByMultiplePlayersFromGameLog(
      filteredGames, 
      filters.multiPlayerFilter,
      filters.campFilter
    );
  }

  // Apply player pair filters
  if (filters.playerPairFilter) {
    filteredGames = filterByPlayerPairFromGameLog(
      filteredGames,
      filters.playerPairFilter
    );
  }

  return filteredGames;
}


/**
 * Parse roles from GameLogEntry structure
 * 
 * @param game - The GameLogEntry to parse roles from
 * @returns GameRoles object with role assignments
 * 
 */
export function parseRolesFromGameLog(game: GameLogEntry): GameRoles {
  const roleMap = new Map<string, string[]>();
  
  // Extract roles from PlayerStats and group players by role
  game.PlayerStats.forEach(player => {
    const roleName = getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []));
    if (!roleMap.has(roleName)) {
      roleMap.set(roleName, []);
    }
    roleMap.get(roleName)!.push(player.Username);
  });
  
  // Convert map to array of RoleEntry objects
  const roles: RoleEntry[] = Array.from(roleMap.entries()).map(([roleName, players]) => ({
    roleName,
    players
  }));
  
  return { roles };
}

/**
 * Compute enriched game details from raw data
 * 
 * @param gameData - Array of GameLogEntry to process
 * @param filters - Optional navigation filters to apply
 * @returns Enriched game data array or null if empty input
 * 
 */
export function computeGameDetailsFromGameLog(
  gameData: GameLogEntry[],
  filters?: NavigationFilters,
  highlightedPlayer?: string | null
){
  if (gameData.length === 0) return null;

  // Apply navigation filters or highlighted player filter
  const filteredGames = applyNavigationFiltersFromGameLog(gameData, filters, highlightedPlayer);

  return filteredGames.map((game) => {

    // Calculate derived fields from PlayerStats
    const playerCount = game.PlayerStats.length;
    const wolves = game.PlayerStats.filter(p => getPlayerCampFromRole(getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || [])) === 'Loup');
    const traitors = game.PlayerStats.filter(p => getPlayerCampFromRole(getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || [])) === 'Traître');
    const wolfCubs = game.PlayerStats.filter(p => getPlayerCampFromRole(getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || [])) === 'Louveteau');
    const lovers = game.PlayerStats.filter(p => getPlayerCampFromRole(getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || [])) === 'Amoureux');
    const victoriousPlayers = game.PlayerStats.filter(p => p.Victorious);
    
    // Calculate wolf count (includes traitors and wolf cubs)
    const wolfCount = wolves.length + traitors.length + wolfCubs.length;
    
    // Determine winning camp
    const winningCamp = getWinnerCampFromGame(game);
    
    // Extract solo roles (players who are not in main camps: Loup, Villageois, Amoureux)
    const mainCampRoles = ['Loup', 'Villageois', 'Amoureux'];
    const soloRolePlayers = game.PlayerStats.filter(p => !mainCampRoles.includes(getPlayerCampFromRole(getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || []))));
    const soloRoles = soloRolePlayers.length > 0 ? soloRolePlayers.map(p => getPlayerCampFromRole(getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || []))).join(', ') : null;
    
    // Convert StartDate (ISO) to French format (DD/MM/YYYY)
    const gameDate = new Date(game.StartDate);
    const formattedDate = gameDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Extract day count from EndTiming
    let dayCount = 0;
    if (game.EndTiming) {
      const timingMatch = game.EndTiming.match(/[UNJMC](\d+)/);
      if (timingMatch) {
        dayCount = parseInt(timingMatch[1], 10);
      }
    }
    
    // Calculate harvest percentage
    let harvestPercentage: number | null = null;
    if (game.HarvestGoal && game.HarvestGoal > 0) {
      harvestPercentage = (game.HarvestDone / game.HarvestGoal);
    }

    return {
      gameId: game.DisplayedId, 
      date: formattedDate,
      isModded: game.Modded || false,
      playerCount,
      wolfCount,
      hasTraitor: traitors.length > 0,
      hasWolfCub: wolfCubs.length > 0,
      hasLovers: lovers.length > 0,
      soloRoles,
      winningCamp,
      dayCount,
      winners: victoriousPlayers.map(p => p.Username).join(', '),
      harvest: game.HarvestDone,
      totalHarvest: game.HarvestGoal,
      harvestPercentage,
      playersList: game.PlayerStats.map(p => p.Username).join(', '),
      versions: game.Version || null,
      map: game.MapName,
      victoryType: game.LegacyData?.VictoryType || null,
      playerVODs: convertPlayerVODsToEmbedUrls(game.LegacyData?.PlayerVODs),
      gameDuration: calculateGameDuration(game.StartDate, game.EndDate),
      playerData : game.PlayerStats,
    };
  });
}
