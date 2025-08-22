import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';
import type { CampWinStatsResponse, CampStat, SoloCamp, CampAverage } from '../types/api';

/**
 * Hook pour calculer les statistiques de victoire par camp à partir des données brutes filtrées.
 * Implémente la même logique que _computeCampWinStats du Google Apps Script.
 */
export function useCampWinStatsFromRaw() {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const campWinStats = useMemo((): CampWinStatsResponse | null => {
    if (!rawGameData || rawGameData.length === 0 || !rawRoleData || rawRoleData.length === 0) {
      return null;
    }

    // Helper function to split and trim strings like the Google Apps Script
    const splitAndTrim = (str: string | null): string[] => {
      return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    };

    const getPlayerCamp = (gamePlayerCampMap: Record<number, Record<string, string>>, gameId: number, playerName: string): string => {
      return (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][playerName]) || "Villageois";
    };

    const didPlayerWin = (playerName: string, winnerList: string): boolean => {
      if (winnerList && winnerList.trim() !== "") {
        const winners = splitAndTrim(winnerList);
        return winners.some(winner => winner.toLowerCase() === playerName.toLowerCase());
      }
      return false;
    };

    const didCampWin = (camp: string, winnerCamp: string): boolean => {
      if (camp === winnerCamp) return true;
      // Special case: Traitor wins if Wolves win
      if (camp === "Traître" && winnerCamp === "Loups") return true;
      return false;
    };

    // Create map of game ID to player camps from role data
    const gamePlayerCampMap: Record<number, Record<string, string>> = {};
    
    rawRoleData.forEach(role => {
      const gameId = role.Game;
      if (!gameId) return;

      if (!gamePlayerCampMap[gameId]) {
        gamePlayerCampMap[gameId] = {};
      }

      // Helper function to add role player
      const addRolePlayer = (player: string | null, roleName: string) => {
        if (player && player.trim()) {
          gamePlayerCampMap[gameId][player.trim()] = roleName;
        }
      };

      // Add wolves
      const wolves = role.Loups;
      if (wolves) {
        splitAndTrim(wolves).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Loups";
        });
      }

      // Add other individual roles
      addRolePlayer(role.Traître, "Traître");
      addRolePlayer(role["Idiot du village"], "Idiot du Village");
      addRolePlayer(role.Cannibale, "Cannibale");
      addRolePlayer(role.Espion, "Espion");
      addRolePlayer(role["La Bête"], "La Bête");
      addRolePlayer(role["Chasseur de primes"], "Chasseur de primes");
      addRolePlayer(role.Vaudou, "Vaudou");

      // Handle agents (could be multiple)
      const agents = role.Agent;
      if (agents) {
        splitAndTrim(agents).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Agent";
        });
      }

      // Handle scientist (could be multiple)
      const scientists = role.Scientifique;
      if (scientists) {
        splitAndTrim(scientists).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Scientifique";
        });
      }

      // Handle lovers (could be multiple)
      const lovers = role.Amoureux;
      if (lovers) {
        splitAndTrim(lovers).forEach(player => {
          gamePlayerCampMap[gameId][player] = "Amoureux";
        });
      }
    });

    // Initialize statistics objects
    const soloCamps: Record<string, number> = {};
    const campWins: Record<string, number> = {};
    const campStats: Record<string, {
      totalGames: number;
      wins: number;
      winRate: number;
      players: Record<string, { games: number; wins: number; winRate: number }>;
    }> = {};
    let totalGames = 0;

    // Process each game for both victory stats and camp participation
    rawGameData.forEach(game => {
      const gameId = game.Game;
      const soloRoles = game["Rôles solo"];
      const winnerCamp = game["Camp victorieux"];
      const playerList = game["Liste des joueurs"];
      const winnerList = game["Liste des gagnants"];

      // Process solo roles if they exist
      if (soloRoles && soloRoles.toString().trim() !== "") {
        // Split by comma and process each solo role
        const soloRolesList = splitAndTrim(soloRoles.toString());
        soloRolesList.forEach(soloRole => {
          const trimmedRole = soloRole.trim();
          if (trimmedRole !== "") {
            // Track solo camps
            if (!soloCamps[trimmedRole]) {
              soloCamps[trimmedRole] = 0;
            }
            soloCamps[trimmedRole]++;
          }
        });
      }

      // Process regular winner camp for victory statistics
      if (winnerCamp && winnerCamp.trim() !== "") {
        totalGames++;
        if (!campWins[winnerCamp]) {
          campWins[winnerCamp] = 0;
        }
        campWins[winnerCamp]++;
      }

      // Process camp participation and performance for camp averages
      if (gameId && playerList && winnerCamp && winnerList) {
        const players = splitAndTrim(playerList);

        // Count participation for each camp in this game
        const campsInGame = new Set<string>();
        players.forEach(playerName => {
          const player = playerName.trim();
          if (player) {
            const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);
            campsInGame.add(playerCamp);
          }
        });

        // Initialize and count participations
        campsInGame.forEach(camp => {
          if (!campStats[camp]) {
            campStats[camp] = {
              totalGames: 0,
              wins: 0,
              winRate: 0,
              players: {}
            };
          }
          campStats[camp].totalGames++;
        });

        // Count wins for all camps (including special cases)
        campsInGame.forEach(camp => {
          if (didCampWin(camp, winnerCamp)) {
            campStats[camp].wins++;
          }
        });

        // Track individual player performance for counting
        players.forEach(playerName => {
          const player = playerName.trim();
          if (player) {
            const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);

            if (!campStats[playerCamp].players[player]) {
              campStats[playerCamp].players[player] = {
                games: 0,
                wins: 0,
                winRate: 0
              };
            }
            campStats[playerCamp].players[player].games++;

            // Check if player won
            const playerWon = didPlayerWin(player, winnerList);
            if (playerWon) {
              campStats[playerCamp].players[player].wins++;
            }
          }
        });
      }
    });

    // Calculate win rates for camps
    Object.keys(campStats).forEach(camp => {
      if (campStats[camp].totalGames > 0) {
        campStats[camp].winRate = parseFloat((campStats[camp].wins / campStats[camp].totalGames * 100).toFixed(2));
      }

      // Calculate each player's win rate in this camp
      Object.keys(campStats[camp].players).forEach(player => {
        const playerStat = campStats[camp].players[player];
        if (playerStat.games > 0) {
          playerStat.winRate = parseFloat((playerStat.wins / playerStat.games * 100).toFixed(2));
        }
      });
    });

    // Calculate victory statistics (original campStats for victory distribution)
    const victoryCampStats: CampStat[] = [];
    Object.keys(campWins).forEach(camp => {
      victoryCampStats.push({
        camp: camp,
        wins: campWins[camp],
        winRate: (campWins[camp] / totalGames * 100).toFixed(2)
      });
    });

    // Sort by win count (descending)
    victoryCampStats.sort((a, b) => b.wins - a.wins);

    // Convert camp participation stats to campAverages format
    const campAverages: CampAverage[] = Object.keys(campStats).map(camp => ({
      camp: camp,
      totalGames: campStats[camp].totalGames,
      winRate: campStats[camp].winRate.toFixed(2)
    }));

    // Calculate total number of unique players analyzed
    const allPlayersSet = new Set<string>();
    Object.keys(campStats).forEach(camp => {
      Object.keys(campStats[camp].players).forEach(player => {
        allPlayersSet.add(player);
      });
    });
    const totalPlayersAnalyzed = allPlayersSet.size;

    // Convert soloCamps to array for easier frontend processing
    const soloCampStats: SoloCamp[] = [];
    Object.keys(soloCamps).forEach(soloRole => {
      soloCampStats.push({
        soloRole: soloRole,
        appearances: soloCamps[soloRole]
      });
    });

    // Sort solo camps by appearances (descending)
    soloCampStats.sort((a, b) => b.appearances - a.appearances);

    const result: CampWinStatsResponse = {
      totalGames: totalGames,
      campStats: victoryCampStats,
      soloCamps: soloCampStats,
      // Add new properties for CampsChart
      campAverages: campAverages,
      totalPlayersAnalyzed: totalPlayersAnalyzed
    };

    return result;
  }, [rawGameData, rawRoleData]);

  const isLoading = gameLoading || roleLoading;
  const error = gameError || roleError;

  return {
    campWinStats,
    isLoading,
    errorInfo: error,
  };
}
