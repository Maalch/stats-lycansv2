/**
 * Simulate the "bavard" achievement against main team data
 * Shows who can get the achievement and current best percentages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load gameLog.json (Discord team)
const gameLogPath = path.join(__dirname, '../../../../../data/discord/gameLog.json');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf-8'));
const gameLog = gameLogData.GameStats || [];

console.log(`Loaded ${gameLog.length} games from Discord team gameLog.json\n`);

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

// Evaluate talking percentage for each player
const playerResults = [];
const MIN_PERCENTAGE = 50;

for (const [playerId, data] of playerGames) {
  let qualifyingGames = 0;
  const qualifyingGameIds = [];
  const allPercentages = [];
  
  for (const { game, playerStat } of data.games) {
    const totalTalked = (playerStat.SecondsTalkedOutsideMeeting || 0) + 
                       (playerStat.SecondsTalkedDuringMeeting || 0);
    
    const gameDurationSec = (new Date(game.EndDate) - new Date(game.StartDate)) / 1000;
    
    if (gameDurationSec > 0) {
      const pct = (totalTalked / gameDurationSec) * 100;
      allPercentages.push({ 
        gameId: game.DisplayedId || game.Id, 
        pct, 
        totalTalked, 
        gameDuration: gameDurationSec 
      });
      
      if (pct >= MIN_PERCENTAGE) {
        qualifyingGames++;
        qualifyingGameIds.push(game.DisplayedId || game.Id);
      }
    }
  }
  
  // Sort percentages to find top games
  allPercentages.sort((a, b) => b.pct - a.pct);
  
  playerResults.push({
    playerId,
    displayName: data.displayName,
    totalGames: data.games.length,
    qualifyingGames,
    qualifyingGameIds,
    topPercentages: allPercentages.slice(0, 5), // Top 5 games
    averageTopPercentage: allPercentages.length > 0 ? 
      allPercentages.slice(0, 5).reduce((sum, g) => sum + g.pct, 0) / Math.min(5, allPercentages.length) : 0
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
console.log('  BAVARD ACHIEVEMENT SIMULATION - DISCORD TEAM');
console.log('  Requirement: Talk at least 50% of game duration');
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
      console.log(`  ${player.displayName}: ${player.qualifyingGames} qualifying games`);
    }
  }
}

if (!hasQualifiers) {
  console.log('  ❌ No players qualify for any tier yet!\n');
}

// Show top 20 players with most qualifying games
console.log('\n\n📊 TOP 20 PLAYERS BY QUALIFYING GAMES:\n');
console.log('Rank | Player Name              | Qualifying | Total | % of Games | Avg Top 5%');
console.log('─'.repeat(85));

for (let i = 0; i < Math.min(20, playerResults.length); i++) {
  const player = playerResults[i];
  const percentOfGames = ((player.qualifyingGames / player.totalGames) * 100).toFixed(1);
  const avgTop5 = player.averageTopPercentage.toFixed(1);
  
  const rank = String(i + 1).padStart(4);
  const name = player.displayName.padEnd(24);
  const qualifying = String(player.qualifyingGames).padStart(10);
  const total = String(player.totalGames).padStart(5);
  const pctGames = String(percentOfGames + '%').padStart(10);
  const avgPct = String(avgTop5 + '%').padStart(10);
  
  console.log(`${rank} | ${name} | ${qualifying} | ${total} | ${pctGames} | ${avgPct}`);
}

// Show detailed stats for top 5 players
console.log('\n\n🔍 DETAILED STATS FOR TOP 5 PLAYERS:\n');

for (let i = 0; i < Math.min(5, playerResults.length); i++) {
  const player = playerResults[i];
  console.log(`\n${i + 1}. ${player.displayName}`);
  console.log(`   Total Games: ${player.totalGames}`);
  console.log(`   Qualifying Games (≥50%): ${player.qualifyingGames}`);
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
  console.log('   Top 5 Talking % Games:');
  for (const game of player.topPercentages) {
    const minutes = (game.totalTalked / 60).toFixed(1);
    const gameMinutes = (game.gameDuration / 60).toFixed(1);
    console.log(`     - Game ${game.gameId}: ${game.pct.toFixed(1)}% (${minutes}min / ${gameMinutes}min)`);
  }
}

console.log('\n\n═══════════════════════════════════════════════════════════════\n');
