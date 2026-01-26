/**
 * Chart display limits and default values
 * Centralized constants to avoid magic numbers scattered throughout the codebase
 */

// Top N limits for charts
export const CHART_LIMITS = {
  /** Top 10 players (used in kill stats, player history) */
  TOP_10: 10,
  /** Top 15 players (used in general stats, voting stats) */
  TOP_15: 15,
  /** Top 20 players (used in loot, talking time, series stats) */
  TOP_20: 20,
  /** Top 25 players */
  TOP_25: 25,
  /** Top 30 players */
  TOP_30: 30,
} as const;

// Minimum games thresholds
export const MIN_GAMES_DEFAULTS = {
  /** Very low threshold - for new player inclusion */
  VERY_LOW: 1,
  /** Low threshold - for basic stats */
  LOW: 3,
  /** Standard threshold - for most statistics */
  STANDARD: 5,
  /** Medium threshold - for reliable averages */
  MEDIUM: 10,
  /** High threshold - for win rates and performance metrics */
  HIGH: 15,
  /** Very high threshold - for competitive rankings */
  VERY_HIGH: 25,
  /** Extreme threshold - for veterans only */
  EXTREME: 50,
} as const;

// Predefined minimum games options for dropdowns
export const MIN_GAMES_OPTIONS = {
  /** Battle Royale minimal options */
  BR_MINIMAL: [1, 2, 3, 5, 10] as const,
  /** Battle Royale standard options */
  BR_STANDARD: [3, 10, 25, 50, 100] as const,
  /** Compact options for small datasets */
  COMPACT: [3, 5, 10, 15, 25, 50] as const,
  /** Standard options for most charts */
  STANDARD: [3, 5, 15, 25, 50, 100] as const,
  /** Extended options for large datasets */
  EXTENDED: [3, 5, 10, 20, 25, 50, 75, 100, 150, 200] as const,
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  /** Items per page for game listings */
  ITEMS_PER_PAGE: 25,
  /** Initial page number */
  INITIAL_PAGE: 1,
} as const;

// Other chart-specific defaults
export const CHART_DEFAULTS = {
  /** Minimum meetings for voting statistics */
  MIN_MEETINGS: 25,
  /** Minimum wolf appearances for pairing stats */
  MIN_WOLF_APPEARANCES: 2,
  /** Minimum lover appearances for pairing stats */
  MIN_LOVER_APPEARANCES: 1,
  /** Default cluster radius for death maps */
  CLUSTER_RADIUS: 20,
  /** Minimum games to include in camp performance */
  MIN_CAMP_GAMES: 3,
  /** Default selected day for survival view */
  DEFAULT_SELECTED_DAY: 1,
} as const;
