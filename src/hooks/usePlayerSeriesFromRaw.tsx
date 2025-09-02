import { useMemo } from 'react';
import { useFilteredRawGameData } from './useRawGameData';
import { useFilteredRawRoleData } from './useRawGameData';

export interface CampSeries {
  player: string;
  camp: 'Villageois' | 'Loups';
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
}

export interface WinSeries {
  player: string;
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
}

export interface PlayerSeriesData {
  longestVillageoisSeries: CampSeries[];
  longestLoupsSeries: CampSeries[];
  longestWinSeries: WinSeries[];
  totalGamesAnalyzed: number;
  // Statistics for all players
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageWinSeries: number;
  eliteVillageoisCount: number; // Players with 5+ Villageois series
  eliteLoupsCount: number; // Players with 3+ Loups series
  eliteWinCount: number; // Players with 5+ win series
  totalPlayersCount: number;
}

/**
 * Hook pour calculer les séries les plus longues des joueurs à partir des données brutes filtrées.
 * Calcule les séries de camps consécutifs (Villageois/Loups) et les séries de victoires.
 */
export function usePlayerSeriesFromRaw() {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const seriesData = useMemo((): PlayerSeriesData | null => {
    if (!rawGameData || rawGameData.length === 0 || !rawRoleData || rawRoleData.length === 0) {
      return null;
    }

    // Helper function to split and trim strings
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

      // Add lovers (could be multiple)
      const lovers = roleRow["Amoureux"];
      if (lovers) {
        splitAndTrim(lovers.toString()).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Amoureux";
        });
      }

      // Add Agent (could be multiple)
      const agents = roleRow["Agent"];
      if (agents) {
        splitAndTrim(agents.toString()).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Agent";
        });
      }

      // Add all other single roles
      addRolePlayer(roleRow["Traître"], "Traître");
      addRolePlayer(roleRow["Idiot du village"], "Idiot du Village");
      addRolePlayer(roleRow["Cannibale"], "Cannibale");
      addRolePlayer(roleRow["Espion"], "Espion");
      addRolePlayer(roleRow["Scientifique"], "Scientifique");
      addRolePlayer(roleRow["La Bête"], "La Bête");
      addRolePlayer(roleRow["Chasseur de primes"], "Chasseur de primes");
      addRolePlayer(roleRow["Vaudou"], "Vaudou");
    });

    // Helper function to get player's main camp (Villageois or Loups)
    const getPlayerMainCamp = (gamePlayerCampMap: Record<string, Record<string, string>>, gameId: string, playerName: string): 'Villageois' | 'Loups' | 'Autres' => {
      const playerCamp = (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][playerName]) || "Villageois";
      
      // Map specific roles to main camps
      if (playerCamp === "Loups" || playerCamp === "Traître") {
        return "Loups";
      } else if (playerCamp === "Villageois") {
        return "Villageois";
      } else {
        return "Autres"; // For special roles like Cannibale, Agent, etc.
      }
    };

    // Sort games by game ID to ensure chronological order
    const sortedGames = [...rawGameData].sort((a, b) => (a.Game || 0) - (b.Game || 0));

    // Get all unique players
    const allPlayers = new Set<string>();
    sortedGames.forEach(gameRow => {
      const playerList = gameRow["Liste des joueurs"];
      if (playerList) {
        splitAndTrim(playerList.toString()).forEach(player => {
          allPlayers.add(player.trim());
        });
      }
    });

    // Track series for each player
    const playerCampSeries: Record<string, {
      currentVillageoisSeries: number;
      currentLoupsSeries: number;
      longestVillageoisSeries: CampSeries | null;
      longestLoupsSeries: CampSeries | null;
      currentWinSeries: number;
      longestWinSeries: WinSeries | null;
      currentWinCamps: string[];
      lastCamp: 'Villageois' | 'Loups' | 'Autres' | null;
      lastWon: boolean;
      villageoisSeriesStart: { game: number; date: string } | null;
      loupsSeriesStart: { game: number; date: string } | null;
      winSeriesStart: { game: number; date: string } | null;
    }> = {};

    // Initialize tracking for all players
    allPlayers.forEach(player => {
      playerCampSeries[player] = {
        currentVillageoisSeries: 0,
        currentLoupsSeries: 0,
        longestVillageoisSeries: null,
        longestLoupsSeries: null,
        currentWinSeries: 0,
        longestWinSeries: null,
        currentWinCamps: [],
        lastCamp: null,
        lastWon: false,
        villageoisSeriesStart: null,
        loupsSeriesStart: null,
        winSeriesStart: null
      };
    });

    // Process each game chronologically
    sortedGames.forEach(gameRow => {
      const gameId = gameRow["Game"]?.toString();
      const playerList = gameRow["Liste des joueurs"];
      const winnerList = gameRow["Liste des gagnants"];
      const date = gameRow["Date"]?.toString() || "";

      if (!gameId || !playerList) return;

      const players = splitAndTrim(playerList.toString());
      const gameIdNum = parseInt(gameId);

      players.forEach(playerName => {
        const player = playerName.trim();
        if (!player) return;

        const playerStats = playerCampSeries[player];
        const mainCamp = getPlayerMainCamp(gamePlayerCampMap, gameId, player);
        const playerWon = didPlayerWin(player, winnerList?.toString());
        const actualCamp = (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][player]) || "Villageois";

        // Handle camp series (only Villageois and Loups count)
        if (mainCamp === 'Villageois' || mainCamp === 'Loups') {
          // Check Villageois series
          if (mainCamp === 'Villageois') {
            if (playerStats.lastCamp === 'Villageois') {
              playerStats.currentVillageoisSeries++;
            } else {
              playerStats.currentVillageoisSeries = 1;
              playerStats.villageoisSeriesStart = { game: gameIdNum, date };
            }
            
            // Update longest if current is longer
            if (!playerStats.longestVillageoisSeries || 
                playerStats.currentVillageoisSeries > playerStats.longestVillageoisSeries.seriesLength) {
              playerStats.longestVillageoisSeries = {
                player,
                camp: 'Villageois',
                seriesLength: playerStats.currentVillageoisSeries,
                startGame: playerStats.villageoisSeriesStart?.game || gameIdNum,
                endGame: gameIdNum,
                startDate: playerStats.villageoisSeriesStart?.date || date,
                endDate: date
              };
            }
            
            // Reset Loups series
            playerStats.currentLoupsSeries = 0;
            playerStats.loupsSeriesStart = null;
          }
          
          // Check Loups series
          if (mainCamp === 'Loups') {
            if (playerStats.lastCamp === 'Loups') {
              playerStats.currentLoupsSeries++;
            } else {
              playerStats.currentLoupsSeries = 1;
              playerStats.loupsSeriesStart = { game: gameIdNum, date };
            }
            
            // Update longest if current is longer
            if (!playerStats.longestLoupsSeries || 
                playerStats.currentLoupsSeries > playerStats.longestLoupsSeries.seriesLength) {
              playerStats.longestLoupsSeries = {
                player,
                camp: 'Loups',
                seriesLength: playerStats.currentLoupsSeries,
                startGame: playerStats.loupsSeriesStart?.game || gameIdNum,
                endGame: gameIdNum,
                startDate: playerStats.loupsSeriesStart?.date || date,
                endDate: date
              };
            }
            
            // Reset Villageois series
            playerStats.currentVillageoisSeries = 0;
            playerStats.villageoisSeriesStart = null;
          }
          
          playerStats.lastCamp = mainCamp;
        } else {
          // Playing as special role breaks both camp series
          playerStats.currentVillageoisSeries = 0;
          playerStats.currentLoupsSeries = 0;
          playerStats.villageoisSeriesStart = null;
          playerStats.loupsSeriesStart = null;
          playerStats.lastCamp = 'Autres';
        }

        // Handle win series
        if (playerWon) {
          if (playerStats.lastWon) {
            playerStats.currentWinSeries++;
            playerStats.currentWinCamps.push(actualCamp);
          } else {
            playerStats.currentWinSeries = 1;
            playerStats.currentWinCamps = [actualCamp];
            playerStats.winSeriesStart = { game: gameIdNum, date };
          }
          
          // Update longest win series if current is longer
          if (!playerStats.longestWinSeries || 
              playerStats.currentWinSeries > playerStats.longestWinSeries.seriesLength) {
            
            // Calculate camp counts from the current win camps array
            const campCounts: Record<string, number> = {};
            playerStats.currentWinCamps.forEach(camp => {
              campCounts[camp] = (campCounts[camp] || 0) + 1;
            });
            
            playerStats.longestWinSeries = {
              player,
              seriesLength: playerStats.currentWinSeries,
              startGame: playerStats.winSeriesStart?.game || gameIdNum,
              endGame: gameIdNum,
              startDate: playerStats.winSeriesStart?.date || date,
              endDate: date,
              campCounts: campCounts
            };
          }
          
          playerStats.lastWon = true;
        } else {
          // Losing breaks the win series
          playerStats.currentWinSeries = 0;
          playerStats.currentWinCamps = [];
          playerStats.winSeriesStart = null;
          playerStats.lastWon = false;
        }
      });
    });

    // Collect results
    const longestVillageoisSeries: CampSeries[] = [];
    const longestLoupsSeries: CampSeries[] = [];
    const longestWinSeries: WinSeries[] = [];

    Object.values(playerCampSeries).forEach(stats => {
      if (stats.longestVillageoisSeries) {
        longestVillageoisSeries.push(stats.longestVillageoisSeries);
      }
      if (stats.longestLoupsSeries) {
        longestLoupsSeries.push(stats.longestLoupsSeries);
      }
      if (stats.longestWinSeries) {
        longestWinSeries.push(stats.longestWinSeries);
      }
    });

    // Sort by series length (descending) and take top results
    longestVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
    longestLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
    longestWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);

    // Calculate statistics for all players
    const totalPlayers = allPlayers.size;
    
    // Calculate averages
    const averageVillageoisSeries = longestVillageoisSeries.length > 0 
      ? longestVillageoisSeries.reduce((sum, series) => sum + series.seriesLength, 0) / longestVillageoisSeries.length 
      : 0;
    
    const averageLoupsSeries = longestLoupsSeries.length > 0 
      ? longestLoupsSeries.reduce((sum, series) => sum + series.seriesLength, 0) / longestLoupsSeries.length 
      : 0;
    
    const averageWinSeries = longestWinSeries.length > 0 
      ? longestWinSeries.reduce((sum, series) => sum + series.seriesLength, 0) / longestWinSeries.length 
      : 0;

    // Count elite players (with thresholds: Villageois 5+, Loups 3+, Wins 5+)
    const eliteVillageoisCount = longestVillageoisSeries.filter(series => series.seriesLength >= 5).length;
    const eliteLoupsCount = longestLoupsSeries.filter(series => series.seriesLength >= 3).length;
    const eliteWinCount = longestWinSeries.filter(series => series.seriesLength >= 5).length;

    return {
      longestVillageoisSeries: longestVillageoisSeries.slice(0, 10), // Top 10
      longestLoupsSeries: longestLoupsSeries.slice(0, 10), // Top 10
      longestWinSeries: longestWinSeries.slice(0, 10), // Top 10
      totalGamesAnalyzed: sortedGames.length,
      averageVillageoisSeries: Math.round(averageVillageoisSeries * 10) / 10, // Round to 1 decimal
      averageLoupsSeries: Math.round(averageLoupsSeries * 10) / 10,
      averageWinSeries: Math.round(averageWinSeries * 10) / 10,
      eliteVillageoisCount,
      eliteLoupsCount,
      eliteWinCount,
      totalPlayersCount: totalPlayers
    };
  }, [rawGameData, rawRoleData]);

  return {
    data: seriesData,
    isLoading: gameLoading || roleLoading,
    error: gameError || roleError
  };
}
