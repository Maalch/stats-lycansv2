import type { RawGameData, RawRoleData, RawPonceData } from '../useCombinedRawData';
import type { NavigationFilters, PlayerPairFilter, MultiPlayerFilter, CampFilter } from '../../context/NavigationContext';
import { splitAndTrim, didPlayerWin } from './dataUtils';

export interface EnrichedGameData {
  gameId: number;
  date: string;
  isModded: boolean;
  playerCount: number;
  wolfCount: number;
  hasTraitor: boolean;
  hasLovers: boolean;
  soloRoles: string | null;
  winningCamp: string;
  victoryType: string;
  dayCount: number;
  villagerSurvivors: number;
  wolfSurvivors: number;
  loverSurvivors: number | null;
  soloSurvivors: number | null;
  winners: string;
  harvest: number | null;
  totalHarvest: number | null;
  harvestPercentage: number | null;
  playersList: string;
  versions: string | null;
  map: string | null;
  youtubeEmbedUrl: string | null;
  gameDuration: number | null; // Duration in seconds calculated from start and end timestamps
  // Enriched data from role and ponce data
  roles: {
    wolves?: string[];
    traitor?: string;
    villageIdiot?: string;
    cannibal?: string;
    agent?: string[];
    spy?: string;
    scientist?: string;
    lovers?: string[];
    beast?: string;
    bountyHunter?: string;
    voodoo?: string;
  };
  playerRoles: Array<{
    player: string;
    role: string;
    camp: string;
  }>;
  playerDetails: Array<{
    player: string;
    camp: string;
    isTraitor: boolean;
    secondaryRole: string | null;
    wolfPower: string | null;
    villagerJob: string | null;
    playersKilled: string | null;
    deathDay: number | null;
    deathType: string | null;
    killers: string | null;
  }>;
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
 * Helper function to get player's camp from role data
 */
export function getPlayerCampFromRoles(
  playerName: string, 
  roleData: RawRoleData,
  excludeTraitor: boolean = false
): string {
  const player = playerName.toLowerCase();
  
  // Check each role type
  if (roleData.Loups && roleData.Loups.toLowerCase().includes(player)) return 'Loups';
  if (roleData.Traître && roleData.Traître.toLowerCase().includes(player)) {
    if (excludeTraitor) return 'Traître'; // Return Traître if we want to exclude traitor from Loups
    return 'Loups';
  }
  if (roleData["Idiot du Village"] && roleData["Idiot du Village"].toLowerCase().includes(player)) return 'Idiot du Village';
  if (roleData.Cannibale && roleData.Cannibale.toLowerCase().includes(player)) return 'Cannibale';
  if (roleData.Agent && roleData.Agent.toLowerCase().includes(player)) return 'Agent';
  if (roleData.Espion && roleData.Espion.toLowerCase().includes(player)) return 'Espion';
  if (roleData.Scientifique && roleData.Scientifique.toLowerCase().includes(player)) return 'Scientifique';
  if (roleData.Amoureux && roleData.Amoureux.toLowerCase().includes(player)) return 'Amoureux';
  if (roleData["La Bête"] && roleData["La Bête"].toLowerCase().includes(player)) return 'La Bête';
  if (roleData["Chasseur de primes"] && roleData["Chasseur de primes"].toLowerCase().includes(player)) return 'Chasseur de primes';
  if (roleData.Vaudou && roleData.Vaudou.toLowerCase().includes(player)) return 'Vaudou';
  
  return 'Villageois';
}

/**
 * Helper function to check if a player is in a specific camp for "Autres" filtering
 */
function isPlayerInSmallCamp(
  playerName: string,
  campName: string,
  roleData: RawRoleData,
  gameData: RawGameData
): boolean {
  const selectedPlayer = playerName.toLowerCase();
  
  switch (campName) {
    case 'Traître':
      return !!(roleData.Traître && roleData.Traître.toLowerCase().includes(selectedPlayer));
    case 'Idiot du Village':
      return !!(roleData["Idiot du Village"] && roleData["Idiot du Village"].toLowerCase().includes(selectedPlayer));
    case 'Cannibale':
      return !!(roleData.Cannibale && roleData.Cannibale.toLowerCase().includes(selectedPlayer));
    case 'Agent':
      return !!(roleData.Agent && roleData.Agent.toLowerCase().includes(selectedPlayer));
    case 'Espion':
      return !!(roleData.Espion && roleData.Espion.toLowerCase().includes(selectedPlayer));
    case 'Scientifique':
      return !!(roleData.Scientifique && roleData.Scientifique.toLowerCase().includes(selectedPlayer));
    case 'Amoureux':
      return !!(roleData.Amoureux && roleData.Amoureux.toLowerCase().includes(selectedPlayer));
    case 'La Bête':
      return !!(roleData["La Bête"] && roleData["La Bête"].toLowerCase().includes(selectedPlayer));
    case 'Chasseur de primes':
      return !!(roleData["Chasseur de primes"] && roleData["Chasseur de primes"].toLowerCase().includes(selectedPlayer));
    case 'Vaudou':
      return !!(roleData.Vaudou && roleData.Vaudou.toLowerCase().includes(selectedPlayer));
    case 'Villageois':
      // For villagers, check if player is in game but not in any special role
      const isInGame = gameData["Liste des joueurs"].toLowerCase().includes(selectedPlayer);
      const playersInSpecialRoles = [
        ...(roleData.Loups ? splitAndTrim(roleData.Loups) : []),
        ...(roleData.Traître ? [roleData.Traître.trim()] : []),
        ...(roleData["Idiot du Village"] ? [roleData["Idiot du Village"].trim()] : []),
        ...(roleData.Cannibale ? [roleData.Cannibale.trim()] : []),
        ...(roleData.Agent ? splitAndTrim(roleData.Agent) : []),
        ...(roleData.Espion ? [roleData.Espion.trim()] : []),
        ...(roleData.Scientifique ? [roleData.Scientifique.trim()] : []),
        ...(roleData.Amoureux ? splitAndTrim(roleData.Amoureux) : []),
        ...(roleData["La Bête"] ? [roleData["La Bête"].trim()] : []),
        ...(roleData["Chasseur de primes"] ? [roleData["Chasseur de primes"].trim()] : []),
        ...(roleData.Vaudou ? [roleData.Vaudou.trim()] : [])
      ].map(p => p.toLowerCase());
      
      return isInGame && !playersInSpecialRoles.includes(selectedPlayer);
    default:
      return false;
  }
}

/**
 * Filter games by selected player
 */
function filterByPlayer(
  games: RawGameData[], 
  selectedPlayer: string, 
  winMode?: 'wins-only' | 'all-assignments'
): RawGameData[] {
  const playerFilteredGames = games.filter(game => 
    game["Liste des joueurs"].toLowerCase().includes(selectedPlayer.toLowerCase())
  );

  // If no win mode specified, return all games with the player
  if (!winMode || winMode === 'all-assignments') {
    return playerFilteredGames;
  }

  // For 'wins-only' mode, filter to only games where the player won
  if (winMode === 'wins-only') {
    return playerFilteredGames.filter(game => 
      didPlayerWin(selectedPlayer, game["Liste des gagnants"])
    );
  }

  return playerFilteredGames;
}

/**
 * Filter games by selected game ID
 */
function filterByGame(games: RawGameData[], selectedGame: number): RawGameData[] {
  return games.filter(game => game.Game === selectedGame);
}

/**
 * Filter games by multiple game IDs (for series navigation)
 */
function filterByGameIds(games: RawGameData[], selectedGameIds: number[]): RawGameData[] {
  return games.filter(game => selectedGameIds.includes(game.Game));
}

/**
 * Filter games by victory type
 */
function filterByVictoryType(games: RawGameData[], victoryType: string): RawGameData[] {
  return games.filter(game => game["Type de victoire"] === victoryType);
}

/**
 * Filter games by date (supports both full date and month/year)
 */
function filterByDate(games: RawGameData[], selectedDate: string): RawGameData[] {
  return games.filter(game => {
    const gameDate = game.Date;
    
    if (selectedDate.includes('/') && selectedDate.split('/').length === 2) {
      const [month, year] = selectedDate.split('/');
      const gameDateParts = gameDate.split('/');
      if (gameDateParts.length === 3) {
        const [, gameMonth, gameYear] = gameDateParts;
        return gameMonth === month && gameYear === year;
      }
    } else {
      return gameDate === selectedDate;
    }
    
    return false;
  });
}

/**
 * Filter games by harvest range
 */
function filterByHarvestRange(games: RawGameData[], harvestRange: string): RawGameData[] {
  return games.filter(game => {
    const harvestPercent = game["Pourcentage de récolte"];
    if (harvestPercent === null || harvestPercent === undefined) return false;
    
    const percentageValue = harvestPercent * 100;
    
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
 */
function filterByGameDuration(games: RawGameData[], gameDuration: number): RawGameData[] {
  return games.filter(game => {
    const gameDays = game["Nombre de journées"];
    return gameDays === gameDuration;
  });
}

/**
 * Complex camp filtering logic
 */
function filterByCamp(
  games: RawGameData[],
  roleData: RawRoleData[],
  campFilter: CampFilter,
  selectedPlayer?: string
): RawGameData[] {
  const { selectedCamp, campFilterMode, _smallCamps: smallCamps, excludeTraitor } = campFilter;
  return games.filter(game => {
    const roleDataForGame = roleData.find(role => role.Game === game.Game);
    if (!roleDataForGame) return false;

    if (selectedPlayer) {
      // Handle "Autres" category for specific player
      if (selectedCamp === 'Autres' && smallCamps) {
        return smallCamps.some(camp => 
          isPlayerInSmallCamp(selectedPlayer, camp, roleDataForGame, game)
        );
      }

      // Check specific camp for specific player
      const playerCamp = getPlayerCampFromRoles(selectedPlayer, roleDataForGame, excludeTraitor);
      
      // Special handling for "Loups" with excludeTraitor flag
      if (selectedCamp === 'Loups' && excludeTraitor) {
        // Only include games where player was a regular wolf (not traitor)
        return playerCamp === 'Loups' && 
               !(roleDataForGame.Traître && roleDataForGame.Traître.toLowerCase().includes(selectedPlayer.toLowerCase()));
      }
      
      // Special handling for Agent camp: when filtering by Agent camp wins, 
      // check if the specific player is in the winners list
      if (playerCamp === 'Agent' && selectedCamp === 'Agent' && game["Camp victorieux"] === 'Agent') {
        const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
        return winnersList.some(winner => winner.toLowerCase() === selectedPlayer.toLowerCase());
      }
      
      return playerCamp === selectedCamp;
    } else {
      // Filter by camp without specific player
      if (campFilterMode === 'wins-only') {
        if (selectedCamp === 'Autres' && smallCamps) {
          return smallCamps.includes(game["Camp victorieux"]);
        }
        return game["Camp victorieux"] === selectedCamp;
      } else {
        // Check if any player was assigned to this camp (all-assignments mode)
        if (selectedCamp === 'Autres' && smallCamps) {
          return smallCamps.some(camp => {
            switch (camp) {
              case 'Traître':
                return !!(roleDataForGame.Traître && roleDataForGame.Traître.trim());
              case 'Idiot du Village':
                return !!(roleDataForGame["Idiot du Village"] && roleDataForGame["Idiot du Village"].trim());
              case 'Cannibale':
                return !!(roleDataForGame.Cannibale && roleDataForGame.Cannibale.trim());
              case 'Agent':
                return !!(roleDataForGame.Agent && roleDataForGame.Agent.trim());
              case 'Espion':
                return !!(roleDataForGame.Espion && roleDataForGame.Espion.trim());
              case 'Scientifique':
                return !!(roleDataForGame.Scientifique && roleDataForGame.Scientifique.trim());
              case 'Amoureux':
                return !!(roleDataForGame.Amoureux && roleDataForGame.Amoureux.trim());
              case 'La Bête':
                return !!(roleDataForGame["La Bête"] && roleDataForGame["La Bête"].trim());
              case 'Chasseur de primes':
                return !!(roleDataForGame["Chasseur de primes"] && roleDataForGame["Chasseur de primes"].trim());
              case 'Vaudou':
                return !!(roleDataForGame.Vaudou && roleDataForGame.Vaudou.trim());
              case 'Villageois':
                const playersInGame = splitAndTrim(game["Liste des joueurs"]);
                return playersInGame.length > 0; // Simplified check
              default:
                return false;
            }
          });
        }

        // Check specific camp assignment
        switch (selectedCamp) {
          case 'Loups':
            return !!(roleDataForGame.Loups && roleDataForGame.Loups.trim());
          case 'Traître':
            return !!(roleDataForGame.Traître && roleDataForGame.Traître.trim());
          case 'Villageois':
            const playersInGame = splitAndTrim(game["Liste des joueurs"]);
            const playersInSpecialRoles = [
              ...splitAndTrim(roleDataForGame.Loups || ''),
              ...(roleDataForGame.Traître ? [roleDataForGame.Traître.trim()] : []),
              ...(roleDataForGame["Idiot du Village"] ? [roleDataForGame["Idiot du Village"].trim()] : []),
              ...(roleDataForGame.Cannibale ? [roleDataForGame.Cannibale.trim()] : []),
              ...(roleDataForGame.Agent ? splitAndTrim(roleDataForGame.Agent) : []),
              ...(roleDataForGame.Espion ? [roleDataForGame.Espion.trim()] : []),
              ...(roleDataForGame.Scientifique ? [roleDataForGame.Scientifique.trim()] : []),
              ...splitAndTrim(roleDataForGame.Amoureux || ''),
              ...(roleDataForGame["La Bête"] ? [roleDataForGame["La Bête"].trim()] : []),
              ...(roleDataForGame["Chasseur de primes"] ? [roleDataForGame["Chasseur de primes"].trim()] : []),
              ...(roleDataForGame.Vaudou ? [roleDataForGame.Vaudou.trim()] : [])
            ];
            return playersInGame.some(player => !playersInSpecialRoles.includes(player));
          case 'Idiot du Village':
            return !!(roleDataForGame["Idiot du Village"] && roleDataForGame["Idiot du Village"].trim());
          case 'Cannibale':
            return !!(roleDataForGame.Cannibale && roleDataForGame.Cannibale.trim());
          case 'Agent':
            return !!(roleDataForGame.Agent && roleDataForGame.Agent.trim());
          case 'Espion':
            return !!(roleDataForGame.Espion && roleDataForGame.Espion.trim());
          case 'Scientifique':
            return !!(roleDataForGame.Scientifique && roleDataForGame.Scientifique.trim());
          case 'Amoureux':
            return !!(roleDataForGame.Amoureux && roleDataForGame.Amoureux.trim());
          case 'La Bête':
            return !!(roleDataForGame["La Bête"] && roleDataForGame["La Bête"].trim());
          case 'Chasseur de primes':
            return !!(roleDataForGame["Chasseur de primes"] && roleDataForGame["Chasseur de primes"].trim());
          case 'Vaudou':
            return !!(roleDataForGame.Vaudou && roleDataForGame.Vaudou.trim());
          default:
            // For any unrecognized camp, fall back to checking wins only
            return game["Camp victorieux"] === selectedCamp;
        }
      }
    }
  });
}

/**
 * Filter games by multiple players with specific filtering modes
 */
function filterByMultiplePlayers(
  games: RawGameData[],
  roleData: RawRoleData[],
  multiPlayerFilter: MultiPlayerFilter,
  campFilter?: CampFilter
): RawGameData[] {
  const { selectedPlayers, playersFilterMode, winnerPlayer } = multiPlayerFilter;

  return games.filter(game => {
    // First check if all selected players are in this game
    const playersInGame = splitAndTrim(game["Liste des joueurs"]);
    const hasAllPlayers = selectedPlayers.every(player => 
      playersInGame.some(gamePlayer => 
        gamePlayer.toLowerCase() === player.toLowerCase()
      )
    );

    if (!hasAllPlayers) return false;

    // Get role data for this game
    const roleDataForGame = roleData.find(role => role.Game === game.Game);
    if (!roleDataForGame) return false;

    // Get camps for each selected player
    const playerCamps = selectedPlayers.map(player => 
      getPlayerCampFromRoles(player, roleDataForGame)
    );

    // Apply filtering based on mode
    switch (playersFilterMode) {
      case 'all-common-games':
        // Include all games where these players participated together
        // If winnerPlayer is specified, filter by games where that player won
        if (winnerPlayer) {
          const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
          return winnersList.some(winner => 
            winner.toLowerCase() === winnerPlayer.toLowerCase()
          );
        }
        return true;

      case 'opposing-camps':
        // Include only games where players were in different camps
        // Special handling for camp alliances (Traître works with Loups)
        const normalizedCamps = playerCamps.map(camp => {
          if (camp === 'Traître') return 'Loups';
          return camp;
        });
        
        const uniqueCamps = [...new Set(normalizedCamps)];
        const areInOpposingCamps = uniqueCamps.length > 1;
        
        if (!areInOpposingCamps) return false;
        
        // If winnerPlayer is specified, check if that player's camp won
        if (winnerPlayer) {
          const winnerPlayerIndex = selectedPlayers.findIndex(player => 
            player.toLowerCase() === winnerPlayer.toLowerCase()
          );
          
          if (winnerPlayerIndex !== -1) {
            const winnerPlayerCamp = normalizedCamps[winnerPlayerIndex];
            const gameWinningCamp = game["Camp victorieux"] === 'Traître' ? 'Loups' : game["Camp victorieux"];
            
            // Special handling for Agent camp - check if specific player is in winners list
            if (winnerPlayerCamp === 'Agent' && gameWinningCamp === 'Agent') {
              const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
              return winnersList.some(winner => 
                winner.toLowerCase() === winnerPlayer.toLowerCase()
              );
            }
            
            return winnerPlayerCamp === gameWinningCamp;
          }
        }
        
        return true;

      case 'same-camp':
        // Include only games where players were in the same camp (considering alliances)
        const normalizedCampsForSame = playerCamps.map(camp => {
          if (camp === 'Traître') return 'Loups';
          return camp;
        });
        
        const uniqueCampsForSame = [...new Set(normalizedCampsForSame)];
        const areInSameCamp = uniqueCampsForSame.length === 1;
        
        if (!areInSameCamp) return false;
        
        const sameCamp = normalizedCampsForSame[0];
        
        // If campFilter is specified, ensure the shared camp matches the required camp
        if (campFilter && campFilter.selectedCamp) {
          const requiredCamp = campFilter.selectedCamp;
          
          // Handle "Loups sans Traître" case
          if (requiredCamp === 'Loups' && campFilter.excludeTraitor) {
            // Ensure all players are regular wolves (not traitors)
            const areAllRegularWolves = selectedPlayers.every(player => {
              const originalCamp = playerCamps[selectedPlayers.indexOf(player)];
              return originalCamp === 'Loups'; // They should be Loups, and we'll check they're not traitors below
            });
            if (!areAllRegularWolves) return false;
            
            // Also check that none of the players are traitors in the role data
            const hasTraitor = selectedPlayers.some(player => {
              const traitors = splitAndTrim(roleDataForGame.Traître || '');
              return traitors.some(traitor => 
                traitor.toLowerCase() === player.toLowerCase()
              );
            });
            if (hasTraitor) return false;
          }
          
          // Ensure the shared camp matches the required camp
          if (sameCamp !== requiredCamp) return false;
        }
        
        // If winnerPlayer is specified, check if their camp won
        if (winnerPlayer) {
          const gameWinningCamp = game["Camp victorieux"] === 'Traître' ? 'Loups' : game["Camp victorieux"];
          
          // Special handling for Agent camp - both players need to be winners for Agent camp
          if (sameCamp === 'Agent' && gameWinningCamp === 'Agent') {
            const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
            return selectedPlayers.every(player =>
              winnersList.some(winner => 
                winner.toLowerCase() === player.toLowerCase()
              )
            );
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
 */
function filterByPlayerPair(
  games: RawGameData[],
  roleData: RawRoleData[],
  playerPairFilter: PlayerPairFilter
): RawGameData[] {
  const { selectedPlayerPair, selectedPairRole } = playerPairFilter;
  if (selectedPlayerPair.length !== 2) return games;

  return games.filter(game => {
    // Check if both players are in this game
    const playersInGame = splitAndTrim(game["Liste des joueurs"]);
    const hasBothPlayers = selectedPlayerPair.every(player => 
      playersInGame.some(gamePlayer => 
        gamePlayer.toLowerCase() === player.toLowerCase()
      )
    );

    if (!hasBothPlayers) return false;

    // Get role data for this game
    const roleDataForGame = roleData.find(role => role.Game === game.Game);
    if (!roleDataForGame) return false;

    switch (selectedPairRole) {
      case 'wolves':
        // Check if both players are wolves in this game
        const wolvesInGame = splitAndTrim(roleDataForGame.Loups || '');
        return selectedPlayerPair.every(player =>
          wolvesInGame.some(wolf => 
            wolf.toLowerCase() === player.toLowerCase()
          )
        );

      case 'lovers':
        // Check if both players are lovers in this game
        const loversInGame = splitAndTrim(roleDataForGame.Amoureux || '');
        return selectedPlayerPair.every(player =>
          loversInGame.some(lover => 
            lover.toLowerCase() === player.toLowerCase()
          )
        );

      default:
        return true;
    }
  });
}

/**
 * Apply navigation filters to game data
 */
export function applyNavigationFilters(
  gameData: RawGameData[],
  roleData: RawRoleData[],
  filters?: NavigationFilters
): RawGameData[] {
  if (!filters) return gameData;

  let filteredGames = [...gameData];

  // Apply filters sequentially
  if (filters.selectedPlayer) {
    filteredGames = filterByPlayer(
      filteredGames, 
      filters.selectedPlayer, 
      filters.selectedPlayerWinMode
    );
  }

  if (filters.selectedGame) {
    filteredGames = filterByGame(filteredGames, filters.selectedGame);
  }

  if (filters.selectedGameIds) {
    filteredGames = filterByGameIds(filteredGames, filters.selectedGameIds);
  }

  if (filters.campFilter) {
    filteredGames = filterByCamp(
      filteredGames,
      roleData,
      filters.campFilter,
      filters.selectedPlayer
    );
  }

  if (filters.selectedVictoryType) {
    filteredGames = filterByVictoryType(filteredGames, filters.selectedVictoryType);
  }

  if (filters.selectedDate) {
    filteredGames = filterByDate(filteredGames, filters.selectedDate);
  }

  if (filters.selectedHarvestRange) {
    filteredGames = filterByHarvestRange(filteredGames, filters.selectedHarvestRange);
  }

  if (filters.selectedGameDuration) {
    filteredGames = filterByGameDuration(filteredGames, filters.selectedGameDuration);
  }

  // Apply multi-player filters (for player comparison scenarios)
  if (filters.multiPlayerFilter) {
    filteredGames = filterByMultiplePlayers(
      filteredGames, 
      roleData, 
      filters.multiPlayerFilter,
      filters.campFilter
    );
  }

  // Apply player pair filters
  if (filters.playerPairFilter) {
    filteredGames = filterByPlayerPair(
      filteredGames,
      roleData,
      filters.playerPairFilter
    );
  }

  return filteredGames;
}

/**
 * Parse roles from role data
 */
function parseRoles(roleDataForGame: RawRoleData | undefined): EnrichedGameData['roles'] {
  const roles: EnrichedGameData['roles'] = {};
  
  if (roleDataForGame) {
    if (roleDataForGame.Loups) roles.wolves = splitAndTrim(roleDataForGame.Loups);
    if (roleDataForGame.Traître) roles.traitor = roleDataForGame.Traître;
    if (roleDataForGame["Idiot du Village"]) roles.villageIdiot = roleDataForGame["Idiot du Village"];
    if (roleDataForGame.Cannibale) roles.cannibal = roleDataForGame.Cannibale;
    if (roleDataForGame.Agent) roles.agent = splitAndTrim(roleDataForGame.Agent);
    if (roleDataForGame.Espion) roles.spy = roleDataForGame.Espion;
    if (roleDataForGame.Scientifique) roles.scientist = roleDataForGame.Scientifique;
    if (roleDataForGame.Amoureux) roles.lovers = splitAndTrim(roleDataForGame.Amoureux);
    if (roleDataForGame["La Bête"]) roles.beast = roleDataForGame["La Bête"];
    if (roleDataForGame["Chasseur de primes"]) roles.bountyHunter = roleDataForGame["Chasseur de primes"];
    if (roleDataForGame.Vaudou) roles.voodoo = roleDataForGame.Vaudou;
  }
  
  return roles;
}

/**
 * Create player roles list from game and role data
 */
function createPlayerRoles(
  game: RawGameData,
  roleDataForGame: RawRoleData | undefined
): EnrichedGameData['playerRoles'] {
  const playerRoles: EnrichedGameData['playerRoles'] = [];
  const allPlayers = splitAndTrim(game["Liste des joueurs"]);

  allPlayers.forEach(player => {
    let role = 'Villageois';
    let camp = 'Villageois';

    if (roleDataForGame) {
      if (roleDataForGame.Loups && splitAndTrim(roleDataForGame.Loups).includes(player)) {
        role = 'Loups';
        camp = 'Loups';
      } else if (roleDataForGame.Traître && splitAndTrim(roleDataForGame.Traître).includes(player)) {
        role = 'Traître';
        camp = 'Loups'; 
      } else if (roleDataForGame["Idiot du Village"] && splitAndTrim(roleDataForGame["Idiot du Village"]).includes(player)) {
        role = 'Idiot du Village';
        camp = 'Idiot du Village'; 
      } else if (roleDataForGame.Cannibale && splitAndTrim(roleDataForGame.Cannibale).includes(player)) {
        role = 'Cannibale';
        camp = 'Cannibale';
      } else if (roleDataForGame.Agent && splitAndTrim(roleDataForGame.Agent).includes(player)) {
        role = 'Agent';
        camp = 'Agent';
      } else if (roleDataForGame.Espion && splitAndTrim(roleDataForGame.Espion).includes(player)) {
        role = 'Espion';
        camp = 'Espion';
      } else if (roleDataForGame.Scientifique && splitAndTrim(roleDataForGame.Scientifique).includes(player)) {
        role = 'Scientifique';
        camp = 'Scientifique';
      } else if (roleDataForGame["La Bête"] && splitAndTrim(roleDataForGame["La Bête"]).includes(player)) {
        role = 'La Bête';
        camp = 'La Bête';
      } else if (roleDataForGame["Chasseur de primes"] && splitAndTrim(roleDataForGame["Chasseur de primes"]).includes(player)) {
        role = 'Chasseur de primes';
        camp = 'Chasseur de primes';
      } else if (roleDataForGame.Vaudou && splitAndTrim(roleDataForGame.Vaudou).includes(player)) {
        role = 'Vaudou';
        camp = 'Vaudou';
      } else if (roleDataForGame.Amoureux && splitAndTrim(roleDataForGame.Amoureux).includes(player)) {
        role = 'Amoureux';
        camp = 'Amoureux';
      }
    }

    playerRoles.push({ player, role, camp });
  });

  return playerRoles;
}

/**
 * Create player details from ponce data
 */
function createPlayerDetails(ponceDataForGame: RawPonceData[]): EnrichedGameData['playerDetails'] {
  return ponceDataForGame.map(ponce => ({
    player: 'Ponce',
    camp: ponce.Camp || 'Unknown',
    isTraitor: ponce.Traître || false,
    secondaryRole: ponce["Rôle secondaire"] === "N/A" ? null : ponce["Rôle secondaire"],
    wolfPower: ponce["Pouvoir de loup"] === "N/A" ? null : ponce["Pouvoir de loup"],
    villagerJob: ponce["Métier villageois"] === "N/A" ? null : ponce["Métier villageois"],
    playersKilled: ponce["Joueurs tués"],
    deathDay: ponce["Jour de mort"],
    deathType: ponce["Type de mort"],
    killers: ponce["Joueurs tueurs"]
  }));
}

/**
 * Compute enriched game details from raw data
 */
export function computeGameDetails(
  gameData: RawGameData[],
  roleData: RawRoleData[],
  ponceData: RawPonceData[],
  filters?: NavigationFilters
): EnrichedGameData[] | null {
  if (gameData.length === 0) return null;

  // Apply navigation filters
  const filteredGames = applyNavigationFilters(gameData, roleData, filters);

  return filteredGames.map(game => {
    // Find corresponding role data
    const roleDataForGame = roleData.find(role => role.Game === game.Game);
    
    // Find corresponding ponce data for this game
    const ponceDataForGame = ponceData.filter(ponce => ponce.Game === game.Game);

    // Parse roles
    const roles = parseRoles(roleDataForGame);

    // Create player roles and details
    const playerRoles = createPlayerRoles(game, roleDataForGame);
    const playerDetails = createPlayerDetails(ponceDataForGame);

    return {
      gameId: game.Game,
      date: game.Date,
      isModded: game["Game Moddée"],
      playerCount: game["Nombre de joueurs"],
      wolfCount: game["Nombre de loups"],
      hasTraitor: game["Rôle Traître"],
      hasLovers: game["Rôle Amoureux"],
      soloRoles: game["Rôles solo"],
      winningCamp: game["Camp victorieux"],
      victoryType: game["Type de victoire"],
      dayCount: game["Nombre de journées"],
      villagerSurvivors: game["Survivants villageois"],
      wolfSurvivors: game["Survivants loups (traître inclus)"],
      loverSurvivors: game["Survivants amoureux"],
      soloSurvivors: game["Survivants solo"],
      winners: game["Liste des gagnants"],
      harvest: game["Récolte"],
      totalHarvest: game["Total récolte"],
      harvestPercentage: game["Pourcentage de récolte"],
      playersList: game["Liste des joueurs"],
      versions: game["Versions"],
      map: game["Map"],
      youtubeEmbedUrl: createYouTubeEmbedUrl(game["VOD"], game["VODEnd"]),
      gameDuration: calculateGameDuration(game["Début"], game["Fin"]),
      roles,
      playerRoles,
      playerDetails
    };
  });
}
