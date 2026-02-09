/**
 * Export Chasseur Role Frequency and Hunter Accuracy Stats
 * 
 * Extracts roleChasseur assignment frequency and hunterAccuracy values
 * for all players from the title generation computation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compute functions
import { computeHunterStatistics } from '../compute/compute-hunter-stats.js';

// Import data source configuration
import { DATA_SOURCES } from '../shared/data-sources.js';

const MIN_GAMES_FOR_ROLE_TITLES = 10;

/**
 * Compute role assignment frequencies from game data
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Map} - Role frequencies by player
 */
function computeRoleFrequencies(moddedGames) {
  const roleFrequencies = new Map();

  moddedGames.forEach(game => {
    if (!game.PlayerStats) return;
    
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      
      if (!roleFrequencies.has(playerId)) {
        roleFrequencies.set(playerId, {
          playerId,
          playerName: player.Username,
          gamesPlayed: 0,
          roles: {}
        });
      }
      
      const freq = roleFrequencies.get(playerId);
      freq.gamesPlayed++;
      
      let role = player.MainRoleInitial;
      const power = player.Power;
      
      // Normalize Amoureux role variants (Amoureux Loup, Amoureux Villageois) to just "Amoureux"
      // This matches the game's victory logic where all lovers are treated as the same role
      if (role === 'Amoureux Loup' || role === 'Amoureux Villageois') {
        role = 'Amoureux';
      }
      
      // Track specific roles
      const effectiveRole = power || role;
      freq.roles[effectiveRole] = (freq.roles[effectiveRole] || 0) + 1;
    });
  });

  return roleFrequencies;
}

/**
 * Export Chasseur statistics for all players
 * @param {string} teamKey - Team key from DATA_SOURCES ('main' or 'discord')
 */
async function exportChasseurStats(teamKey = 'main') {
  const dataSource = DATA_SOURCES[teamKey];
  if (!dataSource) {
    console.error(`❌ Unknown team key: ${teamKey}`);
    process.exit(1);
  }

  // Resolve from the project root (3 levels up from titleCheck/)
  const projectRoot = path.resolve(__dirname, '../../..');
  const outputDir = path.resolve(projectRoot, dataSource.outputDir);
  const gameLogPath = path.join(outputDir, 'gameLog.json');
  const exportPath = path.join(__dirname, `chasseur-stats-${teamKey}.json`);

  console.log(`🎯 Exporting Chasseur stats for ${dataSource.name}...`);
  console.log(`📁 Data directory: ${outputDir}`);

  try {
    // Load game log
    const gameLogContent = await fs.readFile(gameLogPath, 'utf8');
    const gameLogData = JSON.parse(gameLogContent);

    // Filter modded games only
    const allGames = gameLogData.GameStats || [];
    const moddedGames = allGames.filter(game => game.Modded === true && game.EndDate);

    console.log(`📊 Total games: ${allGames.length}, Modded games: ${moddedGames.length}`);

    if (moddedGames.length === 0) {
      console.log('⚠️  No modded games found!');
      return;
    }

    // Compute role frequencies
    const roleFrequencies = computeRoleFrequencies(moddedGames);
    
    // Compute hunter statistics
    const hunterStats = computeHunterStatistics(moddedGames);

    // Build chasseur stats for each player
    const chasseurStats = [];

    roleFrequencies.forEach((roleData, playerId) => {
      const playerName = roleData.playerName;
      const gamesPlayed = roleData.gamesPlayed;
      
      // Get Chasseur role frequency
      const chasseurGames = roleData.roles['Chasseur'] || 0;
      const chasseurPercentage = gamesPlayed > 0 ? (chasseurGames / gamesPlayed) * 100 : 0;
      
      // Get hunter accuracy
      const hunterData = hunterStats?.hunterStats?.find(h => h.hunterId === playerId);
      const gamesAsHunter = hunterData?.gamesPlayedAsHunter || 0;
      const totalKills = hunterData?.totalKills || 0;
      const goodKills = hunterData?.nonVillageoisKills || 0;
      const badKills = hunterData?.villageoisKills || 0;
      
      let hunterAccuracy = null;
      if (gamesAsHunter >= MIN_GAMES_FOR_ROLE_TITLES && totalKills > 0) {
        // Accuracy = (good kills - bad kills) / total kills
        // Ranges from -100 (all bad) to +100 (all good)
        hunterAccuracy = ((goodKills - badKills) / totalKills) * 100;
      }

      // Only include players with some Chasseur data
      if (chasseurGames > 0 || hunterAccuracy !== null) {
        chasseurStats.push({
          playerId,
          playerName,
          gamesPlayed,
          chasseurGames,
          chasseurPercentage: Math.round(chasseurPercentage * 10) / 10,
          gamesAsHunter,
          totalKills,
          goodKills,
          badKills,
          hunterAccuracy: hunterAccuracy !== null ? Math.round(hunterAccuracy * 10) / 10 : null,
          eligibleForRoleTitles: gamesAsHunter >= MIN_GAMES_FOR_ROLE_TITLES
        });
      }
    });

    // Sort by chasseurPercentage descending
    chasseurStats.sort((a, b) => b.chasseurPercentage - a.chasseurPercentage);

    // Prepare output
    const output = {
      teamName: dataSource.name,
      generatedAt: new Date().toISOString(),
      moddedGamesAnalyzed: moddedGames.length,
      minGamesForRoleTitles: MIN_GAMES_FOR_ROLE_TITLES,
      totalPlayers: chasseurStats.length,
      players: chasseurStats
    };

    // Save to file
    await fs.writeFile(exportPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`✅ Exported stats for ${chasseurStats.length} players`);
    console.log(`📁 Saved to: ${exportPath}`);

    // Print summary to console
    console.log('\n📊 Top players by Chasseur frequency:');
    chasseurStats.slice(0, 10).forEach((player, i) => {
      const accuracy = player.hunterAccuracy !== null ? `${player.hunterAccuracy.toFixed(1)}%` : 'N/A';
      console.log(`${i + 1}. ${player.playerName}: ${player.chasseurGames}/${player.gamesPlayed} games (${player.chasseurPercentage}%), Accuracy: ${accuracy}`);
    });

    console.log('\n🎯 Top players by Hunter Accuracy (min 10 games as Chasseur):');
    const eligiblePlayers = chasseurStats
      .filter(p => p.eligibleForRoleTitles && p.hunterAccuracy !== null)
      .sort((a, b) => b.hunterAccuracy - a.hunterAccuracy)
      .slice(0, 10);
    
    eligiblePlayers.forEach((player, i) => {
      console.log(`${i + 1}. ${player.playerName}: ${player.hunterAccuracy.toFixed(1)}% accuracy (${player.goodKills} good, ${player.badKills} bad kills)`);
    });

  } catch (error) {
    console.error('❌ Error exporting Chasseur stats:', error.message);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const teamKey = args[0] || 'main';

exportChasseurStats(teamKey);
