/**
 * Battle Royale Achievement Evaluators
 * 
 * Evaluators for BR-specific achievements. These use rawBRData format:
 * { Game, Participants, Score, Gagnant }
 * Only available for 'main' team — discord has no BR data.
 */

/**
 * Count BR victories
 */
export function brWins(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  for (const entry of playerBRGames) {
    if (entry.Gagnant) {
      value++;
      gameIds.push(`BR-${entry.Game}`);
    }
  }
  return { value, gameIds };
}

/**
 * Count BR participations
 */
export function brParticipations(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  for (const entry of playerBRGames) {
    value++;
    gameIds.push(`BR-${entry.Game}`);
  }
  return { value, gameIds };
}

/**
 * Count total BR kills
 */
export function brTotalKills(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  for (const entry of playerBRGames) {
    if (entry.Score > 0) {
      value += entry.Score;
      gameIds.push(`BR-${entry.Game}`);
    }
  }
  return { value, gameIds };
}

/**
 * Count BR games with 0 kills
 */
export function brZeroKillGames(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  for (const entry of playerBRGames) {
    if (entry.Score === 0) {
      value++;
      gameIds.push(`BR-${entry.Game}`);
    }
  }
  return { value, gameIds };
}

/**
 * Max kills in a single BR game (returns max score, gameIds ordered by when each threshold was first reached)
 */
export function brHighKillGame(playerBRGames, brData) {
  // For this achievement, we need to track when each kill threshold was first reached
  // Sort games by game number to maintain chronological order
  const sortedGames = [...playerBRGames].sort((a, b) => a.Game - b.Game);
  
  const gameIds = [];
  let maxSoFar = 0;
  
  for (const entry of sortedGames) {
    if (entry.Score > maxSoFar) {
      // New record - add this game ID
      gameIds.push(`BR-${entry.Game}`);
      maxSoFar = entry.Score;
    }
  }
  
  return { value: maxSoFar, gameIds };
}

/**
 * Count BR games where player had top kills but still lost
 */
export function brTopKillsButLoss(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  
  // Group all BR entries by game number
  const gameParticipants = new Map();
  for (const entry of brData) {
    if (!gameParticipants.has(entry.Game)) {
      gameParticipants.set(entry.Game, []);
    }
    gameParticipants.get(entry.Game).push(entry);
  }
  
  for (const entry of playerBRGames) {
    // Must be a loss
    if (entry.Gagnant) continue;
    
    // Get all participants in this game
    const participants = gameParticipants.get(entry.Game) || [];
    
    // Find max score in this game
    const maxScore = Math.max(...participants.map(p => p.Score));
    
    // Player must have top score (or tied for top)
    if (entry.Score === maxScore && maxScore > 0) {
      value++;
      gameIds.push(`BR-${entry.Game}`);
    }
  }
  return { value, gameIds };
}

/**
 * Count BR games where player had 5 or more kills
 */
export function brLuckyLuke(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  for (const entry of playerBRGames) {
    if (entry.Score >= 5) {
      value++;
      gameIds.push(`BR-${entry.Game}`);
    }
  }
  return { value, gameIds };
}

/**
 * Count BR victories with exactly 1 kill
 */
export function brOneShotVictory(playerBRGames, brData) {
  const gameIds = [];
  let value = 0;
  for (const entry of playerBRGames) {
    if (entry.Gagnant && entry.Score === 1) {
      value++;
      gameIds.push(`BR-${entry.Game}`);
    }
  }
  return { value, gameIds };
}
