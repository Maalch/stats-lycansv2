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
  // Positive titles
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
  CHANCEUX: {
    id: 'CHANCEUX',
    name: 'Chanceux',
    emoji: '🍀',
    color: '#27AE60',
    description: 'Taux de victoire élevé'
  },
  LEADER: {
    id: 'LEADER',
    name: 'Leader',
    emoji: '👑',
    color: '#FFD700',
    description: 'Beaucoup de votes reçus'
  },
  DISCRET: {
    id: 'DISCRET',
    name: 'Discret',
    emoji: '🥷',
    color: '#34495E',
    description: 'Rarement voté'
  },
  
  // Negative titles
  SILENCIEUX: {
    id: 'SILENCIEUX',
    name: 'Silencieux',
    emoji: '🤐',
    color: '#95A5A6',
    description: 'Parle très peu'
  },
  VICTIME: {
    id: 'VICTIME',
    name: 'Victime',
    emoji: '💀',
    color: '#7F8C8D',
    description: 'Meurt souvent'
  },
  MALCHANCEUX: {
    id: 'MALCHANCEUX',
    name: 'Malchanceux',
    emoji: '😢',
    color: '#95A5A6',
    description: 'Faible taux de victoire'
  },
  PACIFIQUE: {
    id: 'PACIFIQUE',
    name: 'Pacifique',
    emoji: '☮️',
    color: '#BDC3C7',
    description: 'Peu de kills'
  },
  DEBUTANT: {
    id: 'DEBUTANT',
    name: 'Débutant',
    emoji: '🌱',
    color: '#A8D5BA',
    description: 'Peu de parties jouées'
  },
  DISTRAIT: {
    id: 'DISTRAIT',
    name: 'Distrait',
    emoji: '😵',
    color: '#BDC3C7',
    description: 'Mauvaise précision de vote'
  },
  IMPULSIF: {
    id: 'IMPULSIF',
    name: 'Impulsif',
    emoji: '⚡',
    color: '#E67E22',
    description: 'Vote rapidement et souvent'
  }
};

/**
 * Thresholds for title eligibility
 * These values are based on observation of typical player stats
 */
const TITLE_THRESHOLDS = {
  MIN_GAMES_FOR_TITLES: 10, // Minimum games to be eligible for any title
  
  // Positive titles
  BAVARD_SECONDS_PER_60MIN: 1200, // 20+ minutes of talking per hour
  TUEUR_KILLS_PER_GAME: 0.8, // 0.8+ kills per game
  SURVIVANT_SURVIVAL_RATE: 0.7, // 70%+ survival rate
  STRATEGE_VOTE_ACCURACY: 0.65, // 65%+ accuracy
  STRATEGE_MIN_VOTES: 20, // Need at least 20 votes to qualify
  VETERAN_GAMES: 100, // 100+ games
  CHANCEUX_WIN_RATE: 0.55, // 55%+ win rate
  LEADER_VOTES_RECEIVED_PER_GAME: 1.5, // 1.5+ votes received per game
  DISCRET_VOTES_RECEIVED_PER_GAME: 0.3, // Less than 0.3 votes received per game
  
  // Negative titles
  SILENCIEUX_SECONDS_PER_60MIN: 300, // Less than 5 minutes per hour
  VICTIME_DEATH_RATE: 0.7, // 70%+ death rate
  MALCHANCEUX_WIN_RATE: 0.35, // Less than 35% win rate
  PACIFIQUE_KILLS_PER_GAME: 0.2, // Less than 0.2 kills per game
  DEBUTANT_GAMES: 20, // Less than 20 games
  DISTRAIT_VOTE_ACCURACY: 0.45, // Less than 45% accuracy
  IMPULSIF_VOTE_RATE: 0.85 // 85%+ voting rate (rarely skips)
};

/**
 * Player statistics aggregated for title calculation
 */
interface PlayerTitleStats {
  playerId: string;
  displayName: string;
  gamesPlayed: number;
  totalWins: number;
  
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
  deathRate: number;
  
  // Vote stats
  totalVotes: number;
  accurateVotes: number;
  voteAccuracy: number;
  totalVotesReceived: number;
  votesReceivedPerGame: number;
  totalVoteOpportunities: number;
  voteRate: number;
  
  // Win rate
  winRate: number;
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
          totalWins: 0,
          totalTalkingSeconds: 0,
          totalGameDurationSeconds: 0,
          talkingSecondsPer60Min: 0,
          totalKills: 0,
          killsPerGame: 0,
          totalDeaths: 0,
          survivalRate: 0,
          deathRate: 0,
          totalVotes: 0,
          accurateVotes: 0,
          voteAccuracy: 0,
          totalVotesReceived: 0,
          votesReceivedPerGame: 0,
          totalVoteOpportunities: 0,
          voteRate: 0,
          winRate: 0
        });
      }
      
      const stats = playerStatsMap.get(playerId)!;
      stats.gamesPlayed++;
      
      // Win stats
      if (player.Victorious) {
        stats.totalWins++;
      }
      
      // Death stats
      if (player.DeathType) {
        stats.totalDeaths++;
      }
      
      // Count votes received by this player
      game.PlayerStats.forEach(otherPlayer => {
        if (otherPlayer.Votes && otherPlayer.Votes.length > 0) {
          otherPlayer.Votes.forEach(vote => {
            if (vote.Target === displayName) {
              stats.totalVotesReceived++;
            }
          });
        }
      });
      
      // Vote stats - analyze vote accuracy and voting behavior
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
      
      // Track vote opportunities (meetings where player could vote)
      // Estimate: roughly 3-4 vote opportunities per game
      stats.totalVoteOpportunities += 3;
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
    
    // Survival and death rates
    if (stats.gamesPlayed > 0) {
      stats.survivalRate = (stats.gamesPlayed - stats.totalDeaths) / stats.gamesPlayed;
      stats.deathRate = stats.totalDeaths / stats.gamesPlayed;
    }
    
    // Vote accuracy
    if (stats.totalVotes > 0) {
      stats.voteAccuracy = stats.accurateVotes / stats.totalVotes;
    }
    
    // Vote rate (how often they vote vs skip/abstain)
    if (stats.totalVoteOpportunities > 0) {
      stats.voteRate = stats.totalVotes / stats.totalVoteOpportunities;
    }
    
    // Votes received per game
    if (stats.gamesPlayed > 0) {
      stats.votesReceivedPerGame = stats.totalVotesReceived / stats.gamesPlayed;
    }
    
    // Win rate
    if (stats.gamesPlayed > 0) {
      stats.winRate = stats.totalWins / stats.gamesPlayed;
    }
  });
  
  return playerStatsMap;
}

/**
 * Title candidate with score for prioritization
 */
interface TitleCandidate {
  title: PlayerTitle;
  score: number; // Higher score = more prominent characteristic
  isPositive: boolean;
}

/**
 * Calculate which titles a player should have based on their stats
 * Returns exactly 2 titles: prioritizes most prominent characteristics
 */
export function calculatePlayerTitles(
  playerStats: PlayerTitleStats
): PlayerTitle[] {
  // Must have minimum games to get any title
  if (playerStats.gamesPlayed < TITLE_THRESHOLDS.MIN_GAMES_FOR_TITLES) {
    return [];
  }
  
  const candidates: TitleCandidate[] = [];
  
  // === POSITIVE TITLES ===
  
  // Bavard: High talking time
  if (playerStats.totalGameDurationSeconds > 0 && 
      playerStats.talkingSecondsPer60Min >= TITLE_THRESHOLDS.BAVARD_SECONDS_PER_60MIN) {
    const score = playerStats.talkingSecondsPer60Min / TITLE_THRESHOLDS.BAVARD_SECONDS_PER_60MIN;
    candidates.push({ title: PLAYER_TITLES.BAVARD, score, isPositive: true });
  }
  
  // Tueur: High kill rate
  if (playerStats.killsPerGame >= TITLE_THRESHOLDS.TUEUR_KILLS_PER_GAME) {
    const score = playerStats.killsPerGame / TITLE_THRESHOLDS.TUEUR_KILLS_PER_GAME;
    candidates.push({ title: PLAYER_TITLES.TUEUR, score, isPositive: true });
  }
  
  // Survivant: High survival rate
  if (playerStats.survivalRate >= TITLE_THRESHOLDS.SURVIVANT_SURVIVAL_RATE) {
    const score = playerStats.survivalRate / TITLE_THRESHOLDS.SURVIVANT_SURVIVAL_RATE;
    candidates.push({ title: PLAYER_TITLES.SURVIVANT, score, isPositive: true });
  }
  
  // Stratège: High vote accuracy
  if (playerStats.totalVotes >= TITLE_THRESHOLDS.STRATEGE_MIN_VOTES &&
      playerStats.voteAccuracy >= TITLE_THRESHOLDS.STRATEGE_VOTE_ACCURACY) {
    const score = playerStats.voteAccuracy / TITLE_THRESHOLDS.STRATEGE_VOTE_ACCURACY;
    candidates.push({ title: PLAYER_TITLES.STRATEGE, score, isPositive: true });
  }
  
  // Vétéran: Many games played
  if (playerStats.gamesPlayed >= TITLE_THRESHOLDS.VETERAN_GAMES) {
    const score = playerStats.gamesPlayed / TITLE_THRESHOLDS.VETERAN_GAMES;
    candidates.push({ title: PLAYER_TITLES.VETERAN, score, isPositive: true });
  }
  
  // Chanceux: High win rate
  if (playerStats.winRate >= TITLE_THRESHOLDS.CHANCEUX_WIN_RATE) {
    const score = playerStats.winRate / TITLE_THRESHOLDS.CHANCEUX_WIN_RATE;
    candidates.push({ title: PLAYER_TITLES.CHANCEUX, score, isPositive: true });
  }
  
  // Leader: Many votes received
  if (playerStats.votesReceivedPerGame >= TITLE_THRESHOLDS.LEADER_VOTES_RECEIVED_PER_GAME) {
    const score = playerStats.votesReceivedPerGame / TITLE_THRESHOLDS.LEADER_VOTES_RECEIVED_PER_GAME;
    candidates.push({ title: PLAYER_TITLES.LEADER, score, isPositive: true });
  }
  
  // Discret: Rarely voted
  if (playerStats.votesReceivedPerGame <= TITLE_THRESHOLDS.DISCRET_VOTES_RECEIVED_PER_GAME) {
    const score = TITLE_THRESHOLDS.DISCRET_VOTES_RECEIVED_PER_GAME / Math.max(0.1, playerStats.votesReceivedPerGame);
    candidates.push({ title: PLAYER_TITLES.DISCRET, score, isPositive: true });
  }
  
  // === NEGATIVE TITLES ===
  
  // Silencieux: Low talking time
  if (playerStats.totalGameDurationSeconds > 0 && 
      playerStats.talkingSecondsPer60Min > 0 &&
      playerStats.talkingSecondsPer60Min <= TITLE_THRESHOLDS.SILENCIEUX_SECONDS_PER_60MIN) {
    const score = TITLE_THRESHOLDS.SILENCIEUX_SECONDS_PER_60MIN / playerStats.talkingSecondsPer60Min;
    candidates.push({ title: PLAYER_TITLES.SILENCIEUX, score, isPositive: false });
  }
  
  // Victime: High death rate
  if (playerStats.deathRate >= TITLE_THRESHOLDS.VICTIME_DEATH_RATE) {
    const score = playerStats.deathRate / TITLE_THRESHOLDS.VICTIME_DEATH_RATE;
    candidates.push({ title: PLAYER_TITLES.VICTIME, score, isPositive: false });
  }
  
  // Malchanceux: Low win rate
  if (playerStats.winRate <= TITLE_THRESHOLDS.MALCHANCEUX_WIN_RATE) {
    const score = TITLE_THRESHOLDS.MALCHANCEUX_WIN_RATE / Math.max(0.1, playerStats.winRate);
    candidates.push({ title: PLAYER_TITLES.MALCHANCEUX, score, isPositive: false });
  }
  
  // Pacifique: Low kill rate
  if (playerStats.killsPerGame <= TITLE_THRESHOLDS.PACIFIQUE_KILLS_PER_GAME) {
    const score = TITLE_THRESHOLDS.PACIFIQUE_KILLS_PER_GAME / Math.max(0.05, playerStats.killsPerGame);
    candidates.push({ title: PLAYER_TITLES.PACIFIQUE, score, isPositive: false });
  }
  
  // Débutant: Few games played
  if (playerStats.gamesPlayed < TITLE_THRESHOLDS.DEBUTANT_GAMES) {
    const score = TITLE_THRESHOLDS.DEBUTANT_GAMES / playerStats.gamesPlayed;
    candidates.push({ title: PLAYER_TITLES.DEBUTANT, score, isPositive: false });
  }
  
  // Distrait: Low vote accuracy
  if (playerStats.totalVotes >= TITLE_THRESHOLDS.STRATEGE_MIN_VOTES &&
      playerStats.voteAccuracy <= TITLE_THRESHOLDS.DISTRAIT_VOTE_ACCURACY) {
    const score = TITLE_THRESHOLDS.DISTRAIT_VOTE_ACCURACY / Math.max(0.1, playerStats.voteAccuracy);
    candidates.push({ title: PLAYER_TITLES.DISTRAIT, score, isPositive: false });
  }
  
  // Impulsif: High vote rate
  if (playerStats.voteRate >= TITLE_THRESHOLDS.IMPULSIF_VOTE_RATE) {
    const score = playerStats.voteRate / TITLE_THRESHOLDS.IMPULSIF_VOTE_RATE;
    candidates.push({ title: PLAYER_TITLES.IMPULSIF, score, isPositive: false });
  }
  
  // If no titles qualify, return empty
  if (candidates.length === 0) {
    return [];
  }
  
  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);
  
  // Strategy: Pick the 2 most prominent titles
  // Try to balance positive and negative if possible
  const selectedTitles: PlayerTitle[] = [];
  
  // First, add the highest scoring title
  selectedTitles.push(candidates[0].title);
  
  // For second title, prefer opposite sentiment if available
  const firstIsPositive = candidates[0].isPositive;
  const oppositeCandidate = candidates.find((c, idx) => 
    idx > 0 && c.isPositive !== firstIsPositive
  );
  
  if (oppositeCandidate) {
    // Add opposite sentiment title
    selectedTitles.push(oppositeCandidate.title);
  } else if (candidates.length > 1) {
    // No opposite sentiment available, add second highest
    selectedTitles.push(candidates[1].title);
  }
  
  return selectedTitles;
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
