import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parseFrenchDate } from './utils/dataUtils';

// Re-export the interfaces for convenience
export interface RawGameData {
  Game: number;
  Date: string;
  "Game Moddée": boolean;
  "Nombre de joueurs": number;
  "Nombre de loups": number;
  "Rôle Traître": boolean;
  "Rôle Amoureux": boolean;
  "Rôles solo": string | null;
  "Camp victorieux": string;
  "Type de victoire": string;
  "Nombre de journées": number;
  "Survivants villageois": number;
  "Survivants loups (traître inclus)": number;
  "Survivants amoureux": number | null;
  "Survivants solo": number | null;
  "Liste des gagnants": string;
  "Récolte": number | null;
  "Total récolte": number | null;
  "Pourcentage de récolte": number | null;
  "Liste des joueurs": string;
  "Versions": string | null;
  "Map": string | null;
  "Début": string | null;
  "Fin": string | null;
}

export interface RawRoleData {
  Game: number;
  "Game Moddée": boolean;
  Loups: string | null;
  Traître: string | null;
  "Idiot du village": string | null;
  Cannibale: string | null;
  Agent: string | null;
  Espion: string | null;
  Scientifique: string | null;
  Amoureux: string | null;
  "La Bête": string | null;
  "Chasseur de primes": string | null;
  Vaudou: string | null;
}

export interface RawPonceData {
  Game: number;
  "Game Moddée": boolean;
  Camp: string | null;
  Traître: boolean;
  "Rôle secondaire": string | null;
  "Pouvoir de loup": string | null;
  "Métier villageois": string | null;
  "Joueurs tués": string | null;
  "Jour de mort": number | null;
  "Type de mort": string | null;
  "Joueurs tueurs": string | null;
}

export interface RawBRData {
  Game: number;
  Participants: string;
  Score: number;
  Gagnant: boolean;
}

export interface RawBRGlobalData {
  Game: number;
  "Nombre de participants": number;
  Date: string;
  VOD: string | null;
  "Game Moddée": boolean;
}

interface RawDataResponse<T> {
  lastUpdated: string;
  totalRecords: number;
  data: T[];
}

interface RawBRResponse {
  lastUpdated: string;
  BRParties: {
    totalRecords: number;
    data: RawBRData[];
  };
  BRRefParties: {
    totalRecords: number;
    data: RawBRGlobalData[];
  };
}

interface CombinedRawData {
  gameData: RawGameData[];
  roleData: RawRoleData[];
  ponceData: RawPonceData[];
  brPartiesData: RawBRData[];
  brRefPartiesData: RawBRGlobalData[];
}

interface CombinedFilteredData {
  gameData: RawGameData[] | null;
  roleData: RawRoleData[] | null;
  ponceData: RawPonceData[] | null;
  brPartiesData: RawBRData[] | null;
  brRefPartiesData: RawBRGlobalData[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Centralized hook to fetch all raw data with a single loading state
 * This prevents multiple concurrent API calls and provides better performance
 */
function useCombinedRawData(): {
  data: CombinedRawData | null;
  isLoading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<CombinedRawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllRawData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data concurrently
        const [gameResponse, roleResponse, ponceResponse, brResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/rawGameData.json`),
          fetch(`${import.meta.env.BASE_URL}data/rawRoleData.json`),
          fetch(`${import.meta.env.BASE_URL}data/rawPonceData.json`),
          fetch(`${import.meta.env.BASE_URL}data/rawBRData.json`)
        ]);

        // Check if all responses are ok
        if (!gameResponse.ok) throw new Error('Failed to fetch game data');
        if (!roleResponse.ok) throw new Error('Failed to fetch role data');
        if (!ponceResponse.ok) throw new Error('Failed to fetch ponce data');
        if (!brResponse.ok) throw new Error('Failed to fetch BR data');

        // Parse all responses
        const [gameResult, roleResult, ponceResult, brResult] = await Promise.all([
          gameResponse.json() as Promise<RawDataResponse<RawGameData>>,
          roleResponse.json() as Promise<RawDataResponse<RawRoleData>>,
          ponceResponse.json() as Promise<RawDataResponse<RawPonceData>>,
          brResponse.json() as Promise<RawBRResponse>
        ]);

        setData({
          gameData: gameResult.data || [],
          roleData: roleResult.data || [],
          ponceData: ponceResult.data || [],
          brPartiesData: brResult.BRParties?.data || [],
          brRefPartiesData: brResult.BRRefParties?.data || []
        });
      } catch (err) {
        console.error('Error fetching combined raw data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllRawData();
  }, []);

  return { data, isLoading, error };
}

/**
 * Apply common filter logic to any dataset
 */
function applyCommonFilters<T extends { Game: number; "Game Moddée"?: boolean; Date?: string }>(
  data: T[],
  settings: any,
  gameData?: RawGameData[]
): T[] {
  return data.filter(record => {
    // For non-game data, we need to find the corresponding game data
    let gameRecord = record as any;
    if (gameData && record.Game) {
      const correspondingGame = gameData.find(game => game.Game === record.Game);
      if (!correspondingGame) return false;
      gameRecord = correspondingGame;
    }

    // Apply game type filter
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      if (settings.gameFilter === 'modded') {
        if (!gameRecord["Game Moddée"]) return false;
      } else if (settings.gameFilter === 'non-modded') {
        if (gameRecord["Game Moddée"]) return false;
      }
    } 
    // Apply date range filter
    else if (settings.filterMode === 'dateRange') {
      if (settings.dateRange.start || settings.dateRange.end) {
        const gameDateObj = parseFrenchDate(gameRecord.Date);
        if (!gameDateObj) return false;
        if (settings.dateRange.start) {
          const startObj = new Date(settings.dateRange.start);
          if (gameDateObj < startObj) return false;
        }
        if (settings.dateRange.end) {
          const endObj = new Date(settings.dateRange.end);
          if (gameDateObj > endObj) return false;
        }
      }
    }

    return true;
  });
}

/**
 * Apply player filter to game data
 */
function applyPlayerFilter(data: RawGameData[], settings: any): RawGameData[] {
  if (settings.playerFilter.mode === 'none' || settings.playerFilter.players.length === 0) {
    return data;
  }

  return data.filter(game => {
    const gamePlayersList = game["Liste des joueurs"].toLowerCase();
    
    if (settings.playerFilter.mode === 'include') {
      // For include mode: ALL selected players must be in the game
      const hasAllPlayers = settings.playerFilter.players.every((player: string) => 
        gamePlayersList.includes(player.toLowerCase())
      );
      return hasAllPlayers;
    } else if (settings.playerFilter.mode === 'exclude') {
      // For exclude mode: if ANY selected player is in the game, exclude it
      const hasAnyPlayer = settings.playerFilter.players.some((player: string) => 
        gamePlayersList.includes(player.toLowerCase())
      );
      return !hasAnyPlayer;
    }

    return true;
  });
}

/**
 * Apply player filter to BR participant data
 */
function applyPlayerFilterToBR(data: RawBRData[], settings: any): RawBRData[] {
  if (settings.playerFilter.mode === 'none' || settings.playerFilter.players.length === 0) {
    return data;
  }

  return data.filter(record => {
    const participantName = record.Participants.toLowerCase();
    
    if (settings.playerFilter.mode === 'include') {
      return settings.playerFilter.players.some((player: string) => 
        participantName.includes(player.toLowerCase())
      );
    } else if (settings.playerFilter.mode === 'exclude') {
      return !settings.playerFilter.players.some((player: string) => 
        participantName.includes(player.toLowerCase())
      );
    }

    return true;
  });
}

/**
 * Main hook that provides all filtered raw data with consistent filtering
 */
export function useCombinedFilteredRawData(): CombinedFilteredData {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useCombinedRawData();

  const filteredData = useMemo(() => {
    if (!rawData) {
      return {
        gameData: null,
        roleData: null,
        ponceData: null,
        brPartiesData: null,
        brRefPartiesData: null
      };
    }

    // Apply filters to game data first (with player filters)
    let filteredGameData = applyCommonFilters(rawData.gameData, settings);
    filteredGameData = applyPlayerFilter(filteredGameData, settings);

    // Apply filters to other data based on the filtered game list
    const filteredGameIds = new Set(filteredGameData.map(game => game.Game));
    
    const filteredRoleData = rawData.roleData.filter(role => 
      filteredGameIds.has(role.Game)
    );
    
    const filteredPonceData = rawData.ponceData.filter(ponce => 
      filteredGameIds.has(ponce.Game)
    );

    // For BR data, apply filters with reference to global game data
    let filteredBRPartiesData = rawData.brPartiesData.filter(record => {
      if (!record.Game || !record.Participants) return false;
      
      const globalGameData = rawData.brRefPartiesData.find(globalRecord => 
        globalRecord.Game === record.Game
      );
      
      if (!globalGameData) {
        return applyPlayerFilterToBR([record], settings).length > 0;
      }
      
      // Apply common filters using global game data
      const commonFiltered = applyCommonFilters([record], settings, [globalGameData as any]);
      if (commonFiltered.length === 0) return false;
      
      // Apply player filter
      return applyPlayerFilterToBR([record], settings).length > 0;
    });

    const filteredBRRefPartiesData = applyCommonFilters(rawData.brRefPartiesData, settings);

    return {
      gameData: filteredGameData,
      roleData: filteredRoleData,
      ponceData: filteredPonceData,
      brPartiesData: filteredBRPartiesData,
      brRefPartiesData: filteredBRRefPartiesData
    };
  }, [rawData, settings]);

  return {
    ...filteredData,
    isLoading,
    error
  };
}

/**
 * Individual hooks for backward compatibility
 */
export function useFilteredRawGameData() {
  const { gameData, isLoading, error } = useCombinedFilteredRawData();
  return { data: gameData, isLoading, error };
}

export function useFilteredRawRoleData() {
  const { roleData, isLoading, error } = useCombinedFilteredRawData();
  return { data: roleData, isLoading, error };
}

export function useFilteredRawPonceData() {
  const { ponceData, isLoading, error } = useCombinedFilteredRawData();
  return { data: ponceData, isLoading, error };
}

export function useFilteredRawBRData() {
  const { brPartiesData, isLoading, error } = useCombinedFilteredRawData();
  return { data: brPartiesData, isLoading, error };
}

export function useFilteredRawBRGlobalData() {
  const { brRefPartiesData, isLoading, error } = useCombinedFilteredRawData();
  return { data: brRefPartiesData, isLoading, error };
}
