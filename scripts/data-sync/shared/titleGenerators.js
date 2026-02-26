/**
 * Title generation logic for Player Titles Generation
 *
 * Provides percentile-based helpers and all title building functions.
 * Consumed by generate-titles.js.
 */

import { TITLE_DEFINITIONS, COMBINATION_TITLES } from '../titleDefinitions.js';
import { MIN_GAMES_FOR_ROLE_TITLES } from '../compute/compute-titles-stats.js';

/** Minimum modded games required for title eligibility */
export const MIN_GAMES_FOR_TITLES = 25;

/** Percentile thresholds for title categories */
export const PERCENTILE_THRESHOLDS = {
  EXTREME_HIGH: 85,   // Top 15%
  HIGH: 65,           // Top 35%
  ABOVE_AVERAGE: 55,  // Top 45%
  BELOW_AVERAGE: 45,  // Bottom 55%
  LOW: 35,            // Bottom 35%
  EXTREME_LOW: 15     // Bottom 15%
};

// ============================================================================
// PERCENTILE UTILITIES
// ============================================================================

/**
 * Calculate percentile for a value in a distribution
 * @param {number} value
 * @param {Array<number>} distribution
 * @returns {number} Percentile (0-100)
 */
export function calculatePercentile(value, distribution) {
  if (distribution.length === 0) return 50;
  const sorted = [...distribution].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}

/**
 * Get percentile category for a value
 * @param {number} percentile
 * @returns {string} Category name
 */
export function getPercentileCategory(percentile) {
  if (percentile >= PERCENTILE_THRESHOLDS.EXTREME_HIGH) return 'EXTREME_HIGH';
  if (percentile >= PERCENTILE_THRESHOLDS.HIGH) return 'HIGH';
  if (percentile >= PERCENTILE_THRESHOLDS.ABOVE_AVERAGE) return 'ABOVE_AVERAGE';
  if (percentile <= PERCENTILE_THRESHOLDS.EXTREME_LOW) return 'EXTREME_LOW';
  if (percentile <= PERCENTILE_THRESHOLDS.LOW) return 'LOW';
  if (percentile <= PERCENTILE_THRESHOLDS.BELOW_AVERAGE) return 'BELOW_AVERAGE';
  return 'AVERAGE';
}

// ============================================================================
// DISTRIBUTION HELPERS
// ============================================================================

/**
 * Build statistical distributions for percentile calculations
 * @param {Array} eligiblePlayers - Array of [playerId, data] entries
 * @returns {Object} Distributions by stat name
 */
export function buildDistributions(eligiblePlayers) {
  const distributions = {};
  eligiblePlayers.forEach(([_, data]) => {
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && !isNaN(value)) {
        if (!distributions[statName]) distributions[statName] = [];
        distributions[statName].push(value);
      }
    });
  });
  return distributions;
}

// ============================================================================
// UNIFIED STAT REGISTRY
// ============================================================================

/**
 * Single source of truth for all title-related stat mappings.
 * Each entry defines:
 *   - statKey: the actual key in data.stats / percentiles (e.g. 'talkingPer60Min')
 *   - alias:   shared name for TITLE_DEFINITIONS lookup AND combination title conditions
 *              (null for threshold-only stats; virtual entries use statKey = null)
 *
 * Exception: when the TITLE_DEFINITIONS key differs from the condition alias, an explicit
 * titleDefKey override is provided (currently only 'gamesPlayed' → 'participation').
 */
const TITLE_STAT_REGISTRY = [
  // --- Talking ---
  { statKey: 'talkingPer60Min',                  alias: 'talking' },
  { statKey: 'talkingOutsidePer60Min',            alias: 'talkingOutsideMeeting' },
  { statKey: 'talkingDuringPer60Min',             alias: 'talkingDuringMeeting' },
  // Camp-specific talking (combination titles only)
  { statKey: 'talkingVillageoisPer60Min',         alias: 'talkingVillageois' },
  { statKey: 'talkingOutsideVillageoisPer60Min',  alias: 'talkingOutsideVillageois' },
  { statKey: 'talkingDuringVillageoisPer60Min',   alias: 'talkingDuringVillageois' },
  { statKey: 'talkingLoupPer60Min',               alias: 'talkingLoup' },
  { statKey: 'talkingOutsideLoupPer60Min',        alias: 'talkingOutsideLoup' },
  { statKey: 'talkingDuringLoupPer60Min',         alias: 'talkingDuringLoup' },
  { statKey: 'talkingSoloPer60Min',               alias: 'talkingSolo' },
  { statKey: 'talkingOutsideSoloPer60Min',        alias: 'talkingOutsideSolo' },
  { statKey: 'talkingDuringSoloPer60Min',         alias: 'talkingDuringSolo' },

  // --- Kill Rate ---
  { statKey: 'killRate',           alias: 'killRate' },
  { statKey: 'killRateVillageois', alias: 'killRateVillageois' },
  { statKey: 'killRateLoup',       alias: 'killRateLoup' },
  { statKey: 'killRateSolo',       alias: 'killRateSolo' },

  // --- Survival ---
  { statKey: 'survivalRate',                alias: 'survival' },
  { statKey: 'survivalDay1Rate',            alias: 'survivalDay1' },
  { statKey: 'survivalRateVillageois',      alias: 'survivalVillageois' },      // BUGFIX: was missing from old CONDITION_STAT_MAP
  { statKey: 'survivalRateLoup',            alias: 'survivalLoup' },            // BUGFIX: was missing from old CONDITION_STAT_MAP
  { statKey: 'survivalRateSolo',            alias: 'survivalSolo' },
  { statKey: 'survivalDay1RateVillageois',  alias: 'survivalDay1Villageois' },
  { statKey: 'survivalDay1RateLoup',        alias: 'survivalDay1Loup' },
  { statKey: 'survivalDay1RateSolo',        alias: 'survivalDay1Solo' },
  // Survival at meeting (combination titles only)
  { statKey: 'survivalAtMeetingVillageois', alias: 'survivalAtMeetingVillageois' },
  { statKey: 'survivalAtMeetingLoup',       alias: 'survivalAtMeetingLoup' },
  { statKey: 'survivalAtMeetingSolo',       alias: 'survivalAtMeetingSolo' },

  // --- Loot ---
  { statKey: 'lootPer60Min',                  alias: 'loot' },
  { statKey: 'lootVillageoisPer60Min',         alias: 'lootVillageois' },
  { statKey: 'lootLoupPer60Min',               alias: 'lootLoup' },
  { statKey: 'lootObjectiveWinRateVillageois', alias: 'lootObjectiveWinRateVillageois' },

  // --- Voting ---
  { statKey: 'votingAggressiveness',           alias: 'votingAggressive' },
  { statKey: 'votingFirst',                    alias: 'votingFirst' },
  { statKey: 'votingAccuracy',                 alias: 'votingAccuracy' },
  // Camp-specific voting (combination titles only)
  { statKey: 'votingAggressivenessVillageois', alias: 'votingAggressiveVillageois' },
  { statKey: 'votingAggressivenessLoup',       alias: 'votingAggressiveLoup' },
  { statKey: 'votingAggressivenessSolo',       alias: 'votingAggressiveSolo' },
  { statKey: 'votingFirstVillageois',          alias: 'votingFirstVillageois' },
  { statKey: 'votingFirstLoup',                alias: 'votingFirstLoup' },
  { statKey: 'votingFirstSolo',                alias: 'votingFirstSolo' },
  { statKey: 'votingAccuracyVillageois',       alias: 'votingAccuracyVillageois' },
  { statKey: 'votingAccuracyLoup',             alias: 'votingAccuracyLoup' },
  { statKey: 'votingAccuracySolo',             alias: 'votingAccuracySolo' },

  // --- Hunter ---
  { statKey: 'hunterAccuracy',     alias: 'hunterAccuracy' },
  { statKey: 'hunterShotAccuracy', alias: 'hunterShotAccuracy' },

  // --- Win Rate ---
  { statKey: 'winRate',           alias: 'winRate' },
  { statKey: 'winRateVillageois', alias: 'winRateVillageois' },
  { statKey: 'winRateLoup',       alias: 'winRateLoup' },
  { statKey: 'winRateSolo',       alias: 'winRateSolo' },

  // --- Series ---
  { statKey: 'longestWinSeries',  alias: 'winSeries' },
  { statKey: 'longestLossSeries', alias: 'lossSeries' },

  // --- General ---
  // titleDefKey override: TITLE_DEFINITIONS key ('participation') differs from condition alias ('gamesPlayed')
  { statKey: 'gamesPlayed', alias: 'gamesPlayed', titleDefKey: 'participation' },

  // --- Zones ---
  { statKey: 'zoneVillagePrincipal',   alias: 'zoneVillagePrincipal' },
  { statKey: 'zoneFerme',              alias: 'zoneFerme' },
  { statKey: 'zoneVillagePecheur',     alias: 'zoneVillagePecheur' },
  { statKey: 'zoneRuines',             alias: 'zoneRuines' },
  { statKey: 'zoneResteCarte',         alias: 'zoneResteCarte' },
  { statKey: 'zoneDominantPercentage', alias: 'zoneDominantPercentage' },

  // --- Wolf Transform ---
  { statKey: 'wolfTransformRate',   alias: 'wolfTransformRate' },
  { statKey: 'wolfUntransformRate', alias: 'wolfUntransformRate' },

  // --- Potions ---
  { statKey: 'potionsPer60Min', alias: 'potionUsage' },

  // --- Camp Assignment (threshold-based, used directly by generateCampAssignmentTitles) ---
  { statKey: 'campVillageoisPercent', alias: null },
  { statKey: 'campLoupPercent',       alias: null },
  { statKey: 'campSoloPercent',       alias: 'campSolo' },  // BUGFIX: was missing from old CONDITION_STAT_MAP

  // --- Virtual entries (no real stat key, used in combination conditions only) ---
  { statKey: null, alias: 'campBalance' },
];

// Derived lookup maps (computed once at module load)
const statToTitleMap = Object.fromEntries(
  TITLE_STAT_REGISTRY
    .filter(e => e.statKey && (e.alias || e.titleDefKey))
    .map(e => [e.statKey, e.titleDefKey ?? e.alias])
);

const conditionToStatMap = Object.fromEntries(
  TITLE_STAT_REGISTRY
    .filter(e => e.alias)
    .map(e => [e.alias, e.statKey ?? e.alias])
);

// ============================================================================
// BASIC STAT-BASED TITLES
// ============================================================================

/**
 * Generate basic stat-based titles
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} Title objects
 */
export function generateBasicTitles(percentiles) {
  const titles = [];

  Object.entries(percentiles).forEach(([statName, data]) => {
    const titleKey = statToTitleMap[statName];
    if (!titleKey || !TITLE_DEFINITIONS[titleKey]) return;

    const titleDef = TITLE_DEFINITIONS[titleKey];
    let selectedTitle = null;
    let priority = 5;

    switch (data.category) {
      case 'EXTREME_HIGH': selectedTitle = titleDef.extremeHigh || titleDef.high; priority = 8; break;
      case 'HIGH':         selectedTitle = titleDef.high;                          priority = 6; break;
      case 'ABOVE_AVERAGE':selectedTitle = titleDef.aboveAverage || titleDef.average; priority = 4; break;
      case 'AVERAGE':      selectedTitle = titleDef.average;                       priority = 3; break;
      case 'BELOW_AVERAGE':selectedTitle = titleDef.belowAverage || titleDef.average; priority = 4; break;
      case 'EXTREME_LOW':  selectedTitle = titleDef.extremeLow || titleDef.low;    priority = 8; break;
      case 'LOW':          selectedTitle = titleDef.low;                           priority = 6; break;
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

// ============================================================================
// CAMP BALANCE TITLES
// ============================================================================

/** Expected win rates per camp used for normalized balance checks */
const EXPECTED_WIN_RATES = { villageois: 52, loup: 28, solo: 20 };

/**
 * Check if player has balanced or specialist camp performance
 * @param {Object} percentiles
 * @param {'BALANCED'|'SPECIALIST'} type
 * @returns {boolean}
 */
export function checkCampBalance(percentiles, type) {
  const villWinRate = percentiles.winRateVillageois?.value;
  const loupWinRate = percentiles.winRateLoup?.value;
  const soloWinRate = percentiles.winRateSolo?.value;

  const normalizedRates = [];
  if (villWinRate != null) normalizedRates.push(villWinRate - EXPECTED_WIN_RATES.villageois);
  if (loupWinRate != null) normalizedRates.push(loupWinRate - EXPECTED_WIN_RATES.loup);
  if (soloWinRate != null) normalizedRates.push(soloWinRate - EXPECTED_WIN_RATES.solo);

  if (normalizedRates.length < 2) return false;

  const diff = Math.max(...normalizedRates) - Math.min(...normalizedRates);
  if (type === 'BALANCED') return diff <= 10;
  if (type === 'SPECIALIST') return diff > 15;
  return false;
}

/**
 * Generate camp balance / specialist titles
 * @param {Object} percentiles
 * @returns {Array}
 */
export function generateCampBalanceTitles(percentiles) {
  const titles = [];
  if (checkCampBalance(percentiles, 'BALANCED')) {
    titles.push({
      id: 'campBalance_balanced',
      ...TITLE_DEFINITIONS.campBalance.balanced,
      stat: 'campBalance', category: 'BALANCED', priority: 6, type: 'campBalance'
    });
  }
  if (checkCampBalance(percentiles, 'SPECIALIST')) {
    titles.push({
      id: 'campBalance_specialist',
      ...TITLE_DEFINITIONS.campBalance.specialist,
      stat: 'campBalance', category: 'SPECIALIST', priority: 6, type: 'campBalance'
    });
  }
  return titles;
}

// ============================================================================
// COMBINATION TITLES
// ============================================================================

/**
 * Generate combination titles based on multiple stats
 * @param {Object} percentiles
 * @returns {Array}
 */
export function generateCombinationTitles(percentiles) {
  const titles = [];

  COMBINATION_TITLES.forEach(combo => {
    const conditionsMet = combo.conditions.every(condition => {
      const statKey = conditionToStatMap[condition.stat] || condition.stat;
      const playerData = percentiles[statKey];

      if (!playerData) {
        if (condition.stat === 'campBalance') return checkCampBalance(percentiles, condition.category);
        if (condition.stat === 'gamesPlayed' && condition.minValue) {
          return (percentiles.gamesPlayed?.value ?? 0) >= condition.minValue;
        }
        return false;
      }

      if (condition.minValue && playerData.value < condition.minValue) return false;

      const minCategory = condition.minCategory;
      switch (condition.category) {
        case 'HIGH':        return ['HIGH', 'EXTREME_HIGH', ...(minCategory ? ['ABOVE_AVERAGE'] : [])].includes(playerData.category);
        case 'LOW':         return ['LOW', 'EXTREME_LOW', ...(minCategory ? ['BELOW_AVERAGE'] : [])].includes(playerData.category);
        case 'AVERAGE':     return playerData.category === 'AVERAGE';
        case 'EXTREME_HIGH':return playerData.category === 'EXTREME_HIGH';
        case 'EXTREME_LOW': return playerData.category === 'EXTREME_LOW';
        case 'BALANCED':    return checkCampBalance(percentiles, 'BALANCED');
        default:            return playerData.category === condition.category;
      }
    });

    if (conditionsMet) {
      const conditionsData = combo.conditions.map(c => ({
        stat: c.stat,
        category: c.category,
        actualValue: percentiles[conditionToStatMap[c.stat] || c.stat]?.value,
        actualPercentile: percentiles[conditionToStatMap[c.stat] || c.stat]?.percentile || 0
      }));
      const validPercentiles = conditionsData.map(c => c.actualPercentile).filter(p => p > 0);
      const averagePercentile = validPercentiles.length > 0
        ? validPercentiles.reduce((s, p) => s + p, 0) / validPercentiles.length : 0;

      titles.push({
        id: combo.id,
        title: combo.title,
        emoji: combo.emoji,
        description: combo.description,
        priority: combo.priority,
        type: 'combination',
        percentile: averagePercentile,
        conditions: conditionsData
      });
    }
  });

  return titles;
}

// ============================================================================
// NEAR-MISS TITLES (almost qualified)
// ============================================================================

/**
 * Get the minimum required percentile for a given category.
 * Used to compute how far a player is from qualifying.
 * @param {string} category - e.g. 'HIGH', 'LOW', 'EXTREME_HIGH'
 * @returns {number} The percentile threshold boundary
 */
function getRequiredPercentile(category) {
  switch (category) {
    case 'EXTREME_HIGH': return PERCENTILE_THRESHOLDS.EXTREME_HIGH;
    case 'HIGH':         return PERCENTILE_THRESHOLDS.HIGH;
    case 'ABOVE_AVERAGE':return PERCENTILE_THRESHOLDS.ABOVE_AVERAGE;
    case 'EXTREME_LOW':  return PERCENTILE_THRESHOLDS.EXTREME_LOW;
    case 'LOW':          return PERCENTILE_THRESHOLDS.LOW;
    case 'BELOW_AVERAGE':return PERCENTILE_THRESHOLDS.BELOW_AVERAGE;
    default:             return 50;
  }
}

/**
 * Check if a single condition is met (same logic as generateCombinationTitles)
 * @param {Object} condition
 * @param {Object} percentiles
 * @returns {boolean}
 */
function isConditionMet(condition, percentiles) {
  const statKey = conditionToStatMap[condition.stat] || condition.stat;
  const playerData = percentiles[statKey];

  if (!playerData) {
    if (condition.stat === 'campBalance') return checkCampBalance(percentiles, condition.category);
    if (condition.stat === 'gamesPlayed' && condition.minValue) {
      return (percentiles.gamesPlayed?.value ?? 0) >= condition.minValue;
    }
    return false;
  }

  if (condition.minValue && playerData.value < condition.minValue) return false;

  const minCategory = condition.minCategory;
  switch (condition.category) {
    case 'HIGH':        return ['HIGH', 'EXTREME_HIGH', ...(minCategory ? ['ABOVE_AVERAGE'] : [])].includes(playerData.category);
    case 'LOW':         return ['LOW', 'EXTREME_LOW', ...(minCategory ? ['BELOW_AVERAGE'] : [])].includes(playerData.category);
    case 'AVERAGE':     return playerData.category === 'AVERAGE';
    case 'EXTREME_HIGH':return playerData.category === 'EXTREME_HIGH';
    case 'EXTREME_LOW': return playerData.category === 'EXTREME_LOW';
    case 'BALANCED':    return checkCampBalance(percentiles, 'BALANCED');
    default:            return playerData.category === condition.category;
  }
}

/**
 * Compute gap between player's actual percentile and the required threshold.
 * For HIGH/EXTREME_HIGH/ABOVE_AVERAGE categories: player needs to go UP.
 * For LOW/EXTREME_LOW/BELOW_AVERAGE categories: player needs to go DOWN.
 * @param {Object} condition
 * @param {Object} percentiles
 * @returns {number} Positive gap = how far the player needs to move
 */
function computeConditionGap(condition, percentiles) {
  const statKey = conditionToStatMap[condition.stat] || condition.stat;
  const playerData = percentiles[statKey];
  if (!playerData) return 50; // No data → max gap

  const required = getRequiredPercentile(condition.category);
  const actual = playerData.percentile;

  // For "high" categories, player needs percentile >= threshold → gap = threshold - actual
  if (['HIGH', 'EXTREME_HIGH', 'ABOVE_AVERAGE'].includes(condition.category)) {
    return Math.max(0, required - actual);
  }
  // For "low" categories, player needs percentile <= threshold → gap = actual - threshold
  if (['LOW', 'EXTREME_LOW', 'BELOW_AVERAGE'].includes(condition.category)) {
    return Math.max(0, actual - required);
  }
  // For AVERAGE, player needs to be in the middle band
  if (condition.category === 'AVERAGE') {
    if (actual > PERCENTILE_THRESHOLDS.ABOVE_AVERAGE) return actual - PERCENTILE_THRESHOLDS.ABOVE_AVERAGE;
    if (actual < PERCENTILE_THRESHOLDS.BELOW_AVERAGE) return PERCENTILE_THRESHOLDS.BELOW_AVERAGE - actual;
    return 0;
  }
  return 50;
}

/**
 * Generate near-miss titles: combination titles where the player is close to qualifying.
 * Criteria:
 * - For combos with 3+ conditions: player meets N-1 conditions
 * - For combos with 2 conditions: player meets 1, and the failing one is within 10 percentile pts
 * - Exclude combos the player already qualifies for
 * @param {Object} percentiles
 * @param {Set<string>} qualifiedIds - IDs of titles the player already has
 * @returns {Array}
 */
export function generateNearMissTitles(percentiles, qualifiedIds) {
  const nearMisses = [];
  const NEAR_MISS_GAP_THRESHOLD = 10; // Max gap for 2-condition combos

  COMBINATION_TITLES.forEach(combo => {
    // Skip already-qualified titles
    if (qualifiedIds.has(combo.id)) return;

    const conditionResults = combo.conditions.map(condition => {
      const met = isConditionMet(condition, percentiles);
      const statKey = conditionToStatMap[condition.stat] || condition.stat;
      const playerData = percentiles[statKey];
      const gap = met ? 0 : computeConditionGap(condition, percentiles);

      return {
        stat: condition.stat,
        category: condition.category,
        met,
        actualValue: playerData?.value,
        actualPercentile: playerData?.percentile || 0,
        requiredPercentile: getRequiredPercentile(condition.category),
        gap
      };
    });

    const metCount = conditionResults.filter(c => c.met).length;
    const totalCount = conditionResults.length;
    const unmetConditions = conditionResults.filter(c => !c.met);

    let isNearMiss = false;

    if (totalCount >= 3 && metCount >= totalCount - 1) {
      // 3+ conditions: meeting all but one
      isNearMiss = true;
    } else if (totalCount === 2 && metCount === 1) {
      // 2 conditions: meeting one, and the other is within gap threshold
      const maxGap = Math.max(...unmetConditions.map(c => c.gap));
      isNearMiss = maxGap <= NEAR_MISS_GAP_THRESHOLD;
    }

    if (isNearMiss) {
      nearMisses.push({
        id: combo.id,
        title: combo.title,
        emoji: combo.emoji,
        description: combo.description,
        priority: combo.priority,
        type: 'nearMiss',
        conditionsMet: metCount,
        conditionsTotal: totalCount,
        conditions: conditionResults
      });
    }
  });

  // Sort by: most conditions met first, then smallest gap
  nearMisses.sort((a, b) => {
    const ratioA = a.conditionsMet / a.conditionsTotal;
    const ratioB = b.conditionsMet / b.conditionsTotal;
    if (ratioA !== ratioB) return ratioB - ratioA;
    const maxGapA = Math.max(...a.conditions.filter(c => !c.met).map(c => c.gap));
    const maxGapB = Math.max(...b.conditions.filter(c => !c.met).map(c => c.gap));
    return maxGapA - maxGapB;
  });

  return nearMisses;
}

// ============================================================================
// CAMP ASSIGNMENT TITLES
// ============================================================================

const CAMP_THRESHOLDS = { villageois: 75, loup: 45, solo: 20 };

/**
 * Generate camp assignment titles (luck-based, uncontrollable)
 * @param {Object} stats
 * @returns {Array}
 */
export function generateCampAssignmentTitles(stats) {
  const titles = [];
  if (stats.campVillageoisPercent >= CAMP_THRESHOLDS.villageois) {
    titles.push({ id: 'campAssignment_villageois', ...TITLE_DEFINITIONS.campAssignment.villageois,
      stat: 'campVillageoisPercent', value: stats.campVillageoisPercent, priority: 3, type: 'campAssignment' });
  }
  if (stats.campLoupPercent >= CAMP_THRESHOLDS.loup) {
    titles.push({ id: 'campAssignment_loup', ...TITLE_DEFINITIONS.campAssignment.loup,
      stat: 'campLoupPercent', value: stats.campLoupPercent, priority: 3, type: 'campAssignment' });
  }
  if (stats.campSoloPercent >= CAMP_THRESHOLDS.solo) {
    titles.push({ id: 'campAssignment_solo', ...TITLE_DEFINITIONS.campAssignment.solo,
      stat: 'campSoloPercent', value: stats.campSoloPercent, priority: 3, type: 'campAssignment' });
  }
  return titles;
}

// ============================================================================
// ROLE-BASED TITLES
// ============================================================================

const ROLE_TO_TITLE_KEY = {
  'Chasseur': 'chasseur', 'Alchimiste': 'alchimiste', 'Amoureux': 'amoureux',
  'Agent': 'agent', 'Espion': 'espion', 'Idiot du Village': 'idiot',
  'Chasseur de Prime': 'chasseurDePrime', 'Contrebandier': 'contrebandier',
  'La Bête': 'bete', 'Vaudou': 'vaudou', 'Scientifique': 'scientifique'
};

/**
 * Generate role-based titles (frequency-based, uncontrollable)
 * @param {Object} roleData
 * @returns {Array}
 */
export function generateRoleTitles(roleData) {
  const titles = [];
  const gamesPlayed = roleData.gamesPlayed;
  Object.entries(roleData.roles).forEach(([role, count]) => {
    const percentage = (count / gamesPlayed) * 100;
    const titleKey = ROLE_TO_TITLE_KEY[role];
    if (titleKey && TITLE_DEFINITIONS.roleAssignment[titleKey] && percentage >= 12 && count >= 5) {
      titles.push({
        id: `role_${titleKey}`,
        ...TITLE_DEFINITIONS.roleAssignment[titleKey],
        roleCount: count, rolePercentage: percentage,
        priority: 3, type: 'role'
      });
    }
  });
  return titles;
}

// ============================================================================
// PRIMARY TITLE UNIQUENESS
// ============================================================================

/**
 * Assign unique primary titles to players via a 3-pass claim-strength algorithm
 * @param {Object} playerTitles - Modified in place
 */
export function assignUniquePrimaryTitles(playerTitles) {
  const usedTitles = new Set();
  const titleOwners = new Map();
  const playerIds = Object.keys(playerTitles);

  // Build all claims
  const titleClaims = [];
  playerIds.forEach(playerId => {
    playerTitles[playerId].titles.forEach((title, titleIndex) => {
      const isBadRanking = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(title.category);
      const adjustedPercentile = isBadRanking ? 100 - (title.percentile || 50) : (title.percentile || 50);
      const claimStrength = (title.priority || 0) * 1000 + adjustedPercentile * 10 - titleIndex;
      titleClaims.push({ playerId, title, claimStrength });
    });
  });

  titleClaims.sort((a, b) => b.claimStrength - a.claimStrength);

  // Pass 1: assign unique titles
  titleClaims.forEach(({ playerId, title }) => {
    const player = playerTitles[playerId];
    if (player.primaryTitle || usedTitles.has(title.id)) return;
    player.primaryTitle = title;
    usedTitles.add(title.id);
    titleOwners.set(title.id, player.playerName);
  });

  // Pass 2: fallback for players without a primary title
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    if (!player.primaryTitle && player.titles.length > 0) {
      player.primaryTitle = player.titles[0];
    }
  });

  // Pass 3: annotate titles owned by someone else
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    player.titles.forEach(title => {
      const owner = titleOwners.get(title.id);
      if (owner && owner !== player.playerName) title.primaryOwner = owner;
    });
  });

  const uniqueTitles = usedTitles.size;
  const totalPlayers = playerIds.length;
  console.log(`  ✓ Primary title uniqueness: ${uniqueTitles}/${totalPlayers} unique (${Math.round(uniqueTitles / totalPlayers * 100)}%)`);
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Generate titles for all eligible players
 * @param {Map} aggregatedStats
 * @param {Map} roleFrequencies
 * @returns {Object} Generated titles by player
 */
export function generatePlayerTitles(aggregatedStats, roleFrequencies) {
  console.log('  Generating player titles...');

  const eligiblePlayers = Array.from(aggregatedStats.entries())
    .filter(([_, data]) => data.gamesPlayed >= MIN_GAMES_FOR_TITLES);

  console.log(`  ${eligiblePlayers.length} players eligible for titles (${MIN_GAMES_FOR_TITLES}+ games)`);

  const distributions = buildDistributions(eligiblePlayers);

  // Calculate per-player percentiles
  const playerPercentiles = new Map();
  eligiblePlayers.forEach(([playerId, data]) => {
    const percentiles = {};
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && distributions[statName]) {
        const percentile = calculatePercentile(value, distributions[statName]);
        percentiles[statName] = { value, percentile, category: getPercentileCategory(percentile) };
      }
    });
    playerPercentiles.set(playerId, { ...data, percentiles });
  });

  // Build title list per player
  const playerTitles = {};
  playerPercentiles.forEach((data, playerId) => {
    const titles = [
      ...generateBasicTitles(data.percentiles),
      ...generateCampBalanceTitles(data.percentiles),
      ...generateCombinationTitles(data.percentiles),
      ...generateCampAssignmentTitles(data.stats),
      ...((() => {
        const roleData = roleFrequencies.get(playerId);
        return roleData && roleData.gamesPlayed >= MIN_GAMES_FOR_ROLE_TITLES
          ? generateRoleTitles(roleData)
          : [];
      })())
    ]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .filter((t, i, self) => i === self.findIndex(s => s.id === t.id));

    // Build near-miss titles (exclude already-qualified combo IDs)
    const qualifiedIds = new Set(titles.map(t => t.id));
    const nearMissTitles = generateNearMissTitles(data.percentiles, qualifiedIds);

    playerTitles[playerId] = {
      playerId,
      playerName: data.playerName,
      gamesPlayed: data.gamesPlayed,
      titles,
      primaryTitle: null,
      nearMissTitles,
      percentiles: data.percentiles,
      stats: data.stats
    };
  });

  assignUniquePrimaryTitles(playerTitles);
  return playerTitles;
}
