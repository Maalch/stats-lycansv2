import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

// Helper to parse DD/MM/YYYY to Date
function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export interface RawBRData {
  Game: number;
  Participants: string;
  Score: number;
  Gagnant: boolean;
}

export interface RawBRGlobalData {
  Game: number; // This corresponds to Game2 in the raw data, but represents the global game ID
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

// Generic hook to fetch raw data from static files or API
function useRawData<T>(endpoint: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRawData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.BASE_URL}data/${endpoint}.json`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${endpoint}`);
        }

        const result: RawDataResponse<T> = await response.json();
        setData(result.data || []);
      } catch (err) {
        console.error(`Error fetching raw ${endpoint}:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRawData();
  }, [endpoint]);

  return { data, isLoading, error };
}

// Raw BR Data interface for the combined structure from the API
interface RawBRCombinedData {
  Game: number;
  Participants: string;
  Score: number;
  Gagnant: boolean;
  Game2: number;
  "Nombre de participants": number;
  Date: string;
  VOD: string | null;
  "Game Moddée": boolean;
}

export function useFilteredRawBRData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawBRCombinedData>('rawBRData');

  // Extract BR participant data and apply filters
  const filteredData = rawData?.filter(record => {
    // Skip records without participant data
    if (!record.Game || !record.Participants) {
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

    // Apply player filter
    if (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) {
      const participantName = record.Participants.toLowerCase();
      
      if (settings.playerFilter.mode === 'include') {
        // For include mode: participant must be in the selected players list
        const isIncluded = settings.playerFilter.players.some(player => 
          player.toLowerCase() === participantName
        );
        if (!isIncluded) {
          return false;
        }
      } else if (settings.playerFilter.mode === 'exclude') {
        // For exclude mode: if participant is in selected players, exclude the record
        const isExcluded = settings.playerFilter.players.some(player => 
          player.toLowerCase() === participantName
        );
        if (isExcluded) {
          return false;
        }
      }
    }

    return true;
  })?.map(record => ({
    Game: record.Game,
    Participants: record.Participants,
    Score: record.Score,
    Gagnant: record.Gagnant
  })) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredRawBRGlobalData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawBRCombinedData>('rawBRData');

  // Extract unique global game data and apply filters
  const filteredData = rawData?.reduce((acc, record) => {
    // Skip records without global game data
    if (!record.Game2 || !record.Date) {
      return acc;
    }

    // Check if we already have this global game
    const existingGame = acc.find(game => game.Game === record.Game2);
    if (existingGame) {
      return acc; // Already processed this global game
    }

    // Apply game type filter using the "Game Moddée" field
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      if (settings.gameFilter === 'modded') {
        if (!record["Game Moddée"]) return acc;
      } else if (settings.gameFilter === 'non-modded') {
        if (record["Game Moddée"]) return acc;
      }
    } else if (settings.filterMode === 'dateRange') {
      if (settings.dateRange.start || settings.dateRange.end) {
        const gameDateObj = parseFrenchDate(record.Date);
        if (!gameDateObj) return acc;
        if (settings.dateRange.start) {
          const startObj = new Date(settings.dateRange.start);
          if (gameDateObj < startObj) return acc;
        }
        if (settings.dateRange.end) {
          const endObj = new Date(settings.dateRange.end);
          if (gameDateObj > endObj) return acc;
        }
      }
    }

    // For global data, we don't apply player filters as it's about the game itself, not participants

    // Add the global game data
    acc.push({
      Game: record.Game2,
      "Nombre de participants": record["Nombre de participants"],
      Date: record.Date,
      VOD: record.VOD,
      "Game Moddée": record["Game Moddée"]
    });

    return acc;
  }, [] as RawBRGlobalData[]) || null;

  return { data: filteredData, isLoading, error };
}
