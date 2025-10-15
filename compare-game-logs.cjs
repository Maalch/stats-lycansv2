/**
 * Script to compare two game log files for the same games
 * Compares specific properties at game and player levels
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FILE1_PATH = path.join(__dirname, 'ExternalData', 'Ponce-20251009114146.json');
const FILE2_PATH = path.join(__dirname, 'ExternalData', '20251009.json');

// Properties to compare at game level
const GAME_PROPERTIES = ['MapName', 'HarvestGoal', 'HarvestDone', 'EndTiming'];

// Properties to compare at player level
const PLAYER_PROPERTIES = [
  'MainRoleInitial',
  'MainRoleChanges',
  'Power',
  'SecondaryRole',
  'DeathTiming',
  'DeathType',
  'KillerName',
  'Victorious'
];

/**
 * Load and parse JSON file
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract games from different file structures
 */
function extractGames(data, fileName) {
  if (Array.isArray(data)) {
    return data;
  } else if (data.GameStats && Array.isArray(data.GameStats)) {
    return data.GameStats;
  } else if (data.games && Array.isArray(data.games)) {
    return data.games;
  } else {
    console.warn(`Unknown structure in ${fileName}:`, Object.keys(data));
    return [];
  }
}

/**
 * Compare two values with detailed analysis
 */
function compareValues(val1, val2, property, context) {
  if (JSON.stringify(val1) === JSON.stringify(val2)) {
    return { match: true, val1, val2 };
  }

  // Special handling for different data types
  if (val1 === null && val2 === undefined || val1 === undefined && val2 === null) {
    return { match: true, val1, val2, note: 'null/undefined equivalence' };
  }

  // For arrays (like MainRoleChanges), compare more carefully
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length === 0 && val2.length === 0) {
      return { match: true, val1, val2, note: 'both empty arrays' };
    }
  }

  return { match: false, val1, val2 };
}

/**
 * Compare vote targets from votes arrays
 */
function compareVoteTargets(votes1, votes2) {
  const targets1 = (votes1 || []).map(vote => vote.Target).sort();
  const targets2 = (votes2 || []).map(vote => vote.Target).sort();
  
  return {
    match: JSON.stringify(targets1) === JSON.stringify(targets2),
    targets1,
    targets2,
    count1: targets1.length,
    count2: targets2.length
  };
}

/**
 * Compare two games
 */
function compareGames(game1, game2) {
  const differences = [];
  
  // Compare game-level properties
  console.log(`\n=== Comparing Game ${game1.Id} ===`);
  
  for (const prop of GAME_PROPERTIES) {
    const result = compareValues(game1[prop], game2[prop], prop, 'game');
    if (!result.match) {
      differences.push({
        type: 'game',
        property: prop,
        file1Value: result.val1,
        file2Value: result.val2
      });
      console.log(`❌ ${prop}: "${result.val1}" vs "${result.val2}"`);
    } else {
      console.log(`✅ ${prop}: ${result.note ? `${JSON.stringify(result.val1)} (${result.note})` : JSON.stringify(result.val1)}`);
    }
  }

  // Compare players
  const players1 = game1.PlayerStats || [];
  const players2 = game2.PlayerStats || [];
  
  console.log(`\nPlayer comparison (${players1.length} vs ${players2.length} players):`);
  
  // Create player maps by username
  const playerMap1 = {};
  const playerMap2 = {};
  
  players1.forEach(player => {
    playerMap1[player.Username] = player;
  });
  
  players2.forEach(player => {
    playerMap2[player.Username] = player;
  });
  
  // Get all unique usernames
  const allUsernames = new Set([...Object.keys(playerMap1), ...Object.keys(playerMap2)]);
  
  for (const username of allUsernames) {
    const player1 = playerMap1[username];
    const player2 = playerMap2[username];
    
    console.log(`\n  --- Player: ${username} ---`);
    
    if (!player1) {
      console.log(`    ❌ Player missing in file 1`);
      differences.push({
        type: 'player',
        username,
        property: 'existence',
        file1Value: 'missing',
        file2Value: 'present'
      });
      continue;
    }
    
    if (!player2) {
      console.log(`    ❌ Player missing in file 2`);
      differences.push({
        type: 'player',
        username,
        property: 'existence',
        file1Value: 'present',
        file2Value: 'missing'
      });
      continue;
    }
    
    // Compare player properties
    for (const prop of PLAYER_PROPERTIES) {
      const result = compareValues(player1[prop], player2[prop], prop, `player ${username}`);
      if (!result.match) {
        differences.push({
          type: 'player',
          username,
          property: prop,
          file1Value: result.val1,
          file2Value: result.val2
        });
        console.log(`    ❌ ${prop}: "${JSON.stringify(result.val1)}" vs "${JSON.stringify(result.val2)}"`);
      } else {
        console.log(`    ✅ ${prop}: ${result.note ? `${JSON.stringify(result.val1)} (${result.note})` : JSON.stringify(result.val1)}`);
      }
    }
    
    // Compare vote targets
    const voteComparison = compareVoteTargets(player1.Votes, player2.Votes);
    if (!voteComparison.match) {
      differences.push({
        type: 'player',
        username,
        property: 'VoteTargets',
        file1Value: voteComparison.targets1,
        file2Value: voteComparison.targets2
      });
      console.log(`    ❌ Vote Targets: [${voteComparison.targets1.join(', ')}] vs [${voteComparison.targets2.join(', ')}] (${voteComparison.count1} vs ${voteComparison.count2} votes)`);
    } else {
      console.log(`    ✅ Vote Targets: [${voteComparison.targets1.join(', ')}] (${voteComparison.count1} votes)`);
    }
  }
  
  return differences;
}

/**
 * Main comparison function
 */
function compareGameLogs() {
  console.log('🔍 Loading game log files...\n');
  
  const data1 = loadJsonFile(FILE1_PATH);
  const data2 = loadJsonFile(FILE2_PATH);
  
  if (!data1 || !data2) {
    console.error('Failed to load one or both files');
    return;
  }
  
  const games1 = extractGames(data1, 'File 1');
  const games2 = extractGames(data2, 'File 2');
  
  console.log(`File 1: ${games1.length} games`);
  console.log(`File 2: ${games2.length} games`);
  
  if (games1.length === 0 || games2.length === 0) {
    console.error('No games found in one or both files');
    return;
  }
  
  // Create game maps by ID
  const gameMap1 = {};
  const gameMap2 = {};
  
  games1.forEach(game => {
    gameMap1[game.Id] = game;
  });
  
  games2.forEach(game => {
    gameMap2[game.Id] = game;
  });
  
  // Get all unique game IDs
  const allGameIds = new Set([...Object.keys(gameMap1), ...Object.keys(gameMap2)]);
  console.log(`\nFound ${allGameIds.size} unique game IDs to compare\n`);
  
  let totalDifferences = [];
  let matchingGames = 0;
  let gamesWithDifferences = 0;
  
  for (const gameId of allGameIds) {
    const game1 = gameMap1[gameId];
    const game2 = gameMap2[gameId];
    
    if (!game1) {
      console.log(`❌ Game ${gameId} missing in file 1`);
      totalDifferences.push({
        gameId,
        type: 'game',
        property: 'existence',
        file1Value: 'missing',
        file2Value: 'present'
      });
      continue;
    }
    
    if (!game2) {
      console.log(`❌ Game ${gameId} missing in file 2`);
      totalDifferences.push({
        gameId,
        type: 'game',
        property: 'existence',
        file1Value: 'present',
        file2Value: 'missing'
      });
      continue;
    }
    
    const gameDifferences = compareGames(game1, game2);
    if (gameDifferences.length === 0) {
      matchingGames++;
      console.log(`\n✅ Game ${gameId} matches perfectly!`);
    } else {
      gamesWithDifferences++;
      totalDifferences.push(...gameDifferences.map(diff => ({ gameId, ...diff })));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total games compared: ${allGameIds.size}`);
  console.log(`Games matching perfectly: ${matchingGames}`);
  console.log(`Games with differences: ${gamesWithDifferences}`);
  console.log(`Total differences found: ${totalDifferences.length}`);
  
  if (totalDifferences.length > 0) {
    console.log('\n📋 DETAILED DIFFERENCES:');
    console.log('-'.repeat(80));
    
    const groupedDifferences = {};
    totalDifferences.forEach(diff => {
      const key = `${diff.type}-${diff.property}`;
      if (!groupedDifferences[key]) {
        groupedDifferences[key] = [];
      }
      groupedDifferences[key].push(diff);
    });
    
    Object.entries(groupedDifferences).forEach(([key, diffs]) => {
      console.log(`\n${key.toUpperCase()}: ${diffs.length} differences`);
      diffs.forEach(diff => {
        const location = diff.username ? `Game ${diff.gameId}, Player ${diff.username}` : `Game ${diff.gameId}`;
        console.log(`  • ${location}: "${JSON.stringify(diff.file1Value)}" → "${JSON.stringify(diff.file2Value)}"`);
      });
    });
  } else {
    console.log('\n🎉 All games match perfectly across both files!');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'game-comparison-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    file1: FILE1_PATH,
    file2: FILE2_PATH,
    summary: {
      totalGames: allGameIds.size,
      matchingGames,
      gamesWithDifferences,
      totalDifferences: totalDifferences.length
    },
    differences: totalDifferences
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run the comparison
if (require.main === module) {
  compareGameLogs();
}

module.exports = {
  compareGameLogs,
  loadJsonFile,
  extractGames,
  compareValues,
  compareVoteTargets,
  compareGames
};