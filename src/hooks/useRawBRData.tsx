import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parseFrenchDate } from './utils/dataUtils';
import { fetchOptionalDataFile, DATA_FILES } from '../utils/dataPath';
import type { DataSource } from '../utils/dataPath';

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

// Updated interface for the new BR data structure
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

// Updated hook to fetch BR data from the new structure
function useRawBRData() {
  const { settings } = useSettings();
  const [brPartiesData, setBRPartiesData] = useState<RawBRData[] | null>(null);
  const [brRefPartiesData, setBRRefPartiesData] = useState<RawBRGlobalData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRawBRData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dataSource = settings.dataSource as DataSource;
        
        // Try to fetch BR data, but don't fail if it doesn't exist (Discord data doesn't have BR data)
        const result = await fetchOptionalDataFile<RawBRResponse>(dataSource, DATA_FILES.RAW_BR_DATA);
        
        if (result) {
          setBRPartiesData(result.BRParties?.data || []);
          setBRRefPartiesData(result.BRRefParties?.data || []);
        } else {
          // No BR data available (expected for Discord)
          setBRPartiesData([]);
          setBRRefPartiesData([]);
        }
      } catch (err) {
        console.error('Error fetching raw BR data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRawBRData();
  }, [settings.dataSource]); // Re-fetch when dataSource changes

  return { brPartiesData, brRefPartiesData, isLoading, error };
}

export function useFilteredRawBRData() {
  const { settings } = useSettings();
  const { brPartiesData, brRefPartiesData, isLoading, error } = useRawBRData();

  // Apply filters to BR participant data
  const filteredData = brPartiesData?.filter(record => {
    // Skip records without participant data
    if (!record.Game || !record.Participants) {
      return false;
    }

    // To apply game type and date filters, we need to find the corresponding global game data
    const globalGameData = brRefPartiesData?.find(globalRecord => globalRecord.Game === record.Game);
    
    if (!globalGameData) {
      // If we can't find global data, we can't apply date/game type filters
      // But we can still apply player filters
      return applyPlayerFilter(record, settings);
    }

    // FILTER OUT MINI BR GAMES (less than 6 players) from regular BR statistics
    if (globalGameData["Nombre de participants"] < 6) {
      return false;
    }

    // Apply independent filters using the "Game Moddée" field from global data
    if (settings.independentFilters) {
      const filters = settings.independentFilters;
      
      // Game type filter
      if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
        if (filters.gameFilter === 'modded') {
          if (!globalGameData["Game Moddée"]) return false;
        } else if (filters.gameFilter === 'non-modded') {
          if (globalGameData["Game Moddée"]) return false;
        }
      }
      
      // Date range filter
      if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
        const gameDateObj = parseFrenchDate(globalGameData.Date);
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
    }

    // Apply player filter
    return applyPlayerFilter(record, settings);
  }) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredRawBRGlobalData() {
  const { settings } = useSettings();
  const { brRefPartiesData, isLoading, error } = useRawBRData();

  // Apply filters to global game data
  const filteredData = brRefPartiesData?.filter(record => {
    // Skip records without essential data
    if (!record.Game || !record.Date) {
      return false;
    }

    // FILTER OUT MINI BR GAMES (less than 6 players) from regular BR statistics
    if (record["Nombre de participants"] < 6) {
      return false;
    }

    // Apply independent filters using the "Game Moddée" field
    if (settings.independentFilters) {
      const filters = settings.independentFilters;
      
      // Game type filter
      if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
        if (filters.gameFilter === 'modded') {
          if (!record["Game Moddée"]) return false;
        } else if (filters.gameFilter === 'non-modded') {
          if (record["Game Moddée"]) return false;
        }
      }
      
      // Date range filter
      if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
        const gameDateObj = parseFrenchDate(record.Date);
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
    }

    // For global data, we don't apply player filters as it's about the game itself, not participants
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}

// New hooks for Mini BR data (games with LESS than 6 players)
export function useFilteredMiniBRData() {
  const { settings } = useSettings();
  const { brPartiesData, brRefPartiesData, isLoading, error } = useRawBRData();

  // Apply filters to BR participant data - ONLY games with less than 6 players
  const filteredData = brPartiesData?.filter(record => {
    // Skip records without participant data
    if (!record.Game || !record.Participants) {
      return false;
    }

    // To apply game type and date filters, we need to find the corresponding global game data
    const globalGameData = brRefPartiesData?.find(globalRecord => globalRecord.Game === record.Game);
    
    if (!globalGameData) {
      // If we can't find global data, we can't apply filters
      return false;
    }

    // ONLY INCLUDE MINI BR GAMES (less than 6 players)
    if (globalGameData["Nombre de participants"] >= 6) {
      return false;
    }

    // Apply independent filters using the "Game Moddée" field from global data
    if (settings.independentFilters) {
      const filters = settings.independentFilters;
      
      // Game type filter
      if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
        if (filters.gameFilter === 'modded') {
          if (!globalGameData["Game Moddée"]) return false;
        } else if (filters.gameFilter === 'non-modded') {
          if (globalGameData["Game Moddée"]) return false;
        }
      }
      
      // Date range filter
      if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
        const gameDateObj = parseFrenchDate(globalGameData.Date);
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
    }

    // Apply player filter
    return applyPlayerFilter(record, settings);
  }) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredMiniBRGlobalData() {
  const { settings } = useSettings();
  const { brRefPartiesData, isLoading, error } = useRawBRData();

  // Apply filters to global game data - ONLY games with less than 6 players
  const filteredData = brRefPartiesData?.filter(record => {
    // Skip records without essential data
    if (!record.Game || !record.Date) {
      return false;
    }

    // ONLY INCLUDE MINI BR GAMES (less than 6 players)
    if (record["Nombre de participants"] >= 6) {
      return false;
    }

    // Apply independent filters using the "Game Moddée" field
    if (settings.independentFilters) {
      const filters = settings.independentFilters;
      
      // Game type filter
      if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
        if (filters.gameFilter === 'modded') {
          if (!record["Game Moddée"]) return false;
        } else if (filters.gameFilter === 'non-modded') {
          if (record["Game Moddée"]) return false;
        }
      }
      
      // Date range filter
      if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
        const gameDateObj = parseFrenchDate(record.Date);
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
    }

    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}

// Helper function to apply player filter to BR participant records
function applyPlayerFilter(record: RawBRData, settings: any): boolean {
  if (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) {
    const participantName = record.Participants.toLowerCase();
    
    if (settings.playerFilter.mode === 'include') {
      // For include mode: participant must be in the selected players list
      const isIncluded = settings.playerFilter.players.some((player: string) => 
        player.toLowerCase() === participantName
      );
      if (!isIncluded) {
        return false;
      }
    } else if (settings.playerFilter.mode === 'exclude') {
      // For exclude mode: if participant is in selected players, exclude the record
      const isExcluded = settings.playerFilter.players.some((player: string) => 
        player.toLowerCase() === participantName
      );
      if (isExcluded) {
        return false;
      }
    }
  }

  return true;
}
