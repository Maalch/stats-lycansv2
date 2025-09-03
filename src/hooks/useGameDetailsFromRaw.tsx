import { useFullStatsBase } from './utils/baseStatsHook';
import { splitAndTrim } from './utils/dataUtils';
import type { RawGameData, RawRoleData, RawPonceData } from './useCombinedRawData';
import type { NavigationFilters } from '../context/NavigationContext';
import { createYouTubeEmbedUrl, calculateGameDuration } from '../utils/gameUtils';

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
 * Helper function to get player's camp from role data
 */
function getPlayerCampFromRoles(
  playerName: string, 
  roleData: RawRoleData
): string {
  const player = playerName.toLowerCase();
  
  // Check each role type
  if (roleData.Loups && roleData.Loups.toLowerCase().includes(player)) return 'Loups';
  if (roleData.Traître && roleData.Traître.toLowerCase().includes(player)) return 'Loups';
  if (roleData["Idiot du village"] && roleData["Idiot du village"].toLowerCase().includes(player)) return 'Idiot du Village';
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
      return !!(roleData["Idiot du village"] && roleData["Idiot du village"].toLowerCase().includes(selectedPlayer));
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
        ...(roleData["Idiot du village"] ? [roleData["Idiot du village"].trim()] : []),
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
 * Apply navigation filters to game data
 */
function applyNavigationFilters(
  gameData: RawGameData[],
  roleData: RawRoleData[],
  filters?: NavigationFilters
): RawGameData[] {
  if (!filters) return gameData;

  let filteredGames = [...gameData];

  // Filter by selected player
  if (filters.selectedPlayer) {
    filteredGames = filteredGames.filter(game => 
      game["Liste des joueurs"].toLowerCase().includes(filters.selectedPlayer!.toLowerCase())
    );
  }

  // Filter by selected game
  if (filters.selectedGame) {
    filteredGames = filteredGames.filter(game => game.Game === filters.selectedGame);
  }

  // Filter by selected camp (complex logic)
  if (filters.selectedCamp) {
    filteredGames = filteredGames.filter(game => {
      const roleDataForGame = roleData.find(role => role.Game === game.Game);
      if (!roleDataForGame) return false;

      if (filters.selectedPlayer) {
        // Handle "Autres" category for specific player
        if (filters.selectedCamp === 'Autres' && (filters as any)._smallCamps) {
          const smallCamps = (filters as any)._smallCamps as string[];
          return smallCamps.some(camp => 
            isPlayerInSmallCamp(filters.selectedPlayer!, camp, roleDataForGame, game)
          );
        }

        // Check specific camp for specific player
        const playerCamp = getPlayerCampFromRoles(filters.selectedPlayer, roleDataForGame);
        
        // Special handling for Agent camp: when filtering by Agent camp wins, 
        // check if the specific player is in the winners list
        if (playerCamp === 'Agent' && filters.selectedCamp === 'Agent' && game["Camp victorieux"] === 'Agent') {
          const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
          return winnersList.some(winner => winner.toLowerCase() === filters.selectedPlayer!.toLowerCase());
        }
        
        return playerCamp === filters.selectedCamp;
      } else {
        // Filter by camp without specific player
        const filterMode = filters.campFilterMode || 'wins-only';
        
        if (filterMode === 'wins-only') {
          if (filters.selectedCamp === 'Autres' && (filters as any)._smallCamps) {
            const smallCamps = (filters as any)._smallCamps as string[];
            return smallCamps.includes(game["Camp victorieux"]);
          }
          return game["Camp victorieux"] === filters.selectedCamp;
        } else {
          // Check if any player was assigned to this camp
          if (filters.selectedCamp === 'Autres' && (filters as any)._smallCamps) {
            const smallCamps = (filters as any)._smallCamps as string[];
            return smallCamps.some(camp => {
              switch (camp) {
                case 'Traître':
                  return !!(roleDataForGame.Traître && roleDataForGame.Traître.trim());
                case 'Idiot du Village':
                  return !!(roleDataForGame["Idiot du village"] && roleDataForGame["Idiot du village"].trim());
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
                  const playersInSpecialRoles = [
                    ...splitAndTrim(roleDataForGame.Loups || ''),
                    ...(roleDataForGame.Traître ? [roleDataForGame.Traître.trim()] : []),
                    ...(roleDataForGame["Idiot du village"] ? [roleDataForGame["Idiot du village"].trim()] : []),
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
                default:
                  return false;
              }
            });
          }

          // Check specific camp assignment
          switch (filters.selectedCamp) {
            case 'Loups':
              return !!(roleDataForGame.Loups && roleDataForGame.Loups.trim());
            case 'Traître':
              return !!(roleDataForGame.Traître && roleDataForGame.Traître.trim());
            case 'Villageois':
              const playersInGame = splitAndTrim(game["Liste des joueurs"]);
              const playersInSpecialRoles = [
                ...splitAndTrim(roleDataForGame.Loups || ''),
                ...(roleDataForGame.Traître ? [roleDataForGame.Traître.trim()] : []),
                ...(roleDataForGame["Idiot du village"] ? [roleDataForGame["Idiot du village"].trim()] : []),
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
              return !!(roleDataForGame["Idiot du village"] && roleDataForGame["Idiot du village"].trim());
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
              return game["Camp victorieux"] === filters.selectedCamp;
          }
        }
      }
    });
  }

  // Apply other filters (victory type, date, player pairs, harvest range, etc.)
  if (filters.selectedVictoryType) {
    filteredGames = filteredGames.filter(game => game["Type de victoire"] === filters.selectedVictoryType);
  }

  if (filters.selectedDate) {
    filteredGames = filteredGames.filter(game => {
      const gameDate = game.Date;
      
      if (filters.selectedDate!.includes('/') && filters.selectedDate!.split('/').length === 2) {
        const [month, year] = filters.selectedDate!.split('/');
        const gameDateParts = gameDate.split('/');
        if (gameDateParts.length === 3) {
          const [, gameMonth, gameYear] = gameDateParts;
          return gameMonth === month && gameYear === year;
        }
      } else {
        return gameDate === filters.selectedDate;
      }
      
      return false;
    });
  }

  if (filters.selectedPlayerPair && filters.selectedPairRole) {
    filteredGames = filteredGames.filter(game => {
      const roleDataForGame = roleData.find(role => role.Game === game.Game);
      if (!roleDataForGame) return false;

      const [player1, player2] = filters.selectedPlayerPair!;
      const player1Lower = player1.toLowerCase();
      const player2Lower = player2.toLowerCase();

      if (filters.selectedPairRole === 'wolves') {
        if (roleDataForGame.Loups) {
          const wolves = roleDataForGame.Loups.toLowerCase();
          return wolves.includes(player1Lower) && wolves.includes(player2Lower);
        }
      } else if (filters.selectedPairRole === 'lovers') {
        if (roleDataForGame.Amoureux) {
          const lovers = roleDataForGame.Amoureux.toLowerCase();
          return lovers.includes(player1Lower) && lovers.includes(player2Lower);
        }
      }

      return false;
    });
  }

  if (filters.selectedHarvestRange) {
    filteredGames = filteredGames.filter(game => {
      const harvestPercent = game["Pourcentage de récolte"];
      if (harvestPercent === null || harvestPercent === undefined) return false;
      
      const percentageValue = harvestPercent * 100;
      
      const range = filters.selectedHarvestRange!;
      switch (range) {
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

  if (filters.selectedGameDuration) {
    filteredGames = filteredGames.filter(game => {
      const gameDays = game["Nombre de journées"];
      return gameDays === filters.selectedGameDuration;
    });
  }

  if (filters.selectedPlayers && filters.selectedPlayers.length === 2) {
    filteredGames = filteredGames.filter(game => {
      const playersInGame = game["Liste des joueurs"].toLowerCase();
      const [player1, player2] = filters.selectedPlayers!;
      
      const bothPlayersInGame = playersInGame.includes(player1.toLowerCase()) && 
                               playersInGame.includes(player2.toLowerCase());
      
      if (!bothPlayersInGame) return false;

      if (filters.playersFilterMode === 'all-common-games') {
        if (filters.winnerPlayer) {
          const roleDataForGame = roleData.find(role => role.Game === game.Game);
          if (!roleDataForGame) return true;
          
          const winnerCamp = getPlayerCampFromRoles(filters.winnerPlayer, roleDataForGame);
          
          // Special handling for Agent camp: check if player is in winners list
          if (winnerCamp === "Agent" && game["Camp victorieux"] === "Agent") {
            const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
            return winnersList.some(winner => winner.toLowerCase() === filters.winnerPlayer!.toLowerCase());
          }
          
          return game["Camp victorieux"] === winnerCamp;
        }
        return true;
      }

      if (filters.playersFilterMode === 'opposing-camps') {
        const roleDataForGame = roleData.find(role => role.Game === game.Game);
        if (!roleDataForGame) return false;

        const player1Camp = getPlayerCampFromRoles(player1, roleDataForGame);
        const player2Camp = getPlayerCampFromRoles(player2, roleDataForGame);

        const inOpposingCamps = player1Camp !== player2Camp;
        if (!inOpposingCamps) return false;

        if (filters.winnerPlayer) {
          const winnerCamp = getPlayerCampFromRoles(filters.winnerPlayer, roleDataForGame);
          
          // Special handling for Agent camp: check if player is in winners list
          if (winnerCamp === "Agent" && game["Camp victorieux"] === "Agent") {
            const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
            return winnersList.some(winner => winner.toLowerCase() === filters.winnerPlayer!.toLowerCase());
          }
          
          return game["Camp victorieux"] === winnerCamp;
        }

        return true;
      }

      if (filters.playersFilterMode === 'same-camp') {
        const roleDataForGame = roleData.find(role => role.Game === game.Game);
        if (!roleDataForGame) return false;

        const player1Camp = getPlayerCampFromRoles(player1, roleDataForGame);
        const player2Camp = getPlayerCampFromRoles(player2, roleDataForGame);

        const inSameCamp = player1Camp === player2Camp;
        if (!inSameCamp) return false;

        if (filters.winnerPlayer) {
          const winnerCamp = getPlayerCampFromRoles(filters.winnerPlayer, roleDataForGame);
          
          // Special handling for Agent camp: check if player is in winners list
          if (winnerCamp === "Agent" && game["Camp victorieux"] === "Agent") {
            const winnersList = splitAndTrim(game["Liste des gagnants"]?.toString() || "");
            return winnersList.some(winner => winner.toLowerCase() === filters.winnerPlayer!.toLowerCase());
          }
          
          return game["Camp victorieux"] === winnerCamp;
        }

        return true;
      }

      return false;
    });
  }

  return filteredGames;
}

/**
 * Compute enriched game details from raw data
 */
function computeGameDetails(
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
    const roles: EnrichedGameData['roles'] = {};
    if (roleDataForGame) {
      if (roleDataForGame.Loups) roles.wolves = splitAndTrim(roleDataForGame.Loups);
      if (roleDataForGame.Traître) roles.traitor = roleDataForGame.Traître;
      if (roleDataForGame["Idiot du village"]) roles.villageIdiot = roleDataForGame["Idiot du village"];
      if (roleDataForGame.Cannibale) roles.cannibal = roleDataForGame.Cannibale;
      if (roleDataForGame.Agent) roles.agent = splitAndTrim(roleDataForGame.Agent);
      if (roleDataForGame.Espion) roles.spy = roleDataForGame.Espion;
      if (roleDataForGame.Scientifique) roles.scientist = roleDataForGame.Scientifique;
      if (roleDataForGame.Amoureux) roles.lovers = splitAndTrim(roleDataForGame.Amoureux);
      if (roleDataForGame["La Bête"]) roles.beast = roleDataForGame["La Bête"];
      if (roleDataForGame["Chasseur de primes"]) roles.bountyHunter = roleDataForGame["Chasseur de primes"];
      if (roleDataForGame.Vaudou) roles.voodoo = roleDataForGame.Vaudou;
    }

    // Parse player details from ponce data
    const playerDetails = ponceDataForGame.map(ponce => ({
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

    // Create comprehensive player roles list
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
        } else if (roleDataForGame["Idiot du village"] && splitAndTrim(roleDataForGame["Idiot du village"]).includes(player)) {
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
      youtubeEmbedUrl: createYouTubeEmbedUrl(game["Début"], game["Fin"]),
      gameDuration: calculateGameDuration(game["Début"], game["Fin"]),
      roles,
      playerRoles,
      playerDetails
    };
  });
}

export function useGameDetailsFromRaw(filters?: NavigationFilters) {
  const { data: enrichedGames, isLoading, error } = useFullStatsBase(
    (gameData, roleData, ponceData) => computeGameDetails(gameData, roleData, ponceData, filters)
  );

  return {
    data: enrichedGames || [],
    isLoading,
    error
  };
}
