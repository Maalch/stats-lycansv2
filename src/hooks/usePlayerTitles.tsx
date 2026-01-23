import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

export interface PlayerTitle {
  id: string;
  title: string;
  emoji: string;
  description: string;
  priority: number;
  type: 'basic' | 'combination' | 'role';
  stat?: string;
  value?: number;
  percentile?: number;
  category?: string;
}

export interface PlayerTitleData {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  titles: PlayerTitle[];
  primaryTitle: PlayerTitle | null;
  percentiles?: Record<string, any>;
  stats?: Record<string, any>;
}

export interface PlayerTitlesResponse {
  version: string;
  generatedAt: string;
  teamName: string;
  totalPlayers: number;
  minGamesRequired: number;
  moddedGamesAnalyzed: number;
  percentileThresholds: Record<string, number>;
  players: Record<string, PlayerTitleData>;
}

/**
 * Hook to load pre-calculated player titles from playerTitles.json
 * @param playerName - Optional player name to get specific player's titles
 * @returns Player titles data with loading and error states
 */
export function usePlayerTitles(playerName?: string | null) {
  const { settings } = useSettings();
  const [data, setData] = useState<PlayerTitlesResponse | null>(null);
  const [playerData, setPlayerData] = useState<PlayerTitleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTitles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Determine which data source to use based on settings
        const dataPath = settings.dataSource === 'discord' 
          ? '/data/discord/playerTitles.json'
          : '/data/playerTitles.json';

        const response = await fetch(dataPath);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Titles not generated yet
            setData(null);
            setPlayerData(null);
            setError('Les titres n\'ont pas encore été générés. Ils seront disponibles après la prochaine synchronisation hebdomadaire.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return;
        }

        const titlesData: PlayerTitlesResponse = await response.json();
        setData(titlesData);

        // If a specific player is requested, extract their data
        if (playerName && titlesData.players) {
          // Find player by name (playerTitles uses playerId as key, so we need to search)
          const playerEntry = Object.entries(titlesData.players).find(
            ([_, data]) => data.playerName === playerName
          );
          
          if (playerEntry) {
            setPlayerData(playerEntry[1]);
          } else {
            setPlayerData(null);
          }
        } else {
          setPlayerData(null);
        }
      } catch (err) {
        console.error('Error loading player titles:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setData(null);
        setPlayerData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadTitles();
  }, [settings.dataSource, playerName]);

  return {
    data,
    playerData,
    isLoading,
    error
  };
}

/**
 * Hook to get titles for all players (useful for displaying in lists)
 */
export function useAllPlayerTitles() {
  const { data, isLoading, error } = usePlayerTitles();
  
  return {
    allPlayers: data?.players || {},
    totalPlayers: data?.totalPlayers || 0,
    minGamesRequired: data?.minGamesRequired || 25,
    isLoading,
    error
  };
}
