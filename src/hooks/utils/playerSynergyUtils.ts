/**
 * Pure computation functions for player synergy statistics
 * 
 * Synergy score measures the difference between a pair's win rate when on the same camp
 * and the average of their individual win rates. A positive score means the pair performs
 * better together than expected from their individual skill levels.
 */

import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { getPlayerId } from '../../utils/playerIdentification';

export interface PlayerSynergyPair {
  pair: string;
  players: string[];
  gamesTogether: number;
  sameCampGames: number;
  sameCampWins: number;
  sameCampWinRate: number;
  player1WinRate: number;
  player2WinRate: number;
  expectedWinRate: number;
  synergyScore: number;
}

export interface ChartSynergyPair extends PlayerSynergyPair {
  isHighlightedAddition?: boolean;
  gradientId?: string;
}

export interface PlayerSynergyData {
  totalGames: number;
  pairs: PlayerSynergyPair[];
}

/**
 * Find the best synergy partners for a specific player
 */
export function findPlayerBestSynergies(
  pairs: PlayerSynergyPair[],
  playerName: string,
  minSameCampGames: number,
  maxResults: number = 5
): PlayerSynergyPair[] {
  if (!playerName) return [];

  return pairs
    .filter(pair => pair.players.includes(playerName) && pair.sameCampGames >= minSameCampGames)
    .sort((a, b) => b.synergyScore - a.synergyScore)
    .slice(0, maxResults);
}

/**
 * Find the worst synergy partners for a specific player
 */
export function findPlayerWorstSynergies(
  pairs: PlayerSynergyPair[],
  playerName: string,
  minSameCampGames: number,
  maxResults: number = 5
): PlayerSynergyPair[] {
  if (!playerName) return [];

  return pairs
    .filter(pair => pair.players.includes(playerName) && pair.sameCampGames >= minSameCampGames)
    .sort((a, b) => a.synergyScore - b.synergyScore)
    .slice(0, maxResults);
}

/**
 * Compute player synergy statistics from game log data
 * 
 * For each pair of players that have shared the same camp:
 * - sameCampWinRate: their win rate when on the same camp
 * - expectedWinRate: average of their individual overall win rates
 * - synergyScore: sameCampWinRate - expectedWinRate
 */
export function computePlayerSynergyStats(
  gameData: GameLogEntry[]
): PlayerSynergyData | null {
  if (gameData.length === 0) return null;

  // Step 1: Compute individual stats per player (keyed by player ID)
  const individualStats: Record<string, { name: string; gamesPlayed: number; wins: number }> = {};

  // Step 2: Track pair stats (keyed by sorted player IDs)
  const pairStats: Record<string, {
    gamesTogether: number;
    sameCampGames: number;
    sameCampWins: number;
    playerIds: [string, string];
    players: [string, string];
  }> = {};

  gameData.forEach(game => {
    // Resolve each player's camp (regroup wolf sub-roles so Traître/Louveteau count as Loup)
    const playerInfos = game.PlayerStats.map(p => ({
      id: getPlayerId(p),
      name: p.Username,
      camp: getPlayerCampFromRole(
        getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || []),
        { regroupWolfSubRoles: true }
      ),
      victorious: p.Victorious,
    }));

    // Update individual stats
    playerInfos.forEach(({ id, name, victorious }) => {
      if (!individualStats[id]) {
        individualStats[id] = { name, gamesPlayed: 0, wins: 0 };
      }
      individualStats[id].name = name;
      individualStats[id].gamesPlayed++;
      if (victorious) individualStats[id].wins++;
    });

    // Generate all pairs in this game
    for (let i = 0; i < playerInfos.length; i++) {
      for (let j = i + 1; j < playerInfos.length; j++) {
        const p1 = playerInfos[i];
        const p2 = playerInfos[j];
        const sortedIds = [p1.id, p2.id].sort();
        const pairKey = sortedIds.join('|');

        if (!pairStats[pairKey]) {
          const isP1First = sortedIds[0] === p1.id;
          pairStats[pairKey] = {
            gamesTogether: 0,
            sameCampGames: 0,
            sameCampWins: 0,
            playerIds: isP1First ? [p1.id, p2.id] : [p2.id, p1.id],
            players: isP1First ? [p1.name, p2.name] : [p2.name, p1.name],
          };
        } else {
          // Update display names to latest
          const isP1First = pairStats[pairKey].playerIds[0] === p1.id;
          pairStats[pairKey].players = isP1First ? [p1.name, p2.name] : [p2.name, p1.name];
        }

        pairStats[pairKey].gamesTogether++;

        // Same camp check
        if (p1.camp === p2.camp) {
          pairStats[pairKey].sameCampGames++;
          if (p1.victorious && p2.victorious) {
            pairStats[pairKey].sameCampWins++;
          }
        }
      }
    }
  });

  // Step 3: Build synergy pairs (only pairs with same-camp games)
  const pairs: PlayerSynergyPair[] = [];

  for (const stats of Object.values(pairStats)) {
    if (stats.sameCampGames === 0) continue;

    const p1Stats = individualStats[stats.playerIds[0]];
    const p2Stats = individualStats[stats.playerIds[1]];
    if (!p1Stats || !p2Stats) continue;

    const sameCampWinRate = (stats.sameCampWins / stats.sameCampGames) * 100;
    const p1WinRate = p1Stats.gamesPlayed > 0 ? (p1Stats.wins / p1Stats.gamesPlayed) * 100 : 0;
    const p2WinRate = p2Stats.gamesPlayed > 0 ? (p2Stats.wins / p2Stats.gamesPlayed) * 100 : 0;
    const expectedWinRate = (p1WinRate + p2WinRate) / 2;

    pairs.push({
      pair: stats.players.join(' & '),
      players: [...stats.players],
      gamesTogether: stats.gamesTogether,
      sameCampGames: stats.sameCampGames,
      sameCampWins: stats.sameCampWins,
      sameCampWinRate: parseFloat(sameCampWinRate.toFixed(1)),
      player1WinRate: parseFloat(p1WinRate.toFixed(1)),
      player2WinRate: parseFloat(p2WinRate.toFixed(1)),
      expectedWinRate: parseFloat(expectedWinRate.toFixed(1)),
      synergyScore: parseFloat((sameCampWinRate - expectedWinRate).toFixed(1)),
    });
  }

  // Sort by synergy score descending
  pairs.sort((a, b) => b.synergyScore - a.synergyScore);

  return { totalGames: gameData.length, pairs };
}
