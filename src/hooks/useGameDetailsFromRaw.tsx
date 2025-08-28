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
        filteredGames = filteredGames.filter(game => game["Camp victorieux"] === filters.selectedCamp);
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
