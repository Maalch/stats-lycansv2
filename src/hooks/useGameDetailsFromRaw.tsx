import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData, useFilteredRawPonceData } from './useRawGameData';
import type { NavigationFilters } from '../context/NavigationContext';

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
  startTime: string | null;
  endTime: string | null;
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
    isAlive: boolean;
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
            // If no specific player selected, filter by winning camp (legacy behavior)
            return game["Camp victorieux"] === filters.selectedCamp;
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
        secondaryRole: ponce["Rôle secondaire"],
        wolfPower: ponce["Pouvoir de loup"],
        villagerJob: ponce["Métier villageois"],
        playersKilled: ponce["Joueurs tués"],
        deathDay: ponce["Jour de mort"],
        deathType: ponce["Type de mort"],
        killers: ponce["Joueurs tueurs"]
      }));

      // Create comprehensive player roles list
      const playerRoles: EnrichedGameData['playerRoles'] = [];
      const allPlayers = game["Liste des joueurs"].split(', ').filter(Boolean);
      const winners = game["Liste des gagnants"].split(', ').filter(Boolean);

      allPlayers.forEach(player => {
        let role = 'Villageois'; // Default role
        let camp = 'Villageois'; // Default camp
        const isAlive = winners.includes(player);

        // Check specific roles from roleData
        if (roleData) {
          if (roleData.Loups && roleData.Loups.split(', ').includes(player)) {
            role = 'Loup-Garou';
            camp = 'Loups';
          } else if (roleData.Traître && roleData.Traître === player) {
            role = 'Traître';
            camp = 'Traître'; // Fixed: Use Traître camp instead of Loups
          } else if (roleData["Idiot du village"] && roleData["Idiot du village"] === player) {
            role = 'Idiot du village';
            camp = 'Idiot du Village'; // Fixed: Use capital V to match color scheme
          } else if (roleData.Cannibale && roleData.Cannibale === player) {
            role = 'Cannibale';
            camp = 'Cannibale';
          } else if (roleData.Agent && roleData.Agent === player) {
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

          // Check if player is a lover (can be combined with other roles)
          if (roleData.Amoureux && roleData.Amoureux.split(', ').includes(player)) {
            if (role === 'Villageois') {
              role = 'Amoureux';
            } else {
              role = `${role} (Amoureux)`;
            }
            // If player won and was lover, they were probably in the lovers camp
            if (isAlive && game["Camp victorieux"] === "Amoureux") {
              camp = 'Amoureux';
            }
          }
        }

        playerRoles.push({
          player,
          role,
          camp,
          isAlive
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
        startTime: game["Début"],
        endTime: game["Fin"],
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
