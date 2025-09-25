import { 
  splitAndTrim, 
  didPlayerWin, 
  didCampWin 
} from './dataUtils';
import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/gameUtils';
import type { CampWinStatsResponse, CampStat, SoloCamp, CampAverage } from '../../types/api';

/**
 * Build game-player-camp mapping from GameLogEntry data
 * Maps players to their camp names, not individual roles
 */
function buildGamePlayerCampMapFromGameLog(gameData: GameLogEntry[]): Record<string, Record<string, string>> {
  const gamePlayerCampMap: Record<string, Record<string, string>> = {};
  
  gameData.forEach(game => {
    const gameId = game.Id;
    if (!gamePlayerCampMap[gameId]) {
      gamePlayerCampMap[gameId] = {};
    }

    game.PlayerStats.forEach(playerStat => {
      const playerName = playerStat.Username;
      let playerRole = getPlayerCampFromRole(playerStat.MainRoleInitial);

      if (playerName && playerRole) {
        gamePlayerCampMap[gameId][playerName] = playerRole;
      }
    });
  });

  return gamePlayerCampMap;
}

/**
 * Get player's camp/role from the game-player-camp mapping
 */
function getPlayerCamp(
  gamePlayerCampMap: Record<string, Record<string, string>>, 
  gameId: string, 
  playerName: string
): string {
  return gamePlayerCampMap[gameId]?.[playerName] || 'Villageois';
}

/**
 * Extract solo roles from a game's PlayerStats
 */
function extractSoloRoles(game: GameLogEntry): string[] {
  const soloRoles: string[] = [];
  // Solo roles are roles that aren't standard village/wolf camps
  const standardRoles = ['Villageois', 'Loup', 'Traître'];
  game.PlayerStats.forEach(playerStat => {
    let role = getPlayerCampFromRole(playerStat.MainRoleInitial);

    if (role && !standardRoles.includes(role)) {
      soloRoles.push(role);
    }
  });
  return soloRoles;
}

/**
 * Determine winner camp from game's PlayerStats
 */
function getWinnerCamp(game: GameLogEntry): string | null {
  // Find the camp/role of the victorious players
  const victoriousPlayers = game.PlayerStats.filter(player => player.Victorious);
  
  if (victoriousPlayers.length === 0) {
    return null;
  }
  
  // Get the role of the first victorious player with all grouping options enabled
  const winnerRole = getPlayerCampFromRole(victoriousPlayers[0].MainRoleInitial, {
    regroupLovers: true,
    regroupVillagers: true,
    regroupTraitor: true
  });
  
  // Return the grouped camp directly (no additional grouping needed since getPlayerCampFromRole handles it)
  return winnerRole;
}

/**
 * Get list of all players in a game
 */
function getPlayerList(game: GameLogEntry): string {
  return game.PlayerStats.map(player => player.Username).join(', ');
}

/**
 * Get list of victorious players in a game
 */
function getWinnerList(game: GameLogEntry): string {
  return game.PlayerStats
    .filter(player => player.Victorious)
    .map(player => player.Username)
    .join(', ');
}

/**
 * Process solo roles from a game and update solo camps statistics
 */
function processSoloRoles(
  soloRoles: string[],
  soloCamps: Record<string, number>
): void {
  soloRoles.forEach(soloRole => {
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

/**
 * Process winner camp for victory statistics
 */
function processWinnerCamp(
  winnerCamp: string,
  campWins: Record<string, number>
): boolean {
  if (winnerCamp && winnerCamp.trim() !== "") {
    if (!campWins[winnerCamp]) {
      campWins[winnerCamp] = 0;
    }
    campWins[winnerCamp]++;
    return true;
  }
  return false;
}

/**
 * Process camp participation and performance for a single game
 */
function processCampParticipation(
  gameId: string,
  playerList: string,
  winnerCamp: string,
  winnerList: string,
  gamePlayerCampMap: Record<string, Record<string, string>>,
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): void {
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

/**
 * Calculate win rates for all camps and their players
 */
function calculateWinRates(
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): void {
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
}

/**
 * Build victory camp statistics from camp wins data
 */
function buildVictoryCampStats(
  campWins: Record<string, number>,
  totalGames: number
): CampStat[] {
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
  
  return victoryCampStats;
}

/**
 * Build camp averages from camp participation stats
 */
function buildCampAverages(
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): CampAverage[] {
  return Object.keys(campStats).map(camp => ({
    camp: camp,
    totalGames: campStats[camp].totalGames,
    wins: campStats[camp].wins,
    winRate: campStats[camp].winRate.toFixed(2)
  }));
}

/**
 * Calculate total number of unique players analyzed
 */
function calculateTotalPlayersAnalyzed(
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): number {
  const allPlayersSet = new Set<string>();
  Object.keys(campStats).forEach(camp => {
    Object.keys(campStats[camp].players).forEach(player => {
      allPlayersSet.add(player);
    });
  });
  return allPlayersSet.size;
}

/**
 * Build solo camp statistics from solo camps data
 */
function buildSoloCampStats(soloCamps: Record<string, number>): SoloCamp[] {
  const soloCampStats: SoloCamp[] = [];
  Object.keys(soloCamps).forEach(soloRole => {
    soloCampStats.push({
      soloRole: soloRole,
      appearances: soloCamps[soloRole]
    });
  });

  // Sort solo camps by appearances (descending)
  soloCampStats.sort((a, b) => b.appearances - a.appearances);
  
  return soloCampStats;
}

/**
 * Compute camp win statistics from GameLogEntry data
 */
export function computeCampWinStats(gameData: GameLogEntry[]): CampWinStatsResponse | null {
  if (gameData.length === 0) {
    return null;
  }

  // Build game-player-camp mapping from GameLogEntry data
  const gamePlayerCampMap = buildGamePlayerCampMapFromGameLog(gameData);

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
  gameData.forEach(game => {
    const gameId = game.Id;
    const soloRoles = extractSoloRoles(game);
    const winnerCamp = getWinnerCamp(game);
    const playerList = getPlayerList(game);
    const winnerList = getWinnerList(game);

    // Process solo roles if they exist
    processSoloRoles(soloRoles, soloCamps);

    // Process regular winner camp for victory statistics
    if (processWinnerCamp(winnerCamp || '', campWins)) {
      totalGames++;
    }

    // Process camp participation and performance for camp averages
    if (gameId && playerList && winnerCamp && winnerList) {
      processCampParticipation(gameId, playerList, winnerCamp, winnerList, gamePlayerCampMap, campStats);
    }
  });

  // Calculate win rates for camps
  calculateWinRates(campStats);

  // Build all result components
  const victoryCampStats = buildVictoryCampStats(campWins, totalGames);
  const campAverages = buildCampAverages(campStats);
  const totalPlayersAnalyzed = calculateTotalPlayersAnalyzed(campStats);
  const soloCampStats = buildSoloCampStats(soloCamps);

  return {
    totalGames: totalGames,
    campStats: victoryCampStats,
    soloCamps: soloCampStats,
    // Add new properties for CampsChart
    campAverages: campAverages,
    totalPlayersAnalyzed: totalPlayersAnalyzed
  };
}
