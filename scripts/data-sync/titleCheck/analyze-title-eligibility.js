/**
 * Title Eligibility Analysis Tool
 * 
 * Analyzes which players are closest to earning each title,
 * especially hard-to-achieve combination titles.
 * 
 * Usage:
 *   node analyze-title-eligibility.js [main|discord] [options]
 * 
 * Options:
 *   --priority <num>     Only show titles with priority >= <num>
 *   --title <id>         Analyze specific title(s) by ID (comma-separated)
 *   --json               Output JSON format instead of formatted text
 *   --top <num>          Number of top candidates to show per title (default: 5)
 *   --include-awarded    Include titles that are already awarded
 */

import fs from 'fs/promises';
import path from 'path';

// Import compute functions
import { computePlayerStats } from '../compute/compute-player-stats.js';
import { computePlayerSeriesData } from '../compute/compute-series-data.js';
import { computeVotingStatistics } from '../compute/compute-voting-stats.js';
import { computeHunterStatistics } from '../compute/compute-hunter-stats.js';
import { computeTalkingTimeStats } from '../compute/compute-talking-stats.js';
import { computeDeathStatistics } from '../compute/compute-death-stats.js';
import { computeLootStatistics } from '../compute/compute-loot-stats.js';
import { computeZoneStatistics } from '../compute/compute-zone-stats.js';

// Import data source configuration
import { DATA_SOURCES } from '../shared/data-sources.js';

// Import title definitions
import { TITLE_DEFINITIONS, COMBINATION_TITLES } from '../titleDefinitions.js';

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

// ============================================================================
// PERCENTILE UTILITIES (from generate-titles.js)
// ============================================================================

/**
 * Calculate percentile for a value in a distribution
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

/**
 * Check if player has balanced camp performance
 */
function checkCampBalance(percentiles, type) {
  const villWinRate = percentiles.winRateVillageois?.value;
  const loupWinRate = percentiles.winRateLoup?.value;
  const soloWinRate = percentiles.winRateSolo?.value;
  
  const EXPECTED_RATES = {
    villageois: 52,
    loup: 28,
    solo: 20
  };
  
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
  
  if (normalizedRates.length < 2) return false;
  
  const max = Math.max(...normalizedRates);
  const min = Math.min(...normalizedRates);
  const diff = max - min;
  
  if (type === 'BALANCED') {
    return diff <= 10;
  }
  
  if (type === 'SPECIALIST') {
    return diff > 15;
  }
  
  return false;
}

// ============================================================================
// CONDITION EVALUATION LOGIC
// ============================================================================

/**
 * Evaluate a single condition for a player
 * @returns {Object} Evaluation result with met status, values, and gap info
 */
function evaluateCondition(playerPercentiles, roleData, condition) {
  let stat = condition.stat;
  const requiredCategory = condition.category;
  const minCategory = condition.minCategory;
  
  // Map condition stat names to actual percentile keys
  const statNameMap = {
    'talking': 'talkingPer60Min',
    'talkingOutsideMeeting': 'talkingOutsidePer60Min',
    'talkingDuringMeeting': 'talkingDuringPer60Min',
    'loot': 'lootPer60Min',
    'lootVillageois': 'lootVillageoisPer60Min',
    'lootLoup': 'lootLoupPer60Min',
    'survival': 'survivalRate',
    'survivalDay1': 'survivalDay1Rate',
    'votingAggressive': 'votingAggressiveness',
    'winSeries': 'longestWinSeries',
    'lossSeries': 'longestLossSeries'
  };
  
  // Apply mapping if exists
  if (statNameMap[stat]) {
    stat = statNameMap[stat];
  }
  
  // Handle minValue conditions (e.g., gamesPlayed >= 100)
  if (condition.minValue !== undefined) {
    const playerData = playerPercentiles[stat];
    const currentValue = playerData ? playerData.value : 0;
    const met = currentValue >= condition.minValue;
    
    return {
      met,
      currentValue,
      currentPercentile: playerData ? playerData.percentile : null,
      currentCategory: playerData ? playerData.category : null,
      requiredCategory: `≥${condition.minValue}`,
      gap: met ? 0 : (condition.minValue - currentValue),
      reason: null
    };
  }
  
  // Handle role-based conditions
  if (stat.startsWith('role')) {
    if (!roleData) {
      return {
        met: false,
        currentValue: 0,
        currentPercentile: null,
        requiredCategory,
        gap: 'No role data',
        reason: 'Player has no role frequency data'
      };
    }
    
    const roleName = getRoleNameFromStat(stat);
    const roleCount = roleData.roles[roleName] || 0;
    const rolePercentage = (roleCount / roleData.gamesPlayed) * 100;
    const hasMinGames = roleCount >= MIN_GAMES_FOR_ROLE_TITLES;
    
    // For HIGH role requirement, need 12%+ games AND min 5 occurrences
    const roleMet = (requiredCategory === 'HIGH' && rolePercentage >= 12 && roleCount >= 5);
    
    return {
      met: roleMet,
      currentValue: rolePercentage,
      currentCount: roleCount,
      currentPercentile: null, // Role assignment is not percentile-based
      requiredCategory,
      gap: roleMet ? 0 : (12 - rolePercentage),
      reason: !hasMinGames ? `Only ${roleCount} games as ${roleName} (need ${MIN_GAMES_FOR_ROLE_TITLES})` : null
    };
  }
  
  // Handle synthetic campBalance stat
  if (stat === 'campBalance') {
    const isBalanced = checkCampBalance(playerPercentiles, 'BALANCED');
    const isSpecialist = checkCampBalance(playerPercentiles, 'SPECIALIST');
    const met = (requiredCategory === 'BALANCED' && isBalanced) || 
                (requiredCategory === 'SPECIALIST' && isSpecialist);
    
    return {
      met,
      currentValue: met ? 'Yes' : 'No',
      currentPercentile: null,
      requiredCategory,
      gap: met ? 0 : 'Camp performance variance not in required range',
      reason: !met ? `Need ${requiredCategory.toLowerCase()} camp performance` : null
    };
  }
  
  // Handle regular percentile-based stats
  const playerData = playerPercentiles[stat];
  
  if (!playerData || playerData.value === null || playerData.value === undefined) {
    return {
      met: false,
      currentValue: null,
      currentPercentile: null,
      requiredCategory,
      gap: 'Stat not available',
      reason: getStatUnavailableReason(stat)
    };
  }
  
  const currentCategory = playerData.category;
  const currentPercentile = playerData.percentile;
  const currentValue = playerData.value;
  
  // Check if condition is met based on category matching
  const categoryMet = checkCategoryMatch(currentCategory, requiredCategory, minCategory);
  
  // Calculate gap (percentile points away from threshold)
  let gap = 0;
  if (!categoryMet) {
    const thresholdPercentile = getThresholdForCategory(requiredCategory, minCategory);
    gap = thresholdPercentile - currentPercentile;
  }
  
  return {
    met: categoryMet,
    currentValue,
    currentPercentile,
    currentCategory,
    requiredCategory,
    gap,
    reason: null
  };
}

/**
 * Check if a stat category matches the required condition
 */
function checkCategoryMatch(currentCategory, requiredCategory, minCategory) {
  // Exact match for AVERAGE
  if (requiredCategory === 'AVERAGE') {
    return currentCategory === 'AVERAGE';
  }
  
  // EXTREME categories require exact match
  if (requiredCategory === 'EXTREME_HIGH') {
    return currentCategory === 'EXTREME_HIGH';
  }
  if (requiredCategory === 'EXTREME_LOW') {
    return currentCategory === 'EXTREME_LOW';
  }
  
  // HIGH category accepts HIGH or EXTREME_HIGH (and ABOVE_AVERAGE if minCategory)
  if (requiredCategory === 'HIGH') {
    if (currentCategory === 'HIGH' || currentCategory === 'EXTREME_HIGH') {
      return true;
    }
    if (minCategory && currentCategory === 'ABOVE_AVERAGE') {
      return true;
    }
    return false;
  }
  
  // LOW category accepts LOW or EXTREME_LOW (and BELOW_AVERAGE if minCategory)
  if (requiredCategory === 'LOW') {
    if (currentCategory === 'LOW' || currentCategory === 'EXTREME_LOW') {
      return true;
    }
    if (minCategory && currentCategory === 'BELOW_AVERAGE') {
      return true;
    }
    return false;
  }
  
  // Direct category match
  return currentCategory === requiredCategory;
}

/**
 * Get percentile threshold for a required category
 */
function getThresholdForCategory(requiredCategory, minCategory) {
  if (minCategory && (requiredCategory === 'HIGH' || requiredCategory === 'LOW')) {
    return PERCENTILE_THRESHOLDS.ABOVE_AVERAGE; // More lenient with minCategory
  }
  return PERCENTILE_THRESHOLDS[requiredCategory] || 50;
}

/**
 * Get reason why a stat might be unavailable
 */
function getStatUnavailableReason(stat) {
  const reasons = {
    hunterAccuracy: 'Requires 10+ games as Chasseur',
    hunterShotAccuracy: 'Requires 10+ shots taken as Chasseur',
    votingAccuracy: 'Requires 10+ votes cast',
    votingFirst: 'Requires 5+ meetings with votes',
    lootPer60Min: 'Loot data not available in game logs',
    lootVillageoisPer60Min: 'Not enough games as Villageois with loot data',
    lootLoupPer60Min: 'Not enough games as Loup with loot data',
    winRateVillageois: 'Requires 5+ games as Villageois',
    winRateLoup: 'Requires 5+ games as Loup',
    winRateSolo: 'Requires 3+ games in Solo roles',
    zoneVillagePrincipal: 'Requires 10+ data points on Village map',
    zoneFerme: 'Requires 10+ data points on Village map',
    zoneVillagePecheur: 'Requires 10+ data points on Village map',
    zoneRuines: 'Requires 10+ data points on Village map',
    zoneResteCarte: 'Requires 10+ data points on Village map',
    zoneDominantPercentage: 'Requires 10+ data points on Village map'
  };
  return reasons[stat] || 'Insufficient data for this stat';
}

/**
 * Get role name from stat name
 */
function getRoleNameFromStat(stat) {
  const roleMap = {
    roleChasseur: 'Chasseur',
    roleAlchimiste: 'Alchimiste',
    roleAmoureux: 'Amoureux',
    roleAgent: 'Agent',
    roleEspion: 'Espion',
    roleIdiot: 'Idiot du Village',
    roleChasseurDePrime: 'Chasseur de Prime',
    roleContrebandier: 'Contrebandier',
    roleBete: 'La Bête',
    roleVaudou: 'Vaudou',
    roleScientifique: 'Scientifique'
  };
  return roleMap[stat] || stat;
}

// ============================================================================
// TITLE PROXIMITY SCORING
// ============================================================================

/**
 * Calculate how close a player is to earning a title
 * @returns {Object} Proximity score (0-100), claim strength, and detailed breakdown
 */
function calculateTitleProximity(playerPercentiles, roleData, titleConditions, priority) {
  const evaluations = titleConditions.map(condition => 
    evaluateCondition(playerPercentiles, roleData, condition)
  );
  
  const totalConditions = evaluations.length;
  const metConditions = evaluations.filter(e => e.met).length;
  
  // Calculate proximity score
  let totalScore = 0;
  evaluations.forEach(evaluation => {
    if (evaluation.met) {
      totalScore += 1.0;
    } else if (evaluation.currentPercentile !== null && typeof evaluation.gap === 'number') {
      // For unmet conditions with percentile data, calculate partial score
      // Score approaches 1.0 as player gets closer to threshold
      const threshold = getThresholdForCategory(evaluation.requiredCategory, false);
      const distance = Math.abs(evaluation.gap);
      const maxDistance = 100; // Max possible percentile distance
      const partialScore = Math.max(0, 1 - (distance / maxDistance));
      totalScore += partialScore;
    }
    // Else: missing data contributes 0 to score
  });
  
  const proximityScore = (totalScore / totalConditions) * 100;
  
  // Calculate claim strength (matching generate-titles.js logic)
  // Get average adjusted percentile for claim strength calculation
  let totalAdjustedPercentile = 0;
  let percentileCount = 0;
  
  evaluations.forEach(evaluation => {
    if (evaluation.currentPercentile !== null && evaluation.currentPercentile !== undefined) {
      let adjustedPercentile = evaluation.currentPercentile;
      
      // Invert percentile for "bad achievement" categories where lower is better
      // Check the REQUIRED category, not the current category
      const isBadAchievement = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(evaluation.requiredCategory);
      if (isBadAchievement) {
        adjustedPercentile = 100 - adjustedPercentile;
      }
      
      totalAdjustedPercentile += adjustedPercentile;
      percentileCount++;
    }
  });
  
  const avgAdjustedPercentile = percentileCount > 0 ? (totalAdjustedPercentile / percentileCount) : 50;
  
  // Calculate claim strength: priority * 1000 + avgAdjustedPercentile * 10
  // (titleIndex subtraction not applicable here since we're analyzing single titles)
  const claimStrength = (priority || 0) * 1000 + avgAdjustedPercentile * 10;
  
  return {
    proximityScore: Math.round(proximityScore * 10) / 10, // Round to 1 decimal
    claimStrength: Math.round(claimStrength * 10) / 10, // Round to 1 decimal
    avgAdjustedPercentile: Math.round(avgAdjustedPercentile * 10) / 10,
    metConditions,
    totalConditions,
    evaluations,
    feasible: evaluations.every(e => e.currentPercentile !== null || e.met)
  };
}

// ============================================================================
// STATISTICS COMPUTATION (from generate-titles.js)
// ============================================================================

/**
 * Compute all player statistics needed for title generation
 */
function computeAllStatistics(moddedGames) {
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
    console.log('  ⚠️  Zone statistics not available');
  }

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
        
        agg.stats.winRateVillageois = vill?.played >= 5 
          ? (vill.won / vill.played) * 100 : null;
        agg.stats.winRateLoup = loup?.played >= 5 
          ? (loup.won / loup.played) * 100 : null;
        agg.stats.winRateSolo = solo?.played >= 3 
          ? (solo.won / solo.played) * 100 : null;
      }
    });
  }

  // Process talking stats
  if (talkingStats?.playerStats) {
    talkingStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
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
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      if (player.aggressivenessScore !== undefined && player.aggressivenessScore !== null) {
        agg.stats.votingAggressiveness = player.aggressivenessScore;
      }
    });
  }

  // Process voting accuracy
  if (votingStats?.playerAccuracyStats) {
    votingStats.playerAccuracyStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      if (player.accuracyRate !== undefined && player.accuracyRate !== null && player.totalVotes >= 10) {
        agg.stats.votingAccuracy = player.accuracyRate;
      }
    });
  }

  // Process voting first stats
  if (votingStats?.playerFirstVoteStats) {
    votingStats.playerFirstVoteStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      if (player.firstVoteRate !== undefined && player.firstVoteRate !== null && player.totalMeetingsWithVotes >= 5) {
        agg.stats.votingFirst = player.firstVoteRate;
      }
    });
  }

  // Process hunter stats
  if (hunterStats?.hunterStats) {
    hunterStats.hunterStats.forEach(hunterData => {
      const playerId = hunterData.hunterId; // Fixed: use hunterId not player
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Kill-based accuracy (only if 10+ games as hunter)
      if (hunterData.gamesPlayedAsHunter >= 10) {
        const totalKills = hunterData.totalKills || 0;
        if (totalKills > 0) {
          const goodKills = hunterData.nonVillageoisKills || 0;
          agg.stats.hunterAccuracy = (goodKills / totalKills) * 100;
        }
      }
      
      // Shot accuracy (only if 10+ shots taken)
      if (hunterData.shotAccuracy !== undefined && hunterData.shotAccuracy !== null && hunterData.totalShots >= 10) {
        agg.stats.hunterShotAccuracy = hunterData.shotAccuracy;
      }
    });
  }

  // Process death stats
  if (deathStats?.playerDeathStats) {
    deathStats.playerDeathStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const gamesPlayed = agg.gamesPlayed;
      const totalDeaths = player.totalDeaths || 0;
      const day1Deaths = player.day1Deaths || 0;
      
      agg.stats.survivalRate = gamesPlayed > 0 
        ? ((gamesPlayed - totalDeaths) / gamesPlayed) * 100 
        : null;
      
      agg.stats.survivalDay1Rate = gamesPlayed > 0 
        ? ((gamesPlayed - day1Deaths) / gamesPlayed) * 100 
        : null;
      
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
      const playerId = player.playerId; // Use playerId not player for correct matching
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      agg.stats.lootPer60Min = player.lootPer60Min !== undefined ? player.lootPer60Min : null;
      agg.stats.lootVillageoisPer60Min = player.lootVillageoisPer60Min !== undefined ? player.lootVillageoisPer60Min : null;
      agg.stats.lootLoupPer60Min = player.lootLoupPer60Min !== undefined ? player.lootLoupPer60Min : null;
    });
  }

  // Process zone stats
  if (zoneStats?.playerStats) {
    zoneStats.playerStats.forEach(player => {
      const playerId = player.playerId; // Use playerId for correct matching
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      agg.stats.zoneVillagePrincipal = player.zoneVillagePrincipal !== undefined ? player.zoneVillagePrincipal : null;
      agg.stats.zoneFerme = player.zoneFerme !== undefined ? player.zoneFerme : null;
      agg.stats.zoneVillagePecheur = player.zoneVillagePecheur !== undefined ? player.zoneVillagePecheur : null;
      agg.stats.zoneRuines = player.zoneRuines !== undefined ? player.zoneRuines : null;
      agg.stats.zoneResteCarte = player.zoneResteCarte !== undefined ? player.zoneResteCarte : null;
      agg.stats.zoneDominantPercentage = player.zoneDominantPercentage !== undefined ? player.zoneDominantPercentage : null;
    });
  }

  return aggregatedStats;
}

/**
 * Compute role assignment frequencies
 */
function computeRoleFrequencies(moddedGames) {
  const roleFrequencies = new Map();

  moddedGames.forEach(game => {
    if (!game.PlayerStats) return;
    
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      
      if (!roleFrequencies.has(playerId)) {
        roleFrequencies.set(playerId, {
          playerId,
          playerName: player.Username,
          gamesPlayed: 0,
          roles: {}
        });
      }
      
      const data = roleFrequencies.get(playerId);
      data.gamesPlayed++;
      
      let role = player.MainRoleInitial;
      
      // Normalize Amoureux role variants (Amoureux Loup, Amoureux Villageois) to just "Amoureux"
      // This matches the game's victory logic where all lovers are treated as the same role
      if (role === 'Amoureux Loup' || role === 'Amoureux Villageois') {
        role = 'Amoureux';
      }
      
      if (role) {
        data.roles[role] = (data.roles[role] || 0) + 1;
      }
    });
  });

  return roleFrequencies;
}

/**
 * Build statistical distributions for percentile calculations
 */
function buildDistributions(eligiblePlayers) {
  const distributions = {};
  
  eligiblePlayers.forEach(([_, data]) => {
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && typeof value === 'number') {
        if (!distributions[statName]) {
          distributions[statName] = [];
        }
        distributions[statName].push(value);
      }
    });
  });
  
  return distributions;
}

// ============================================================================
// MAIN ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze all titles and find top candidates for each
 */
function analyzeTitleEligibility(aggregatedStats, roleFrequencies, options = {}) {
  const { 
    minPriority = 0, 
    specificTitles = null, 
    topN = 5,
    includeAwarded = false 
  } = options;

  console.log('  Analyzing title eligibility...');

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
        const percentile = calculatePercentile(value, distributions[statName]);
        const category = getPercentileCategory(percentile);
        percentiles[statName] = { value, percentile, category };
      } else {
        percentiles[statName] = { value: null, percentile: null, category: null };
      }
    });
    
    playerPercentiles.set(playerId, {
      ...data,
      percentiles
    });
  });

  // Analyze each combination title
  const titleAnalysis = [];
  
  COMBINATION_TITLES.forEach(combo => {
    // Filter by priority if specified
    if (combo.priority < minPriority) return;
    
    // Filter by specific titles if specified
    if (specificTitles && !specificTitles.includes(combo.id)) return;
    
    console.log(`  Analyzing: ${combo.title} (${combo.id})`);
    
    // Evaluate all players for this title
    const candidates = [];
    
    playerPercentiles.forEach((playerData, playerId) => {
      const roleData = roleFrequencies.get(playerId);
      const proximity = calculateTitleProximity(playerData.percentiles, roleData, combo.conditions, combo.priority);
      
      candidates.push({
        playerId,
        playerName: playerData.playerName,
        gamesPlayed: playerData.gamesPlayed,
        ...proximity
      });
    });
    
    // Sort by claim strength (highest first), matching generate-titles.js behavior
    // This properly ranks players when multiple have 100% proximity score
    candidates.sort((a, b) => {
      if (b.claimStrength !== a.claimStrength) {
        return b.claimStrength - a.claimStrength;
      }
      // Fallback to proximity score if claim strengths are equal
      return b.proximityScore - a.proximityScore;
    });
    
    // Take top N
    const topCandidates = candidates.slice(0, topN);
    
    titleAnalysis.push({
      titleId: combo.id,
      title: combo.title,
      emoji: combo.emoji,
      description: combo.description,
      priority: combo.priority,
      conditions: combo.conditions,
      topCandidates,
      totalEligiblePlayers: candidates.length,
      playersWithFullData: candidates.filter(c => c.feasible).length
    });
  });

  // Sort by priority (highest first)
  titleAnalysis.sort((a, b) => b.priority - a.priority);

  return titleAnalysis;
}

/**
 * Format analysis results as human-readable text
 */
function formatTextReport(analysis) {
  let report = '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '           TITLE ELIGIBILITY ANALYSIS REPORT\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  analysis.forEach((titleData, index) => {
    report += `\n${'─'.repeat(63)}\n`;
    report += `${titleData.emoji} ${titleData.title}\n`;
    report += `   ID: ${titleData.titleId} | Priority: ${titleData.priority}\n`;
    report += `   ${titleData.description}\n`;
    report += `${'─'.repeat(63)}\n\n`;

    // Show conditions
    report += '📋 REQUIREMENTS:\n';
    titleData.conditions.forEach((cond, i) => {
      const minCat = cond.minCategory ? ` (min: ${cond.minCategory})` : '';
      const requirement = cond.minValue !== undefined ? `≥${cond.minValue}` : cond.category;
      report += `   ${i + 1}. ${cond.stat}: ${requirement}${minCat}\n`;
    });
    report += '\n';

    // Show top candidates
    report += `🏆 TOP ${titleData.topCandidates.length} CANDIDATES (sorted by claim strength):\n`;
    if (titleData.topCandidates.length === 0) {
      report += '   ❌ No eligible candidates found\n';
    } else {
      titleData.topCandidates.forEach((candidate, rank) => {
        const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '  ';
        report += `\n${medal} #${rank + 1}: ${candidate.playerName} (${candidate.gamesPlayed} games)\n`;
        report += `   Proximity Score: ${candidate.proximityScore}% (${candidate.metConditions}/${candidate.totalConditions} conditions met)\n`;
        report += `   Claim Strength: ${candidate.claimStrength} (avg adjusted %ile: ${candidate.avgAdjustedPercentile})\n`;
        
        if (!candidate.feasible) {
          report += `   ⚠️  Missing required data - title may not be achievable\n`;
        }
        
        // Show detailed evaluation for each condition
        candidate.evaluations.forEach((evaluation, i) => {
          const condition = titleData.conditions[i];
          const checkMark = evaluation.met ? '✓' : '✗';
          const statusColor = evaluation.met ? '' : '';
          const requirement = condition.minValue !== undefined ? `≥${condition.minValue}` : condition.category;
          
          report += `   ${checkMark} ${condition.stat} (${requirement}):\n`;
          
          if (evaluation.met) {
            if (evaluation.currentPercentile !== null) {
              report += `      Current: ${evaluation.currentValue} (${Math.round(evaluation.currentPercentile)}th %ile, ${evaluation.currentCategory})\n`;
            } else if (evaluation.currentValue !== null) {
              report += `      Current: ${evaluation.currentValue}\n`;
            } else {
              report += `      Condition met ✓\n`;
            }
          } else {
            if (evaluation.currentPercentile !== null) {
              report += `      Current: ${evaluation.currentValue} (${Math.round(evaluation.currentPercentile)}th %ile, ${evaluation.currentCategory})\n`;
              report += `      Gap: ${Math.round(evaluation.gap)} percentile points needed\n`;
            } else if (evaluation.currentCount !== undefined) {
              report += `      Current: ${evaluation.currentValue.toFixed(1)}% of games (${evaluation.currentCount} times)\n`;
              report += `      Gap: Need ${Math.abs(evaluation.gap).toFixed(1)}% more\n`;
            } else {
              report += `      Status: ${evaluation.gap}\n`;
            }
            
            if (evaluation.reason) {
              report += `      Note: ${evaluation.reason}\n`;
            }
          }
        });
      });
    }

    report += '\n';
    report += `📊 Stats: ${titleData.playersWithFullData}/${titleData.totalEligiblePlayers} players have all required data\n`;
  });

  report += '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                      END OF REPORT\n';
  report += '═══════════════════════════════════════════════════════════════\n';

  return report;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const teamKey = args.find(arg => !arg.startsWith('--')) || 'main';
  
  const options = {
    minPriority: 0,
    specificTitles: null,
    topN: 5,
    includeAwarded: false,
    jsonOutput: false
  };

  // Parse options
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--priority' && args[i + 1]) {
      options.minPriority = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--title' && args[i + 1]) {
      options.specificTitles = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--top' && args[i + 1]) {
      options.topN = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--json') {
      options.jsonOutput = true;
    } else if (args[i] === '--include-awarded') {
      options.includeAwarded = true;
    }
  }

  // Get data source
  const dataSource = DATA_SOURCES[teamKey];
  if (!dataSource) {
    console.error(`❌ Unknown team key: ${teamKey}`);
    console.error('Available teams:', Object.keys(DATA_SOURCES).join(', '));
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), dataSource.outputDir);
  const gameLogPath = path.join(outputDir, 'gameLog.json');

  console.log(`\n🔍 Analyzing title eligibility for ${dataSource.name}...`);
  console.log(`📁 Data source: ${gameLogPath}`);
  
  if (options.minPriority > 0) {
    console.log(`🎯 Filtering: Priority >= ${options.minPriority}`);
  }
  if (options.specificTitles) {
    console.log(`🎯 Filtering: Titles ${options.specificTitles.join(', ')}`);
  }
  console.log(`📊 Showing top ${options.topN} candidates per title\n`);

  try {
    // Load game log
    const gameLogContent = await fs.readFile(gameLogPath, 'utf8');
    const gameLogData = JSON.parse(gameLogContent);

    // Filter modded games only
    const allGames = gameLogData.GameStats || [];
    const moddedGames = allGames.filter(game => game.Modded === true);
    
    console.log(`📊 Total games: ${allGames.length}`);
    console.log(`🎮 Modded games: ${moddedGames.length}\n`);

    if (moddedGames.length === 0) {
      console.error('❌ No modded games found in data');
      process.exit(1);
    }

    // Compute statistics
    const aggregatedStats = computeAllStatistics(moddedGames);
    const roleFrequencies = computeRoleFrequencies(moddedGames);

    // Analyze titles
    const analysis = analyzeTitleEligibility(aggregatedStats, roleFrequencies, options);

    // Output results
    if (options.jsonOutput) {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      const report = formatTextReport(analysis);
      console.log(report);
      
      // Summary statistics
      const noQualified = analysis.filter(t => t.topCandidates.length === 0).length;
      const perfectScore = analysis.filter(t => 
        t.topCandidates.length > 0 && t.topCandidates[0].proximityScore === 100
      ).length;
      
      console.log('\n📈 SUMMARY:');
      console.log(`   Titles analyzed: ${analysis.length}`);
      console.log(`   Titles with no qualified candidates: ${noQualified}`);
      console.log(`   Titles with at least one 100% match: ${perfectScore}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
