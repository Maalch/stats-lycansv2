import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData, useFilteredRawPonceData } from './useRawGameData';
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
    agent?: string;
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

export function useGameDetailsFromRaw(filters?: NavigationFilters) {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();
  const { data: rawPonceData, isLoading: ponceLoading, error: ponceError } = useFilteredRawPonceData();

  const enrichedGames = useMemo(() => {
    if (!rawGameData || !rawRoleData || !rawPonceData) return [];

    let filteredGames = [...rawGameData];

    // Apply navigation filters
    if (filters) {
      if (filters.selectedPlayer) {
        filteredGames = filteredGames.filter(game => 
          game["Liste des joueurs"].toLowerCase().includes(filters.selectedPlayer!.toLowerCase())
        );
      }

      if (filters.selectedGame) {
        filteredGames = filteredGames.filter(game => game.Game === filters.selectedGame);
      }

      if (filters.selectedCamp) {
        filteredGames = filteredGames.filter(game => {
          // If we have a selected player, filter by the camp that player was in
          if (filters.selectedPlayer) {
            const roleData = rawRoleData.find(role => role.Game === game.Game);
            if (!roleData) {
              return false;
            }
            
            const selectedPlayer = filters.selectedPlayer.toLowerCase();
            
            // Handle "Autres" category first - check if player is in any of the small camps
            if (filters.selectedCamp === 'Autres' && (filters as any)._smallCamps) {
              const smallCamps = (filters as any)._smallCamps as string[];
              // Check if player is in any of the small camps
              for (const camp of smallCamps) {
                let playerInThisCamp = false;
                
                // Check each role for this camp
                switch (camp) {
                  case 'Traître':
                    playerInThisCamp = !!(roleData.Traître && roleData.Traître.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Idiot du Village':
                    playerInThisCamp = !!(roleData["Idiot du village"] && roleData["Idiot du village"].toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Cannibale':
                    playerInThisCamp = !!(roleData.Cannibale && roleData.Cannibale.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Agent':
                    playerInThisCamp = !!(roleData.Agent && roleData.Agent.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Espion':
                    playerInThisCamp = !!(roleData.Espion && roleData.Espion.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Scientifique':
                    playerInThisCamp = !!(roleData.Scientifique && roleData.Scientifique.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Amoureux':
                    playerInThisCamp = !!(roleData.Amoureux && roleData.Amoureux.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'La Bête':
                    playerInThisCamp = !!(roleData["La Bête"] && roleData["La Bête"].toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Chasseur de primes':
                    playerInThisCamp = !!(roleData["Chasseur de primes"] && roleData["Chasseur de primes"].toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Vaudou':
                    playerInThisCamp = !!(roleData.Vaudou && roleData.Vaudou.toLowerCase().includes(selectedPlayer));
                    break;
                  case 'Villageois':
                    // For villagers, check if player is in game but not in any special role
                    const isInGame = game["Liste des joueurs"].toLowerCase().includes(selectedPlayer);
                    const isInSpecialRole = (
                      (roleData.Loups && roleData.Loups.toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Traître && roleData.Traître.toLowerCase().includes(selectedPlayer)) ||
                      (roleData["Idiot du village"] && roleData["Idiot du village"].toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Cannibale && roleData.Cannibale.toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Agent && roleData.Agent.toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Espion && roleData.Espion.toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Scientifique && roleData.Scientifique.toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Amoureux && roleData.Amoureux.toLowerCase().includes(selectedPlayer)) ||
                      (roleData["La Bête"] && roleData["La Bête"].toLowerCase().includes(selectedPlayer)) ||
                      (roleData["Chasseur de primes"] && roleData["Chasseur de primes"].toLowerCase().includes(selectedPlayer)) ||
                      (roleData.Vaudou && roleData.Vaudou.toLowerCase().includes(selectedPlayer))
                    );
                    playerInThisCamp = isInGame && !isInSpecialRole;
                    break;
                }
                
                if (playerInThisCamp) {
                  return true;
                }
              }
              
              return false;
            }
            
            // Check if player is in any specific role (for non-"Autres" camps)
            if (roleData.Loups && roleData.Loups.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Loups';
            }
            if (roleData.Traître && roleData.Traître.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Traître'; // Changed: Traitor should have its own camp
            }
            if (roleData["Idiot du village"] && roleData["Idiot du village"].toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Idiot du Village'; // Fixed: Use capital V to match color scheme
            }
            if (roleData.Cannibale && roleData.Cannibale.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Cannibale';
            }
            if (roleData.Agent && roleData.Agent.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Agent';
            }
            if (roleData.Espion && roleData.Espion.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Espion';
            }
            if (roleData.Scientifique && roleData.Scientifique.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Scientifique';
            }
            if (roleData.Amoureux && roleData.Amoureux.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Amoureux';
            }
            // Check other solo roles
            if (roleData["La Bête"] && roleData["La Bête"].toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'La Bête';
            }
            if (roleData["Chasseur de primes"] && roleData["Chasseur de primes"].toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Chasseur de primes';
            }
            if (roleData.Vaudou && roleData.Vaudou.toLowerCase().includes(selectedPlayer)) {
              return filters.selectedCamp === 'Vaudou';
            }
            
            // If player is in game but not in any special role, they're a villager
            const isInGame = game["Liste des joueurs"].toLowerCase().includes(selectedPlayer);
            if (isInGame) {
              return filters.selectedCamp === 'Villageois';
            }
            
            return false;
          } else {
            // If no specific player selected, use the campFilterMode to determine behavior
            const filterMode = filters.campFilterMode || 'wins-only'; // Default to wins-only for backward compatibility
            
            if (filterMode === 'wins-only') {
              // Original behavior: filter by winning camp only
              if (filters.selectedCamp === 'Autres' && (filters as any)._smallCamps) {
                const smallCamps = (filters as any)._smallCamps as string[];
                return smallCamps.includes(game["Camp victorieux"]);
              }
              return game["Camp victorieux"] === filters.selectedCamp;
            } else {
              // New behavior: filter by role assignments (all games where players were assigned to this camp)
              const roleData = rawRoleData.find(role => role.Game === game.Game);
              if (!roleData) {
                // If no role data, fall back to winning camp filter
                return game["Camp victorieux"] === filters.selectedCamp;
              }

              // Handle "Autres" category - check if any player is in any of the small camps
              if (filters.selectedCamp === 'Autres' && (filters as any)._smallCamps) {
                const smallCamps = (filters as any)._smallCamps as string[];
                return smallCamps.some(camp => {
                  switch (camp) {
                    case 'Traître':
                      return !!(roleData.Traître && roleData.Traître.trim());
                    case 'Idiot du Village':
                      return !!(roleData["Idiot du village"] && roleData["Idiot du village"].trim());
                    case 'Cannibale':
                      return !!(roleData.Cannibale && roleData.Cannibale.trim());
                    case 'Agent':
                      return !!(roleData.Agent && roleData.Agent.trim());
                    case 'Espion':
                      return !!(roleData.Espion && roleData.Espion.trim());
                    case 'Scientifique':
                      return !!(roleData.Scientifique && roleData.Scientifique.trim());
                    case 'Amoureux':
                      return !!(roleData.Amoureux && roleData.Amoureux.trim());
                    case 'La Bête':
                      return !!(roleData["La Bête"] && roleData["La Bête"].trim());
                    case 'Chasseur de primes':
                      return !!(roleData["Chasseur de primes"] && roleData["Chasseur de primes"].trim());
                    case 'Vaudou':
                      return !!(roleData.Vaudou && roleData.Vaudou.trim());
                    case 'Villageois':
                      // Check if there are any players who are not in special roles
                      const playersInGame = game["Liste des joueurs"].split(',').map(p => p.trim()).filter(p => p);
                      const playersInSpecialRoles = [
                        ...(roleData.Loups ? roleData.Loups.split(',').map(p => p.trim()).filter(p => p) : []),
                        ...(roleData.Traître ? [roleData.Traître.trim()].filter(p => p) : []),
                        ...(roleData["Idiot du village"] ? [roleData["Idiot du village"].trim()].filter(p => p) : []),
                        ...(roleData.Cannibale ? [roleData.Cannibale.trim()].filter(p => p) : []),
                        ...(roleData.Agent ? [roleData.Agent.trim()].filter(p => p) : []),
                        ...(roleData.Espion ? [roleData.Espion.trim()].filter(p => p) : []),
                        ...(roleData.Scientifique ? [roleData.Scientifique.trim()].filter(p => p) : []),
                        ...(roleData.Amoureux ? roleData.Amoureux.split(',').map(p => p.trim()).filter(p => p) : []),
                        ...(roleData["La Bête"] ? [roleData["La Bête"].trim()].filter(p => p) : []),
                        ...(roleData["Chasseur de primes"] ? [roleData["Chasseur de primes"].trim()].filter(p => p) : []),
                        ...(roleData.Vaudou ? [roleData.Vaudou.trim()].filter(p => p) : [])
                      ];
                      return playersInGame.some(player => !playersInSpecialRoles.includes(player));
                    default:
                      return false;
                  }
                });
              }

              // Check for specific camps
              switch (filters.selectedCamp) {
                case 'Loups':
                  return !!(roleData.Loups && roleData.Loups.trim());
                case 'Traître':
                  return !!(roleData.Traître && roleData.Traître.trim());
                case 'Idiot du Village':
                  return !!(roleData["Idiot du village"] && roleData["Idiot du village"].trim());
                case 'Cannibale':
                  return !!(roleData.Cannibale && roleData.Cannibale.trim());
                case 'Agent':
                  return !!(roleData.Agent && roleData.Agent.trim());
                case 'Espion':
                  return !!(roleData.Espion && roleData.Espion.trim());
                case 'Scientifique':
                  return !!(roleData.Scientifique && roleData.Scientifique.trim());
                case 'Amoureux':
                  return !!(roleData.Amoureux && roleData.Amoureux.trim());
                case 'La Bête':
                  return !!(roleData["La Bête"] && roleData["La Bête"].trim());
                case 'Chasseur de primes':
                  return !!(roleData["Chasseur de primes"] && roleData["Chasseur de primes"].trim());
                case 'Vaudou':
                  return !!(roleData.Vaudou && roleData.Vaudou.trim());
                case 'Villageois':
                  // Check if there are any players who are not in special roles
                  const playersInGame = game["Liste des joueurs"].split(',').map(p => p.trim()).filter(p => p);
                  const playersInSpecialRoles = [
                    ...(roleData.Loups ? roleData.Loups.split(',').map(p => p.trim()).filter(p => p) : []),
                    ...(roleData.Traître ? [roleData.Traître.trim()].filter(p => p) : []),
                    ...(roleData["Idiot du village"] ? [roleData["Idiot du village"].trim()].filter(p => p) : []),
                    ...(roleData.Cannibale ? [roleData.Cannibale.trim()].filter(p => p) : []),
                    ...(roleData.Agent ? [roleData.Agent.trim()].filter(p => p) : []),
                    ...(roleData.Espion ? [roleData.Espion.trim()].filter(p => p) : []),
                    ...(roleData.Scientifique ? [roleData.Scientifique.trim()].filter(p => p) : []),
                    ...(roleData.Amoureux ? roleData.Amoureux.split(',').map(p => p.trim()).filter(p => p) : []),
                    ...(roleData["La Bête"] ? [roleData["La Bête"].trim()].filter(p => p) : []),
                    ...(roleData["Chasseur de primes"] ? [roleData["Chasseur de primes"].trim()].filter(p => p) : []),
                    ...(roleData.Vaudou ? [roleData.Vaudou.trim()].filter(p => p) : [])
                  ];
                  return playersInGame.some(player => !playersInSpecialRoles.includes(player));
                default:
                  // For any other camp, fall back to winning camp filter
                  return game["Camp victorieux"] === filters.selectedCamp;
              }
            }
          }
        });
      }

      if (filters.selectedVictoryType) {
        filteredGames = filteredGames.filter(game => game["Type de victoire"] === filters.selectedVictoryType);
      }

      if (filters.selectedDate) {
        filteredGames = filteredGames.filter(game => {
          const gameDate = game.Date;
          
          // Check if selectedDate is a month filter (MM/YYYY format)
          if (filters.selectedDate!.includes('/') && filters.selectedDate!.split('/').length === 2) {
            const [month, year] = filters.selectedDate!.split('/');
            const gameDateParts = gameDate.split('/');
            if (gameDateParts.length === 3) {
              const [, gameMonth, gameYear] = gameDateParts;
              return gameMonth === month && gameYear === year;
            }
          } else {
            // Exact date match (DD/MM/YYYY)
            return gameDate === filters.selectedDate;
          }
          
          return false;
        });
      }

      if (filters.selectedPlayerPair && filters.selectedPairRole) {
        filteredGames = filteredGames.filter(game => {
          const roleData = rawRoleData.find(role => role.Game === game.Game);
          if (!roleData) return false;

          const [player1, player2] = filters.selectedPlayerPair!;
          const player1Lower = player1.toLowerCase();
          const player2Lower = player2.toLowerCase();

          if (filters.selectedPairRole === 'wolves') {
            // Check if both players are in the wolves list
            if (roleData.Loups) {
              const wolves = roleData.Loups.toLowerCase();
              return wolves.includes(player1Lower) && wolves.includes(player2Lower);
            }
          } else if (filters.selectedPairRole === 'lovers') {
            // Check if both players are in the lovers list
            if (roleData.Amoureux) {
              const lovers = roleData.Amoureux.toLowerCase();
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
          
          // Convert decimal to percentage for comparison
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
              // Include any value that is 100% or higher
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

      // New multi-player filtering for player comparison scenarios
      if (filters.selectedPlayers && filters.selectedPlayers.length === 2) {
        filteredGames = filteredGames.filter(game => {
          const playersInGame = game["Liste des joueurs"].toLowerCase();
          const [player1, player2] = filters.selectedPlayers!;
          
          // Check if both players are in the game
          const bothPlayersInGame = playersInGame.includes(player1.toLowerCase()) && 
                                   playersInGame.includes(player2.toLowerCase());
          
          if (!bothPlayersInGame) return false;

          // If mode is 'all-common-games', just return true since both players are in the game
          if (filters.playersFilterMode === 'all-common-games') {
            return true;
          }

          // If mode is 'opposing-camps', check if players were in different camps
          if (filters.playersFilterMode === 'opposing-camps') {
            const roleData = rawRoleData.find(role => role.Game === game.Game);
            if (!roleData) return false;

            // Function to get player's camp
            const getPlayerCamp = (playerName: string): string => {
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
              
              // If not in any special role, they're a villager
              return 'Villageois';
            };

            const player1Camp = getPlayerCamp(player1);
            const player2Camp = getPlayerCamp(player2);

            // Return true if players are in different camps
            return player1Camp !== player2Camp;
          }

          return false;
        });
      }
    }

    return filteredGames.map(game => {
      // Find corresponding role data
      const roleData = rawRoleData.find(role => role.Game === game.Game);
      
      // Find corresponding ponce data for this game
      const ponceDataForGame = rawPonceData.filter(ponce => ponce.Game === game.Game);

      // Parse roles
      const roles: EnrichedGameData['roles'] = {};
      if (roleData) {
        if (roleData.Loups) roles.wolves = roleData.Loups.split(', ').filter(Boolean);
        if (roleData.Traître) roles.traitor = roleData.Traître;
        if (roleData["Idiot du village"]) roles.villageIdiot = roleData["Idiot du village"];
        if (roleData.Cannibale) roles.cannibal = roleData.Cannibale;
        if (roleData.Agent) roles.agent = roleData.Agent;
        if (roleData.Espion) roles.spy = roleData.Espion;
        if (roleData.Scientifique) roles.scientist = roleData.Scientifique;
        if (roleData.Amoureux) roles.lovers = roleData.Amoureux.split(', ').filter(Boolean);
        if (roleData["La Bête"]) roles.beast = roleData["La Bête"];
        if (roleData["Chasseur de primes"]) roles.bountyHunter = roleData["Chasseur de primes"];
        if (roleData.Vaudou) roles.voodoo = roleData.Vaudou;
      }

      // Parse player details from ponce data
      const playerDetails = ponceDataForGame.map(ponce => ({
        player: 'Ponce', // Since this is Ponce-only data
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
      const allPlayers = game["Liste des joueurs"].split(', ').filter(Boolean);

      allPlayers.forEach(player => {
        let role = 'Villageois'; // Default role
        let camp = 'Villageois'; // Default camp

        // Check specific roles from roleData
        if (roleData) {
          if (roleData.Loups && roleData.Loups.split(', ').includes(player)) {
            role = 'Loups';
            camp = 'Loups';
          } else if (roleData.Traître && roleData.Traître === player) {
            role = 'Traître';
            camp = 'Loups'; 
          } else if (roleData["Idiot du village"] && roleData["Idiot du village"] === player) {
            role = 'Idiot du Village';
            camp = 'Idiot du Village'; 
          } else if (roleData.Cannibale && roleData.Cannibale === player) {
            role = 'Cannibale';
            camp = 'Cannibale';
          } else if (roleData.Agent && roleData.Agent.split(', ').includes(player)) {
            role = 'Agent';
            camp = 'Agent';
          } else if (roleData.Espion && roleData.Espion === player) {
            role = 'Espion';
            camp = 'Espion';
          } else if (roleData.Scientifique && roleData.Scientifique === player) {
            role = 'Scientifique';
            camp = 'Scientifique';
          } else if (roleData["La Bête"] && roleData["La Bête"] === player) {
            role = 'La Bête';
            camp = 'La Bête';
          } else if (roleData["Chasseur de primes"] && roleData["Chasseur de primes"] === player) {
            role = 'Chasseur de primes';
            camp = 'Chasseur de primes';
          } else if (roleData.Vaudou && roleData.Vaudou === player) {
            role = 'Vaudou';
            camp = 'Vaudou';
          }
          else if (roleData.Amoureux && roleData.Amoureux.split(', ').includes(player)) {
            if (role === 'Villageois') {
              role = 'Amoureux';
              camp = 'Amoureux';
            }
          }
        }

        playerRoles.push({
          player,
          role,
          camp
        });
      });

      const enriched: EnrichedGameData = {
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

      return enriched;
    });
  }, [rawGameData, rawRoleData, rawPonceData, filters]);

  const isLoading = gameLoading || roleLoading || ponceLoading;
  const error = gameError || roleError || ponceError;

  return {
    data: enrichedGames,
    isLoading,
    error
  };
}
