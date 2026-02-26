/**
 * Pure computation functions for player pairing statistics
 */

import type { PlayerPairingStatsData, PlayerPairStat, AgentPlayerPairStat } from '../../types/api';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId } from '../../utils/playerIdentification';

/**
 * Extended interface for chart display with highlighting support
 */
export interface ChartPlayerPairStat extends PlayerPairStat {
  isHighlightedAddition?: boolean;
  winRateNum?: number;
  winRateDisplay?: number;
  gradientId?: string;
}

/**
 * Extended interface for agent pair chart display
 */
export interface ChartAgentPairStat extends AgentPlayerPairStat {
  isHighlightedAddition?: boolean;
  winRateNum?: number;
  winRateDisplay?: number;
  player1WinRateNum?: number;
  player2WinRateNum?: number;
  gradientId?: string;
}

/**
 * Find the most common pairings for a specific player
 */
export function findPlayerMostCommonPairings(
  pairs: PlayerPairStat[],
  playerName: string,
  maxResults: number = 5
): PlayerPairStat[] {
  if (!playerName) return [];

  // Find all pairs involving the player
  const playerPairs = pairs.filter(pair => 
    pair.players.includes(playerName)
  );

  if (playerPairs.length === 0) return [];

  // Find the maximum number of appearances for this player
  const maxAppearances = Math.max(...playerPairs.map(pair => pair.appearances));

  // Get all pairs with the maximum appearances (handling ties)
  const topPairs = playerPairs.filter(pair => pair.appearances === maxAppearances);

  // Limit to maxResults and sort by win rate as secondary criteria
  return topPairs
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
    .slice(0, maxResults);
}

/**
 * Find the best performing pairings for a specific player
 */
export function findPlayerBestPerformingPairings(
  pairs: PlayerPairStat[],
  playerName: string,
  maxResults: number = 5
): PlayerPairStat[] {
  if (!playerName) return [];

  // Find all pairs involving the player
  const playerPairs = pairs.filter(pair => 
    pair.players.includes(playerName)
  );

  if (playerPairs.length === 0) return [];

  // Find the maximum win rate for this player
  const maxWinRate = Math.max(...playerPairs.map(pair => parseFloat(pair.winRate)));

  // Get all pairs with the maximum win rate (handling ties)
  const topPairs = playerPairs.filter(pair => parseFloat(pair.winRate) === maxWinRate);

  // Limit to maxResults and sort by appearances as secondary criteria
  return topPairs
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, maxResults);
}

/**
 * Compute player pairing statistics from game log data
 */
export function computePlayerPairingStats(
  gameData: GameLogEntry[]
): PlayerPairingStatsData | null {
  if (gameData.length === 0) {
    return null;
  }

  // Create map of game ID to winner camp from game data
  // No longer needed - we determine winners directly from PlayerStats

  // Initialize statistics
  const wolfPairStats: Record<string, {
    appearances: number;
    wins: number;
    players: string[];
  }> = {};

  const loverPairStats: Record<string, {
    appearances: number;
    wins: number;
    players: string[];
  }> = {};

  const agentPairStats: Record<string, {
    appearances: number;
    wins: number;
    player1Wins: number;
    player2Wins: number;
    players: string[];
  }> = {};

  let totalGamesWithMultipleWolves = 0;
  let totalGamesWithLovers = 0;
  let totalGamesWithAgents = 0;

  // Process each game
  gameData.forEach(game => {
    // Find all wolves in this game (exclude traitors by default with regroupWolfSubRoles: false, only pure wolves)
    const wolves = game.PlayerStats.filter(player => 
      getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []), { regroupWolfSubRoles: false }) === 'Loup'
    );

    // Find all lovers in this game (using regroupLovers: true to group them as 'Amoureux')
    const lovers = game.PlayerStats.filter(player => 
      getPlayerCampFromRole(getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []), { regroupLovers: true }) === 'Amoureux'
    );

    // Process wolf pairs
    if (wolves.length >= 2) {
      totalGamesWithMultipleWolves++;
      
      // Generate all possible wolf pairs
      for (let i = 0; i < wolves.length; i++) {
        for (let j = i + 1; j < wolves.length; j++) {
          const wolf1Id = getPlayerId(wolves[i]);
          const wolf2Id = getPlayerId(wolves[j]);
          // Player names are already normalized during data loading
          const wolf1Name = wolves[i].Username;
          const wolf2Name = wolves[j].Username;
          // Create a consistent key for the pair using IDs (alphabetical order for internal tracking)
          const pairKey = [wolf1Id, wolf2Id].sort().join(" & ");
          
          if (!wolfPairStats[pairKey]) {
            wolfPairStats[pairKey] = {
              appearances: 0,
              wins: 0,
              players: [wolf1Name, wolf2Name]
            };
          } else {
            // Update to latest display names
            wolfPairStats[pairKey].players = [wolf1Name, wolf2Name];
          }
          
          wolfPairStats[pairKey].appearances++;
          
          // Check if both wolves won (they should have the same victory status)
          if (wolves[i].Victorious && wolves[j].Victorious) {
            wolfPairStats[pairKey].wins++;
          }
        }
      }
    }

    // Process lover pairs
    if (lovers.length >= 2) {
      totalGamesWithLovers++;

      // Generate lover pairs (should usually be just one pair per game)
      for (let i = 0; i < lovers.length; i += 2) {
        // Make sure we have both lovers of the pair
        if (i + 1 < lovers.length) {
          const lover1Id = getPlayerId(lovers[i]);
          const lover2Id = getPlayerId(lovers[i + 1]);
          // Player names are already normalized during data loading
          const lover1Name = lovers[i].Username;
          const lover2Name = lovers[i + 1].Username;

          // Create a consistent key for the pair by IDs (alphabetical order for internal tracking)
          const pairKey = [lover1Id, lover2Id].sort().join(" & ");

          if (!loverPairStats[pairKey]) {
            loverPairStats[pairKey] = {
              appearances: 0,
              wins: 0,
              players: [lover1Name, lover2Name]
            };
          } else {
            // Update to latest display names
            loverPairStats[pairKey].players = [lover1Name, lover2Name];
          }

          loverPairStats[pairKey].appearances++;
          
          // Check if both lovers won (they should have the same victory status)
          if (lovers[i].Victorious && lovers[i + 1].Victorious) {
            loverPairStats[pairKey].wins++;
          }
        }
      }
    }

    // Process agent pairs
    const agents = game.PlayerStats.filter(player => {
      const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      return finalRole === 'Agent';
    });

    if (agents.length >= 2) {
      totalGamesWithAgents++;

      // Generate agent pairs (should be exactly one pair per game)
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const agent1Id = getPlayerId(agents[i]);
          const agent2Id = getPlayerId(agents[j]);
          const agent1Name = agents[i].Username;
          const agent2Name = agents[j].Username;

          // Create a consistent key for the pair using IDs (alphabetical order)
          const sortedIds = [agent1Id, agent2Id].sort();
          const pairKey = sortedIds.join(" & ");

          // Determine consistent player order based on sorted IDs
          const isAgent1First = sortedIds[0] === agent1Id;
          const firstName = isAgent1First ? agent1Name : agent2Name;
          const secondName = isAgent1First ? agent2Name : agent1Name;
          const firstAgent = isAgent1First ? agents[i] : agents[j];
          const secondAgent = isAgent1First ? agents[j] : agents[i];

          if (!agentPairStats[pairKey]) {
            agentPairStats[pairKey] = {
              appearances: 0,
              wins: 0,
              player1Wins: 0,
              player2Wins: 0,
              players: [firstName, secondName]
            };
          } else {
            agentPairStats[pairKey].players = [firstName, secondName];
          }

          agentPairStats[pairKey].appearances++;

          // Track individual wins (only one agent can win per game)
          if (firstAgent.Victorious) {
            agentPairStats[pairKey].player1Wins++;
            agentPairStats[pairKey].wins++;
          }
          if (secondAgent.Victorious) {
            agentPairStats[pairKey].player2Wins++;
            agentPairStats[pairKey].wins++;
          }
        }
      }
    }
  });

  // Calculate win rates and convert to arrays
  const wolfPairArray: PlayerPairStat[] = Object.keys(wolfPairStats).map(key => {
    const stats = wolfPairStats[key];
    const winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    // Use player display names for the pair label, not the ID-based key
    const pairLabel = stats.players.join(" & ");
    return {
      pair: pairLabel,
      appearances: stats.appearances,
      wins: stats.wins,
      winRate: winRate,
      players: stats.players
    };
  });

  const loverPairArray: PlayerPairStat[] = Object.keys(loverPairStats).map(key => {
    const stats = loverPairStats[key];
    const winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    // Use player display names for the pair label, not the ID-based key
    const pairLabel = stats.players.join(" & ");
    return {
      pair: pairLabel,
      appearances: stats.appearances,
      wins: stats.wins,
      winRate: winRate,
      players: stats.players
    };
  });

  // Sort by number of appearances (descending)
  wolfPairArray.sort((a, b) => b.appearances - a.appearances);
  loverPairArray.sort((a, b) => b.appearances - a.appearances);

  const agentPairArray: AgentPlayerPairStat[] = Object.keys(agentPairStats).map(key => {
    const stats = agentPairStats[key];
    const winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    const player1WinRate = stats.appearances > 0 ? (stats.player1Wins / stats.appearances * 100).toFixed(2) : "0.00";
    const player2WinRate = stats.appearances > 0 ? (stats.player2Wins / stats.appearances * 100).toFixed(2) : "0.00";
    const pairLabel = stats.players.join(" & ");
    return {
      pair: pairLabel,
      appearances: stats.appearances,
      wins: stats.wins,
      winRate: winRate,
      players: stats.players,
      player1Wins: stats.player1Wins,
      player2Wins: stats.player2Wins,
      player1WinRate: player1WinRate,
      player2WinRate: player2WinRate
    };
  });

  agentPairArray.sort((a, b) => b.appearances - a.appearances);

  return {
    wolfPairs: {
      totalGames: totalGamesWithMultipleWolves,
      pairs: wolfPairArray
    },
    loverPairs: {
      totalGames: totalGamesWithLovers,
      pairs: loverPairArray
    },
    agentPairs: {
      totalGames: totalGamesWithAgents,
      pairs: agentPairArray
    }
  };
}
