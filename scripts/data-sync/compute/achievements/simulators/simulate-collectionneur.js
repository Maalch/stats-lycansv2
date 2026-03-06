/**
 * Simulate the "collectionneur" achievement against Main team data
 * Shows who can get the achievement and current best item diversity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load gameLog.json (Main team)
const gameLogPath = path.join(__dirname, '../../../../../data/gameLog.json');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf-8'));
const gameLog = gameLogData.GameStats || [];

console.log(`Loaded ${gameLog.length} games from Main team gameLog.json\n`);

// Group games by player (using Steam ID or Username)
const playerGames = new Map();

for (const game of gameLog) {
  for (const playerStat of game.PlayerStats) {
    const playerId = playerStat.ID || playerStat.Username;
    if (!playerGames.has(playerId)) {
      playerGames.set(playerId, {
        displayName: playerStat.Username,
        games: []
      });
    }
    playerGames.get(playerId).games.push({ game, playerStat });
  }
}

console.log(`Found ${playerGames.size} unique players\n`);

// Evaluate item diversity for each player
const playerResults = [];
const MIN_DISTINCT_ITEMS = 5;

for (const [playerId, data] of playerGames) {
  let qualifyingGames = 0;
  const qualifyingGameIds = [];
  const allDistinctItemCounts = [];
  
  for (const { game, playerStat } of data.games) {
    const actions = playerStat.Actions || [];
    
    // Collect distinct item names from UseGadget and DrinkPotion actions
    const distinctItems = new Set();
    for (const action of actions) {
      if (
        (action.ActionType === 'UseGadget' || action.ActionType === 'DrinkPotion') &&
        action.ActionName
      ) {
        distinctItems.add(action.ActionName);
      }
    }
    
    const distinctCount = distinctItems.size;
    const itemsList = Array.from(distinctItems);
    
    allDistinctItemCounts.push({ 
      gameId: game.DisplayedId || game.Id, 
      distinctCount,
      items: itemsList
    });
    
    if (distinctCount >= MIN_DISTINCT_ITEMS) {
      qualifyingGames++;
      qualifyingGameIds.push(game.DisplayedId || game.Id);
    }
  }
  
  // Sort by distinct item counts to find top games
  allDistinctItemCounts.sort((a, b) => b.distinctCount - a.distinctCount);
  
  playerResults.push({
    playerId,
    displayName: data.displayName,
    totalGames: data.games.length,
    qualifyingGames,
    qualifyingGameIds,
    topItemCounts: allDistinctItemCounts.slice(0, 5), // Top 5 games
    averageTopDistinctItems: allDistinctItemCounts.length > 0 ? 
      allDistinctItemCounts.slice(0, 5).reduce((sum, g) => sum + g.distinctCount, 0) / Math.min(5, allDistinctItemCounts.length) : 0,
    maxDistinctItems: allDistinctItemCounts.length > 0 ? allDistinctItemCounts[0].distinctCount : 0
  });
}

// Sort by qualifying games (descending)
playerResults.sort((a, b) => b.qualifyingGames - a.qualifyingGames);

// Achievement thresholds
const THRESHOLDS = {
  bronze: 5,
  argent: 10,
  or: 15,
  lycans: 30
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('  COLLECTIONNEUR ACHIEVEMENT SIMULATION - MAIN TEAM');
console.log('  Requirement: Use at least 5 different items in a game');
console.log('═══════════════════════════════════════════════════════════════\n');

// Show players who qualify for each tier
console.log('🏆 PLAYERS WHO QUALIFY:\n');

let hasQualifiers = false;
for (const tier of ['lycans', 'or', 'argent', 'bronze']) {
  const qualifiers = playerResults.filter(p => p.qualifyingGames >= THRESHOLDS[tier]);
  if (qualifiers.length > 0) {
    hasQualifiers = true;
    console.log(`\n${tier.toUpperCase()} Tier (${THRESHOLDS[tier]}+ games):`);
    console.log('─'.repeat(60));
    for (const player of qualifiers) {
      console.log(`  ${player.displayName}: ${player.qualifyingGames} qualifying games (max: ${player.maxDistinctItems} items)`);
    }
  }
}

if (!hasQualifiers) {
  console.log('  ❌ No players qualify for any tier yet!\n');
}

// Show top 20 players with most qualifying games
console.log('\n\n📊 TOP 20 PLAYERS BY QUALIFYING GAMES:\n');
console.log('Rank | Player Name              | Qualifying | Total | % of Games | Avg Top 5  | Max');
console.log('─'.repeat(95));

for (let i = 0; i < Math.min(20, playerResults.length); i++) {
  const player = playerResults[i];
  const percentOfGames = ((player.qualifyingGames / player.totalGames) * 100).toFixed(1);
  const avgTop5 = player.averageTopDistinctItems.toFixed(1);
  
  const rank = String(i + 1).padStart(4);
  const name = player.displayName.padEnd(24);
  const qualifying = String(player.qualifyingGames).padStart(10);
  const total = String(player.totalGames).padStart(5);
  const pctGames = String(percentOfGames + '%').padStart(10);
  const avgItems = String(avgTop5 + ' items').padStart(10);
  const maxItems = String(player.maxDistinctItems).padStart(3);
  
  console.log(`${rank} | ${name} | ${qualifying} | ${total} | ${pctGames} | ${avgItems} | ${maxItems}`);
}

// Show top 5 players by highest single-game distinct item count
console.log('\n\n🥇 TOP 5 PLAYERS BY HIGHEST SINGLE-GAME ITEM DIVERSITY:\n');

const sortedByMaxItems = [...playerResults].sort((a, b) => b.maxDistinctItems - a.maxDistinctItems);

console.log('Rank | Player Name              | Max Items | Game ID                        | Total Games');
console.log('─'.repeat(95));

for (let i = 0; i < Math.min(5, sortedByMaxItems.length); i++) {
  const player = sortedByMaxItems[i];
  const topGame = player.topItemCounts[0]; // Highest diversity game
  
  const rank = String(i + 1).padStart(4);
  const name = player.displayName.padEnd(24);
  const maxItems = String(player.maxDistinctItems + ' items').padStart(9);
  const gameId = topGame ? (topGame.gameId || 'N/A').padEnd(30) : 'N/A'.padEnd(30);
  const totalGames = String(player.totalGames).padStart(11);
  
  console.log(`${rank} | ${name} | ${maxItems} | ${gameId} | ${totalGames}`);
  
  // Show the items used in that game
  if (topGame && topGame.items && topGame.items.length > 0) {
    console.log(`      Items: ${topGame.items.join(', ')}`);
  }
}

// Show detailed stats for top 5 players
console.log('\n\n🔍 DETAILED STATS FOR TOP 5 PLAYERS:\n');

for (let i = 0; i < Math.min(5, playerResults.length); i++) {
  const player = playerResults[i];
  console.log(`\n${i + 1}. ${player.displayName}`);
  console.log(`   Total Games: ${player.totalGames}`);
  console.log(`   Qualifying Games (≥5 items): ${player.qualifyingGames}`);
  console.log(`   Next Tier: ${player.qualifyingGames < THRESHOLDS.bronze ? 
    `Bronze (need ${THRESHOLDS.bronze - player.qualifyingGames} more)` :
    player.qualifyingGames < THRESHOLDS.argent ? 
    `Argent (need ${THRESHOLDS.argent - player.qualifyingGames} more)` :
    player.qualifyingGames < THRESHOLDS.or ? 
    `Or (need ${THRESHOLDS.or - player.qualifyingGames} more)` :
    player.qualifyingGames < THRESHOLDS.lycans ? 
    `Lycans (need ${THRESHOLDS.lycans - player.qualifyingGames} more)` :
    'MAX (Lycans tier achieved!)'
  }`);
  console.log('   Top 5 Item Diversity Games:');
  for (const game of player.topItemCounts) {
    const qualifier = game.distinctCount >= MIN_DISTINCT_ITEMS ? '✓' : '✗';
    console.log(`     ${qualifier} Game ${game.gameId}: ${game.distinctCount} distinct items`);
    if (game.items && game.items.length > 0) {
      console.log(`        Items: ${game.items.join(', ')}`);
    }
  }
}

console.log('\n\n═══════════════════════════════════════════════════════════════\n');
