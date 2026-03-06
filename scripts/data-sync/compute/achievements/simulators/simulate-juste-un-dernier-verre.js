/**
 * Simulate the "juste-un-dernier-verre" achievement against Discord team data
 * Shows who can get the achievement and current best potion consumption
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

// Evaluate potion consumption for each player
const playerResults = [];
const MIN_POTIONS = 5;

for (const [playerId, data] of playerGames) {
  let qualifyingGames = 0;
  const qualifyingGameIds = [];
  const allPotionCounts = [];
  
  for (const { game, playerStat } of data.games) {
    const actions = playerStat.Actions || [];
    
    // Count only DrinkPotion actions
    const potionCount = actions.filter(a => a.ActionType === 'DrinkPotion').length;
    
    allPotionCounts.push({ 
      gameId: game.DisplayedId || game.Id, 
      potionCount 
    });
    
    if (potionCount >= MIN_POTIONS) {
      qualifyingGames++;
      qualifyingGameIds.push(game.DisplayedId || game.Id);
    }
  }
  
  // Sort potion counts to find top games
  allPotionCounts.sort((a, b) => b.potionCount - a.potionCount);
  
  playerResults.push({
    playerId,
    displayName: data.displayName,
    totalGames: data.games.length,
    qualifyingGames,
    qualifyingGameIds,
    topPotionCounts: allPotionCounts.slice(0, 5), // Top 5 games
    averageTopPotions: allPotionCounts.length > 0 ? 
      allPotionCounts.slice(0, 5).reduce((sum, g) => sum + g.potionCount, 0) / Math.min(5, allPotionCounts.length) : 0,
    maxPotions: allPotionCounts.length > 0 ? allPotionCounts[0].potionCount : 0
  });
}

// Sort by qualifying games (descending)
playerResults.sort((a, b) => b.qualifyingGames - a.qualifyingGames);

// Achievement thresholds
const THRESHOLDS = {
  bronze: 3,
  argent: 5,
  or: 10,
  lycans: 20
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('  JUSTE UN DERNIER VERRE ACHIEVEMENT SIMULATION - MAIN TEAM');
console.log(`  Requirement: Drink at least ${MIN_POTIONS} potions in a game`);
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
      console.log(`  ${player.displayName}: ${player.qualifyingGames} qualifying games (max: ${player.maxPotions} potions)`);
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
  const avgTop5 = player.averageTopPotions.toFixed(1);
  
  const rank = String(i + 1).padStart(4);
  const name = player.displayName.padEnd(24);
  const qualifying = String(player.qualifyingGames).padStart(10);
  const total = String(player.totalGames).padStart(5);
  const pctGames = String(percentOfGames + '%').padStart(10);
  const avgPotions = String(avgTop5 + ' potions').padStart(10);
  const maxPotions = String(player.maxPotions).padStart(3);
  
  console.log(`${rank} | ${name} | ${qualifying} | ${total} | ${pctGames} | ${avgPotions} | ${maxPotions}`);
}

// Show detailed stats for top 10 players
console.log('\n\n🔍 DETAILED STATS FOR TOP 10 PLAYERS:\n');

for (let i = 0; i < Math.min(10, playerResults.length); i++) {
  const player = playerResults[i];
  console.log(`\n${i + 1}. ${player.displayName}`);
  console.log(`   Total Games: ${player.totalGames}`);
  console.log(`   Qualifying Games (≥${MIN_POTIONS} potions): ${player.qualifyingGames}`);
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
  console.log('   Top 10  Potion Consumption Games:');
  for (const game of player.topPotionCounts) {
    const qualifier = game.potionCount >= MIN_POTIONS ? '✓' : '✗';
    console.log(`     ${qualifier} Game ${game.gameId}: ${game.potionCount} potions`);
  }
}

// Show top 10 players by highest single-game potion count
console.log('\n\n🥇 TOP 10 PLAYERS BY HIGHEST SINGLE-GAME POTION RECORD:\n');

const sortedByMaxPotions = [...playerResults].sort((a, b) => b.maxPotions - a.maxPotions);

console.log('Rank | Player Name              | Max Potions | Game ID                        | Total Games');
console.log('─'.repeat(95));

for (let i = 0; i < Math.min(10, sortedByMaxPotions.length); i++) {
  const player = sortedByMaxPotions[i];
  const topGame = player.topPotionCounts[0]; // Highest potion game
  
  const rank = String(i + 1).padStart(4);
  const name = player.displayName.padEnd(24);
  const maxPot = String(player.maxPotions + ' potions').padStart(11);
  const gameId = topGame ? (topGame.gameId || 'N/A').padEnd(30) : 'N/A'.padEnd(30);
  const totalGames = String(player.totalGames).padStart(11);
  
  console.log(`${rank} | ${name} | ${maxPot} | ${gameId} | ${totalGames}`);
}

console.log('\n\n═══════════════════════════════════════════════════════════════\n');
