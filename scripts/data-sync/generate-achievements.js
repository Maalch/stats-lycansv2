/**
 * Player Achievements Generation System
 * 
 * Generates permanent, level-based achievements for players based on their game history.
 * Unlike Rankings (comparative) or Titles (percentile-based), achievements are absolute
 * thresholds that once unlocked, are never revoked.
 * 
 * Level tiers: ⭐ (1) / ⭐⭐ (2) / ⭐⭐⭐ (3) / 🐺 (4)
 * 
 * Usage:
 *   node generate-achievements.js [main|discord] [-f|--force-full]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import achievement definitions
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CATEGORIES } from './shared/achievementDefinitions.js';

// Import data source configuration
import { DATA_SOURCES } from './shared/data-sources.js';

// Import compute function
import { computeAllAchievements } from './compute/compute-achievements.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main generation function
 * @param {string} sourceKey - 'main' or 'discord'
 */
async function main(sourceKey) {
  const startTime = Date.now();
  
  // Validate source key
  const dataSource = DATA_SOURCES[sourceKey];
  if (!dataSource) {
    console.error(`❌ Unknown data source: ${sourceKey}`);
    console.error(`   Available: ${Object.keys(DATA_SOURCES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🏆 Generating Achievements for ${dataSource.name}`);
  console.log('='.repeat(60));

  // Resolve paths
  const rootDir = path.resolve(__dirname, '../..');
  const dataDir = path.resolve(rootDir, dataSource.outputDir);
  const gameLogPath = path.join(dataDir, 'gameLog.json');
  const joueursPath = path.join(dataDir, 'joueurs.json');
  const outputPath = path.join(dataDir, 'playerAchievements.json');

  // Load game log
  console.log(`\n📂 Loading data from ${dataDir}...`);
  let gameLogRaw;
  try {
    gameLogRaw = await fs.readFile(gameLogPath, 'utf-8');
  } catch (err) {
    console.error(`❌ Cannot read ${gameLogPath}: ${err.message}`);
    process.exit(1);
  }

  const gameLog = JSON.parse(gameLogRaw);
  const allGames = gameLog.GameStats || [];
  console.log(`  📊 Total games: ${allGames.length}`);

  // Load joueurs.json for canonical name resolution
  let joueursData = null;
  try {
    const joueursRaw = await fs.readFile(joueursPath, 'utf-8');
    joueursData = JSON.parse(joueursRaw);
    console.log(`  👥 Joueurs loaded: ${joueursData.Players?.length || 0} players`);
  } catch (err) {
    console.log(`  ⚠️  joueurs.json not found, using game data names`);
  }

  // Compute achievements
  console.log(`\n⚙️  Computing ${ACHIEVEMENT_DEFINITIONS.length} achievements...`);
  const playerResults = computeAllAchievements(allGames, ACHIEVEMENT_DEFINITIONS, joueursData);

  // Build the definitions array for client-side display (strip evaluator internals)
  const clientDefinitions = ACHIEVEMENT_DEFINITIONS.map(def => ({
    id: def.id,
    name: def.name,
    description: def.description,
    explanation: def.explanation,
    emoji: def.emoji,
    category: def.category,
    levels: def.levels,
  }));

  // Build output JSON
  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    teamName: dataSource.name,
    totalPlayers: Object.keys(playerResults).length,
    totalGames: allGames.length,
    categories: ACHIEVEMENT_CATEGORIES,
    achievementDefinitions: clientDefinitions,
    players: playerResults,
  };

  // Write output
  console.log(`\n💾 Writing ${outputPath}...`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // Summary
  const totalUnlocked = Object.values(playerResults).reduce((sum, p) => sum + p.totalUnlocked, 0);
  const maxPossiblePerPlayer = ACHIEVEMENT_DEFINITIONS.reduce((sum, d) => sum + d.levels.length, 0);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Achievement generation complete in ${elapsed}s`);
  console.log(`   📊 ${Object.keys(playerResults).length} players processed`);
  console.log(`   🏆 ${ACHIEVEMENT_DEFINITIONS.length} achievements defined (${maxPossiblePerPlayer} total levels)`);
  console.log(`   ⭐ ${totalUnlocked} total levels unlocked across all players`);
  
  // Per-player summary (top 5 by unlocked count)
  const topPlayers = Object.values(playerResults)
    .sort((a, b) => b.totalUnlocked - a.totalUnlocked)
    .slice(0, 5);
  
  if (topPlayers.length > 0) {
    console.log(`\n   🏅 Top achievers:`);
    for (const p of topPlayers) {
      console.log(`      ${p.playerName}: ${p.totalUnlocked}/${maxPossiblePerPlayer} levels unlocked`);
    }
  }

  console.log('');
}

// Parse CLI args
const args = process.argv.slice(2);
const sourceKey = args.find(a => !a.startsWith('-')) || 'main';

main(sourceKey).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
