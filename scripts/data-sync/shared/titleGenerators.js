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
 *   - statKey:        the actual key in data.stats / percentiles (e.g. 'talkingPer60Min')
 *   - titleDefKey:    the TITLE_DEFINITIONS lookup key for basic titles (null if combo-only)
 *   - conditionAlias: the friendly name used in combination title conditions (null if basic-only)
 *
 * When statKey === conditionAlias the alias is still listed explicitly for discoverability.
 * Virtual entries (no real stat) use statKey = null.
 */
const TITLE_STAT_REGISTRY = [
  // --- Talking ---
  { statKey: 'talkingPer60Min',                  titleDefKey: 'talking',                conditionAlias: 'talking' },
  { statKey: 'talkingOutsidePer60Min',            titleDefKey: 'talkingOutsideMeeting',  conditionAlias: 'talkingOutsideMeeting' },
  { statKey: 'talkingDuringPer60Min',             titleDefKey: 'talkingDuringMeeting',   conditionAlias: 'talkingDuringMeeting' },
  // Camp-specific talking (combination titles only)
  { statKey: 'talkingVillageoisPer60Min',         titleDefKey: null,                     conditionAlias: 'talkingVillageois' },
  { statKey: 'talkingOutsideVillageoisPer60Min',  titleDefKey: null,                     conditionAlias: 'talkingOutsideVillageois' },
  { statKey: 'talkingDuringVillageoisPer60Min',   titleDefKey: null,                     conditionAlias: 'talkingDuringVillageois' },
  { statKey: 'talkingLoupPer60Min',               titleDefKey: null,                     conditionAlias: 'talkingLoup' },
  { statKey: 'talkingOutsideLoupPer60Min',        titleDefKey: null,                     conditionAlias: 'talkingOutsideLoup' },
  { statKey: 'talkingDuringLoupPer60Min',         titleDefKey: null,                     conditionAlias: 'talkingDuringLoup' },
  { statKey: 'talkingSoloPer60Min',               titleDefKey: null,                     conditionAlias: 'talkingSolo' },
  { statKey: 'talkingOutsideSoloPer60Min',        titleDefKey: null,                     conditionAlias: 'talkingOutsideSolo' },
  { statKey: 'talkingDuringSoloPer60Min',         titleDefKey: null,                     conditionAlias: 'talkingDuringSolo' },

  // --- Kill Rate ---
  { statKey: 'killRate',              titleDefKey: 'killRate', conditionAlias: 'killRate' },
  { statKey: 'killRateVillageois',    titleDefKey: null,       conditionAlias: 'killRateVillageois' },
  { statKey: 'killRateLoup',          titleDefKey: null,       conditionAlias: 'killRateLoup' },
  { statKey: 'killRateSolo',          titleDefKey: null,       conditionAlias: 'killRateSolo' },

  // --- Survival ---
  { statKey: 'survivalRate',                titleDefKey: 'survival',               conditionAlias: 'survival' },
  { statKey: 'survivalDay1Rate',            titleDefKey: 'survivalDay1',           conditionAlias: 'survivalDay1' },
  { statKey: 'survivalRateVillageois',      titleDefKey: 'survivalVillageois',     conditionAlias: 'survivalVillageois' },      // BUGFIX: was missing from CONDITION_STAT_MAP
  { statKey: 'survivalRateLoup',            titleDefKey: 'survivalLoup',           conditionAlias: 'survivalLoup' },            // BUGFIX: was missing from CONDITION_STAT_MAP
  { statKey: 'survivalRateSolo',            titleDefKey: 'survivalSolo',           conditionAlias: 'survivalSolo' },
  { statKey: 'survivalDay1RateVillageois',  titleDefKey: 'survivalDay1Villageois', conditionAlias: 'survivalDay1Villageois' },
  { statKey: 'survivalDay1RateLoup',        titleDefKey: 'survivalDay1Loup',       conditionAlias: 'survivalDay1Loup' },
  { statKey: 'survivalDay1RateSolo',        titleDefKey: 'survivalDay1Solo',       conditionAlias: 'survivalDay1Solo' },
  // Survival at meeting (combination titles only)
  { statKey: 'survivalAtMeetingVillageois', titleDefKey: null,                     conditionAlias: 'survivalAtMeetingVillageois' },
  { statKey: 'survivalAtMeetingLoup',       titleDefKey: null,                     conditionAlias: 'survivalAtMeetingLoup' },
  { statKey: 'survivalAtMeetingSolo',       titleDefKey: null,                     conditionAlias: 'survivalAtMeetingSolo' },

  // --- Loot ---
  { statKey: 'lootPer60Min',                    titleDefKey: 'loot',                           conditionAlias: 'loot' },
  { statKey: 'lootVillageoisPer60Min',           titleDefKey: 'lootVillageois',                 conditionAlias: 'lootVillageois' },
  { statKey: 'lootLoupPer60Min',                 titleDefKey: 'lootLoup',                       conditionAlias: 'lootLoup' },
  { statKey: 'lootObjectiveWinRateVillageois',   titleDefKey: 'lootObjectiveWinRateVillageois', conditionAlias: 'lootObjectiveWinRateVillageois' },

  // --- Voting ---
  { statKey: 'votingAggressiveness',          titleDefKey: 'votingAggressive', conditionAlias: 'votingAggressive' },
  { statKey: 'votingFirst',                   titleDefKey: 'votingFirst',      conditionAlias: 'votingFirst' },
  { statKey: 'votingAccuracy',                titleDefKey: 'votingAccuracy',   conditionAlias: 'votingAccuracy' },
  // Camp-specific voting (combination titles only)
  { statKey: 'votingAggressivenessVillageois', titleDefKey: null, conditionAlias: 'votingAggressiveVillageois' },
  { statKey: 'votingAggressivenessLoup',       titleDefKey: null, conditionAlias: 'votingAggressiveLoup' },
  { statKey: 'votingAggressivenessSolo',       titleDefKey: null, conditionAlias: 'votingAggressiveSolo' },
  { statKey: 'votingFirstVillageois',          titleDefKey: null, conditionAlias: 'votingFirstVillageois' },
  { statKey: 'votingFirstLoup',                titleDefKey: null, conditionAlias: 'votingFirstLoup' },
  { statKey: 'votingFirstSolo',                titleDefKey: null, conditionAlias: 'votingFirstSolo' },
  { statKey: 'votingAccuracyVillageois',       titleDefKey: null, conditionAlias: 'votingAccuracyVillageois' },
  { statKey: 'votingAccuracyLoup',             titleDefKey: null, conditionAlias: 'votingAccuracyLoup' },
  { statKey: 'votingAccuracySolo',             titleDefKey: null, conditionAlias: 'votingAccuracySolo' },

  // --- Hunter ---
  { statKey: 'hunterAccuracy',     titleDefKey: 'hunterAccuracy',     conditionAlias: 'hunterAccuracy' },
  { statKey: 'hunterShotAccuracy', titleDefKey: 'hunterShotAccuracy', conditionAlias: 'hunterShotAccuracy' },

  // --- Win Rate ---
  { statKey: 'winRate',           titleDefKey: 'winRate',           conditionAlias: 'winRate' },
  { statKey: 'winRateVillageois', titleDefKey: 'winRateVillageois', conditionAlias: 'winRateVillageois' },
  { statKey: 'winRateLoup',       titleDefKey: 'winRateLoup',       conditionAlias: 'winRateLoup' },
  { statKey: 'winRateSolo',       titleDefKey: 'winRateSolo',       conditionAlias: 'winRateSolo' },

  // --- Series ---
  { statKey: 'longestWinSeries',  titleDefKey: 'winSeries',  conditionAlias: 'winSeries' },
  { statKey: 'longestLossSeries', titleDefKey: 'lossSeries', conditionAlias: 'lossSeries' },

  // --- General ---
  { statKey: 'gamesPlayed', titleDefKey: 'participation', conditionAlias: 'gamesPlayed' },

  // --- Zones ---
  { statKey: 'zoneVillagePrincipal',  titleDefKey: 'zoneVillagePrincipal',  conditionAlias: 'zoneVillagePrincipal' },
  { statKey: 'zoneFerme',             titleDefKey: 'zoneFerme',             conditionAlias: 'zoneFerme' },
  { statKey: 'zoneVillagePecheur',    titleDefKey: 'zoneVillagePecheur',    conditionAlias: 'zoneVillagePecheur' },
  { statKey: 'zoneRuines',            titleDefKey: 'zoneRuines',            conditionAlias: 'zoneRuines' },
  { statKey: 'zoneResteCarte',        titleDefKey: 'zoneResteCarte',        conditionAlias: 'zoneResteCarte' },
  { statKey: 'zoneDominantPercentage', titleDefKey: 'zoneDominantPercentage', conditionAlias: 'zoneDominantPercentage' },

  // --- Wolf Transform ---
  { statKey: 'wolfTransformRate',   titleDefKey: 'wolfTransformRate',   conditionAlias: 'wolfTransformRate' },
  { statKey: 'wolfUntransformRate', titleDefKey: 'wolfUntransformRate', conditionAlias: 'wolfUntransformRate' },

  // --- Potions ---
  { statKey: 'potionsPer60Min', titleDefKey: 'potionUsage', conditionAlias: 'potionUsage' },

  // --- Camp Assignment (threshold-based, no basic title via percentiles) ---
  { statKey: 'campVillageoisPercent', titleDefKey: null, conditionAlias: null },
  { statKey: 'campLoupPercent',       titleDefKey: null, conditionAlias: null },
  { statKey: 'campSoloPercent',       titleDefKey: null, conditionAlias: 'campSolo' },  // BUGFIX: was missing from CONDITION_STAT_MAP

  // --- Virtual entries (no real stat key, used in combination conditions only) ---
  { statKey: null, titleDefKey: null, conditionAlias: 'campBalance' },
];

// Derived lookup maps (computed once at module load)
const statToTitleMap = Object.fromEntries(
  TITLE_STAT_REGISTRY
    .filter(e => e.statKey && e.titleDefKey)
    .map(e => [e.statKey, e.titleDefKey])
);

const conditionToStatMap = Object.fromEntries(
  TITLE_STAT_REGISTRY
    .filter(e => e.conditionAlias)
    .map(e => [e.conditionAlias, e.statKey ?? e.conditionAlias])
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

    playerTitles[playerId] = {
      playerId,
      playerName: data.playerName,
      gamesPlayed: data.gamesPlayed,
      titles,
      primaryTitle: null,
      percentiles: data.percentiles,
      stats: data.stats
    };
  });

  assignUniquePrimaryTitles(playerTitles);
  return playerTitles;
}
