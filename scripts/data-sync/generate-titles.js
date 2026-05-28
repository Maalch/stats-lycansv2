/**
 * Player Titles Generation System — Main Entry Point
 *
 * Orchestrates title generation: loads data, computes statistics, builds titles.
 * Heavy lifting is split across:
 *   - compute/compute-titles-stats.js  (statistics aggregation)
 *   - shared/titleGenerators.js         (title building logic)
 */

import fs from 'fs/promises';
import path from 'path';
import { DATA_SOURCES } from './shared/data-sources.js';
import { computeAllStatistics, computeRoleFrequencies } from './compute/compute-titles-stats.js';
import { generatePlayerTitles, MIN_GAMES_FOR_TITLES, PERCENTILE_THRESHOLDS } from './shared/titleGenerators.js';

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function to generate player titles
 * @param {string} teamKey - Team key from DATA_SOURCES ('main' or 'discord')
 */
async function generateTitles(teamKey = 'main') {
  const dataSource = DATA_SOURCES[teamKey];
  if (!dataSource) {
    console.error(`❌ Unknown team key: ${teamKey}`);
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), dataSource.outputDir);
  const gameLogPath = path.join(outputDir, 'gameLog.json');
  const titlesOutputPath = path.join(outputDir, 'playerTitles.json');

  console.log(`🏷️  Generating player titles for ${dataSource.name}...`);
  console.log(`📁 Output directory: ${outputDir}`);

  try {
    // Load game log
    const gameLogContent = await fs.readFile(gameLogPath, 'utf8');
    const gameLogData = JSON.parse(gameLogContent);

    // Filter modded games only
    const allGames = gameLogData.GameStats || [];
    const moddedGames = allGames.filter(game => game.Modded === true && game.EndDate);

    console.log(`📊 Total games: ${allGames.length}, Modded games: ${moddedGames.length}`);

    if (moddedGames.length === 0) {
      console.log('⚠️  No modded games found, skipping title generation');
      return;
    }

    // Load joueurs.json to resolve canonical player names by Steam ID
    const joueursPath = path.join(outputDir, 'joueurs.json');
    let canonicalNameMap = new Map(); // steamId → canonical name
    try {
      const joueursContent = await fs.readFile(joueursPath, 'utf8');
      const joueursData = JSON.parse(joueursContent);
      for (const player of (joueursData.Players || [])) {
        const steamId = player.SteamID || player.ID;
        if (steamId && player.Joueur) {
          canonicalNameMap.set(String(steamId), player.Joueur);
        }
      }
      console.log(`👤 Loaded ${canonicalNameMap.size} canonical player names from joueurs.json`);
    } catch (e) {
      console.log('  ⚠️  Could not load joueurs.json for canonical name resolution:', e.message);
    }

    // Compute statistics
    const aggregatedStats = computeAllStatistics(moddedGames);
    const roleFrequencies = computeRoleFrequencies(moddedGames);

    // Resolve canonical player names using joueurs.json (Steam ID → canonical name)
    if (canonicalNameMap.size > 0) {
      let resolved = 0;
      aggregatedStats.forEach((data) => {
        const canonical = canonicalNameMap.get(String(data.playerId));
        if (canonical && canonical !== data.playerName) {
          console.log(`  🔄 ${data.playerName} → ${canonical} (ID: ${data.playerId})`);
          data.playerName = canonical;
          resolved++;
        }
      });
      if (resolved > 0) {
        console.log(`  ✅ Resolved ${resolved} player name(s) to canonical form`);
      }
    }

    // Generate titles
    const playerTitles = generatePlayerTitles(aggregatedStats, roleFrequencies);

    // Prepare output
    const output = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      teamName: dataSource.name,
      totalPlayers: Object.keys(playerTitles).length,
      minGamesRequired: MIN_GAMES_FOR_TITLES,
      moddedGamesAnalyzed: moddedGames.length,
      percentileThresholds: PERCENTILE_THRESHOLDS,
      players: playerTitles
    };

    // Save titles
    await fs.writeFile(titlesOutputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`✅ Generated titles for ${Object.keys(playerTitles).length} players`);
    console.log(`📁 Saved to: ${titlesOutputPath}`);

    // Print summary
    const totalTitles = Object.values(playerTitles).reduce(
      (sum, p) => sum + (p.titles?.length || 0), 0
    );
    console.log(`📊 Total titles assigned: ${totalTitles}`);

    // Show top players by title count
    const topByTitles = Object.entries(playerTitles)
      .sort((a, b) => (b[1].titles?.length || 0) - (a[1].titles?.length || 0))
      .slice(0, 5);

    console.log('\n🏅 Top players by title count:');
    topByTitles.forEach(([_, data], i) => {
      console.log(`   ${i + 1}. ${data.playerName}: ${data.titles?.length || 0} titles`);
      if (data.primaryTitle) {
        console.log(`      Primary: ${data.primaryTitle.emoji} ${data.primaryTitle.title}`);
      }
    });

  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const teamKey = args[0] || 'main';

generateTitles(teamKey);

export { generateTitles };
