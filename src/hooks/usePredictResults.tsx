import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';

export interface GameParameters {
  nombreJoueurs: number;
  nombreLoups: number;
  roleTraitre: boolean;
  roleAmoureux: boolean;
  rolesSolo: string[];
  rolesSpeciaux: string[];
}

export interface PredictionResult {
  camp: string;
  winPercentage: number;
  gamesAnalyzed: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface PredictionAnalysis {
  predictions: PredictionResult[];
  totalSimilarGames: number;
  mostSimilarGame: {
    gameNumber: number;
    similarity: number;
    winner: string;
  } | null;
}

export function usePredictResults(parameters: GameParameters): PredictionAnalysis {
  const { data: gameData } = useFilteredRawGameData();
  const { data: roleData } = useFilteredRawRoleData();

  return useMemo(() => {
    if (!gameData || !roleData) {
      return {
        predictions: [],
        totalSimilarGames: 0,
        mostSimilarGame: null
      };
    }

    // Find similar games based on parameters
    const similarGames = gameData.filter(game => {
      let similarity = 0;
      let maxSimilarity = 0;

      // Player count similarity (weighted heavily)
      maxSimilarity += 3;
      if (game["Nombre de joueurs"] === parameters.nombreJoueurs) {
        similarity += 3;
      } else if (Math.abs(game["Nombre de joueurs"] - parameters.nombreJoueurs) <= 1) {
        similarity += 2;
      } else if (Math.abs(game["Nombre de joueurs"] - parameters.nombreJoueurs) <= 2) {
        similarity += 1;
      }

      // Wolf count similarity (weighted heavily)
      maxSimilarity += 3;
      if (game["Nombre de loups"] === parameters.nombreLoups) {
        similarity += 3;
      } else if (Math.abs(game["Nombre de loups"] - parameters.nombreLoups) <= 1) {
        similarity += 1;
      }

      // Role similarities
      maxSimilarity += 1;
      if (game["Rôle Traître"] === parameters.roleTraitre) {
        similarity += 1;
      }

      maxSimilarity += 1;
      if (game["Rôle Amoureux"] === parameters.roleAmoureux) {
        similarity += 1;
      }

      // Solo roles
      maxSimilarity += 1;
      const gameSoloRoles = game["Rôles solo"] ? game["Rôles solo"].split(',').map(r => r.trim()) : [];
      const hasSimilarSoloRoles = parameters.rolesSolo.length === 0 && gameSoloRoles.length === 0 ||
        parameters.rolesSolo.some(role => gameSoloRoles.includes(role));
      if (hasSimilarSoloRoles) {
        similarity += 1;
      }

      // Check special roles from role data
      const gameRoles = roleData.find(r => r.Game === game.Game);
      if (gameRoles) {
        const specialRolesInGame = [
          gameRoles["Idiot du village"] ? "Idiot du village" : null,
          gameRoles.Cannibale ? "Cannibale" : null,
          gameRoles.Agent ? "Agent" : null,
          gameRoles.Espion ? "Espion" : null,
          gameRoles.Scientifique ? "Scientifique" : null,
          gameRoles["La Bête"] ? "La Bête" : null,
          gameRoles["Chasseur de primes"] ? "Chasseur de primes" : null,
          gameRoles.Vaudou ? "Vaudou" : null,
        ].filter(Boolean) as string[];

        maxSimilarity += 2;
        const commonSpecialRoles = parameters.rolesSpeciaux.filter(role => 
          specialRolesInGame.includes(role)
        ).length;
        const totalSpecialRoles = Math.max(parameters.rolesSpeciaux.length, specialRolesInGame.length);
        
        if (totalSpecialRoles === 0) {
          similarity += 2; // Both have no special roles
        } else {
          similarity += (commonSpecialRoles / totalSpecialRoles) * 2;
        }
      }

      // Return games with at least 50% similarity
      return similarity / maxSimilarity >= 0.5;
    });

    // Calculate win percentages by camp
    const campWins: Record<string, number> = {};
    similarGames.forEach(game => {
      const winner = game["Camp victorieux"];
      campWins[winner] = (campWins[winner] || 0) + 1;
    });

    // Find most similar game
    let mostSimilarGame = null;
    let highestSimilarity = 0;

    for (const game of gameData) {
      let similarity = 0;
      let maxSimilarity = 10; // Total possible similarity points

      // Calculate detailed similarity for ranking
      if (game["Nombre de joueurs"] === parameters.nombreJoueurs) similarity += 3;
      else if (Math.abs(game["Nombre de joueurs"] - parameters.nombreJoueurs) <= 1) similarity += 2;
      else if (Math.abs(game["Nombre de joueurs"] - parameters.nombreJoueurs) <= 2) similarity += 1;

      if (game["Nombre de loups"] === parameters.nombreLoups) similarity += 3;
      else if (Math.abs(game["Nombre de loups"] - parameters.nombreLoups) <= 1) similarity += 1;

      if (game["Rôle Traître"] === parameters.roleTraitre) similarity += 1;
      if (game["Rôle Amoureux"] === parameters.roleAmoureux) similarity += 1;

      const gameSoloRoles = game["Rôles solo"] ? game["Rôles solo"].split(',').map(r => r.trim()) : [];
      const hasSimilarSoloRoles = parameters.rolesSolo.length === 0 && gameSoloRoles.length === 0 ||
        parameters.rolesSolo.some(role => gameSoloRoles.includes(role));
      if (hasSimilarSoloRoles) similarity += 1;

      const gameRoles = roleData.find(r => r.Game === game.Game);
      if (gameRoles) {
        const specialRolesInGame = [
          gameRoles["Idiot du village"] ? "Idiot du village" : null,
          gameRoles.Cannibale ? "Cannibale" : null,
          gameRoles.Agent ? "Agent" : null,
          gameRoles.Espion ? "Espion" : null,
          gameRoles.Scientifique ? "Scientifique" : null,
          gameRoles["La Bête"] ? "La Bête" : null,
          gameRoles["Chasseur de primes"] ? "Chasseur de primes" : null,
          gameRoles.Vaudou ? "Vaudou" : null,
        ].filter(Boolean) as string[];

        const commonSpecialRoles = parameters.rolesSpeciaux.filter(role => 
          specialRolesInGame.includes(role)
        ).length;
        const totalSpecialRoles = Math.max(parameters.rolesSpeciaux.length, specialRolesInGame.length);
        
        if (totalSpecialRoles === 0) {
          similarity += 1;
        } else {
          similarity += (commonSpecialRoles / totalSpecialRoles);
        }
      }

      const similarityScore = similarity / maxSimilarity;
      if (similarityScore > highestSimilarity) {
        highestSimilarity = similarityScore;
        mostSimilarGame = {
          gameNumber: game.Game,
          similarity: similarityScore,
          winner: game["Camp victorieux"]
        };
      }
    }

    // Create predictions
    const totalGames = similarGames.length;
    const predictions: PredictionResult[] = [];

    // Standard camps
    const camps = ['Villageois', 'Loups', 'Amoureux', 'Solo'];
    
    for (const camp of camps) {
      const wins = campWins[camp] || 0;
      const percentage = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      
      // Determine confidence based on sample size
      let confidence: 'low' | 'medium' | 'high' = 'low';
      if (totalGames >= 20) confidence = 'high';
      else if (totalGames >= 10) confidence = 'medium';

      if (percentage > 0 || camp === 'Villageois' || camp === 'Loups') {
        predictions.push({
          camp,
          winPercentage: percentage,
          gamesAnalyzed: wins,
          confidence
        });
      }
    }

    // Sort predictions by win percentage
    predictions.sort((a, b) => b.winPercentage - a.winPercentage);

    return {
      predictions,
      totalSimilarGames: totalGames,
      mostSimilarGame
    };
  }, [gameData, roleData, parameters]);
}