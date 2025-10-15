/**
 * Enhanced script to compare two game log files 
 * Tries both ID matching and sequential matching
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
  // Special handling for player names (KillerName property)
  if (property === 'KillerName') {
    const normalizedVal1 = normalizePlayerName(val1);
    const normalizedVal2 = normalizePlayerName(val2);
    if (normalizedVal1 === normalizedVal2) {
      return { match: true, val1, val2, note: `normalized names match (${normalizedVal1})` };
    }
  }
  
  if (JSON.stringify(val1) === JSON.stringify(val2)) {
    return { match: true, val1, val2 };
  }

  // Special handling for different data types
  if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
    return { match: true, val1, val2, note: 'both null/undefined' };
  }
  
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
 * Normalize player names to handle inconsistencies between data sources
 */
function normalizePlayerName(playerName) {
  if (!playerName) return playerName;
  
  // Hard-coded mappings for known inconsistencies
  const nameMap = {
    'khalen': 'Khalen',
    'Khalen': 'Khalen',
    'LuttiLutti': 'Lutti',
    'Lutti': 'Lutti',
    'TL areliaNNNN': 'Areliann',
    'Areliann': 'Areliann'
  };
  
  return nameMap[playerName] || playerName;
}

/**
 * Compare vote targets from votes arrays
 */
function compareVoteTargets(votes1, votes2) {
  const targets1 = (votes1 || []).map(vote => normalizePlayerName(vote.Target)).sort();
  const targets2 = (votes2 || []).map(vote => normalizePlayerName(vote.Target)).sort();
  
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
function compareGames(game1, game2, gameIndex) {
  const differences = [];
  
  // Compare game-level properties
  console.log(`\n=== Comparing Game ${gameIndex + 1} ===`);
  console.log(`File 1: ${game1.Id} | File 2: ${game2.Id}`);
  
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
  
  // Create player maps by normalized username
  const playerMap1 = {};
  const playerMap2 = {};
  
  players1.forEach(player => {
    const normalizedName = normalizePlayerName(player.Username);
    playerMap1[normalizedName] = player;
  });
  
  players2.forEach(player => {
    const normalizedName = normalizePlayerName(player.Username);
    playerMap2[normalizedName] = player;
  });
  
  // Get all unique normalized usernames
  const allUsernames = new Set([...Object.keys(playerMap1), ...Object.keys(playerMap2)]);
  
  for (const username of allUsernames) {
    const player1 = playerMap1[username];
    const player2 = playerMap2[username];
    
    console.log(`\n  --- Player: ${username} ---`);
    if (player1 && player1.Username !== username) {
      console.log(`    📝 File 1 original name: ${player1.Username}`);
    }
    if (player2 && player2.Username !== username) {
      console.log(`    📝 File 2 original name: ${player2.Username}`);
    }
    
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
 * Main comparison function - using sequential matching
 */
function compareGameLogsSequential() {
  console.log('🔍 Loading game log files for sequential comparison...\n');
  
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
  
  // Sequential comparison
  const maxGames = Math.max(games1.length, games2.length);
  const minGames = Math.min(games1.length, games2.length);
  
  console.log(`\nComparing ${minGames} games sequentially (both files)`);
  if (maxGames > minGames) {
    console.log(`Note: ${maxGames - minGames} extra games in one of the files will be ignored`);
  }
  
  let totalDifferences = [];
  let matchingGames = 0;
  let gamesWithDifferences = 0;
  
  for (let i = 0; i < minGames; i++) {
    const game1 = games1[i];
    const game2 = games2[i];
    
    const gameDifferences = compareGames(game1, game2, i);
    if (gameDifferences.length === 0) {
      matchingGames++;
      console.log(`\n✅ Game ${i + 1} matches perfectly!`);
    } else {
      gamesWithDifferences++;
      totalDifferences.push(...gameDifferences.map(diff => ({ 
        gameIndex: i + 1, 
        game1Id: game1.Id,
        game2Id: game2.Id,
        ...diff 
      })));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SEQUENTIAL COMPARISON SUMMARY');
  console.log('='.repeat(80));
  console.log(`Games compared: ${minGames}`);
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
      
      // Group by game for better readability
      const byGame = {};
      diffs.forEach(diff => {
        const gameKey = `Game ${diff.gameIndex} (${diff.game1Id} vs ${diff.game2Id})`;
        if (!byGame[gameKey]) {
          byGame[gameKey] = [];
        }
        byGame[gameKey].push(diff);
      });
      
      Object.entries(byGame).forEach(([gameKey, gameDiffs]) => {
        console.log(`\n  ${gameKey}:`);
        gameDiffs.forEach(diff => {
          const location = diff.username ? `Player ${diff.username}` : 'Game level';
          console.log(`    • ${location}: "${JSON.stringify(diff.file1Value)}" → "${JSON.stringify(diff.file2Value)}"`);
        });
      });
    });
  } else {
    console.log('\n🎉 All games match perfectly when compared sequentially!');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'sequential-comparison-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    file1: FILE1_PATH,
    file2: FILE2_PATH,
    comparisonType: 'sequential',
    summary: {
      gamesCompared: minGames,
      matchingGames,
      gamesWithDifferences,
      totalDifferences: totalDifferences.length,
      extraGamesInFile1: Math.max(0, games1.length - minGames),
      extraGamesInFile2: Math.max(0, games2.length - minGames)
    },
    differences: totalDifferences
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run the comparison
if (require.main === module) {
  compareGameLogsSequential();
}

module.exports = {
  compareGameLogsSequential,
  loadJsonFile,
  extractGames,
  compareValues,
  compareVoteTargets,
  compareGames
};