import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parseFrenchDate } from './utils/dataUtils';
import { getCanonicalPlayerName, initializePlayerIdentification } from '../utils/playerIdentification';
import type { DeathType } from '../types/deathTypes';
import { fetchDataFile, fetchOptionalDataFile, DATA_FILES } from '../utils/dataPath';
import type { DataSource } from '../utils/dataPath';
import { getPlayerId } from '../utils/playerIdentification';
import { logger, handleFetchError } from '../utils/logger';

// New GameLog interfaces
export interface Vote {
  Day: number;              // Meeting number (1, 2, 3, etc.)
  Target: string;                 // Player name targeted by the vote or "Passé" for abstention
  Date: string | null;            // ISO date string when the vote was cast (may be null for legacy data)
}

export interface RoleChange {
  NewMainRole: string;            // New main role after change
  RoleChangeDateIrl: string;     // Date of role change
}

export interface Action {
  Date: string;                   // ISO date string when the action was performed
  Timing: string;                 // Game timing (e.g., "N3" for Night 3, "J6" for Day 6)
  Position: {                     // Game coordinates where action was performed
    x: number;
    y: number;
    z: number;
  };
  ActionType: string;             // Type of action (e.g., "UseGadget", "DrinkPotion", "Sabotage")
  ActionName: string | null;      // Name of the action/item used (e.g., "Diamant", "Invisible", "Vampire")
  ActionTarget: string | null;    // Target of the action if applicable
}

export interface Clip {
  ClipId: string;                 // Unique ID of the video clip
  ClipUrl: string | null;         // URL of the video clip (usually from Twitch)
  ClipName: string | null;        // Name of the clip as displayed on Twitch/source
  POVPlayer: string;              // Player whose POV is shown in the clip
  OthersPlayers: string | null;   // Comma-separated list of other players involved
  RelatedClips: string | null;    // Comma-separated list of related clip IDs (different POVs)
  NextClip: string | null;        // ID of the next clip in sequence (if applicable)
  NewName: string | null;         // Custom display name for the clip
  AdditionalInfo: string | null;  // Additional context/explanation about the clip
  Tags: string[];                 // Array of tag names for grouping clips
}

export interface PlayerStat {
  ID?: string | null;             // Steam ID - unique identifier (may be null for legacy data)
  Username: string;
  Color?: string;                 // Player color assigned in game
  MainRoleInitial: string;        // Original role at game start
  MainRoleChanges: RoleChange[];      // List of role changes (if any)
  Power: string | null;           // Special power (linked to the role), if any
  SecondaryRole: string | null;     // Secondary role if any
  DeathDateIrl: string | null;    // Real-life date of death in game
  DeathTiming: string | null;     // Timing of death (e.g., "Nuit 2 --> N2", "Jour 3 --> J3")
  DeathPosition: {                // Game coordinates of death
    x: number;
    y: number;
    z: number;
  } | null;
  DeathType: DeathType | null;    // Type-safe death type from centralized constants
  KillerName: string | null;      // Name of the killer if applicable
  Victorious: boolean;            // Whether the player was on the winning side
  Votes: Vote[];                  // Array of votes cast by this player during meetings
  SecondsTalkedOutsideMeeting: number;
  SecondsTalkedDuringMeeting: number;
  TotalCollectedLoot?: number;    // Total loot collected during the game (optional for legacy data)
  Actions?: Action[];             // Array of actions performed by this player during the game (optional for legacy data)
}

export interface LegacyData {
  VictoryType: string | null; // E.g., "Votes", "Tous les loups tués", "Domination loups" etc.
  PlayerVODs?: { [playerId: string]: string }; // Per-player VOD links mapped by Steam ID
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
  Clips: Clip[];                 // Array of clips associated with this game
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
 * Supports switching between main and Discord data sources via settings
 * Integrates with joueurs.json for canonical player name resolution
 */
function useCombinedRawData(): {
  data: CombinedRawData | null;
  isLoading: boolean;
  error: string | null;
} {
  const { settings } = useSettings();
  const [data, setData] = useState<CombinedRawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllRawData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dataSource = settings.dataSource as DataSource;
        
        // Fetch joueurs data first for canonical name resolution
        const joueursData = await fetchDataFile<any>(dataSource, DATA_FILES.JOUEURS);
        
        // Initialize the player identification system with joueurs data
        initializePlayerIdentification(joueursData);
        
        // Fetch the game log data
        const gameLogResult = await fetchDataFile<GameLogData>(dataSource, DATA_FILES.GAME_LOG);
        
        // Try to fetch BR data, but don't fail if it doesn't exist (Discord data doesn't have BR data)
        const brResult = await fetchOptionalDataFile<RawBRResponse>(dataSource, DATA_FILES.RAW_BR_DATA) || { 
          BRParties: { totalRecords: 0, data: [] }, 
          BRRefParties: { totalRecords: 0, data: [] } 
        };

        // Filter out corrupted games (games without EndDate) and add DisplayedId to each valid game
        const validGames = gameLogResult.GameStats.filter(game => {
          if (!game.EndDate) {
            return false;
          }
          return true;
        });

        // Regenerate DisplayedIds for valid games only
        const displayedIdMapFiltered = generateDisplayedIds(validGames);

        // Add DisplayedId to each game and normalize player names using joueurs data
        const gameDataWithDisplayedIds = validGames.map(game => {
          const gameWithDisplayedId = {
            ...game,
            DisplayedId: displayedIdMapFiltered.get(game.Id) || game.Id // Fallback to original ID
          };
          
          // Normalize all player names in the game using canonical name resolution
          return normalizeGameLogEntry(gameWithDisplayedId, joueursData);
        });

        setData({
          gameData: gameDataWithDisplayedIds,
          brPartiesData: (brResult.BRParties?.data || []).map(normalizeBRData),
          brRefPartiesData: brResult.BRRefParties?.data || []
        });
      } catch (err) {
        const errorMsg = handleFetchError(err, 'useCombinedRawData');
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllRawData();
  }, [settings.dataSource]); // Re-fetch when dataSource changes

  return { data, isLoading, error };
}

/**
 * Apply common filter logic to any dataset using independent filters
 */
function applyCommonFilters<T extends { Game?: number; "Game Moddée"?: boolean; Date?: string }>(
  data: T[],
  settings: any,
  gameData?: GameLogEntry[]
): T[] {
  // Only use independent filters - legacy filterMode no longer supported
  if (!settings.independentFilters) {
    return data;
  }

  const filters = settings.independentFilters;

  return data.filter(record => {
    // For non-game data, we need to find the corresponding game data
    let gameRecord = record as any;
    if (gameData && record.Game) {
      const correspondingGame = gameData.find((_, index) => index + 1 === record.Game);
      if (!correspondingGame) return false;
      // Convert GameLogEntry to a format compatible with filtering
      gameRecord = {
        "Game Moddée": correspondingGame.Modded || true,
        Date: new Date(correspondingGame.StartDate).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      };
    }

    // Apply game type filter if enabled
    if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
      if (filters.gameFilter === 'modded') {
        if (!gameRecord["Game Moddée"]) return false;
      } else if (filters.gameFilter === 'non-modded') {
        if (gameRecord["Game Moddée"]) return false;
      }
    }
    
    // Apply date range filter if enabled
    if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
      const gameDateObj = parseFrenchDate(gameRecord.Date);
      if (!gameDateObj) return false;
      if (filters.dateRange.start) {
        const startObj = new Date(filters.dateRange.start);
        if (gameDateObj < startObj) return false;
      }
      if (filters.dateRange.end) {
        const endObj = new Date(filters.dateRange.end);
        if (gameDateObj > endObj) return false;
      }
    }

    return true;
  });
}

/**
 * Apply independent filters to GameLogEntry data
 */
function applyIndependentGameLogFilters(data: GameLogEntry[], settings: any): GameLogEntry[] {
  return data.filter(game => {
    // The dataSource is already determined in the data fetching layer
    
    const filters = settings.independentFilters;
    if (!filters) {
      // If no independent filters, don't filter
      return true;
    }

    // Apply game type filter if enabled
    if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
      const isModded = game.Modded ?? true;
      if (filters.gameFilter === 'modded' && !isModded) return false;
      if (filters.gameFilter === 'non-modded' && isModded) return false;
    }
    
    // Apply date range filter if enabled
    if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
      const gameDate = new Date(game.StartDate);
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        if (gameDate < startDate) return false;
      }
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        if (gameDate > endDate) return false;
      }
    }
    
    // Apply map name filter if enabled
    if (filters.mapNameEnabled && filters.mapNameFilter !== 'all') {
      const mapName = game.MapName || '';
      if (filters.mapNameFilter === 'village' && mapName !== 'Village') return false;
      if (filters.mapNameFilter === 'chateau' && mapName !== 'Château') return false;
      if (filters.mapNameFilter === 'others' && (mapName === 'Village' || mapName === 'Château')) return false;
    }

    // Apply player filter (supports both IDs and names for backward compatibility)
    if (filters.playerFilter.mode !== 'none' && filters.playerFilter.players.length > 0) {
      const gamePlayerNames = game.PlayerStats.map(p => p.Username.toLowerCase());
      const gamePlayerIds = game.PlayerStats.map(p => getPlayerId(p).toLowerCase());

      if (filters.playerFilter.mode === 'include') {
        const hasAllPlayers = filters.playerFilter.players.every((player: string) => {
          const term = String(player).toLowerCase();
          return gamePlayerIds.includes(term) || gamePlayerNames.includes(term);
        });
        if (!hasAllPlayers) return false;
      } else if (filters.playerFilter.mode === 'exclude') {
        const hasAnyPlayer = filters.playerFilter.players.some((player: string) => {
          const term = String(player).toLowerCase();
          return gamePlayerIds.includes(term) || gamePlayerNames.includes(term);
        });
        if (hasAnyPlayer) return false;
      }
    }

    return true;
  });
}



/**
 * Apply filters to GameLogEntry data using independent filters only
 */
function applyGameLogFilters(data: GameLogEntry[], settings: any): GameLogEntry[] {
  // Only use independent filters - legacy mode removed
  return applyIndependentGameLogFilters(data, settings);
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

    // Apply filters to game data (player filters already included in applyGameLogFilters)
    const filteredGameData = applyGameLogFilters(rawData.gameData, settings);


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
 * Supports switching between main and Discord data sources via settings
 */
export function useGameLogData(): {
  data: GameLogData | null;
  isLoading: boolean;
  error: string | null;
} {
  const { settings } = useSettings();
  const [data, setData] = useState<GameLogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameLogData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dataSource = settings.dataSource as DataSource;
        
        // Fetch joueurs data for canonical name resolution
        const joueursData = await fetchDataFile<any>(dataSource, DATA_FILES.JOUEURS);
        
        // Initialize the player identification system with joueurs data
        initializePlayerIdentification(joueursData);
        
        const result = await fetchDataFile<GameLogData>(dataSource, DATA_FILES.GAME_LOG);
        
        // Filter out corrupted games (games without EndDate)
        const validGames = result.GameStats.filter(game => game.EndDate);
        
        // Generate DisplayedIds for valid games
        const displayedIdMap = generateDisplayedIds(validGames);
        
        // Add DisplayedId to each game and normalize player names
        const gameStatsWithDisplayedIds = validGames.map(game => {
          const gameWithDisplayedId = {
            ...game,
            DisplayedId: displayedIdMap.get(game.Id) || game.Id
          };
          
          // Normalize all player names in the game using canonical name resolution
          return normalizeGameLogEntry(gameWithDisplayedId, joueursData);
        });
        
        const normalizedResult = {
          ...result,
          GameStats: gameStatsWithDisplayedIds
        };
        
        setData(normalizedResult);
      } catch (err) {
        const errorMsg = handleFetchError(err, 'useGameLogData');
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameLogData();
  }, [settings.dataSource]); // Re-fetch when dataSource changes

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
    
    // Use the independent filters approach
    return applyIndependentGameLogFilters(rawGameLogData.GameStats, settings);
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
 * Normalize all player names in a PlayerStat object using canonical name resolution
 * Handles Username, KillerName, and Vote targets
 * 
 * Since all players now have Steam IDs, this function resolves names via
 * Steam ID lookup in joueurs.json.
 * 
 * @param playerStat - The player stat to normalize
 * @param joueursData - Optional joueurs data for canonical name resolution
 */
function normalizePlayerStat(playerStat: PlayerStat, joueursData?: any): PlayerStat {
  if (!playerStat) {
    logger.warn('normalizePlayerStat: received null/undefined playerStat');
    return playerStat;
  }
  
  // Add safety check for Votes array
  if (playerStat.Votes && !Array.isArray(playerStat.Votes)) {
    logger.warn('normalizePlayerStat: Votes is not an array for player', playerStat.Username, playerStat.Votes);
  }
  
  // Resolve canonical name using Steam ID lookup in joueurs.json
  const canonicalName = getCanonicalPlayerName(playerStat, joueursData);
  
  return {
    ...playerStat,
    Username: canonicalName,
    // KillerName, Vote targets, and Action targets will be resolved in the second pass of normalizeGameLogEntry
    // using the name mapping built from all players in the game
    KillerName: playerStat.KillerName,
    Votes: playerStat.Votes || []
  };
}

/**
 * Normalize all player names in a GameLogEntry
 * This includes a second pass to fix KillerName and Vote targets using the normalized PlayerStats
 * 
 * @param game - The game to normalize
 * @param joueursData - Optional joueurs data for canonical name resolution
 */
function normalizeGameLogEntry(game: GameLogEntry, joueursData?: any): GameLogEntry {
  if (!game) {
    logger.warn('normalizeGameLogEntry: received null/undefined game');
    return game;
  }
  
  // Add safety check for PlayerStats array
  if (game.PlayerStats && !Array.isArray(game.PlayerStats)) {
    logger.warn('normalizeGameLogEntry: PlayerStats is not an array for game', game.Id, game.PlayerStats);
  }
  
  // First pass: normalize all player usernames
  const normalizedPlayers = (game.PlayerStats || []).map(player => normalizePlayerStat(player, joueursData));
  
  // Create a map of original names to canonical names for fixing references
  const nameMap = new Map<string, string>();
  (game.PlayerStats || []).forEach((originalPlayer, index) => {
    const normalizedPlayer = normalizedPlayers[index];
    if (originalPlayer.Username !== normalizedPlayer.Username) {
      nameMap.set(originalPlayer.Username.toLowerCase(), normalizedPlayer.Username);
    }
  });
  
  // Second pass: fix KillerName, Vote targets, and Action targets using the name map
  const fullyNormalizedPlayers = normalizedPlayers.map(player => {
    let killerName = player.KillerName;
    if (killerName && nameMap.has(killerName.toLowerCase())) {
      killerName = nameMap.get(killerName.toLowerCase())!;
    }
    
    const normalizedVotes = player.Votes.map(vote => {
      if (!vote || vote.Target === 'Passé') return vote;
      
      const lowerTarget = vote.Target.toLowerCase();
      if (nameMap.has(lowerTarget)) {
        return { ...vote, Target: nameMap.get(lowerTarget)! };
      }
      return vote;
    });
    
    // Normalize ActionTarget in Actions array
    const normalizedActions = player.Actions ? player.Actions.map(action => {
      if (!action.ActionTarget) return action;
      
      const lowerTarget = action.ActionTarget.toLowerCase();
      if (nameMap.has(lowerTarget)) {
        return { ...action, ActionTarget: nameMap.get(lowerTarget)! };
      }
      return action;
    }) : undefined;
    
    return {
      ...player,
      KillerName: killerName,
      Votes: normalizedVotes,
      Actions: normalizedActions
    };
  });
  
  return {
    ...game,
    PlayerStats: fullyNormalizedPlayers
  };
}

/**
 * Normalize player names in BR data
 * BR data has player names in the "Participants" field as a string
 * Since BR data doesn't have Steam IDs, we keep the names as-is
 */
function normalizeBRData(brData: RawBRData): RawBRData {
  // BR participants are already strings, no normalization needed
  // All actual player statistics come from gameLog which has proper Steam IDs
  return brData;
}