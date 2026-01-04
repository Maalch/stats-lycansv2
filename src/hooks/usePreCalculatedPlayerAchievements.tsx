import { useState, useEffect } from 'react';
import type { PlayerAchievements } from '../types/achievements';
import { useSettings } from '../context/SettingsContext';
import { useJoueursData } from './useJoueursData';

interface PreCalculatedAchievementsData {
  generatedAt: string;
  totalPlayers: number;
  totalGames: number;
  totalModdedGames: number;
  achievements: Record<string, PlayerAchievements>;
}

/**
 * Hook to load pre-calculated achievements from the server-generated JSON file
 * @param playerName - The player name to get achievements for
 * @returns PlayerAchievements or null if not found/loading
 */
export function usePreCalculatedPlayerAchievements(playerName: string | null): {
  data: PlayerAchievements | null;
  isLoading: boolean;
  error: string | null;
  metadata: {
    generatedAt: string | null;
    totalPlayers: number;
    totalGames: number;
    totalModdedGames: number;
  };
} {
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const [achievementsData, setAchievementsData] = useState<PreCalculatedAchievementsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load achievements data from JSON file
  useEffect(() => {
    let mounted = true;

    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use the appropriate data source path
        const dataPath = settings.dataSource === 'discord' 
          ? '/data/discord/playerAchievements.json'
          : '/data/playerAchievements.json';

        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to load achievements: ${response.status} ${response.statusText}`);
        }

        const data: PreCalculatedAchievementsData = await response.json();
        
        if (mounted) {
          setAchievementsData(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load achievements');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAchievements();

    return () => {
      mounted = false;
    };
  }, [settings.dataSource]); // Reload when data source changes

  // Extract player-specific achievements by mapping player name → Steam ID → achievements
  // Achievements are now keyed by Steam ID, so we need to find the player's ID first
  const playerAchievements = (() => {
    if (!playerName || !achievementsData) return null;
    
    // Find player's Steam ID from joueurs.json
    const playerInfo = joueursData?.Players?.find(p => p.Joueur === playerName);
    const steamId = playerInfo?.SteamID;
    
    if (!steamId) {
      // Player doesn't have Steam ID - this is expected in dev mode
      if (import.meta.env.DEV) {
        console.error(`No Steam ID found for player: ${playerName}`);
      }
      return null;
    }
    
    // Lookup achievements by Steam ID
    return achievementsData.achievements[steamId] || null;
  })();

  // Debug logging when a player is selected
  useEffect(() => {
    if (playerName && achievementsData && joueursData) {
      const playerInfo = joueursData.Players?.find(p => p.Joueur === playerName);
      const steamId = playerInfo?.SteamID;
      
      if (!steamId) {
        return;
      }
    }
  }, [playerName, achievementsData, joueursData, settings.dataSource]);

  return {
    data: playerAchievements,
    isLoading,
    error,
    metadata: {
      generatedAt: achievementsData?.generatedAt || null,
      totalPlayers: achievementsData?.totalPlayers || 0,
      totalGames: achievementsData?.totalGames || 0,
      totalModdedGames: achievementsData?.totalModdedGames || 0,
    }
  };
}