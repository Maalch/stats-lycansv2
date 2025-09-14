import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parseFrenchDate } from './utils/dataUtils';

// New GameLog interfaces
export interface PlayerStat {
  Username: string;
  MainRoleInitial: string;
  MainRoleFinal: string | null;
  Power: string | null;
  SecondaryRole: string | null;
  DeathDateIrl: string | null;
  DeathTiming: string | null;
  DeathPosition: number | null;
  KillerName: string | null;
  Victorious: boolean;
}

export interface LegacyData {
  VODLink: string | null;
  VODLinkEnd: string | null;
  Modded: boolean;
  Version: string;
}

export interface GameLogEntry {
  Id: string;
  StartDate: string;
  EndDate: string;
  MapName: string;
  HarvestGoal: number;
  HarvestDone: number;
  EndTiming: string | null;
  LegacyData: LegacyData | null;
  PlayerStats: PlayerStat[];
}

export interface GameLogData {
  ModVersion: string;
  TotalRecords: number;
  GameStats: GameLogEntry[];
}

// RawGameData interface removed - using GameLogEntry directly

export interface RawRoleData {
  Game: number;
  "Game Moddée": boolean;
  Loups: string | null;
  Traître: string | null;
  "Idiot du Village": string | null;
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
  gameData: GameLogEntry[];
  roleData: RawRoleData[];
  ponceData: RawPonceData[];
  brPartiesData: RawBRData[];
  brRefPartiesData: RawBRGlobalData[];
}

interface CombinedFilteredData {
  gameData: GameLogEntry[] | null;
  roleData: RawRoleData[] | null;
  ponceData: RawPonceData[] | null;
  brPartiesData: RawBRData[] | null;
  brRefPartiesData: RawBRGlobalData[] | null;
  isLoading: boolean;
  error: string | null;
}

// Transformation functions removed - using GameLogEntry directly

/**
 * Transform GameLogData to legacy RawRoleData format
 */
function transformToRawRoleData(gameLogData: GameLogData): RawRoleData[] {
  return gameLogData.GameStats.map((game, index) => {
    const gameNumber = index + 1;
    
    // Group players by role
    const roleGroups: { [key: string]: string[] } = {};
    
    game.PlayerStats.forEach(player => {
      const role = player.MainRoleInitial;
      if (!roleGroups[role]) {
        roleGroups[role] = [];
      }
      roleGroups[role].push(player.Username);
    });
    
    return {
      Game: gameNumber,
      "Game Moddée": game.LegacyData?.Modded || true,
      Loups: roleGroups['Loup']?.join(', ') || null,
      Traître: roleGroups['Traître']?.join(', ') || null,
      "Idiot du Village": roleGroups['Idiot du Village']?.join(', ') || null,
      Cannibale: roleGroups['Cannibale']?.join(', ') || null,
      Agent: roleGroups['Agent']?.join(', ') || null,
      Espion: roleGroups['Espion']?.join(', ') || null,
      Scientifique: roleGroups['Scientifique']?.join(', ') || null,
      Amoureux: roleGroups['Amoureux']?.join(', ') || null,
      "La Bête": roleGroups['La Bête']?.join(', ') || null,
      "Chasseur de primes": roleGroups['Chasseur de primes']?.join(', ') || null,
      Vaudou: roleGroups['Vaudou']?.join(', ') || null
    };
  });
}

/**
 * Transform GameLogData to legacy RawPonceData format
 * Note: This focuses on Ponce's data specifically
 */
function transformToRawPonceData(gameLogData: GameLogData): RawPonceData[] {
  return gameLogData.GameStats.map((game, index) => {
    const gameNumber = index + 1;
    const ponceData = game.PlayerStats.find(p => p.Username === 'Ponce');
    
    if (!ponceData) {
      // Return empty data if Ponce not in game
      return {
        Game: gameNumber,
        "Game Moddée": game.LegacyData?.Modded || true,
        Camp: null,
        Traître: false,
        "Rôle secondaire": null,
        "Pouvoir de loup": null,
        "Métier villageois": null,
        "Joueurs tués": null,
        "Jour de mort": null,
        "Type de mort": null,
        "Joueurs tueurs": null
      };
    }
    
    // Determine camp based on role
    let camp = '';
    if (ponceData.MainRoleInitial === 'Loup') {
      camp = 'Loups';
    } else if (ponceData.MainRoleInitial === 'Villageois') {
      camp = 'Villageois';
    } else if (ponceData.MainRoleInitial === 'Traître') {
      camp = 'Traître';
    } else {
      camp = ponceData.MainRoleInitial; // Solo roles
    }
    
    return {
      Game: gameNumber,
      "Game Moddée": game.LegacyData?.Modded || true,
      Camp: camp,
      Traître: ponceData.MainRoleInitial === 'Traître',
      "Rôle secondaire": ponceData.SecondaryRole,
      "Pouvoir de loup": ponceData.Power,
      "Métier villageois": ponceData.MainRoleInitial === 'Villageois' ? ponceData.Power : null,
      "Joueurs tués": null, // This would need additional data from game log
      "Jour de mort": ponceData.DeathPosition,
      "Type de mort": ponceData.DeathTiming,
      "Joueurs tueurs": ponceData.KillerName
    };
  });
}

/**
 * Centralized hook to fetch all raw data with a single loading state
 * Now loads from gameLog.json and transforms to legacy format for backward compatibility
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

        // Fetch the new gameLog.json and legacy BR data
        const [gameLogResponse, brResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/gameLog.json`),
          fetch(`${import.meta.env.BASE_URL}data/rawBRData.json`)
        ]);

        // Check if responses are ok
        if (!gameLogResponse.ok) throw new Error('Failed to fetch game log data');
        if (!brResponse.ok) throw new Error('Failed to fetch BR data');

        // Parse responses
        const [gameLogResult, brResult] = await Promise.all([
          gameLogResponse.json() as Promise<GameLogData>,
          brResponse.json() as Promise<RawBRResponse>
        ]);

        // Use GameLogEntry directly instead of transforming to legacy format
        const transformedRoleData = transformToRawRoleData(gameLogResult);
        const transformedPonceData = transformToRawPonceData(gameLogResult);

        setData({
          gameData: gameLogResult.GameStats,
          roleData: transformedRoleData,
          ponceData: transformedPonceData,
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
function applyCommonFilters<T extends { Game?: number; "Game Moddée"?: boolean; Date?: string }>(
  data: T[],
  settings: any,
  gameData?: GameLogEntry[]
): T[] {
  return data.filter(record => {
    // For non-game data, we need to find the corresponding game data
    let gameRecord = record as any;
    if (gameData && record.Game) {
      const correspondingGame = gameData.find((_, index) => index + 1 === record.Game);
      if (!correspondingGame) return false;
      // Convert GameLogEntry to a format compatible with legacy filtering
      gameRecord = {
        "Game Moddée": correspondingGame.LegacyData?.Modded || true,
        Date: new Date(correspondingGame.StartDate).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      };
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
function applyPlayerFilter(data: GameLogEntry[], settings: any): GameLogEntry[] {
  if (settings.playerFilter.mode === 'none' || settings.playerFilter.players.length === 0) {
    return data;
  }

  return data.filter(game => {
    const gamePlayersList = game.PlayerStats.map(p => p.Username.toLowerCase());
    
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
 * Apply common filters to GameLogEntry data
 */
function applyGameLogFilters(data: GameLogEntry[], settings: any): GameLogEntry[] {
  return data.filter(game => {
    // Apply game type filter
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      if (settings.gameFilter === 'modded') {
        if (!game.LegacyData?.Modded) return false;
      } else if (settings.gameFilter === 'non-modded') {
        if (game.LegacyData?.Modded) return false;
      }
    } 
    // Apply date range filter
    else if (settings.filterMode === 'dateRange') {
      if (settings.dateRange.start || settings.dateRange.end) {
        const gameDate = new Date(game.StartDate);
        if (settings.dateRange.start) {
          const startDate = new Date(settings.dateRange.start);
          if (gameDate < startDate) return false;
        }
        if (settings.dateRange.end) {
          const endDate = new Date(settings.dateRange.end);
          if (gameDate > endDate) return false;
        }
      }
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
    let filteredGameData = applyGameLogFilters(rawData.gameData, settings);
    filteredGameData = applyPlayerFilter(filteredGameData, settings);

    // Apply filters to other data based on the filtered game list
    const filteredGameIds = new Set(filteredGameData.map((_, index) => index + 1));
    
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

/**
 * New hook to work directly with GameLog structure
 * Use this for new features that can benefit from the richer data structure
 */
export function useGameLogData(): {
  data: GameLogData | null;
  isLoading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<GameLogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameLogData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.BASE_URL}data/gameLog.json`);
        if (!response.ok) throw new Error('Failed to fetch game log data');

        const result = await response.json() as GameLogData;
        setData(result);
      } catch (err) {
        console.error('Error fetching game log data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameLogData();
  }, []);

  return { data, isLoading, error };
}

/**
 * Filtered GameLog data that respects settings context
 */
export function useFilteredGameLogData(): {
  data: GameLogEntry[] | null;
  isLoading: boolean;
  error: string | null;
} {
  const { settings } = useSettings();
  const { data: rawGameLogData, isLoading, error } = useGameLogData();

  const filteredData = useMemo(() => {
    if (!rawGameLogData) return null;

    return rawGameLogData.GameStats.filter(game => {
      // Apply game type filter
      if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
        if (settings.gameFilter === 'modded') {
          if (!game.LegacyData?.Modded) return false;
        } else if (settings.gameFilter === 'non-modded') {
          if (game.LegacyData?.Modded) return false;
        }
      }
      // Apply date range filter
      else if (settings.filterMode === 'dateRange') {
        if (settings.dateRange.start || settings.dateRange.end) {
          const gameDate = new Date(game.StartDate);
          if (settings.dateRange.start) {
            const startDate = new Date(settings.dateRange.start);
            if (gameDate < startDate) return false;
          }
          if (settings.dateRange.end) {
            const endDate = new Date(settings.dateRange.end);
            if (gameDate > endDate) return false;
          }
        }
      }

      // Apply player filter
      if (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) {
        const gamePlayersList = game.PlayerStats.map(p => p.Username.toLowerCase());
        
        if (settings.playerFilter.mode === 'include') {
          const hasAllPlayers = settings.playerFilter.players.every((player: string) => 
            gamePlayersList.includes(player.toLowerCase())
          );
          if (!hasAllPlayers) return false;
        } else if (settings.playerFilter.mode === 'exclude') {
          const hasAnyPlayer = settings.playerFilter.players.some((player: string) => 
            gamePlayersList.includes(player.toLowerCase())
          );
          if (hasAnyPlayer) return false;
        }
      }

      return true;
    });
  }, [rawGameLogData, settings]);

  return { data: filteredData, isLoading, error };
}
