/**
 * Statistics computation for Player Titles Generation
 *
 * Aggregates raw game data into per-player statistics used by titleGenerators.js.
 */

import { computePlayerStats } from './compute-player-stats.js';
import { computePlayerSeriesData } from './compute-series-data.js';
import { computeVotingStatistics } from './compute-voting-stats.js';
import { computeHunterStatistics } from './compute-hunter-stats.js';
import { computeTalkingTimeStats } from './compute-talking-stats.js';
import { computeDeathStatistics } from './compute-death-stats.js';
import { computeLootStatistics } from './compute-loot-stats.js';
import { computeZoneStatistics } from './compute-zone-stats.js';
import { computeWolfTransformStatistics } from './compute-wolf-transform-stats.js';
import { computePotionStatistics } from './compute-potion-stats.js';

/** Minimum games as a specific role before role-based stats are considered */
export const MIN_GAMES_FOR_ROLE_TITLES = 10;

/**
 * Compute all player statistics needed for title generation
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Map} - Aggregated statistics keyed by playerId
 */
export function computeAllStatistics(moddedGames) {
  console.log(`  Computing statistics from ${moddedGames.length} modded games...`);

  const playerStats = computePlayerStats(moddedGames);
  const seriesData = computePlayerSeriesData(moddedGames);
  const votingStats = computeVotingStatistics(moddedGames);
  const hunterStats = computeHunterStatistics(moddedGames);
  const talkingStats = computeTalkingTimeStats(moddedGames);
  const deathStats = computeDeathStatistics(moddedGames);

  let lootStats = null;
  try {
    lootStats = computeLootStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Loot statistics not available');
  }

  let zoneStats = null;
  try {
    zoneStats = computeZoneStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Zone statistics not available:', e.message);
  }

  let wolfTransformStats = null;
  try {
    wolfTransformStats = computeWolfTransformStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Wolf transform statistics not available:', e.message);
  }

  let potionStats = null;
  try {
    potionStats = computePotionStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Potion statistics not available:', e.message);
  }

  const aggregatedStats = new Map();

  // Base player stats
  if (playerStats?.playerStats) {
    playerStats.playerStats.forEach(player => {
      const playerId = player.playerId || player.player;
      if (!aggregatedStats.has(playerId)) {
        aggregatedStats.set(playerId, { playerId, playerName: player.playerName, gamesPlayed: 0, stats: {} });
      }
      const agg = aggregatedStats.get(playerId);
      agg.gamesPlayed = player.gamesPlayed || 0;
      agg.stats.winRate = parseFloat(player.winPercent) || 0;
      agg.stats.gamesPlayed = player.gamesPlayed || 0;

      if (player.camps) {
        const vill = player.camps.villageois;
        const loup = player.camps.loups;
        const solo = player.camps.solo;

        agg.stats.winRateVillageois = vill?.played > 5 ? (vill.won / vill.played) * 100 : null;
        agg.stats.winRateLoup = loup?.played > 5 ? (loup.won / loup.played) * 100 : null;
        agg.stats.winRateSolo = solo?.played > 3 ? (solo.won / solo.played) * 100 : null;

        const total = (vill?.played || 0) + (loup?.played || 0) + (solo?.played || 0);
        if (total > 0) {
          agg.stats.campVillageoisPercent = ((vill?.played || 0) / total) * 100;
          agg.stats.campLoupPercent = ((loup?.played || 0) / total) * 100;
          agg.stats.campSoloPercent = ((solo?.played || 0) / total) * 100;
        }
      }
    });
  }

  // Talking stats
  if (talkingStats?.playerStats) {
    talkingStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      agg.stats.talkingPer60Min = player.secondsAllPer60Min ?? null;
      agg.stats.talkingOutsidePer60Min = player.secondsOutsidePer60Min ?? null;
      agg.stats.talkingDuringPer60Min = player.secondsDuringPer60Min ?? null;
    });
  }

  // Voting behavior
  if (votingStats?.playerBehaviorStats) {
    votingStats.playerBehaviorStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      if (player.aggressivenessScore !== undefined && player.aggressivenessScore !== null) {
        agg.stats.votingAggressiveness = player.aggressivenessScore;
      }
    });
  }

  // Voting accuracy
  if (votingStats?.playerAccuracyStats) {
    votingStats.playerAccuracyStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      const totalVotes = player.totalVotes || 0;
      if (totalVotes >= 10 && player.accuracyRate !== undefined && player.accuracyRate !== null) {
        agg.stats.votingAccuracy = player.accuracyRate;
      }
    });
  }

  // Voting first/early
  if (votingStats?.playerFirstVoteStats) {
    votingStats.playerFirstVoteStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      const totalMeetingsWithVotes = player.totalMeetingsWithVotes || 0;
      if (totalMeetingsWithVotes >= 5 && player.earlyVoteRate !== undefined && player.earlyVoteRate !== null) {
        agg.stats.votingFirst = player.earlyVoteRate;
      }
    });
  }

  // Meeting survival
  if (votingStats?.playerMeetingSurvivalStats) {
    votingStats.playerMeetingSurvivalStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      if (player.villageoisMeetings >= 5 && player.survivalAtMeetingVillageois !== null) {
        agg.stats.survivalAtMeetingVillageois = player.survivalAtMeetingVillageois;
      }
      if (player.loupMeetings >= 5 && player.survivalAtMeetingLoup !== null) {
        agg.stats.survivalAtMeetingLoup = player.survivalAtMeetingLoup;
      }
      if (player.soloMeetings >= 3 && player.survivalAtMeetingSolo !== null) {
        agg.stats.survivalAtMeetingSolo = player.survivalAtMeetingSolo;
      }
    });
  }

  // Hunter stats
  if (hunterStats?.hunterStats) {
    hunterStats.hunterStats.forEach(hunterData => {
      const hunterId = hunterData.hunterId;
      if (!aggregatedStats.has(hunterId)) return;
      const agg = aggregatedStats.get(hunterId);
      const gamesAsHunter = hunterData.gamesPlayedAsHunter || 0;
      if (gamesAsHunter >= MIN_GAMES_FOR_ROLE_TITLES) {
        const totalKills = hunterData.totalKills || 0;
        const goodKills = hunterData.nonVillageoisKills || 0;
        agg.stats.hunterGames = gamesAsHunter;
        agg.stats.hunterAccuracy = totalKills > 0 ? (goodKills / totalKills) * 100 : null;
        const totalShots = hunterData.totalShots || 0;
        const shotsHit = hunterData.shotsHit || 0;
        agg.stats.hunterShotAccuracy = totalShots > 0 ? (shotsHit / totalShots) * 100 : null;
      }
    });
  }

  // Death / survival stats
  if (deathStats?.playerDeathStats) {
    deathStats.playerDeathStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      const gamesPlayed = agg.gamesPlayed || 0;
      const deaths = player.totalDeaths || 0;
      if (gamesPlayed > 0) {
        agg.stats.survivalRate = ((gamesPlayed - deaths) / gamesPlayed) * 100;
      }
      if (player.survivalDay1Rate !== undefined && player.survivalDay1Rate !== null) {
        agg.stats.survivalDay1Rate = player.survivalDay1Rate;
      }
      const killerData = deathStats.killerStats?.find(k => k.killerId === playerId);
      const kills = killerData?.kills || 0;
      agg.stats.killRate = kills / Math.max(gamesPlayed, 1);
    });
  }

  // Series data
  if (seriesData) {
    seriesData.allWinSeries?.forEach(series => {
      const playerId = series.player;
      if (!aggregatedStats.has(playerId)) return;
      aggregatedStats.get(playerId).stats.longestWinSeries = series.seriesLength || 0;
    });
    seriesData.allLossSeries?.forEach(series => {
      const playerId = series.player;
      if (!aggregatedStats.has(playerId)) return;
      aggregatedStats.get(playerId).stats.longestLossSeries = series.seriesLength || 0;
    });
  }

  // Loot stats
  if (lootStats?.playerStats) {
    lootStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      agg.stats.lootPer60Min = player.lootPer60Min ?? null;
      agg.stats.lootVillageoisPer60Min = (player.villageoisGames > 5 && player.lootVillageoisPer60Min != null)
        ? player.lootVillageoisPer60Min : null;
      agg.stats.lootLoupPer60Min = (player.loupGames > 5 && player.lootLoupPer60Min != null)
        ? player.lootLoupPer60Min : null;
      agg.stats.lootSoloPer60Min = (player.soloGames > 3 && player.lootSoloPer60Min != null)
        ? player.lootSoloPer60Min : null;
    });
  }

  // Zone stats (Village map only)
  if (zoneStats?.playerStats) {
    zoneStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      if (player.totalPositions < 10) return;
      const agg = aggregatedStats.get(playerId);
      agg.stats.zoneVillagePrincipal = player.zonePercentages['Village Principal'] ?? null;
      agg.stats.zoneFerme = player.zonePercentages['Ferme'] ?? null;
      agg.stats.zoneVillagePecheur = player.zonePercentages['Village Pêcheur'] ?? null;
      agg.stats.zoneRuines = player.zonePercentages['Ruines'] ?? null;
      agg.stats.zoneResteCarte = player.zonePercentages['Reste de la Carte'] ?? null;
      agg.stats.zoneDominantPercentage = player.dominantZonePercentage ?? null;
      agg.stats.zoneTotalPositions = player.totalPositions;
    });
  }

  // Wolf transform stats
  if (wolfTransformStats?.playerStats) {
    wolfTransformStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      if (player.gamesWithTransformData < 5 || player.totalNightsAsWolf < 5) return;
      const agg = aggregatedStats.get(playerId);
      agg.stats.wolfTransformRate = player.transformsPerNight ?? null;
      agg.stats.wolfUntransformRate = player.untransformsPerNight ?? null;
    });
  }

  // Potion stats
  if (potionStats?.playerStats) {
    potionStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      if (player.gamesWithPotionData < 5) return;
      aggregatedStats.get(playerId).stats.potionsPer60Min = player.potionsPer60Min ?? null;
    });
  }

  // Camp-specific kill/survival rates
  if (deathStats?.campKillRates) {
    deathStats.campKillRates.forEach(campData => {
      const playerId = campData.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      agg.stats.killRateVillageois = campData.killRateVillageois;
      agg.stats.killRateLoup = campData.killRateLoup;
      agg.stats.killRateSolo = campData.killRateSolo;
      agg.stats.survivalRateVillageois = campData.survivalRateVillageois ?? null;
      agg.stats.survivalRateLoup = campData.survivalRateLoup ?? null;
      agg.stats.survivalRateSolo = campData.survivalRateSolo ?? null;
      agg.stats.survivalDay1RateVillageois = campData.survivalDay1RateVillageois ?? null;
      agg.stats.survivalDay1RateLoup = campData.survivalDay1RateLoup ?? null;
      agg.stats.survivalDay1RateSolo = campData.survivalDay1RateSolo ?? null;
    });
  }

  return aggregatedStats;
}

/**
 * Compute role assignment frequencies from game data
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Map} - Role frequencies keyed by playerId
 */
export function computeRoleFrequencies(moddedGames) {
  const roleFrequencies = new Map();

  moddedGames.forEach(game => {
    if (!game.PlayerStats) return;
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      if (!roleFrequencies.has(playerId)) {
        roleFrequencies.set(playerId, { gamesPlayed: 0, roles: {} });
      }
      const freq = roleFrequencies.get(playerId);
      freq.gamesPlayed++;

      let role = player.MainRoleInitial;
      // Normalize Amoureux variants
      if (role === 'Amoureux Loup' || role === 'Amoureux Villageois') role = 'Amoureux';

      const effectiveRole = player.Power || role;
      freq.roles[effectiveRole] = (freq.roles[effectiveRole] || 0) + 1;
    });
  });

  return roleFrequencies;
}
