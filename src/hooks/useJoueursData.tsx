import { useState, useEffect } from 'react';
import type { JoueursData } from '../types/joueurs';
import { useThemeAdjustedDynamicPlayersColor } from '../types/api';

export function useJoueursData() {
  const [joueursData, setJoueursData] = useState<JoueursData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJoueursData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${import.meta.env.BASE_URL}data/joueurs.json`);
        if (!response.ok) {
          throw new Error('Failed to fetch joueurs data');
        }

        const result: JoueursData = await response.json();
        setJoueursData(result);
      } catch (err) {
        console.error('Error fetching joueurs data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJoueursData();
  }, []);

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