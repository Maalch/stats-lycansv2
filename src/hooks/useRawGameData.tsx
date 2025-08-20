import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

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

  const filteredData = rawData?.filter(game => {
    if (settings.showOnlyModdedGames && !game["Game Moddée"]) {
      return false;
    }
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredRawRoleData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawRoleData>('rawRoleData');

  const filteredData = rawData?.filter(role => {
    if (settings.showOnlyModdedGames && !role["Game Moddée"]) {
      return false;
    }
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}

export function useFilteredRawPonceData() {
  const { settings } = useSettings();
  const { data: rawData, isLoading, error } = useRawData<RawPonceData>('rawPonceData');

  const filteredData = rawData?.filter(ponce => {
    if (settings.showOnlyModdedGames && !ponce["Game Moddée"]) {
      return false;
    }
    return true;
  }) || null;

  return { data: filteredData, isLoading, error };
}