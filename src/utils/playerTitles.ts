import type { GameLogEntry } from '../hooks/useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from './playerIdentification';
import { calculateGameDuration } from './datasyncExport';

/**
 * Player title definition
 */
export interface PlayerTitle {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

/**
 * All available player titles with their metadata
 */
export const PLAYER_TITLES: Record<string, PlayerTitle> = {
  BAVARD: {
    id: 'BAVARD',
    name: 'Bavard',
    emoji: '🗣️',
    color: '#4A90E2',
    description: 'Parle beaucoup en jeu'
  },
  TUEUR: {
    id: 'TUEUR',
    name: 'Tueur',
    emoji: '🔪',
    color: '#E74C3C',
    description: 'Taux de kill élevé'
  },
  SURVIVANT: {
    id: 'SURVIVANT',
    name: 'Survivant',
    emoji: '🛡️',
    color: '#2ECC71',
    description: 'Excellent taux de survie'
  },
  STRATEGE: {
    id: 'STRATEGE',
    name: 'Stratège',
    emoji: '🎯',
    color: '#9B59B6',
    description: 'Vote avec précision'
  },
  VETERAN: {
    id: 'VETERAN',
    name: 'Vétéran',
    emoji: '⭐',
    color: '#F39C12',
    description: 'Nombreuses parties jouées'
  },
  SILENCIEUX: {
    id: 'SILENCIEUX',
    name: 'Silencieux',
    emoji: '🤐',
    color: '#95A5A6',
    description: 'Parle très peu'
  }
};

/**
 * Thresholds for title eligibility
 * These values are based on observation of typical player stats
 */
const TITLE_THRESHOLDS = {
  MIN_GAMES_FOR_TITLES: 10, // Minimum games to be eligible for any title
  
  // Bavard: Top 20% in talking time (normalized per 60 min)
  BAVARD_SECONDS_PER_60MIN: 1200, // 20+ minutes of talking per hour
  
  // Silencieux: Bottom 20% in talking time
  SILENCIEUX_SECONDS_PER_60MIN: 300, // Less than 5 minutes per hour
  
  // Tueur: Top 20% in kills per game
  TUEUR_KILLS_PER_GAME: 0.8, // 0.8+ kills per game
  
  // Survivant: Top 20% in survival rate
  SURVIVANT_SURVIVAL_RATE: 0.7, // 70%+ survival rate
  
  // Stratège: Top 30% in vote accuracy (voting for enemy camp)
  STRATEGE_VOTE_ACCURACY: 0.6, // 60%+ accuracy
  STRATEGE_MIN_VOTES: 20, // Need at least 20 votes to qualify
  
  // Vétéran: Top 10% in games played
  VETERAN_GAMES: 100 // 100+ games
};

/**
 * Player statistics aggregated for title calculation
 */
interface PlayerTitleStats {
  playerId: string;
  displayName: string;
  gamesPlayed: number;
  
  // Talking time stats
  totalTalkingSeconds: number;
  totalGameDurationSeconds: number;
  talkingSecondsPer60Min: number;
  
  // Kill stats
  totalKills: number;
  killsPerGame: number;
  
  // Survival stats
  totalDeaths: number;
  survivalRate: number;
  
  // Vote stats
  totalVotes: number;
  accurateVotes: number;
  voteAccuracy: number;
}

/**
 * Check if a game has talking time data
 */
function gameHasTalkingData(game: GameLogEntry): boolean {
  return game.PlayerStats.some(
    player => 
      player.SecondsTalkedOutsideMeeting > 0 || 
      player.SecondsTalkedDuringMeeting > 0
  );
}

/**
 * Get player's camp from their role
 */
function getPlayerCamp(role: string): string {
  const loupRoles = ['Loup', 'Louveteau', 'Traître', 'Infect', 'Loup Blanc'];
  if (loupRoles.includes(role)) return 'Loups';
  
  const soloRoles = ['Amoureux', 'Idiot du Village', 'Agent', 'Ange'];
  if (soloRoles.includes(role)) return role;
  
  return 'Villageois';
}

/**
 * Calculate aggregated statistics for all players
 */
export function calculatePlayerTitleStats(gameData: GameLogEntry[]): Map<string, PlayerTitleStats> {
  const playerStatsMap = new Map<string, PlayerTitleStats>();
  
  // Filter games with talking data for talking time calculations
  const gamesWithTalkingData = gameData.filter(gameHasTalkingData);
  
  // Process all games for general stats
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);
      
      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          playerId,
          displayName,
          gamesPlayed: 0,
          totalTalkingSeconds: 0,
          totalGameDurationSeconds: 0,
          talkingSecondsPer60Min: 0,
          totalKills: 0,
          killsPerGame: 0,
          totalDeaths: 0,
          survivalRate: 0,
          totalVotes: 0,
          accurateVotes: 0,
          voteAccuracy: 0
        });
      }
      
      const stats = playerStatsMap.get(playerId)!;
      stats.gamesPlayed++;
      
      // Death stats
      if (player.DeathType) {
        stats.totalDeaths++;
      }
      
      // Kill stats
      if (player.KillerName === displayName || 
          (player.DeathType && ['BY_WOLF', 'BY_ZOMBIE', 'BY_BEAST'].includes(player.DeathType))) {
        // Count as killer if this player is listed as killer
      }
      
      // Vote stats - analyze vote accuracy
      if (player.Votes && player.Votes.length > 0) {
        const playerCamp = getPlayerCamp(player.MainRoleInitial);
        
        player.Votes.forEach(vote => {
          stats.totalVotes++;
          
          // Find the voted player
          const targetPlayer = game.PlayerStats.find(p => 
            getCanonicalPlayerName(p) === vote.Target
          );
          
          if (targetPlayer) {
            const targetCamp = getPlayerCamp(targetPlayer.MainRoleInitial);
            
            // Accurate vote if voting for enemy camp
            const isAccurate = (
              (playerCamp === 'Villageois' && targetCamp === 'Loups') ||
              (playerCamp === 'Loups' && targetCamp === 'Villageois')
            );
            
            if (isAccurate) {
              stats.accurateVotes++;
            }
          }
        });
      }
    });
  });
  
  // Process talking time data separately (only for games with data)
  gamesWithTalkingData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const stats = playerStatsMap.get(playerId);
      
      if (!stats) return;
      
      // Calculate player-specific game duration
      const endTime = player.DeathDateIrl || game.EndDate;
      const playerGameDuration = calculateGameDuration(game.StartDate, endTime);
      
      if (playerGameDuration && playerGameDuration > 0) {
        stats.totalTalkingSeconds += (player.SecondsTalkedOutsideMeeting || 0) + 
                                     (player.SecondsTalkedDuringMeeting || 0);
        stats.totalGameDurationSeconds += playerGameDuration;
      }
    });
  });
  
  // Process kill counts (count times this player appears as KillerName)
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      if (player.KillerName) {
        // Find the killer's player ID
        const killerPlayer = game.PlayerStats.find(p => 
          getCanonicalPlayerName(p) === player.KillerName
        );
        
        if (killerPlayer) {
          const killerId = getPlayerId(killerPlayer);
          const killerStats = playerStatsMap.get(killerId);
          
          if (killerStats) {
            killerStats.totalKills++;
          }
        }
      }
    });
  });
  
  // Calculate normalized values
  playerStatsMap.forEach(stats => {
    // Talking time per 60 minutes
    if (stats.totalGameDurationSeconds > 0) {
      stats.talkingSecondsPer60Min = (stats.totalTalkingSeconds / stats.totalGameDurationSeconds) * 3600;
    }
    
    // Kills per game
    if (stats.gamesPlayed > 0) {
      stats.killsPerGame = stats.totalKills / stats.gamesPlayed;
    }
    
    // Survival rate
    if (stats.gamesPlayed > 0) {
      stats.survivalRate = (stats.gamesPlayed - stats.totalDeaths) / stats.gamesPlayed;
    }
    
    // Vote accuracy
    if (stats.totalVotes > 0) {
      stats.voteAccuracy = stats.accurateVotes / stats.totalVotes;
    }
  });
  
  return playerStatsMap;
}

/**
 * Calculate which titles a player should have based on their stats
 */
export function calculatePlayerTitles(
  playerStats: PlayerTitleStats
): PlayerTitle[] {
  const titles: PlayerTitle[] = [];
  
  // Must have minimum games to get any title
  if (playerStats.gamesPlayed < TITLE_THRESHOLDS.MIN_GAMES_FOR_TITLES) {
    return titles;
  }
  
  // Bavard: High talking time
  if (playerStats.totalGameDurationSeconds > 0 && 
      playerStats.talkingSecondsPer60Min >= TITLE_THRESHOLDS.BAVARD_SECONDS_PER_60MIN) {
    titles.push(PLAYER_TITLES.BAVARD);
  }
  
  // Silencieux: Low talking time (mutually exclusive with Bavard)
  if (playerStats.totalGameDurationSeconds > 0 && 
      playerStats.talkingSecondsPer60Min > 0 &&
      playerStats.talkingSecondsPer60Min <= TITLE_THRESHOLDS.SILENCIEUX_SECONDS_PER_60MIN &&
      !titles.includes(PLAYER_TITLES.BAVARD)) {
    titles.push(PLAYER_TITLES.SILENCIEUX);
  }
  
  // Tueur: High kill rate
  if (playerStats.killsPerGame >= TITLE_THRESHOLDS.TUEUR_KILLS_PER_GAME) {
    titles.push(PLAYER_TITLES.TUEUR);
  }
  
  // Survivant: High survival rate
  if (playerStats.survivalRate >= TITLE_THRESHOLDS.SURVIVANT_SURVIVAL_RATE) {
    titles.push(PLAYER_TITLES.SURVIVANT);
  }
  
  // Stratège: High vote accuracy with minimum votes
  if (playerStats.totalVotes >= TITLE_THRESHOLDS.STRATEGE_MIN_VOTES &&
      playerStats.voteAccuracy >= TITLE_THRESHOLDS.STRATEGE_VOTE_ACCURACY) {
    titles.push(PLAYER_TITLES.STRATEGE);
  }
  
  // Vétéran: Many games played
  if (playerStats.gamesPlayed >= TITLE_THRESHOLDS.VETERAN_GAMES) {
    titles.push(PLAYER_TITLES.VETERAN);
  }
  
  return titles;
}

/**
 * Calculate titles for all players
 */
export function calculateAllPlayerTitles(gameData: GameLogEntry[]): Map<string, PlayerTitle[]> {
  const playerStatsMap = calculatePlayerTitleStats(gameData);
  const playerTitlesMap = new Map<string, PlayerTitle[]>();
  
  playerStatsMap.forEach((stats, playerId) => {
    const titles = calculatePlayerTitles(stats);
    playerTitlesMap.set(playerId, titles);
  });
  
  return playerTitlesMap;
}
