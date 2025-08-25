
import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

// Helper to parse DD/MM/YYYY to Date
function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

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

interface RawDataResponse<T> {
  lastUpdated: string;
  totalRecords: number;
  data: T[];
}

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

export function useFilteredRawGameData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawGameData>('rawGameData');


  // Helper to parse DD/MM/YYYY to Date
  function parseFrenchDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return null;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const filteredData = rawData?.filter(game => {
    if (settings.filterMode === 'gameType') {
      if (settings.gameFilter === 'all') {
        return true;
      } else if (settings.gameFilter === 'modded') {
        return game["Game Moddée"];
      } else if (settings.gameFilter === 'non-modded') {
        return !game["Game Moddée"];
      }
      return true;
    } else if (settings.filterMode === 'dateRange') {
      if (!settings.dateRange.start && !settings.dateRange.end) return true;
      const gameDateObj = parseFrenchDate(game.Date);
      if (!gameDateObj) return false;
      if (settings.dateRange.start) {
        const startObj = new Date(settings.dateRange.start);
        if (gameDateObj < startObj) return false;
      }
      if (settings.dateRange.end) {
        const endObj = new Date(settings.dateRange.end);
        if (gameDateObj > endObj) return false;
      }
      return true;
    }
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredRawRoleData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawRoleData>('rawRoleData');
  const { data: gameData } = useRawData<RawGameData>('rawGameData');

  const filteredData = rawData?.filter(role => {
    if (settings.filterMode === 'gameType') {
      if (settings.gameFilter === 'all') {
        return true;
      } else if (settings.gameFilter === 'modded') {
        return role["Game Moddée"];
      } else if (settings.gameFilter === 'non-modded') {
        return !role["Game Moddée"];
      }
      return true;
    } else if (settings.filterMode === 'dateRange') {
      if (!settings.dateRange.start && !settings.dateRange.end) return true;
      // Find corresponding game data by Game ID
      const correspondingGame = gameData?.find(game => game.Game === role.Game);
      if (!correspondingGame) return false;
      
      const gameDateObj = parseFrenchDate(correspondingGame.Date);
      if (!gameDateObj) return false;
      if (settings.dateRange.start) {
        const startObj = new Date(settings.dateRange.start);
        if (gameDateObj < startObj) return false;
      }
      if (settings.dateRange.end) {
        const endObj = new Date(settings.dateRange.end);
        if (gameDateObj > endObj) return false;
      }
      return true;
    }
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredRawPonceData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawPonceData>('rawPonceData');
  const { data: gameData } = useRawData<RawGameData>('rawGameData');

  const filteredData = rawData?.filter(ponce => {
    if (settings.filterMode === 'gameType') {
      if (settings.gameFilter === 'all') {
        return true;
      } else if (settings.gameFilter === 'modded') {
        return ponce["Game Moddée"];
      } else if (settings.gameFilter === 'non-modded') {
        return !ponce["Game Moddée"];
      }
      return true;
    } else if (settings.filterMode === 'dateRange') {
      if (!settings.dateRange.start && !settings.dateRange.end) return true;
      // Find corresponding game data by Game ID
      const correspondingGame = gameData?.find(game => game.Game === ponce.Game);
      if (!correspondingGame) return false;
      
      const gameDateObj = parseFrenchDate(correspondingGame.Date);
      if (!gameDateObj) return false;
      if (settings.dateRange.start) {
        const startObj = new Date(settings.dateRange.start);
        if (gameDateObj < startObj) return false;
      }
      if (settings.dateRange.end) {
        const endObj = new Date(settings.dateRange.end);
        if (gameDateObj > endObj) return false;
      }
      return true;
    }
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}