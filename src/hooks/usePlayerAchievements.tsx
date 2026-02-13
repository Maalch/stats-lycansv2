import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useJoueursData } from './useJoueursData';
import type {
  AchievementsData,
  PlayerAchievements,
  AchievementWithProgress,
  AchievementCategory,
} from '../types/achievements';

/**
 * Hook to load pre-calculated player achievements from playerAchievements.json
 * @param playerName - Optional player name to get specific player's achievements
 */
export function usePlayerAchievements(playerName?: string | null) {
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const [data, setData] = useState<AchievementsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAchievements = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const dataPath = settings.dataSource === 'discord'
          ? '/data/discord/playerAchievements.json'
          : '/data/playerAchievements.json';

        const response = await fetch(dataPath);

        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            setError('Les succès n\'ont pas encore été générés. Ils seront disponibles après la prochaine synchronisation.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return;
        }

        const achievementsData: AchievementsData = await response.json();
        setData(achievementsData);
      } catch (err) {
        console.error('Error loading player achievements:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [settings.dataSource]);

  // Resolve player data by name → Steam ID
  const playerData = useMemo<PlayerAchievements | null>(() => {
    if (!data || !playerName) return null;

    // Try to find by player name in the data
    const entry = Object.entries(data.players).find(
      ([_, pData]) => pData.playerName === playerName
    );
    if (entry) return entry[1];

    // Try Steam ID lookup via joueursData
    if (joueursData?.Players) {
      const joueur = joueursData.Players.find(p => p.Joueur === playerName);
      const steamId = joueur?.SteamID;
      if (steamId && data.players[steamId]) {
        return data.players[steamId];
      }
    }

    return null;
  }, [data, playerName, joueursData]);

  // Merge definitions with player progress
  const achievementsWithProgress = useMemo<AchievementWithProgress[]>(() => {
    if (!data) return [];

    return data.achievementDefinitions.map(def => {
      const progress = playerData?.achievements.find(a => a.id === def.id) || null;
      return { ...def, playerProgress: progress };
    });
  }, [data, playerData]);

  return {
    data,
    playerData,
    achievementsWithProgress,
    definitions: data?.achievementDefinitions || [],
    categories: data?.categories || {} as Record<string, AchievementCategory>,
    isLoading,
    error,
  };
}
