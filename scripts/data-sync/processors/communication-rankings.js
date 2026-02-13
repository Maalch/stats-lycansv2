/**
 * Communication Rankings Processor
 * Processes talking time statistics to generate communication-related Rankings
 */

/**
 * Process communication Rankings for a specific player
 * @param {Object} talkingStats - Talking time statistics object
 * @param {string} playerId - Player ID to generate Rankings for
 * @param {string} suffix - Suffix for Ranking title (e.g., " (Parties Moddées)")
 * @returns {Array} - Array of Ranking objects
 */
export function processCommunicationRankings(talkingStats, playerId, suffix) {
  const Rankings = [];

  if (!talkingStats || !talkingStats.playerStats || talkingStats.playerStats.length === 0) {
    return Rankings;
  }

  // Minimum games threshold for talking time Rankings
  // Note: Talking time data only available since version 0.215
  const MIN_GAMES_TALKING = 15;

  // Filter players with enough games with talking data
  const eligiblePlayers = talkingStats.playerStats.filter(p => p.gamesPlayed >= MIN_GAMES_TALKING);

  if (eligiblePlayers.length === 0) {
    return Rankings;
  }

  // Sort by total talking time (normalized per 60 min)
  const sortedByTotalTalking = [...eligiblePlayers].sort((a, b) => b.secondsAllPer60Min - a.secondsAllPer60Min);

  // Find player's position in the ranking
  const playerIndex = sortedByTotalTalking.findIndex(p => p.playerId === playerId);

  if (playerIndex === -1) {
    return Rankings; // Player not found or doesn't meet minimum games
  }

  const playerStats = sortedByTotalTalking[playerIndex];
  const playerValue = playerStats.secondsAllPer60Min;
  
  // Calculate true rank considering ties
  let rank = 1;
  for (let i = 0; i < playerIndex; i++) {
    if (sortedByTotalTalking[i].secondsAllPer60Min > playerValue) {
      rank++;
    }
  }
  
  const totalRanked = sortedByTotalTalking.length;

  // 🎤 Most Talkative - All eligible players get a ranking Ranking
  const minutes = Math.floor(playerStats.secondsAllPer60Min / 60);
  const seconds = Math.floor(playerStats.secondsAllPer60Min % 60);
  const timeFormatted = `${minutes}m ${seconds}s`;

  Rankings.push({
    id: `communication-most-talkative${suffix.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-')}`,
    title: `🎤 Rang ${rank} Temps de Parole${suffix}`,
    description: `${rank}${rank === 1 ? 'er' : 'ème'} joueur le plus bavard avec ${timeFormatted} par heure de jeu (minimum ${MIN_GAMES_TALKING} parties avec données)`,
    type: 'good',
    category: 'communication',
    rank: rank,
    value: playerStats.secondsAllPer60Min,
    totalRanked: totalRanked,
    redirectTo: {
      tab: 'rankings',
      subTab: 'talkingTime',
      filters: {
        moddedGames: suffix.includes('Moddées') ? true : false,
        minGames: MIN_GAMES_TALKING
      }
    }
  });

  return Rankings;
}
