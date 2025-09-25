import { getPlayerCampFromRole, getWinnerCampFromGame } from '../../utils/gameUtils';
import type { GameLogEntry } from '../useCombinedRawData';

export interface VotingStats {
  totalVotes: number;
  totalAbstentions: number;
  participationRate: number;
  averageVotesPerGame: number;
  averageAbstentionsPerGame: number;
  totalGamesWithVotes: number;
}

export interface PlayerVotingBehavior {
  player: string;
  role: string;
  totalVotesCast: number;
  totalAbstentions: number;
  participationRate: number;
  averageVotesPerGame: number;
  votesPerMeeting: number[];  // Number of votes cast in each meeting (for games they survived)
  targetsVoted: Record<string, number>;  // Who they voted for and how often
  mostTargetedPlayer: string | null;
  targetsVotedCount: number;  // Number of unique players they voted for
  gamesParticipated: number;
  survivedToMeeting: number[];  // Which meetings they survived to (1-indexed)
  earlyVoter: boolean;  // Tends to vote early in meetings
  roleBasedBehavior: {
    asVillageois: Partial<PlayerVotingBehavior>;
    asLoup: Partial<PlayerVotingBehavior>;
    asOther: Partial<PlayerVotingBehavior>;
  };
}

export interface VoteTargetingAnalysis {
  player: string;
  timesTargeted: number;
  targetedByPlayers: Record<string, number>;
  targetedByRoles: Record<string, number>;
  targetingPressure: number;  // Average times targeted per game
  survivalAfterBeingTargeted: number;  // How often they survive despite votes
  mostFrequentAttacker: string | null;
  gamesTargeted: number;
}

export interface MeetingVoteAnalysis {
  meetingNumber: number;
  totalParticipants: number;
  totalVotesCast: number;
  totalAbstentions: number;
  participationRate: number;
  playersWhoVoted: string[];
  playersWhoAbstained: string[];
  voteTargets: Record<string, number>;
  mostTargetedPlayer: string | null;
  consensusLevel: number;  // How concentrated votes were (0-1)
}

export interface GameVotingAnalysis {
  gameId: string;
  gameDate: string;
  totalMeetings: number;
  meetingAnalysis: MeetingVoteAnalysis[];
  overallParticipation: number;
  mostActiveVoter: string | null;
  mostTargetedPlayer: string | null;
  winningCamp: string;
  votingPatternsByRole: Record<string, {
    totalVotes: number;
    totalAbstentions: number;
    participationRate: number;
  }>;
}

/**
 * Analyze overall voting statistics across all games
 */
export function computeVotingStats(gameData: GameLogEntry[]): VotingStats | null {
  if (gameData.length === 0) {
    return null;
  }

  let totalVotes = 0;
  let totalAbstentions = 0;
  let gamesWithVotes = 0;

  gameData.forEach(game => {
    let gameHasVotes = false;
    
    game.PlayerStats.forEach(player => {
      if (player.Votes && player.Votes.length > 0) {
        gameHasVotes = true;
        player.Votes.forEach(vote => {
          if (vote.Target === "Passé") {
            totalAbstentions++;
          } else {
            totalVotes++;
          }
        });
      }
    });

    if (gameHasVotes) {
      gamesWithVotes++;
    }
  });

  const totalVoteActions = totalVotes + totalAbstentions;
  
  return {
    totalVotes,
    totalAbstentions,
    participationRate: totalVoteActions > 0 ? (totalVotes / totalVoteActions) * 100 : 0,
    averageVotesPerGame: gamesWithVotes > 0 ? totalVotes / gamesWithVotes : 0,
    averageAbstentionsPerGame: gamesWithVotes > 0 ? totalAbstentions / gamesWithVotes : 0,
    totalGamesWithVotes: gamesWithVotes
  };
}

/**
 * Analyze individual player voting behavior
 */
export function computePlayerVotingBehavior(gameData: GameLogEntry[]): PlayerVotingBehavior[] {
  if (gameData.length === 0) {
    return [];
  }

  const playerBehavior: Record<string, PlayerVotingBehavior> = {};

  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerName = player.Username.trim();
      if (!playerName || !player.Votes) return;

      if (!playerBehavior[playerName]) {
        playerBehavior[playerName] = {
          player: playerName,
          role: getPlayerCampFromRole(player.MainRoleInitial),
          totalVotesCast: 0,
          totalAbstentions: 0,
          participationRate: 0,
          averageVotesPerGame: 0,
          votesPerMeeting: [],
          targetsVoted: {},
          mostTargetedPlayer: null,
          targetsVotedCount: 0,
          gamesParticipated: 0,
          survivedToMeeting: [],
          earlyVoter: false,
          roleBasedBehavior: {
            asVillageois: {},
            asLoup: {},
            asOther: {}
          }
        };
      }

      const behavior = playerBehavior[playerName];
      behavior.gamesParticipated++;

      // Track which meetings they survived to
      const meetingsSurvived = player.Votes.length;
      behavior.survivedToMeeting.push(meetingsSurvived);

      player.Votes.forEach((vote) => {
        if (vote.Target === "Passé") {
          behavior.totalAbstentions++;
        } else {
          behavior.totalVotesCast++;
          
          // Track who they voted for
          if (!behavior.targetsVoted[vote.Target]) {
            behavior.targetsVoted[vote.Target] = 0;
          }
          behavior.targetsVoted[vote.Target]++;
        }
      });

      // Track role-specific behavior
      const roleCategory = getPlayerCampFromRole(player.MainRoleInitial) === "Villageois" ? "asVillageois" : 
                         getPlayerCampFromRole(player.MainRoleInitial) === "Loup" ? "asLoup" : "asOther";
      
      if (!behavior.roleBasedBehavior[roleCategory].totalVotesCast) {
        behavior.roleBasedBehavior[roleCategory] = {
          totalVotesCast: 0,
          totalAbstentions: 0,
          targetsVoted: {},
          gamesParticipated: 0
        };
      }
      
      const roleBehavior = behavior.roleBasedBehavior[roleCategory];
      if (roleBehavior.gamesParticipated !== undefined) {
        roleBehavior.gamesParticipated++;
      }
    });
  });

  // Calculate derived statistics
  Object.values(playerBehavior).forEach(behavior => {
    const totalVoteActions = behavior.totalVotesCast + behavior.totalAbstentions;
    behavior.participationRate = totalVoteActions > 0 ? (behavior.totalVotesCast / totalVoteActions) * 100 : 0;
    behavior.averageVotesPerGame = behavior.gamesParticipated > 0 ? behavior.totalVotesCast / behavior.gamesParticipated : 0;
    
    // Find most targeted player
    let maxVotes = 0;
    let mostTargeted = null;
    Object.entries(behavior.targetsVoted).forEach(([target, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        mostTargeted = target;
      }
    });
    behavior.mostTargetedPlayer = mostTargeted;
    behavior.targetsVotedCount = Object.keys(behavior.targetsVoted).length;
  });

  return Object.values(playerBehavior).sort((a, b) => b.totalVotesCast - a.totalVotesCast);
}

/**
 * Analyze who gets targeted by votes most often
 */
export function computeVoteTargetingAnalysis(gameData: GameLogEntry[]): VoteTargetingAnalysis[] {
  if (gameData.length === 0) {
    return [];
  }

  const targetingData: Record<string, VoteTargetingAnalysis> = {};
  const allPlayers = new Set<string>();

  // First pass: collect all players
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      allPlayers.add(player.Username.trim());
    });
  });

  // Initialize all players
  allPlayers.forEach(playerName => {
    if (playerName) {
      targetingData[playerName] = {
        player: playerName,
        timesTargeted: 0,
        targetedByPlayers: {},
        targetedByRoles: {},
        targetingPressure: 0,
        survivalAfterBeingTargeted: 0,
        mostFrequentAttacker: null,
        gamesTargeted: 0
      };
    }
  });

  // Second pass: analyze targeting
  gameData.forEach(game => {
    const gamesTargetedInThisGame = new Set<string>();
    
    game.PlayerStats.forEach(voter => {
      if (!voter.Votes) return;
      
      voter.Votes.forEach(vote => {
        if (vote.Target !== "Passé" && targetingData[vote.Target]) {
          const target = targetingData[vote.Target];
          target.timesTargeted++;
          gamesTargetedInThisGame.add(vote.Target);
          
          // Track who voted for them
          if (!target.targetedByPlayers[voter.Username]) {
            target.targetedByPlayers[voter.Username] = 0;
          }
          target.targetedByPlayers[voter.Username]++;
          
          // Track which roles voted for them
          if (!target.targetedByRoles[getPlayerCampFromRole(voter.MainRoleInitial)]) {
            target.targetedByRoles[getPlayerCampFromRole(voter.MainRoleInitial)] = 0;
          }
          target.targetedByRoles[getPlayerCampFromRole(voter.MainRoleInitial)]++;
        }
      });
    });

    // Update games targeted count
    gamesTargetedInThisGame.forEach(playerName => {
      targetingData[playerName].gamesTargeted++;
    });
  });

  // Calculate derived statistics
  Object.values(targetingData).forEach(target => {
    target.targetingPressure = target.gamesTargeted > 0 ? target.timesTargeted / target.gamesTargeted : 0;
    
    // Find most frequent attacker
    let maxAttacks = 0;
    let mostFrequentAttacker = null;
    Object.entries(target.targetedByPlayers).forEach(([attacker, count]) => {
      if (count > maxAttacks) {
        maxAttacks = count;
        mostFrequentAttacker = attacker;
      }
    });
    target.mostFrequentAttacker = mostFrequentAttacker;
  });

  return Object.values(targetingData)
    .filter(target => target.timesTargeted > 0)
    .sort((a, b) => b.timesTargeted - a.timesTargeted);
}

/**
 * Analyze voting patterns in individual games
 */
export function computeGameVotingAnalysis(gameData: GameLogEntry[]): GameVotingAnalysis[] {
  return gameData.map(game => {
    const meetingAnalysis: MeetingVoteAnalysis[] = [];
    
    // Determine number of meetings by looking at max votes array length
    const maxMeetings = Math.max(...game.PlayerStats.map(p => p.Votes ? p.Votes.length : 0));
    
    for (let meetingIndex = 0; meetingIndex < maxMeetings; meetingIndex++) {
      const meetingVotes: { voter: string; target: string; role: string }[] = [];
      const participants = new Set<string>();
      
      game.PlayerStats.forEach(player => {
        if (player.Votes && player.Votes[meetingIndex]) {
          participants.add(player.Username);
          meetingVotes.push({
            voter: player.Username,
            target: player.Votes[meetingIndex].Target,
            role: getPlayerCampFromRole(player.MainRoleInitial)
          });
        }
      });
      
      const totalVotes = meetingVotes.filter(v => v.target !== "Passé").length;
      const totalAbstentions = meetingVotes.filter(v => v.target === "Passé").length;
      const voteTargets: Record<string, number> = {};
      
      meetingVotes.forEach(vote => {
        if (vote.target !== "Passé") {
          voteTargets[vote.target] = (voteTargets[vote.target] || 0) + 1;
        }
      });
      
      const mostTargetedPlayer = Object.entries(voteTargets)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
      
      // Calculate consensus level (how concentrated votes were)
      const totalNonAbstentionVotes = totalVotes;
      const maxVotesForOnePlayer = Math.max(...Object.values(voteTargets), 0);
      const consensusLevel = totalNonAbstentionVotes > 0 ? maxVotesForOnePlayer / totalNonAbstentionVotes : 0;
      
      meetingAnalysis.push({
        meetingNumber: meetingIndex + 1,
        totalParticipants: participants.size,
        totalVotesCast: totalVotes,
        totalAbstentions,
        participationRate: participants.size > 0 ? (totalVotes / participants.size) * 100 : 0,
        playersWhoVoted: meetingVotes.filter(v => v.target !== "Passé").map(v => v.voter),
        playersWhoAbstained: meetingVotes.filter(v => v.target === "Passé").map(v => v.voter),
        voteTargets,
        mostTargetedPlayer,
        consensusLevel
      });
    }
    
    // Overall game analysis
    const allVotes = game.PlayerStats.flatMap(p => p.Votes || []);
    const totalGameVotes = allVotes.filter(v => v.Target !== "Passé").length;
    const totalGameParticipation = allVotes.length;
    
    const playerVoteCounts = game.PlayerStats.map(p => ({
      player: p.Username,
      votes: p.Votes ? p.Votes.filter(v => v.Target !== "Passé").length : 0
    }));
    
    const mostActiveVoter = playerVoteCounts
      .sort((a, b) => b.votes - a.votes)[0]?.player || null;
    
    // Find most targeted player across all meetings
    const allTargets: Record<string, number> = {};
    allVotes.forEach(vote => {
      if (vote.Target !== "Passé") {
        allTargets[vote.Target] = (allTargets[vote.Target] || 0) + 1;
      }
    });
    const mostTargetedPlayer = Object.entries(allTargets)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
    
    // Determine winning camp
    const winningCamp = getWinnerCampFromGame(game);

    // Role-based voting patterns
    const votingPatternsByRole: Record<string, {
      totalVotes: number;
      totalAbstentions: number;
      participationRate: number;
    }> = {};
    
    game.PlayerStats.forEach(player => {
      const role = getPlayerCampFromRole(player.MainRoleInitial);
      if (!votingPatternsByRole[role]) {
        votingPatternsByRole[role] = {
          totalVotes: 0,
          totalAbstentions: 0,
          participationRate: 0
        };
      }
      
      if (player.Votes) {
        const votes = player.Votes.filter(v => v.Target !== "Passé").length;
        const abstentions = player.Votes.filter(v => v.Target === "Passé").length;
        
        votingPatternsByRole[role].totalVotes += votes;
        votingPatternsByRole[role].totalAbstentions += abstentions;
      }
    });
    
    // Calculate participation rates by role
    Object.values(votingPatternsByRole).forEach(roleData => {
      const total = roleData.totalVotes + roleData.totalAbstentions;
      roleData.participationRate = total > 0 ? (roleData.totalVotes / total) * 100 : 0;
    });
    
    return {
      gameId: game.Id,
      gameDate: game.StartDate,
      totalMeetings: maxMeetings,
      meetingAnalysis,
      overallParticipation: totalGameParticipation > 0 ? (totalGameVotes / totalGameParticipation) * 100 : 0,
      mostActiveVoter,
      mostTargetedPlayer,
      winningCamp,
      votingPatternsByRole
    };
  });
}