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

// Predefined minimum games options for dropdowns
// Defined before MIN_GAMES_DEFAULTS so the type constraint can reference these values
export const MIN_GAMES_OPTIONS = {
  /** Minimal options */
  MINIMAL: [1, 2, 3, 5, 15, 30] as const,
  /** Compact options for small datasets */
  COMPACT: [1, 10, 25, 50, 100] as const,
  /** Standard options for most charts */
  STANDARD: [5, 10, 25, 50, 100, 200] as const,
  /** Extended options for large datasets */
  EXTENDED: [5, 10, 25, 50, 100, 200, 400] as const,
  /** Meetings options, big datasets */
  MEETINGS: [3, 25, 50, 100, 250, 500, 1000] as const,
} as const;

// Union of all valid option values — ensures defaults always match a dropdown option
export type MinGamesOptionValue =
  | typeof MIN_GAMES_OPTIONS.MINIMAL[number]
  | typeof MIN_GAMES_OPTIONS.COMPACT[number]
  | typeof MIN_GAMES_OPTIONS.STANDARD[number]
  | typeof MIN_GAMES_OPTIONS.EXTENDED[number]
  | typeof MIN_GAMES_OPTIONS.MEETINGS[number];

// Minimum games/meetings thresholds for filter defaults
// Constrained via `satisfies` so every value must exist in at least one MIN_GAMES_OPTIONS array
export const MIN_GAMES_DEFAULTS = {
  /** Very low threshold - for new player inclusion */
  VERY_LOW: 1,
  /** Low threshold - for basic stats */
  LOW: 10,
  /** Standard threshold - for most statistics */
  STANDARD: 25,
  /** Medium threshold - for reliable averages (also used for min meetings) */
  MEDIUM: 50,
  /** High threshold - for win rates and performance metrics */
  HIGH: 100,
  /** Very high threshold - for competitive rankings */
  VERY_HIGH: 200,
} as const satisfies Record<string, MinGamesOptionValue>;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  /** Items per page for game listings */
  ITEMS_PER_PAGE: 25,
  /** Initial page number */
  INITIAL_PAGE: 1,
} as const;

// Chart-specific defaults (non-min-games values: appearance counts, radius, UI state)
export const CHART_DEFAULTS = {
  /** Minimum wolf appearances for pairing stats */
  MIN_WOLF_APPEARANCES: 2,
  /** Minimum lover appearances for pairing stats */
  MIN_LOVER_APPEARANCES: 1,
  /** Minimum agent appearances for pairing stats */
  MIN_AGENT_APPEARANCES: 1,
  /** Default cluster radius for death maps */
  CLUSTER_RADIUS: 20,
  /** Minimum games to include in camp performance */
  MIN_CAMP_GAMES: 3,
  /** Default selected day for survival view */
  DEFAULT_SELECTED_DAY: 1,
} as const;
