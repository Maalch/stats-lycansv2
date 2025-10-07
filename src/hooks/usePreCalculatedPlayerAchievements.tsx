import { useState, useEffect } from 'react';
import type { PlayerAchievements } from '../types/achievements';

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

        const response = await fetch('/data/playerAchievements.json');
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
  }, []);

  // Extract player-specific achievements
  const playerAchievements = playerName && achievementsData?.achievements[playerName] || null;

  // Debug logging when a player is selected
  useEffect(() => {
    if (playerName && achievementsData) {
      const achievements = achievementsData.achievements[playerName];
      if (achievements) {
        console.log(`🏆 Achievements for ${playerName}:`, {
          allGames: achievements.allGamesAchievements.length,
          moddedOnly: achievements.moddedOnlyAchievements.length,
          categories: [...new Set([
            ...achievements.allGamesAchievements.map(a => a.category),
            ...achievements.moddedOnlyAchievements.map(a => a.category)
          ])]
        });
      } else {
        console.log(`❌ No achievements found for ${playerName}`);
      }
    }
  }, [playerName, achievementsData]);

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