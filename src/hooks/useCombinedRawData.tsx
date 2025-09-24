import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parseFrenchDate } from './utils/dataUtils';
import { PLAYER_NAME_MAPPING } from '../utils/playerNameMapping';

// New GameLog interfaces
export interface Vote {
  Target: string;                 // Player name targeted by the vote or "Passé" for abstention
  Date: string;                   // ISO date string when the vote was cast
}

export interface PlayerStat {
  Username: string;
  Color?: string;                 // Player color assigned in game
  MainRoleInitial: string;        // Original role at game start
  MainRoleFinal: string | null;    // Final role if changed (e.g., by role swap)
  Power: string | null;           // Special power (linked to the role), if any
  SecondaryRole: string | null;     // Secondary role if any
  DeathDateIrl: string | null;    // Real-life date of death in game
  DeathTiming: string | null;     // Timing of death (e.g., "Nuit 2 --> N2", "Jour 3 --> J3")
  DeathPosition: {                // Game coordinates of death
    x: number;
    y: number;
    z: number;
  } | null;
  DeathType: string | null;       // Type of death (e.g., "Tué par un loup")
  KillerName: string | null;      // Name of the killer if applicable
  Victorious: boolean;            // Whether the player was on the winning side
  Votes: Vote[];                  // Array of votes cast by this player during meetings
}

export interface LegacyData {
  VODLink: string | null;
  VODLinkEnd: string | null;
  VictoryType: string | null; // E.g., "Votes", "Tous les loups tués", "Domination loups" etc.
}

export interface GameLogEntry {
  Id: string;
  DisplayedId: string;    // Global chronological game number (e.g., "123")
  StartDate: string;
  EndDate: string;
  MapName: string;
  HarvestGoal: number;           // Target harvest for the game
  HarvestDone: number;            // Actual harvest achieved at the end of the game
  EndTiming: string | null;       // Timing of game end (e.g., "Nuit 5 --> N5", "Jour 6 --> J6")
  Version: string;               // Mod version used for the game
  Modded: boolean;              // Whether the game was modded or not
  LegacyData: LegacyData | null;
  PlayerStats: PlayerStat[];
}

export interface GameLogData {
  ModVersion: string;
  TotalRecords: number;
  GameStats: GameLogEntry[];
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
  brPartiesData: RawBRData[];
  brRefPartiesData: RawBRGlobalData[];
}

interface CombinedFilteredData {
  gameData: GameLogEntry[] | null;
  brPartiesData: RawBRData[] | null;
  brRefPartiesData: RawBRGlobalData[] | null;
  isLoading: boolean;
  error: string | null;
}



/**
 * Centralized hook to fetch all raw data with a single loading state
 * Now loads from gameLog.json directly without legacy transformations
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

        // Generate DisplayedId values for all games
        const displayedIdMap = generateDisplayedIds(gameLogResult.GameStats);

        // Add DisplayedId to each game and normalize player names
        const gameDataWithDisplayedIds = gameLogResult.GameStats.map(game => {
          const gameWithDisplayedId = {
            ...game,
            DisplayedId: displayedIdMap.get(game.Id) || game.Id // Fallback to original ID
          };
          
          // Normalize all player names in the game
          return normalizeGameLogEntry(gameWithDisplayedId);
        });

        setData({
          gameData: gameDataWithDisplayedIds,
          brPartiesData: (brResult.BRParties?.data || []).map(normalizeBRData),
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
        "Game Moddée": correspondingGame.Modded || true,
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
    //for now: hard filter on only Ponce game
    if (!game.Id.toLowerCase().includes('ponce')) return false;

    // Apply game type filter
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      const isModded = game.Modded ?? true; // Default to true if no LegacyData
      if (settings.gameFilter === 'modded') {
        if (!isModded) return false;
      } else if (settings.gameFilter === 'non-modded') {
        if (isModded) return false;
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
    // Apply map name filter
    else if (settings.filterMode === 'mapName') {
      if (settings.mapNameFilter !== 'all') {
        const mapName = game.MapName || '';
        if (settings.mapNameFilter === 'village' && mapName !== 'Village') return false;
        if (settings.mapNameFilter === 'chateau' && mapName !== 'Château') return false;
        if (settings.mapNameFilter === 'others' && (mapName === 'Village' || mapName === 'Château')) return false;
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
        brPartiesData: null,
        brRefPartiesData: null
      };
    }

    // Apply filters to game data first (with player filters)
    let filteredGameData = applyGameLogFilters(rawData.gameData, settings);
    filteredGameData = applyPlayerFilter(filteredGameData, settings);


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
        
        // Normalize player names in the GameLog data
        const normalizedResult = {
          ...result,
          GameStats: result.GameStats.map(normalizeGameLogEntry)
        };
        
        setData(normalizedResult);
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
        const isModded = game.Modded ?? true; // Default to true if no LegacyData
        if (settings.gameFilter === 'modded') {
          if (!isModded) return false;
        } else if (settings.gameFilter === 'non-modded') {
          if (isModded) return false;
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
      // Apply map name filter
      else if (settings.filterMode === 'mapName') {
        if (settings.mapNameFilter !== 'all') {
          const mapName = game.MapName || '';
          if (settings.mapNameFilter === 'village' && mapName !== 'Village') return false;
          if (settings.mapNameFilter === 'chateau' && mapName !== 'Château') return false;
          if (settings.mapNameFilter === 'others' && (mapName === 'Village' || mapName === 'Château')) return false;
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


/**
 * Extract timestamp and trailing number from game ID
 */
function parseGameId(gameId: string): { timestamp: string; trailingNumber: number } {
  const parts = gameId.split('-');
  
  if (parts.length === 3) {
    // Legacy format: "Ponce-20231013000000-1"
    return { 
      timestamp: parts[1], 
      trailingNumber: parseInt(parts[2]) || 0 
    };
  } else if (parts.length === 2) {
    // New format: "Nales-20250912210715"
    return { 
      timestamp: parts[1], 
      trailingNumber: 0 
    };
  }
  
  // Fallback
  return { timestamp: '0', trailingNumber: 0 };
}

/**
 * Generate DisplayedId values for all games based on global chronological order
 */
function generateDisplayedIds(games: GameLogEntry[]): Map<string, string> {
  const displayedIdMap = new Map<string, string>();
  
  // Sort all games globally by timestamp, then by trailing number
  const sortedGames = [...games].sort((a, b) => {
    const parsedA = parseGameId(a.Id);
    const parsedB = parseGameId(b.Id);
    
    // First compare by timestamp
    const timestampCompare = parsedA.timestamp.localeCompare(parsedB.timestamp);
    if (timestampCompare !== 0) {
      return timestampCompare;
    }
    
    // If timestamps are equal, compare by trailing number
    return parsedA.trailingNumber - parsedB.trailingNumber;
  });
  
  // Assign sequential global numbers
  sortedGames.forEach((game, index) => {
    const globalNumber = index + 1;
    displayedIdMap.set(game.Id, globalNumber.toString());
  });
  
  return displayedIdMap;
}

/**
 * Normalize a player name using the mapping configuration
 * Performs case-insensitive matching and returns the canonical name
 * 
 * @param playerName - The original player name from the data
 * @returns The normalized/canonical player name
 */
function normalizePlayerName(playerName: string): string {
  if (!playerName) return playerName;
  
  // Try exact match first
  if (PLAYER_NAME_MAPPING[playerName]) {
    return PLAYER_NAME_MAPPING[playerName];
  }
  
  // Try case-insensitive match
  const lowerPlayerName = playerName.toLowerCase();
  for (const [variant, canonical] of Object.entries(PLAYER_NAME_MAPPING)) {
    if (variant.toLowerCase() === lowerPlayerName) {
      return canonical;
    }
  }
  
  // Return original name if no mapping found
  return playerName;
}

/**
 * Normalize all player names in a PlayerStat object
 * Handles Username, KillerName, and Vote targets
 */
function normalizePlayerStat(playerStat: PlayerStat): PlayerStat {
  if (!playerStat) {
    console.warn('normalizePlayerStat: received null/undefined playerStat');
    return playerStat;
  }
  
  // Add safety check for Votes array
  if (playerStat.Votes && !Array.isArray(playerStat.Votes)) {
    console.warn('normalizePlayerStat: Votes is not an array for player', playerStat.Username, playerStat.Votes);
  }
  
  return {
    ...playerStat,
    Username: normalizePlayerName(playerStat.Username),
    KillerName: playerStat.KillerName ? normalizePlayerName(playerStat.KillerName) : playerStat.KillerName,
    Votes: (playerStat.Votes || []).map(vote => {
      if (!vote) return vote;
      return {
        ...vote,
        Target: vote.Target === 'Passé' ? vote.Target : normalizePlayerName(vote.Target)
      };
    })
  };
}

/**
 * Normalize all player names in a GameLogEntry
 */
function normalizeGameLogEntry(game: GameLogEntry): GameLogEntry {
  if (!game) {
    console.warn('normalizeGameLogEntry: received null/undefined game');
    return game;
  }
  
  // Add safety check for PlayerStats array
  if (game.PlayerStats && !Array.isArray(game.PlayerStats)) {
    console.warn('normalizeGameLogEntry: PlayerStats is not an array for game', game.Id, game.PlayerStats);
  }
  
  return {
    ...game,
    PlayerStats: (game.PlayerStats || []).map(normalizePlayerStat)
  };
}

/**
 * Normalize player names in BR data
 * BR data has player names in the "Participants" field
 */
function normalizeBRData(brData: RawBRData): RawBRData {
  return {
    ...brData,
    Participants: normalizePlayerName(brData.Participants)
  };
}