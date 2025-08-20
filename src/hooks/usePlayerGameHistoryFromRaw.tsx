import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';

export interface PlayerGame {
  gameId: string;
  date: string;
  camp: string;
  won: boolean;
  winnerCamp: string;
  playersInGame: number;
}

export interface CampStats {
  appearances: number;
  wins: number;
  winRate: string;
}

export interface PlayerGameHistoryData {
  playerName: string;
  totalGames: number;
  totalWins: number;
  winRate: string;
  games: PlayerGame[];
  campStats: Record<string, CampStats>;
}

/**
 * Hook pour calculer l'historique détaillé d'un joueur à partir des données brutes filtrées.
 * Implémente la même logique que getPlayerGameHistoryRaw du Google Apps Script.
 */
export function usePlayerGameHistoryFromRaw(playerName: string | null) {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const playerGameHistory = useMemo((): PlayerGameHistoryData | null => {
    if (!playerName || playerName.trim() === '') {
      return null;
    }

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

    // Helper function to format date consistently
    const formatLycanDate = (date: any): string => {
      if (date instanceof Date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      if (typeof date === 'string') {
        // If it's already in DD/MM/YYYY format, return as is
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
          return date;
        }
        // Convert YYYY-MM-DD to DD/MM/YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const parts = date.split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      
      return date?.toString() || '';
    };

    // Create map of game ID to player camps from role data
    const gamePlayerCampMap: Record<string, Record<string, string>> = {};
    
    rawRoleData.forEach(roleRow => {
      const gameId = roleRow["Game"]?.toString();
      if (!gameId) return;

      if (!gamePlayerCampMap[gameId]) {
        gamePlayerCampMap[gameId] = {};
      }

      // Helper function to add player to camp
      const addPlayerToCamp = (playerStr: any, campName: string) => {
        if (playerStr) {
          const players = splitAndTrim(playerStr.toString());
          players.forEach(player => {
            const trimmedPlayer = player.trim();
            if (trimmedPlayer) {
              gamePlayerCampMap[gameId][trimmedPlayer] = campName;
            }
          });
        }
      };

      // Add players by camp
      addPlayerToCamp(roleRow["Loups"], "Loups");
      addPlayerToCamp(roleRow["Traître"], "Traître");
      addPlayerToCamp(roleRow["Idiot du village"], "Idiot du Village");
      addPlayerToCamp(roleRow["Cannibale"], "Cannibale");
      addPlayerToCamp(roleRow["Agent"], "Agent");
      addPlayerToCamp(roleRow["Espion"], "Espion");
      addPlayerToCamp(roleRow["Scientifique"], "Scientifique");
      addPlayerToCamp(roleRow["Amoureux"], "Amoureux");
      addPlayerToCamp(roleRow["La Bête"], "La Bête");
      addPlayerToCamp(roleRow["Chasseur de primes"], "Chasseur de primes");
      addPlayerToCamp(roleRow["Vaudou"], "Vaudou");
    });

    // Find games where the player participated
    const playerGames: PlayerGame[] = [];

    rawGameData.forEach(gameRow => {
      const gameId = gameRow["Game"]?.toString();
      const date = gameRow["Date"];
      const playerList = gameRow["Liste des joueurs"];
      const winnerCamp = gameRow["Camp victorieux"];
      const winnerList = gameRow["Liste des gagnants"];

      if (gameId && playerList && date && winnerList) {
        // Check if player is in the game
        const players = splitAndTrim(playerList.toString());
        const playerInGame = players.some(p => p.toLowerCase() === playerName.toLowerCase());

        if (playerInGame) {
          // Determine player's camp
          const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);

          // Determine win/loss status
          const playerWon = didPlayerWin(playerName, winnerList?.toString());

          // Format date consistently
          const formattedDate = formatLycanDate(date);

          playerGames.push({
            gameId: gameId,
            date: formattedDate,
            camp: playerCamp,
            won: playerWon,
            winnerCamp: winnerCamp?.toString() || '',
            playersInGame: players.length
          });
        }
      }
    });

    // Sort games by date (most recent first)
    playerGames.sort((a, b) => {
      // Convert DD/MM/YYYY to comparable format
      const parseDate = (dateStr: string): Date => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
      };

      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
    });

    // Calculate summary statistics
    const totalGames = playerGames.length;
    const totalWins = playerGames.filter(game => game.won).length;
    const winRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(2) : "0.00";

    // Calculate camp distribution
    const campStats: Record<string, CampStats> = {};
    playerGames.forEach(game => {
      if (!campStats[game.camp]) {
        campStats[game.camp] = {
          appearances: 0,
          wins: 0,
          winRate: "0.00"
        };
      }
      campStats[game.camp].appearances++;
      if (game.won) {
        campStats[game.camp].wins++;
      }
    });

    // Calculate win rates for each camp
    Object.keys(campStats).forEach(camp => {
      const stats = campStats[camp];
      stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    });

    return {
      playerName: playerName,
      totalGames: totalGames,
      totalWins: totalWins,
      winRate: winRate,
      games: playerGames,
      campStats: campStats
    };
  }, [playerName, rawGameData, rawRoleData]);

  return {
    data: playerGameHistory,
    isLoading: gameLoading || roleLoading,
    error: gameError || roleError
  };
}
