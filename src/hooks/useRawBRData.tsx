import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { parseFrenchDate } from './utils/dataUtils';

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
  const [brPartiesData, setBRPartiesData] = useState<RawBRData[] | null>(null);
  const [brRefPartiesData, setBRRefPartiesData] = useState<RawBRGlobalData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRawBRData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.BASE_URL}data/rawBRData.json`);
        if (!response.ok) {
          throw new Error('Failed to fetch rawBRData');
        }

        const result: RawBRResponse = await response.json();
        setBRPartiesData(result.BRParties?.data || []);
        setBRRefPartiesData(result.BRRefParties?.data || []);
      } catch (err) {
        console.error('Error fetching raw BR data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRawBRData();
  }, []);

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

    // Apply game type filter using the "Game Moddée" field from global data
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      if (settings.gameFilter === 'modded') {
        if (!globalGameData["Game Moddée"]) return false;
      } else if (settings.gameFilter === 'non-modded') {
        if (globalGameData["Game Moddée"]) return false;
      }
    } else if (settings.filterMode === 'dateRange') {
      if (settings.dateRange.start || settings.dateRange.end) {
        const gameDateObj = parseFrenchDate(globalGameData.Date);
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

    // Apply game type filter using the "Game Moddée" field
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      if (settings.gameFilter === 'modded') {
        if (!record["Game Moddée"]) return false;
      } else if (settings.gameFilter === 'non-modded') {
        if (record["Game Moddée"]) return false;
      }
    } else if (settings.filterMode === 'dateRange') {
      if (settings.dateRange.start || settings.dateRange.end) {
        const gameDateObj = parseFrenchDate(record.Date);
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

    // For global data, we don't apply player filters as it's about the game itself, not participants
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
