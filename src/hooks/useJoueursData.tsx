import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { fetchDataFile, DATA_FILES } from '../utils/dataPath';
import type { JoueursData } from '../types/joueurs';
import type { DataSource } from '../utils/dataPath';
import { useThemeAdjustedDynamicPlayersColor } from '../types/api';
import { handleFetchError } from '../utils/logger';

export function useJoueursData() {
  const { settings } = useSettings();
  const [joueursData, setJoueursData] = useState<JoueursData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJoueursData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dataSource = settings.dataSource as DataSource;
        const result = await fetchDataFile<JoueursData>(dataSource, DATA_FILES.JOUEURS);
        setJoueursData(result);
      } catch (err) {
        const errorMsg = handleFetchError(err, 'useJoueursData');
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJoueursData();
  }, [settings.dataSource]); // Re-fetch when dataSource changes

  return { joueursData, isLoading, error };
}

// Hook to get players list only
export function usePlayersList() {
  const { joueursData, isLoading, error } = useJoueursData();
  
  const players = joueursData?.Players || null;
  
  return { players, isLoading, error };
}

// Convenience hook that combines joueurs data with dynamic player colors
export function useJoueursDataWithColors() {
  const { joueursData, isLoading, error } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  
  return { 
    joueursData, 
    playersColor, 
    isLoading, 
    error 
  };
}

// Hook to find a specific player by name
export function usePlayer(playerName: string) {
  const { joueursData, isLoading, error } = useJoueursData();
  
  const player = joueursData?.Players.find(p => p.Joueur === playerName) || null;
  
  return { player, isLoading, error };
}

// Hook to get player names only (useful for dropdowns/selects)
export function usePlayerNames() {
  const { joueursData, isLoading, error } = useJoueursData();
  
  const playerNames = joueursData?.Players.map(p => p.Joueur) || null;
  
  return { playerNames, isLoading, error };
}

// Hook to get players with social media links
export function usePlayersWithSocialMedia() {
  const { joueursData, isLoading, error } = useJoueursData();
  
  const playersWithSocial = joueursData?.Players.filter(p => 
    p.Twitch !== null || p.Youtube !== null
  ) || null;
  
  return { playersWithSocial, isLoading, error };
}