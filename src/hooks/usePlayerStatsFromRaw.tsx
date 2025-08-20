import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';
import type { PlayerStatsData, PlayerStat, PlayerCamps } from '../types/api';

/**
 * Hook pour calculer les statistiques détaillées des joueurs à partir des données brutes filtrées.
 * Implémente la même logique que _computePlayerStats du Google Apps Script.
 */
export function usePlayerStatsFromRaw() {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const playerStats = useMemo((): PlayerStatsData | null => {
    if (!rawGameData || rawGameData.length === 0 || !rawRoleData || rawRoleData.length === 0) {
      return null;
    }

    // Helper function to split and trim strings like the Google Apps Script
    const splitAndTrim = (str: string | null | undefined): string[] => {
      return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    };

    // Helper function to determine if a player won the game
    const didPlayerWin = (playerName: string, winnerList: string | null | undefined): boolean => {
      if (winnerList && winnerList.trim() !== "") {
        const winners = splitAndTrim(winnerList);
        return winners.some(winner => winner.toLowerCase() === playerName.toLowerCase());
      }
      return false;
    };

    // Helper function to get player's camp in a specific game
    const getPlayerCamp = (gamePlayerCampMap: Record<string, Record<string, string>>, gameId: string, playerName: string): string => {
      return (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][playerName]) || "Villageois";
    };

    // Create map of game ID to player camps from role data
    const gamePlayerCampMap: Record<string, Record<string, string>> = {};
    
    rawRoleData.forEach(roleRow => {
      const gameId = roleRow["Game"]?.toString();
      if (!gameId) return;

      if (!gamePlayerCampMap[gameId]) {
        gamePlayerCampMap[gameId] = {};
      }

      // Helper function to add a single role player
      const addRolePlayer = (player: string | null | undefined, roleName: string) => {
        if (player && player.toString().trim()) {
          gamePlayerCampMap[gameId][player.toString().trim()] = roleName;
        }
      };

      // Add wolves (could be multiple)
      const wolves = roleRow["Loups"];
      if (wolves) {
        splitAndTrim(wolves.toString()).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Loups";
        });
      }

      // Add all other single roles
      addRolePlayer(roleRow["Traître"], "Traître");
      addRolePlayer(roleRow["Idiot du village"], "Idiot du Village");
      addRolePlayer(roleRow["Cannibale"], "Cannibale");
      addRolePlayer(roleRow["Espion"], "Espion");
      addRolePlayer(roleRow["La Bête"], "La Bête");
      addRolePlayer(roleRow["Chasseur de primes"], "Chasseur de primes");
      addRolePlayer(roleRow["Vaudou"], "Vaudou");

      // Handle agents (could be multiple)
      const agents = roleRow["Agent"];
      if (agents) {
        splitAndTrim(agents.toString()).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Agent";
        });
      }

      // Handle scientists (could be multiple)
      const scientists = roleRow["Scientifique"];
      if (scientists) {
        splitAndTrim(scientists.toString()).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Scientifique";
        });
      }

      // Handle lovers (could be multiple)
      const lovers = roleRow["Amoureux"];
      if (lovers) {
        splitAndTrim(lovers.toString()).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Amoureux";
        });
      }
    });

    // Initialize player statistics
    const allPlayers: Record<string, {
      gamesPlayed: number;
      gamesPlayedPercent: string;
      wins: number;
      winPercent: string;
      camps: PlayerCamps;
    }> = {};

    let totalGames = 0;

    // Process game data to collect player statistics
    rawGameData.forEach(gameRow => {
      const gameId = gameRow["Game"]?.toString();
      const playerList = gameRow["Liste des joueurs"];
      const winnerList = gameRow["Liste des gagnants"];

      if (gameId && playerList) {
        totalGames++;
        const players = splitAndTrim(playerList.toString());

        players.forEach(playerName => {
          const player = playerName.trim();
          if (player) {
            // Initialize player if not seen before
            if (!allPlayers[player]) {
              allPlayers[player] = {
                gamesPlayed: 0,
                gamesPlayedPercent: "0",
                wins: 0,
                winPercent: "0",
                camps: {
                  "Villageois": 0,
                  "Loups": 0,
                  "Traître": 0,
                  "Idiot du Village": 0,
                  "Cannibale": 0,
                  "Agent": 0,
                  "Espion": 0,
                  "Scientifique": 0,
                  "Amoureux": 0,
                  "La Bête": 0,
                  "Chasseur de primes": 0,
                  "Vaudou": 0
                }
              };
            }

            // Increment games played
            allPlayers[player].gamesPlayed++;

            // Determine player's camp in this game
            const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);

            // Increment camp count
            allPlayers[player].camps[playerCamp as keyof PlayerCamps]++;

            // Check if player won
            const playerWon = didPlayerWin(player, winnerList?.toString());
            if (playerWon) {
              allPlayers[player].wins++;
            }
          }
        });
      }
    });

    // Calculate percentages for each player
    Object.keys(allPlayers).forEach(player => {
      const stats = allPlayers[player];
      stats.gamesPlayedPercent = (stats.gamesPlayed / totalGames * 100).toFixed(2);
      stats.winPercent = (stats.wins / stats.gamesPlayed * 100).toFixed(2);
    });

    // Convert to array format and add player name
    const playerStatsArray: PlayerStat[] = Object.keys(allPlayers).map(player => ({
      player,
      ...allPlayers[player]
    }));

    // Sort by games played (descending)
    playerStatsArray.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    return {
      totalGames,
      playerStats: playerStatsArray
    };
  }, [rawGameData, rawRoleData]);

  return {
    data: playerStats,
    isLoading: gameLoading || roleLoading,
    error: gameError || roleError
  };
}
