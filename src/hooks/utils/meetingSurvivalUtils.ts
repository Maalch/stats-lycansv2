import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId } from '../../utils/playerIdentification';
import { getPlayerFinalRole, getPlayerCampFromRole } from '../../utils/datasyncExport';

/**
 * Player meeting survival statistics
 */
export interface PlayerMeetingSurvivalStats {
  playerId: string;
  playerName: string;
  totalMeetingsParticipated: number;
  totalDeathsAtMeetings: number;
  survivalRate: number;
  campBreakdown: {
    villageois: {
      meetingsParticipated: number;
      deathsAtMeetings: number;
      survivalRate: number | null;
    };
    loups: {
      meetingsParticipated: number;
      deathsAtMeetings: number;
      survivalRate: number | null;
    };
    solo: {
      meetingsParticipated: number;
      deathsAtMeetings: number;
      survivalRate: number | null;
    };
  };
}

/**
 * Comprehensive meeting survival statistics
 */
export interface MeetingSurvivalStatistics {
  totalGames: number;
  totalMeetings: number;
  playerStats: PlayerMeetingSurvivalStats[];
}

/**
 * Helper to determine if a player was alive at a meeting
 */
function wasPlayerAliveAtMeeting(player: any, meetingNumber: number): boolean {
  if (!player.DeathTiming) return true;
  
  const deathTiming = player.DeathTiming.toUpperCase();
  
  if (deathTiming.startsWith('M')) {
    const deathMeeting = parseInt(deathTiming.substring(1));
    return meetingNumber <= deathMeeting;
  }
  
  if (deathTiming.startsWith('N') || deathTiming.startsWith('J')) {
    const deathDay = parseInt(deathTiming.substring(1));
    // Sequence: J1 -> N1 -> M1 -> J2 -> N2 -> M2
    // If player dies at J2 or N2, they are NOT alive for M2
    return meetingNumber < deathDay;
  }
  
  return true;
}

/**
 * Calculate meeting survival statistics for all players
 */
export function computeMeetingSurvivalStatistics(
  gameData: GameLogEntry[],
  campFilter?: string
): MeetingSurvivalStatistics | null {
  if (gameData.length === 0) {
    return null;
  }

  const playerMeetingSurvivalMap = new Map<string, {
    playerName: string;
    villageois: { meetingsParticipated: number; deathsAtMeetings: number };
    loups: { meetingsParticipated: number; deathsAtMeetings: number };
    solo: { meetingsParticipated: number; deathsAtMeetings: number };
  }>();

  let totalMeetingsAcrossAllGames = 0;

  // Process each game
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    // Initialize player maps
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const playerName = player.Username;
      
      if (!playerMeetingSurvivalMap.has(playerId)) {
        playerMeetingSurvivalMap.set(playerId, {
          playerName: playerName,
          villageois: { meetingsParticipated: 0, deathsAtMeetings: 0 },
          loups: { meetingsParticipated: 0, deathsAtMeetings: 0 },
          solo: { meetingsParticipated: 0, deathsAtMeetings: 0 }
        });
      }
    });

    // Find max meeting number in this game
    const maxMeetingNumber = Math.max(
      ...game.PlayerStats.flatMap(player => 
        (player.Votes || []).map(vote => vote.Day || 0)
      ),
      0
    );

    totalMeetingsAcrossAllGames += maxMeetingNumber;

    // Process each meeting
    for (let meetingNum = 1; meetingNum <= maxMeetingNumber; meetingNum++) {
      // Get all players who were alive at this meeting
      const alivePlayersAtMeeting = game.PlayerStats.filter(player => 
        wasPlayerAliveAtMeeting(player, meetingNum)
      );

      // Process each alive player
      alivePlayersAtMeeting.forEach(player => {
        const playerId = getPlayerId(player);
        const meetingSurvivalStats = playerMeetingSurvivalMap.get(playerId);
        
        if (!meetingSurvivalStats) return;

        // Determine player's camp for this game
        const playerRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
        const playerCamp = getPlayerCampFromRole(playerRole, { regroupWolfSubRoles: true });

        // Apply camp filter if specified
        if (campFilter && campFilter !== 'Tous les camps' && playerCamp !== campFilter) {
          return;
        }

        // Player was alive at this meeting - count it
        if (playerCamp === 'Villageois') {
          meetingSurvivalStats.villageois.meetingsParticipated++;
        } else if (playerCamp === 'Loup') {
          meetingSurvivalStats.loups.meetingsParticipated++;
        } else {
          meetingSurvivalStats.solo.meetingsParticipated++;
        }

        // Check if player died at this meeting (must be voted out, not just die during meeting)
        if (player.DeathType === 'VOTED' && player.DeathTiming === `M${meetingNum}`) {
          if (playerCamp === 'Villageois') {
            meetingSurvivalStats.villageois.deathsAtMeetings++;
          } else if (playerCamp === 'Loup') {
            meetingSurvivalStats.loups.deathsAtMeetings++;
          } else {
            meetingSurvivalStats.solo.deathsAtMeetings++;
          }
        }
      });
    }
  });

  // Convert to final stats array
  const playerStats: PlayerMeetingSurvivalStats[] = Array.from(playerMeetingSurvivalMap.entries())
    .map(([playerId, data]) => {
      // Calculate overall stats
      const totalMeetingsParticipated = 
        data.villageois.meetingsParticipated + 
        data.loups.meetingsParticipated + 
        data.solo.meetingsParticipated;
      
      const totalDeathsAtMeetings = 
        data.villageois.deathsAtMeetings + 
        data.loups.deathsAtMeetings + 
        data.solo.deathsAtMeetings;

      const survivalRate = totalMeetingsParticipated > 0
        ? ((totalMeetingsParticipated - totalDeathsAtMeetings) / totalMeetingsParticipated) * 100
        : 0;

      // Calculate camp-specific survival rates
      const villageoisSurvivalRate = data.villageois.meetingsParticipated > 0
        ? ((data.villageois.meetingsParticipated - data.villageois.deathsAtMeetings) / data.villageois.meetingsParticipated) * 100
        : null;

      const loupsSurvivalRate = data.loups.meetingsParticipated > 0
        ? ((data.loups.meetingsParticipated - data.loups.deathsAtMeetings) / data.loups.meetingsParticipated) * 100
        : null;

      const soloSurvivalRate = data.solo.meetingsParticipated > 0
        ? ((data.solo.meetingsParticipated - data.solo.deathsAtMeetings) / data.solo.meetingsParticipated) * 100
        : null;

      return {
        playerId,
        playerName: data.playerName,
        totalMeetingsParticipated,
        totalDeathsAtMeetings,
        survivalRate,
        campBreakdown: {
          villageois: {
            meetingsParticipated: data.villageois.meetingsParticipated,
            deathsAtMeetings: data.villageois.deathsAtMeetings,
            survivalRate: villageoisSurvivalRate
          },
          loups: {
            meetingsParticipated: data.loups.meetingsParticipated,
            deathsAtMeetings: data.loups.deathsAtMeetings,
            survivalRate: loupsSurvivalRate
          },
          solo: {
            meetingsParticipated: data.solo.meetingsParticipated,
            deathsAtMeetings: data.solo.deathsAtMeetings,
            survivalRate: soloSurvivalRate
          }
        }
      };
    })
    .filter(player => player.totalMeetingsParticipated > 0) // Only include players who participated in at least one meeting
    .sort((a, b) => b.survivalRate - a.survivalRate);

  return {
    totalGames: gameData.length,
    totalMeetings: totalMeetingsAcrossAllGames,
    playerStats
  };
}
