import { useState, useEffect } from 'react';
import type { PlayerRankings } from '../types/rankings';
import { useSettings } from '../context/SettingsContext';
import { useJoueursData } from './useJoueursData';

interface PreCalculatedRankingsData {
  generatedAt: string;
  totalPlayers: number;
  totalGames: number;
  totalModdedGames: number;
  Rankings: Record<string, PlayerRankings>;
}

/**
 * Hook to load pre-calculated Rankings from the server-generated JSON file
 * @param playerName - The player name to get Rankings for
 * @returns PlayerRankings or null if not found/loading
 */
export function usePreCalculatedPlayerRankings(playerName: string | null): {
  data: PlayerRankings | null;
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
  const [RankingsData, setRankingsData] = useState<PreCalculatedRankingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Rankings data from JSON file
  useEffect(() => {
    let mounted = true;

    const loadRankings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use the appropriate data source path
        const dataPath = settings.dataSource === 'discord' 
          ? '/data/discord/playerRankings.json'
          : '/data/playerRankings.json';

        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to load Rankings: ${response.status} ${response.statusText}`);
        }

        const data: PreCalculatedRankingsData = await response.json();
        
        if (mounted) {
          setRankingsData(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load Rankings');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadRankings();

    return () => {
      mounted = false;
    };
  }, [settings.dataSource]); // Reload when data source changes

  // Extract player-specific Rankings by mapping player name → Steam ID → Rankings
  // Rankings are now keyed by Steam ID, so we need to find the player's ID first
  const playerRankings = (() => {
    if (!playerName || !RankingsData) return null;
    
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
    
    // Lookup Rankings by Steam ID
    return RankingsData.Rankings[steamId] || null;
  })();

  // Debug logging when a player is selected
  useEffect(() => {
    if (playerName && RankingsData && joueursData) {
      const playerInfo = joueursData.Players?.find(p => p.Joueur === playerName);
      const steamId = playerInfo?.SteamID;
      
      if (!steamId) {
        return;
      }
    }
  }, [playerName, RankingsData, joueursData, settings.dataSource]);

  return {
    data: playerRankings,
    isLoading,
    error,
    metadata: {
      generatedAt: RankingsData?.generatedAt || null,
      totalPlayers: RankingsData?.totalPlayers || 0,
      totalGames: RankingsData?.totalGames || 0,
      totalModdedGames: RankingsData?.totalModdedGames || 0,
    }
  };
}