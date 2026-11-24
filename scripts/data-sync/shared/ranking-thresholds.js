const MIN_GAMES_RATIOS = {
  5: 0.01,
  10: 0.02,
  15: 0.02,
  20: 0.05,
  25: 0.05,
  30: 0.05,
  50: 0.1
};

/**
 * Get the dynamic game minimum for a ranking while preserving its base minimum.
 * @param {number} baseMinimumGames - Static minimum used as the threshold floor
 * @param {number} totalGames - Total games in the dataset being ranked
 * @returns {number}
 */
export function getMinimumGamesThreshold(baseMinimumGames, totalGames) {
  const ratio = MIN_GAMES_RATIOS[baseMinimumGames];
  if (ratio === undefined) return baseMinimumGames;

  return Math.max(baseMinimumGames, Math.ceil(totalGames * ratio));
}
