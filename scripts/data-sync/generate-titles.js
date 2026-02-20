/**
 * Player Titles Generation System
 * 
 * Generates dynamic titles for players based on their statistics.
 * Uses percentile-based distribution to ensure fair title assignment.
 * 
 * Titles are generated from modded games only and require minimum 25 games.
 */

import fs from 'fs/promises';
import path from 'path';

// Import compute functions
import { computePlayerStats } from './compute/compute-player-stats.js';
import { computePlayerSeriesData } from './compute/compute-series-data.js';
import { computeVotingStatistics } from './compute/compute-voting-stats.js';
import { computeHunterStatistics } from './compute/compute-hunter-stats.js';
import { computeTalkingTimeStats } from './compute/compute-talking-stats.js';
import { computeDeathStatistics } from './compute/compute-death-stats.js';
import { computeLootStatistics } from './compute/compute-loot-stats.js';
import { computeZoneStatistics } from './compute/compute-zone-stats.js';
import { computeWolfTransformStatistics } from './compute/compute-wolf-transform-stats.js';
import { computePotionStatistics } from './compute/compute-potion-stats.js';

// Import data source configuration
import { DATA_SOURCES } from './shared/data-sources.js';

// Import title definitions
import { TITLE_DEFINITIONS, COMBINATION_TITLES } from './titleDefinitions.js';

// Minimum games required for title eligibility
const MIN_GAMES_FOR_TITLES = 25;
const MIN_GAMES_FOR_ROLE_TITLES = 10;

// Percentile thresholds for title categories
const PERCENTILE_THRESHOLDS = {
  EXTREME_HIGH: 85,   // Top 15% 
  HIGH: 65,           // Top 35% 
  ABOVE_AVERAGE: 55,  // Top 45% 
  BELOW_AVERAGE: 45,  // Bottom 55% 
  LOW: 35,            // Bottom 35% 
  EXTREME_LOW: 15     // Bottom 15% 
};

/**
 * Calculate percentile for a value in a distribution
 * @param {number} value - The value to calculate percentile for
 * @param {Array<number>} distribution - Sorted array of all values
 * @returns {number} - Percentile (0-100)
 */
function calculatePercentile(value, distribution) {
  if (distribution.length === 0) return 50;
  const sorted = [...distribution].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}

/**
 * Get percentile category for a value
 * @param {number} percentile - Percentile value (0-100)
 * @returns {string} - Category name
 */
function getPercentileCategory(percentile) {
  if (percentile >= PERCENTILE_THRESHOLDS.EXTREME_HIGH) return 'EXTREME_HIGH';
  if (percentile >= PERCENTILE_THRESHOLDS.HIGH) return 'HIGH';
  if (percentile >= PERCENTILE_THRESHOLDS.ABOVE_AVERAGE) return 'ABOVE_AVERAGE';
  if (percentile <= PERCENTILE_THRESHOLDS.EXTREME_LOW) return 'EXTREME_LOW';
  if (percentile <= PERCENTILE_THRESHOLDS.LOW) return 'LOW';
  if (percentile <= PERCENTILE_THRESHOLDS.BELOW_AVERAGE) return 'BELOW_AVERAGE';
  return 'AVERAGE';
}

// Title definitions are now imported from titleDefinitions.js

// ============================================================================
// STATISTICS COMPUTATION
// ============================================================================

/**
 * Compute all player statistics needed for title generation
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Object} - Computed statistics by player
 */
function computeAllStatistics(moddedGames) {
  console.log(`  Computing statistics from ${moddedGames.length} modded games...`);

  // Compute all stats using existing compute functions
  const playerStats = computePlayerStats(moddedGames);
  const seriesData = computePlayerSeriesData(moddedGames);
  const votingStats = computeVotingStatistics(moddedGames);
  const hunterStats = computeHunterStatistics(moddedGames);
  const talkingStats = computeTalkingTimeStats(moddedGames);
  const deathStats = computeDeathStatistics(moddedGames);
  
  // Try to compute loot stats if available
  let lootStats = null;
  try {
    lootStats = computeLootStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Loot statistics not available');
  }

  // Compute zone stats (Village map only)
  let zoneStats = null;
  try {
    zoneStats = computeZoneStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Zone statistics not available:', e.message);
  }

  // Compute wolf transform stats
  let wolfTransformStats = null;
  try {
    wolfTransformStats = computeWolfTransformStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Wolf transform statistics not available:', e.message);
  }

  // Compute potion usage stats
  let potionStats = null;
  try {
    potionStats = computePotionStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Potion statistics not available:', e.message);
  }

  // Aggregate all stats by player
  const aggregatedStats = new Map();

  // Process base player stats
  if (playerStats?.playerStats) {
    playerStats.playerStats.forEach(player => {
      const playerId = player.playerId || player.player;
      if (!aggregatedStats.has(playerId)) {
        aggregatedStats.set(playerId, {
          playerId,
          playerName: player.playerName,
          gamesPlayed: 0,
          stats: {}
        });
      }
      const agg = aggregatedStats.get(playerId);
      agg.gamesPlayed = player.gamesPlayed || 0;
      agg.stats.winRate = parseFloat(player.winPercent) || 0;
      agg.stats.gamesPlayed = player.gamesPlayed || 0;
      
      // Camp-specific win rates
      if (player.camps) {
        const vill = player.camps.villageois;
        const loup = player.camps.loups;
        const solo = player.camps.solo;
        
        agg.stats.winRateVillageois = vill?.played > 5 
          ? (vill.won / vill.played) * 100 : null;
        agg.stats.winRateLoup = loup?.played > 5 
          ? (loup.won / loup.played) * 100 : null;
        agg.stats.winRateSolo = solo?.played > 3 
          ? (solo.won / solo.played) * 100 : null;
        
        // Camp assignment percentages
        const total = (vill?.played || 0) + (loup?.played || 0) + (solo?.played || 0);
        if (total > 0) {
          agg.stats.campVillageoisPercent = ((vill?.played || 0) / total) * 100;
          agg.stats.campLoupPercent = ((loup?.played || 0) / total) * 100;
          agg.stats.campSoloPercent = ((solo?.played || 0) / total) * 100;
        }
      }
    });
  }

  // Process talking stats
  if (talkingStats?.playerStats) {
    talkingStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Only set talking stats if data exists (not 0 from missing data)
      agg.stats.talkingPer60Min = (player.secondsAllPer60Min !== undefined && player.secondsAllPer60Min !== null) 
        ? player.secondsAllPer60Min : null;
      agg.stats.talkingOutsidePer60Min = (player.secondsOutsidePer60Min !== undefined && player.secondsOutsidePer60Min !== null) 
        ? player.secondsOutsidePer60Min : null;
      agg.stats.talkingDuringPer60Min = (player.secondsDuringPer60Min !== undefined && player.secondsDuringPer60Min !== null) 
        ? player.secondsDuringPer60Min : null;
    });
  }

  // Process voting behavior stats
  if (votingStats?.playerBehaviorStats) {
    votingStats.playerBehaviorStats.forEach(player => {
      const playerId = player.player; // Use 'player' field from compute-voting-stats
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Use aggressivenessScore directly from compute-voting-stats
      if (player.aggressivenessScore !== undefined && player.aggressivenessScore !== null) {
        agg.stats.votingAggressiveness = player.aggressivenessScore;
      }
    });
  }

  // Process voting accuracy
  if (votingStats?.playerAccuracyStats) {
    votingStats.playerAccuracyStats.forEach(player => {
      const playerId = player.player; // Use 'player' field from compute-voting-stats
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const totalVotes = player.totalVotes || 0;
      const accuracyRate = player.accuracyRate;
      
      if (totalVotes >= 10 && accuracyRate !== undefined && accuracyRate !== null) {
        agg.stats.votingAccuracy = accuracyRate;
      }
    });
  }

  // Process voting first/early stats
  if (votingStats?.playerFirstVoteStats) {
    votingStats.playerFirstVoteStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const totalMeetingsWithVotes = player.totalMeetingsWithVotes || 0;
      const earlyVoteRate = player.earlyVoteRate;
      
      // Use early vote rate (top 33% of voters) as the "first vote" metric
      if (totalMeetingsWithVotes >= 5 && earlyVoteRate !== undefined && earlyVoteRate !== null) {
        agg.stats.votingFirst = earlyVoteRate;
      }
    });
  }

  // Process hunter stats
  if (hunterStats?.hunterStats) {
    hunterStats.hunterStats.forEach(hunterData => {
      const hunterId = hunterData.hunterId;
      if (!aggregatedStats.has(hunterId)) return;
      const agg = aggregatedStats.get(hunterId);
      
      const gamesAsHunter = hunterData.gamesPlayedAsHunter || 0;
      const totalKills = hunterData.totalKills || 0;
      const goodKills = hunterData.nonVillageoisKills || 0;
      const badKills = hunterData.villageoisKills || 0;
      
      // Only compute accuracy if played at least MIN_GAMES_FOR_ROLE_TITLES games as hunter
      if (gamesAsHunter >= MIN_GAMES_FOR_ROLE_TITLES) {
        agg.stats.hunterGames = gamesAsHunter;
        agg.stats.hunterAccuracy = totalKills > 0 
          ? (goodKills / totalKills) * 100 : null;
        
        // Shot accuracy from Actions data (HunterShoot: ActionTarget present = hit)
        const totalShots = hunterData.totalShots || 0;
        const shotsHit = hunterData.shotsHit || 0;
        agg.stats.hunterShotAccuracy = totalShots > 0
          ? (shotsHit / totalShots) * 100 : null;
      }
    });
  }

  // Process death stats for survival rates
  if (deathStats?.playerDeathStats) {
    deathStats.playerDeathStats.forEach(player => {
      const playerId = player.player; // Use 'player' field, not 'playerId'
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const gamesPlayed = agg.gamesPlayed || 0;
      const deaths = player.totalDeaths || 0;
      
      if (gamesPlayed > 0) {
        agg.stats.survivalRate = ((gamesPlayed - deaths) / gamesPlayed) * 100;
      }
      
      // Survival Day 1 Rate - now available from compute-death-stats.js
      if (player.survivalDay1Rate !== undefined && player.survivalDay1Rate !== null) {
        agg.stats.survivalDay1Rate = player.survivalDay1Rate;
      }
      
      // Kill rate - get from killerStats
      const killerData = deathStats.killerStats?.find(k => k.killerId === playerId);
      const kills = killerData?.kills || 0;
      agg.stats.killRate = kills / Math.max(gamesPlayed, 1);
    });
  }

  // Process series data
  if (seriesData) {
    // Process win series
    if (seriesData.allWinSeries) {
      seriesData.allWinSeries.forEach(series => {
        const playerId = series.player;
        if (!aggregatedStats.has(playerId)) return;
        const agg = aggregatedStats.get(playerId);
        
        agg.stats.longestWinSeries = series.seriesLength || 0;
      });
    }
    
    // Process loss series
    if (seriesData.allLossSeries) {
      seriesData.allLossSeries.forEach(series => {
        const playerId = series.player;
        if (!aggregatedStats.has(playerId)) return;
        const agg = aggregatedStats.get(playerId);
        
        agg.stats.longestLossSeries = series.seriesLength || 0;
      });
    }
  }

  // Process loot stats if available
  if (lootStats?.playerStats) {
    lootStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Overall loot stat (no minimum games requirement)
      agg.stats.lootPer60Min = (player.lootPer60Min !== undefined && player.lootPer60Min !== null) 
        ? player.lootPer60Min : null;
      
      // Camp-specific loot stats with minimum games requirement (same as win rates)
      agg.stats.lootVillageoisPer60Min = (player.villageoisGames > 5 && player.lootVillageoisPer60Min !== undefined && player.lootVillageoisPer60Min !== null) 
        ? player.lootVillageoisPer60Min : null;
      agg.stats.lootLoupPer60Min = (player.loupGames > 5 && player.lootLoupPer60Min !== undefined && player.lootLoupPer60Min !== null) 
        ? player.lootLoupPer60Min : null;
      agg.stats.lootSoloPer60Min = (player.soloGames > 3 && player.lootSoloPer60Min !== undefined && player.lootSoloPer60Min !== null) 
        ? player.lootSoloPer60Min : null;
    });
  }

  // Process zone stats (Village map position analysis)
  if (zoneStats?.playerStats) {
    zoneStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);

      // Only set zone stats if player has enough position data points (at least 10)
      if (player.totalPositions >= 10) {
        agg.stats.zoneVillagePrincipal = player.zonePercentages['Village Principal'] ?? null;
        agg.stats.zoneFerme = player.zonePercentages['Ferme'] ?? null;
        agg.stats.zoneVillagePecheur = player.zonePercentages['Village P\u00eacheur'] ?? null;
        agg.stats.zoneRuines = player.zonePercentages['Ruines'] ?? null;
        agg.stats.zoneResteCarte = player.zonePercentages['Reste de la Carte'] ?? null;
        agg.stats.zoneDominantPercentage = player.dominantZonePercentage ?? null;
        agg.stats.zoneTotalPositions = player.totalPositions;
      }
    });
  }

  // Process wolf transform stats
  if (wolfTransformStats?.playerStats) {
    wolfTransformStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);

      // Only set wolf transform stats if player has enough games with transform data (at least 5)
      if (player.gamesWithTransformData >= 5 && player.totalNightsAsWolf >= 5) {
        agg.stats.wolfTransformRate = player.transformsPerNight ?? null;
        agg.stats.wolfUntransformRate = player.untransformsPerNight ?? null;
      }
    });
  }

  // Process potion usage stats
  if (potionStats?.playerStats) {
    potionStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);

      // Only set potion stats if player has enough games with potion data (at least 5)
      if (player.gamesWithPotionData >= 5) {
        agg.stats.potionsPer60Min = player.potionsPer60Min ?? null;
      }
    });
  }

  // Process camp-specific kill rates from death stats
  if (deathStats?.campKillRates) {
    deathStats.campKillRates.forEach(campData => {
      const playerId = campData.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      agg.stats.killRateVillageois = campData.killRateVillageois;
      agg.stats.killRateLoup = campData.killRateLoup;
      agg.stats.killRateSolo = campData.killRateSolo;
    });
  }

  return aggregatedStats;
}

/**
 * Compute role assignment frequencies from game data
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Map} - Role frequencies by player
 */
function computeRoleFrequencies(moddedGames) {
  const roleFrequencies = new Map();

  moddedGames.forEach(game => {
    if (!game.PlayerStats) return;
    
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      
      if (!roleFrequencies.has(playerId)) {
        roleFrequencies.set(playerId, {
          gamesPlayed: 0,
          roles: {}
        });
      }
      
      const freq = roleFrequencies.get(playerId);
      freq.gamesPlayed++;
      
      let role = player.MainRoleInitial;
      const power = player.Power;
      
      // Normalize Amoureux role variants (Amoureux Loup, Amoureux Villageois) to just "Amoureux"
      // This matches the game's victory logic where all lovers are treated as the same role
      if (role === 'Amoureux Loup' || role === 'Amoureux Villageois') {
        role = 'Amoureux';
      }
      
      // Track specific roles
      const effectiveRole = power || role;
      freq.roles[effectiveRole] = (freq.roles[effectiveRole] || 0) + 1;
    });
  });

  return roleFrequencies;
}

// ============================================================================
// TITLE GENERATION
// ============================================================================

/**
 * Assign unique primary titles to players
 * Each title is ideally given to only one player - the one with the strongest claim
 * @param {Object} playerTitles - Player titles object (modified in place)
 */
function assignUniquePrimaryTitles(playerTitles) {
  const usedTitles = new Set();
  const playerIds = Object.keys(playerTitles);
  
  // Map to track which player owns each title as primary
  const titleOwners = new Map();
  
  // Create a list of all title claims with their strength
  const titleClaims = [];
  
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    
    player.titles.forEach((title, titleIndex) => {
      // Calculate claim strength based on:
      // 1. Priority (higher is better)
      // 2. Percentile (adjusted for "bad" vs "good" rankings)
      //    - For bad rankings (LOW, EXTREME_LOW, BELOW_AVERAGE): lower percentile = stronger claim
      //    - For good rankings (HIGH, EXTREME_HIGH, ABOVE_AVERAGE): higher percentile = stronger claim
      // 3. Title position (earlier in list is better)
      
      let adjustedPercentile = title.percentile || 50;
      
      // Invert percentile for "bad ranking" categories where lower is better
      const isBadRanking = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(title.category);
      if (isBadRanking) {
        adjustedPercentile = 100 - adjustedPercentile;
      }
      
      const claimStrength = 
        (title.priority || 0) * 1000 + 
        adjustedPercentile * 10 - 
        titleIndex;
      
      titleClaims.push({
        playerId,
        playerName: player.playerName,
        title,
        titleIndex,
        claimStrength
      });
    });
  });
  
  // Sort claims by strength (highest first)
  titleClaims.sort((a, b) => b.claimStrength - a.claimStrength);
  
  // First pass: assign unique titles
  titleClaims.forEach(claim => {
    const player = playerTitles[claim.playerId];
    
    // Skip if player already has a primary title
    if (player.primaryTitle) return;
    
    // Skip if this title is already used
    if (usedTitles.has(claim.title.id)) return;
    
    // Assign this title to the player
    player.primaryTitle = claim.title;
    usedTitles.add(claim.title.id);
    titleOwners.set(claim.title.id, player.playerName);
  });
  
  // Second pass: assign any remaining players their best available title (even if used)
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    
    if (!player.primaryTitle && player.titles.length > 0) {
      // Give them their highest priority title, even if already used
      player.primaryTitle = player.titles[0];
    }
  });
  
  // Third pass: add primaryOwner info to titles that belong to other players
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    
    player.titles.forEach(title => {
      const owner = titleOwners.get(title.id);
      if (owner && owner !== player.playerName) {
        title.primaryOwner = owner;
      }
    });
  });
  
  // Log uniqueness stats
  const uniqueTitles = usedTitles.size;
  const totalPlayers = playerIds.length;
  console.log(`  ✓ Primary title uniqueness: ${uniqueTitles}/${totalPlayers} unique (${Math.round(uniqueTitles/totalPlayers*100)}%)`);
}

/**
 * Filter combination titles to keep only the top player(s) for each title
 * Awards combination titles only to players with the highest average percentile
 * @param {Object} playerTitles - Player titles object (modified in place)
 */
function filterCombinationTitlesToTopPlayers(playerTitles) {
  const playerIds = Object.keys(playerTitles);
  
  // Group players by combination title ID with their average percentiles
  const titleCandidates = {};
  
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    
    player.titles.forEach(title => {
      if (title.type === 'combination') {
        if (!titleCandidates[title.id]) {
          titleCandidates[title.id] = [];
        }
        
        titleCandidates[title.id].push({
          playerId,
          playerName: player.playerName,
          title,
          averagePercentile: title.percentile || 0
        });
      }
    });
  });
  
  // For each combination title, find the max average percentile
  Object.keys(titleCandidates).forEach(titleId => {
    const candidates = titleCandidates[titleId];
    
    if (candidates.length === 0) return;
    
    // Find the maximum average percentile
    const maxPercentile = Math.max(...candidates.map(c => c.averagePercentile));
    
    // Allow a small tolerance (0.1%) for ties
    const tolerance = 0.1;
    const topPlayerIds = new Set(
      candidates
        .filter(c => Math.abs(c.averagePercentile - maxPercentile) <= tolerance)
        .map(c => c.playerId)
    );
    
    // Remove this title from players who don't have the top score
    playerIds.forEach(playerId => {
      if (!topPlayerIds.has(playerId)) {
        const player = playerTitles[playerId];
        player.titles = player.titles.filter(t => 
          t.type !== 'combination' || t.id !== titleId
        );
      }
    });
    
    console.log(`  ✓ Combination title "${titleId}": awarded to ${topPlayerIds.size} player(s) with avg percentile ${maxPercentile.toFixed(1)}%`);
  });
}

/**
 * Generate titles for all eligible players
 * @param {Map} aggregatedStats - Aggregated statistics by player
 * @param {Map} roleFrequencies - Role frequencies by player
 * @returns {Object} - Generated titles by player
 */
function generatePlayerTitles(aggregatedStats, roleFrequencies) {
  console.log('  Generating player titles...');

  // Filter eligible players (min games requirement)
  const eligiblePlayers = Array.from(aggregatedStats.entries())
    .filter(([_, data]) => data.gamesPlayed >= MIN_GAMES_FOR_TITLES);

  console.log(`  ${eligiblePlayers.length} players eligible for titles (${MIN_GAMES_FOR_TITLES}+ games)`);

  // Build distributions for percentile calculations
  const distributions = buildDistributions(eligiblePlayers);
  
  // Calculate percentiles for each player
  const playerPercentiles = new Map();
  eligiblePlayers.forEach(([playerId, data]) => {
    const percentiles = {};
    
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && distributions[statName]) {
        percentiles[statName] = {
          value,
          percentile: calculatePercentile(value, distributions[statName]),
          category: getPercentileCategory(calculatePercentile(value, distributions[statName]))
        };
      }
    });
    
    playerPercentiles.set(playerId, {
      ...data,
      percentiles
    });
  });

  // Generate titles for each player
  const playerTitles = {};
  
  playerPercentiles.forEach((data, playerId) => {
    const titles = [];
    
    // Generate basic stat-based titles
    const basicTitles = generateBasicTitles(data.percentiles);
    titles.push(...basicTitles);
    
    // Generate camp balance titles
    const campBalanceTitles = generateCampBalanceTitles(data.percentiles);
    titles.push(...campBalanceTitles);
    
    // Generate combination titles
    const comboTitles = generateCombinationTitles(data.percentiles);
    titles.push(...comboTitles);
    
    // Generate camp assignment titles
    const campAssignmentTitles = generateCampAssignmentTitles(data.stats);
    titles.push(...campAssignmentTitles);
    
    // Generate role-based titles
    const roleData = roleFrequencies.get(playerId);
    if (roleData && roleData.gamesPlayed >= MIN_GAMES_FOR_ROLE_TITLES) {
      const roleTitles = generateRoleTitles(roleData, eligiblePlayers.length);
      titles.push(...roleTitles);
    }
    
    // Sort by priority and deduplicate
    const sortedTitles = titles
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .filter((title, index, self) => 
        index === self.findIndex(t => t.id === title.id)
      );
    
    playerTitles[playerId] = {
      playerId,
      playerName: data.playerName,
      gamesPlayed: data.gamesPlayed,
      titles: sortedTitles,
      primaryTitle: null, // Will be assigned in unique allocation phase
      percentiles: data.percentiles,
      stats: data.stats
    };
  });

  // Note: We keep all qualifying titles in the titles array (including combinations)
  // The uniqueness logic only applies to primary title assignment
  // This allows players to see all their earned titles as secondary rankings

  // Assign unique primary titles
  assignUniquePrimaryTitles(playerTitles);

  return playerTitles;
}

/**
 * Build statistical distributions for percentile calculations
 * @param {Array} eligiblePlayers - Array of [playerId, data] entries
 * @returns {Object} - Distributions by stat name
 */
function buildDistributions(eligiblePlayers) {
  const distributions = {};
  
  eligiblePlayers.forEach(([_, data]) => {
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && !isNaN(value)) {
        if (!distributions[statName]) {
          distributions[statName] = [];
        }
        distributions[statName].push(value);
      }
    });
  });
  
  return distributions;
}

/**
 * Generate basic stat-based titles
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of title objects
 */
function generateBasicTitles(percentiles) {
  const titles = [];

  // Map stat names to title definitions
  const statToTitleMap = {
    talkingPer60Min: 'talking',
    talkingOutsidePer60Min: 'talkingOutsideMeeting',
    talkingDuringPer60Min: 'talkingDuringMeeting',
    killRate: 'killRate',
    survivalRate: 'survival',
    survivalDay1Rate: 'survivalDay1',
    lootPer60Min: 'loot',
    lootVillageoisPer60Min: 'lootVillageois',
    lootLoupPer60Min: 'lootLoup',
    votingAggressiveness: 'votingAggressive',
    votingFirst: 'votingFirst',
    votingAccuracy: 'votingAccuracy',
    hunterAccuracy: 'hunterAccuracy',
    hunterShotAccuracy: 'hunterShotAccuracy',
    winRate: 'winRate',
    winRateVillageois: 'winRateVillageois',
    winRateLoup: 'winRateLoup',
    winRateSolo: 'winRateSolo',
    longestWinSeries: 'winSeries',
    longestLossSeries: 'lossSeries',
    gamesPlayed: 'participation',
    zoneVillagePrincipal: 'zoneVillagePrincipal',
    zoneFerme: 'zoneFerme',
    zoneVillagePecheur: 'zoneVillagePecheur',
    zoneRuines: 'zoneRuines',
    zoneResteCarte: 'zoneResteCarte',
    zoneDominantPercentage: 'zoneDominantPercentage',
    wolfTransformRate: 'wolfTransformRate',
    wolfUntransformRate: 'wolfUntransformRate',
    potionsPer60Min: 'potionUsage'
  };

  Object.entries(percentiles).forEach(([statName, data]) => {
    const titleKey = statToTitleMap[statName];
    if (!titleKey || !TITLE_DEFINITIONS[titleKey]) return;
    
    const titleDef = TITLE_DEFINITIONS[titleKey];
    let selectedTitle = null;
    let priority = 5;

    switch (data.category) {
      case 'EXTREME_HIGH':
        selectedTitle = titleDef.extremeHigh || titleDef.high;
        priority = 8;
        break;
      case 'HIGH':
        selectedTitle = titleDef.high;
        priority = 6;
        break;
      case 'ABOVE_AVERAGE':
        selectedTitle = titleDef.aboveAverage || titleDef.average;
        priority = 4;
        break;
      case 'AVERAGE':
        selectedTitle = titleDef.average;
        priority = 3;
        break;
      case 'BELOW_AVERAGE':
        selectedTitle = titleDef.belowAverage || titleDef.average;
        priority = 4;
        break;
      case 'EXTREME_LOW':
        selectedTitle = titleDef.extremeLow || titleDef.low;
        priority = 8;
        break;
      case 'LOW':
        selectedTitle = titleDef.low;
        priority = 6;
        break;
    }

    if (selectedTitle) {
      titles.push({
        id: `${titleKey}_${data.category.toLowerCase()}`,
        ...selectedTitle,
        stat: statName,
        value: data.value,
        percentile: data.percentile,
        category: data.category,
        priority,
        type: 'basic'
      });
    }
  });

  return titles;
}

/**
 * Check if player has balanced camp performance
 * @param {Object} percentiles - Player's percentile data
 * @param {string} type - Type of balance check ('BALANCED' or 'SPECIALIST')
 * @returns {boolean} - Whether condition is met
 */
function checkCampBalance(percentiles, type) {
  const villWinRate = percentiles.winRateVillageois?.value;
  const loupWinRate = percentiles.winRateLoup?.value;
  const soloWinRate = percentiles.winRateSolo?.value;
  
  // Expected win rates for each camp (baseline difficulty)
  const EXPECTED_RATES = {
    villageois: 52,
    loup: 28,
    solo: 20
  };
  
  // Calculate normalized performance (difference from expected rate)
  const normalizedRates = [];
  if (villWinRate !== null && villWinRate !== undefined) {
    normalizedRates.push(villWinRate - EXPECTED_RATES.villageois);
  }
  if (loupWinRate !== null && loupWinRate !== undefined) {
    normalizedRates.push(loupWinRate - EXPECTED_RATES.loup);
  }
  if (soloWinRate !== null && soloWinRate !== undefined) {
    normalizedRates.push(soloWinRate - EXPECTED_RATES.solo);
  }
  
  // Need at least 2 camp win rates to determine balance
  if (normalizedRates.length < 2) return false;
  
  const max = Math.max(...normalizedRates);
  const min = Math.min(...normalizedRates);
  const diff = max - min;
  
  if (type === 'BALANCED') {
    // Balanced: low variance in normalized performance (within 10% difference)
    return diff <= 10;
  }
  
  if (type === 'SPECIALIST') {
    // Specialist: high variance in normalized performance (>15% difference)
    return diff > 15;
  }
  
  return false;
}

/**
 * Generate camp balance titles
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of camp balance title objects
 */
function generateCampBalanceTitles(percentiles) {
  const titles = [];
  
  // Check if player has balanced camp performance
  if (checkCampBalance(percentiles, 'BALANCED')) {
    const titleDef = TITLE_DEFINITIONS.campBalance.balanced;
    titles.push({
      id: 'campBalance_balanced',
      ...titleDef,
      stat: 'campBalance',
      category: 'BALANCED',
      priority: 6,
      type: 'campBalance'
    });
  }
  
  // Check if player is a specialist
  if (checkCampBalance(percentiles, 'SPECIALIST')) {
    const titleDef = TITLE_DEFINITIONS.campBalance.specialist;
    titles.push({
      id: 'campBalance_specialist',
      ...titleDef,
      stat: 'campBalance',
      category: 'SPECIALIST',
      priority: 6,
      type: 'campBalance'
    });
  }
  
  return titles;
}

/**
 * Generate combination titles based on multiple stats
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of combination title objects
 */
function generateCombinationTitles(percentiles) {
  const titles = [];

  // Map stat names used in conditions to percentile keys
  const conditionStatMap = {
    talking: 'talkingPer60Min',
    talkingOutsideMeeting: 'talkingOutsidePer60Min',
    talkingDuringMeeting: 'talkingDuringPer60Min',
    loot: 'lootPer60Min',
    lootVillageois: 'lootVillageoisPer60Min',
    lootLoup: 'lootLoupPer60Min',
    killRate: 'killRate',
    killRateVillageois: 'killRateVillageois',
    killRateLoup: 'killRateLoup',
    killRateSolo: 'killRateSolo',
    survival: 'survivalRate',
    survivalDay1: 'survivalDay1Rate',
    votingAggressive: 'votingAggressiveness',
    votingFirst: 'votingFirst',
    votingAccuracy: 'votingAccuracy',
    hunterAccuracy: 'hunterAccuracy',
    hunterShotAccuracy: 'hunterShotAccuracy',
    winRate: 'winRate',
    winRateVillageois: 'winRateVillageois',
    winRateLoup: 'winRateLoup',
    winRateSolo: 'winRateSolo',
    winSeries: 'longestWinSeries',
    lossSeries: 'longestLossSeries',
    gamesPlayed: 'gamesPlayed',
    roleAmoureux: 'roleAmoureux',
    roleChasseur: 'roleChasseur',
    campBalance: 'campBalance', // Synthetic stat
    zoneVillagePrincipal: 'zoneVillagePrincipal',
    zoneFerme: 'zoneFerme',
    zoneVillagePecheur: 'zoneVillagePecheur',
    zoneRuines: 'zoneRuines',
    zoneResteCarte: 'zoneResteCarte',
    zoneDominantPercentage: 'zoneDominantPercentage',
    wolfTransformRate: 'wolfTransformRate',
    wolfUntransformRate: 'wolfUntransformRate',
    potionUsage: 'potionsPer60Min'
  };

  COMBINATION_TITLES.forEach(combo => {    
    // Check if all conditions are met
    const conditionsMet = combo.conditions.every(condition => {
      const statKey = conditionStatMap[condition.stat] || condition.stat;
      const playerData = percentiles[statKey];
      
      if (!playerData) {
        // Special handling for synthetic stats
        if (condition.stat === 'campBalance') {
          return checkCampBalance(percentiles, condition.category);
        }
        if (condition.stat === 'gamesPlayed' && condition.minValue) {
          return percentiles.gamesPlayed?.value >= condition.minValue;
        }
        return false;
      }
      
      // Check minimum value if specified
      if (condition.minValue && playerData.value < condition.minValue) {
        return false;
      }
      
      // Check if category matches with optional minCategory fallback
      const minCategory = condition.minCategory;
      
      if (condition.category === 'HIGH') {
        const acceptableCategories = ['HIGH', 'EXTREME_HIGH'];
        if (minCategory) acceptableCategories.push('ABOVE_AVERAGE');
        return acceptableCategories.includes(playerData.category);
      }
      if (condition.category === 'LOW') {
        const acceptableCategories = ['LOW', 'EXTREME_LOW'];
        if (minCategory) acceptableCategories.push('BELOW_AVERAGE');
        return acceptableCategories.includes(playerData.category);
      }
      if (condition.category === 'AVERAGE') {
        return playerData.category === 'AVERAGE';
      }
      if (condition.category === 'EXTREME_HIGH') {
        return playerData.category === 'EXTREME_HIGH';
      }
      if (condition.category === 'EXTREME_LOW') {
        return playerData.category === 'EXTREME_LOW';
      }
      if (condition.category === 'BALANCED') {
        return checkCampBalance(percentiles, 'BALANCED');
      }
      
      return playerData.category === condition.category;
    });

    if (conditionsMet) {
      // Calculate average percentile across all conditions for ranking
      const conditionsData = combo.conditions.map(c => ({
        stat: c.stat,
        category: c.category,
        actualValue: percentiles[conditionStatMap[c.stat] || c.stat]?.value,
        actualPercentile: percentiles[conditionStatMap[c.stat] || c.stat]?.percentile || 0
      }));
      
      const validPercentiles = conditionsData
        .map(c => c.actualPercentile)
        .filter(p => p !== null && p !== undefined && p > 0);
      
      const averagePercentile = validPercentiles.length > 0
        ? validPercentiles.reduce((sum, p) => sum + p, 0) / validPercentiles.length
        : 0;
      
      titles.push({
        id: combo.id,
        title: combo.title,
        emoji: combo.emoji,
        description: combo.description,
        priority: combo.priority,
        type: 'combination',
        percentile: averagePercentile, // Add average percentile for ranking
        conditions: conditionsData
      });
    }
  });

  return titles;
}

/**
 * Generate camp assignment titles (uncontrollable - based on luck of role assignment)
 * @param {Object} stats - Player's stats object with camp percentages
 * @returns {Array} - Array of camp assignment title objects
 */
function generateCampAssignmentTitles(stats) {
  const titles = [];
  
  // Threshold for "Serial" titles - player plays this camp significantly more than expected
  // Expected: ~60% Villageois, ~30% Loup, ~10% Solo (approximate game balance)
  // Award title if 15+ percentage points above expected
  const VILLAGEOIS_THRESHOLD = 75; // Expected ~60%, so 75%+ is notable
  const LOUP_THRESHOLD = 45;       // Expected ~30%, so 45%+ is notable  
  const SOLO_THRESHOLD = 20;       // Expected ~10%, so 20%+ is notable
  
  if (stats.campVillageoisPercent !== undefined && stats.campVillageoisPercent >= VILLAGEOIS_THRESHOLD) {
    const titleDef = TITLE_DEFINITIONS.campAssignment.villageois;
    titles.push({
      id: 'campAssignment_villageois',
      ...titleDef,
      stat: 'campVillageoisPercent',
      value: stats.campVillageoisPercent,
      priority: 3,
      type: 'campAssignment'
    });
  }
  
  if (stats.campLoupPercent !== undefined && stats.campLoupPercent >= LOUP_THRESHOLD) {
    const titleDef = TITLE_DEFINITIONS.campAssignment.loup;
    titles.push({
      id: 'campAssignment_loup',
      ...titleDef,
      stat: 'campLoupPercent',
      value: stats.campLoupPercent,
      priority: 3,
      type: 'campAssignment'
    });
  }
  
  if (stats.campSoloPercent !== undefined && stats.campSoloPercent >= SOLO_THRESHOLD) {
    const titleDef = TITLE_DEFINITIONS.campAssignment.solo;
    titles.push({
      id: 'campAssignment_solo',
      ...titleDef,
      stat: 'campSoloPercent',
      value: stats.campSoloPercent,
      priority: 3,
      type: 'campAssignment'
    });
  }
  
  return titles;
}

/**
 * Generate role-based titles (uncontrollable stats)
 * @param {Object} roleData - Player's role frequency data
 * @param {number} totalPlayers - Total number of eligible players
 * @returns {Array} - Array of role title objects
 */
function generateRoleTitles(roleData, totalPlayers) {
  const titles = [];
  const gamesPlayed = roleData.gamesPlayed;
  
  // Role to title mapping
  const roleToTitle = {
    'Chasseur': 'chasseur',
    'Alchimiste': 'alchimiste',
    'Amoureux': 'amoureux',
    'Agent': 'agent',
    'Espion': 'espion',
    'Idiot du Village': 'idiot',
    'Chasseur de Prime': 'chasseurDePrime',
    'Contrebandier': 'contrebandier',
    'La Bête': 'bete',
    'Vaudou': 'vaudou',
    'Scientifique': 'scientifique'
  };

  Object.entries(roleData.roles).forEach(([role, count]) => {
    const percentage = (count / gamesPlayed) * 100;
    const titleKey = roleToTitle[role];
    
    if (titleKey && TITLE_DEFINITIONS.roleAssignment[titleKey]) {
      // Only give role title if player has high percentage of that role
      // Using 12% as threshold (lowered from 15% to award more titles)
      if (percentage >= 12 && count >= 5) {
        const titleDef = TITLE_DEFINITIONS.roleAssignment[titleKey];
        titles.push({
          id: `role_${titleKey}`,
          ...titleDef,
          roleCount: count,
          rolePercentage: percentage,
          priority: 3,
          type: 'role'
        });
      }
    }
  });

  return titles;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function to generate player titles
 * @param {string} teamKey - Team key from DATA_SOURCES ('main' or 'discord')
 */
async function generateTitles(teamKey = 'main') {
  const dataSource = DATA_SOURCES[teamKey];
  if (!dataSource) {
    console.error(`❌ Unknown team key: ${teamKey}`);
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), dataSource.outputDir);
  const gameLogPath = path.join(outputDir, 'gameLog.json');
  const titlesOutputPath = path.join(outputDir, 'playerTitles.json');

  console.log(`🏷️  Generating player titles for ${dataSource.name}...`);
  console.log(`📁 Output directory: ${outputDir}`);

  try {
    // Load game log
    const gameLogContent = await fs.readFile(gameLogPath, 'utf8');
    const gameLogData = JSON.parse(gameLogContent);

    // Filter modded games only
    const allGames = gameLogData.GameStats || [];
    const moddedGames = allGames.filter(game => game.Modded === true && game.EndDate);

    console.log(`📊 Total games: ${allGames.length}, Modded games: ${moddedGames.length}`);

    if (moddedGames.length === 0) {
      console.log('⚠️  No modded games found, skipping title generation');
      return;
    }

    // Compute statistics
    const aggregatedStats = computeAllStatistics(moddedGames);
    const roleFrequencies = computeRoleFrequencies(moddedGames);

    // Generate titles
    const playerTitles = generatePlayerTitles(aggregatedStats, roleFrequencies);

    // Prepare output
    const output = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      teamName: dataSource.name,
      totalPlayers: Object.keys(playerTitles).length,
      minGamesRequired: MIN_GAMES_FOR_TITLES,
      moddedGamesAnalyzed: moddedGames.length,
      percentileThresholds: PERCENTILE_THRESHOLDS,
      players: playerTitles
    };

    // Save titles
    await fs.writeFile(titlesOutputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`✅ Generated titles for ${Object.keys(playerTitles).length} players`);
    console.log(`📁 Saved to: ${titlesOutputPath}`);

    // Print summary
    const totalTitles = Object.values(playerTitles).reduce(
      (sum, p) => sum + (p.titles?.length || 0), 0
    );
    console.log(`📊 Total titles assigned: ${totalTitles}`);

    // Show top players by title count
    const topByTitles = Object.entries(playerTitles)
      .sort((a, b) => (b[1].titles?.length || 0) - (a[1].titles?.length || 0))
      .slice(0, 5);
    
    console.log('\n🏅 Top players by title count:');
    topByTitles.forEach(([_, data], i) => {
      console.log(`   ${i + 1}. ${data.playerName}: ${data.titles?.length || 0} titles`);
      if (data.primaryTitle) {
        console.log(`      Primary: ${data.primaryTitle.emoji} ${data.primaryTitle.title}`);
      }
    });

  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const teamKey = args[0] || 'main';

generateTitles(teamKey);

export { generateTitles, TITLE_DEFINITIONS, COMBINATION_TITLES, PERCENTILE_THRESHOLDS };
