import type { GameLogEntry } from '../useCombinedRawData';
import { getWinnerCampFromGame } from '../../utils/gameUtils';

export interface VictoryType {
  type: string;
  count: number;
  percentage: string;
  [camp: string]: string | number; // Dynamic camp counts
}

export interface VictoryTypesResponse {
  totalGames: number;
  victoryTypes: VictoryType[];
  winningCamps: string[];
}

/**
 * Process a single game for victory type statistics
 */
function processGameVictoryType(
  game: GameLogEntry,
  victoryTypes: Record<string, number>,
  victoryTypesByCamp: Record<string, Record<string, number>>
): boolean {
  const victoryType = game.LegacyData?.["VictoryType"];
  const winnerCamp = getWinnerCampFromGame(game);
  
  if (victoryType && victoryType.trim() !== "" && winnerCamp && winnerCamp.trim() !== "") {
    // Count total victories by type
    if (!victoryTypes[victoryType]) {
      victoryTypes[victoryType] = 0;
    }
    victoryTypes[victoryType]++;

    // Count victories by type and camp
    if (!victoryTypesByCamp[victoryType]) {
      victoryTypesByCamp[victoryType] = {};
    }
    if (!victoryTypesByCamp[victoryType][winnerCamp]) {
      victoryTypesByCamp[victoryType][winnerCamp] = 0;
    }
    victoryTypesByCamp[victoryType][winnerCamp]++;
    
    return true; // Game was processed successfully
  }
  
  return false; // Game was skipped
}

/**
 * Extract all unique winning camps from victory types data
 */
function extractWinningCamps(victoryTypesByCamp: Record<string, Record<string, number>>): string[] {
  const allWinningCamps = new Set<string>();
  Object.values(victoryTypesByCamp).forEach(campCounts => {
    Object.keys(campCounts).forEach(camp => allWinningCamps.add(camp));
  });
  return Array.from(allWinningCamps).sort();
}

/**
 * Build victory type data with camp breakdown and percentages
 */
function buildVictoryTypeData(
  type: string,
  totalCount: number,
  totalGames: number,
  victoryTypesByCamp: Record<string, Record<string, number>>,
  allWinningCamps: string[]
): VictoryType {
  const typeData: any = {
    type: type,
    count: totalCount,
    percentage: ((totalCount / totalGames) * 100).toFixed(1)
  };

  // Add camp counts and percentages for this victory type
  const campCounts = victoryTypesByCamp[type] || {};
  allWinningCamps.forEach(camp => {
    const campCount = campCounts[camp] || 0;
    const campPercentage = totalCount > 0 ? ((campCount / totalCount) * 100).toFixed(1) : "0.0";
    typeData[camp] = campCount;
    typeData[`${camp}_percentage`] = campPercentage;
  });

  return typeData as VictoryType;
}

/**
 * Convert victory types data to sorted array format
 */
function buildVictoryTypesArray(
  victoryTypes: Record<string, number>,
  totalGames: number,
  victoryTypesByCamp: Record<string, Record<string, number>>,
  allWinningCamps: string[]
): VictoryType[] {
  const victoryTypesArray = Object.keys(victoryTypes).map(type => {
    return buildVictoryTypeData(
      type,
      victoryTypes[type],
      totalGames,
      victoryTypesByCamp,
      allWinningCamps
    );
  });
  
  // Sort by count (descending)
  victoryTypesArray.sort((a, b) => b.count - a.count);
  
  return victoryTypesArray;
}

/**
 * Compute victory types statistics from raw game data
 */
export function computeVictoryTypesStats(rawGameData: GameLogEntry[]): VictoryTypesResponse | null {
  if (rawGameData.length === 0) {
    return null;
  }

  // Initialize tracking objects
  const victoryTypes: Record<string, number> = {};
  const victoryTypesByCamp: Record<string, Record<string, number>> = {};
  let totalGames = 0;
  
  // Process each game
  rawGameData.forEach(game => {
    if (processGameVictoryType(game, victoryTypes, victoryTypesByCamp)) {
      totalGames++;
    }
  });

  // Extract all winning camps
  const winningCampsList = extractWinningCamps(victoryTypesByCamp);

  // Build final victory types array with camp breakdown
  const victoryTypesArray = buildVictoryTypesArray(
    victoryTypes,
    totalGames,
    victoryTypesByCamp,
    winningCampsList
  );

  return {
    totalGames: totalGames,
    victoryTypes: victoryTypesArray,
    winningCamps: winningCampsList
  };
}
