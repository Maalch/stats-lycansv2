/**
 * Test script to check what correctVictoriousStatusForDisconnectedPlayers fixes
 * in an existing gameLog.json file
 * 
 * Usage: node scripts/test-corrections.js [path-to-gameLog.json]
 * Example: node scripts/test-corrections.js data/gameLog.json
 */
import fs from 'fs/promises';
import path from 'path';
import { correctVictoriousStatusForDisconnectedPlayers } from './data-sync/shared/sync-utils.js';

/**
 * Deep clone an object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare two game logs and report differences
 */
function compareGameLogs(original, corrected) {
  const corrections = [];
  
  if (!original.GameStats || !corrected.GameStats) {
    console.log('⚠️  No GameStats found in game logs');
    return corrections;
  }
  
  // Build a map of games for easier comparison
  const originalGamesMap = new Map();
  original.GameStats.forEach(game => {
    originalGamesMap.set(game.Id, game);
  });
  
  // Compare each game
  corrected.GameStats.forEach(correctedGame => {
    const originalGame = originalGamesMap.get(correctedGame.Id);
    
    if (!originalGame) {
      console.log(`⚠️  Game ${correctedGame.Id} not found in original data`);
      return;
    }
    
    // Build player maps for comparison
    const originalPlayersMap = new Map();
    if (originalGame.PlayerStats) {
      originalGame.PlayerStats.forEach(player => {
        const key = `${player.ID || player.Username}`;
        originalPlayersMap.set(key, player);
      });
    }
    
    // Check each player for differences
    if (correctedGame.PlayerStats) {
      correctedGame.PlayerStats.forEach(correctedPlayer => {
        const key = `${correctedPlayer.ID || correctedPlayer.Username}`;
        const originalPlayer = originalPlayersMap.get(key);
        
        if (!originalPlayer) {
          console.log(`⚠️  Player ${correctedPlayer.Username} not found in original game ${correctedGame.Id}`);
          return;
        }
        
        // Check if Victorious status changed
        if (originalPlayer.Victorious !== correctedPlayer.Victorious) {
          corrections.push({
            gameId: correctedGame.Id,
            gameDate: correctedGame.StartDate,
            playerName: correctedPlayer.Username,
            playerSteamId: correctedPlayer.ID,
            mainRole: correctedPlayer.MainRoleInitial,
            secondaryRole: correctedPlayer.SecondaryRole,
            originalVictorious: originalPlayer.Victorious,
            correctedVictorious: correctedPlayer.Victorious,
            deathTiming: correctedPlayer.DeathTiming,
            deathType: correctedPlayer.DeathType
          });
        }
      });
    }
  });
  
  return corrections;
}

/**
 * Format corrections report
 */
function formatCorrectionsReport(corrections) {
  if (corrections.length === 0) {
    console.log('\n✅ No corrections needed! All victory statuses are already correct.\n');
    return;
  }
  
  console.log(`\n📋 Found ${corrections.length} corrections:\n`);
  console.log('='.repeat(120));
  
  // Group by game
  const gameGroups = new Map();
  corrections.forEach(c => {
    if (!gameGroups.has(c.gameId)) {
      gameGroups.set(c.gameId, []);
    }
    gameGroups.get(c.gameId).push(c);
  });
  
  // Display by game
  for (const [gameId, gameCorrections] of gameGroups) {
    console.log(`\nGame: ${gameId}`);
    console.log(`Date: ${gameCorrections[0].gameDate}`);
    console.log(`Players corrected: ${gameCorrections.length}`);
    console.log('-'.repeat(120));
    
    gameCorrections.forEach(c => {
      console.log(`  Player: ${c.playerName} (${c.playerSteamId || 'no Steam ID'})`);
      console.log(`    Role: ${c.mainRole}${c.secondaryRole ? ` (${c.secondaryRole})` : ''}`);
      console.log(`    Victorious: ${c.originalVictorious} → ${c.correctedVictorious}`);
      console.log(`    Death: ${c.deathType || 'Survived'} ${c.deathTiming ? `at ${c.deathTiming}` : ''}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(120));
  
  // Summary statistics
  const byRole = new Map();
  const byDeathType = new Map();
  
  corrections.forEach(c => {
    // Count by role
    const roleKey = c.secondaryRole ? `${c.mainRole} (${c.secondaryRole})` : c.mainRole;
    byRole.set(roleKey, (byRole.get(roleKey) || 0) + 1);
    
    // Count by death type
    const deathKey = c.deathType || 'Survived';
    byDeathType.set(deathKey, (byDeathType.get(deathKey) || 0) + 1);
  });
  
  console.log('\n📊 Summary by Role:');
  for (const [role, count] of [...byRole.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${role}: ${count}`);
  }
  
  console.log('\n📊 Summary by Death Type:');
  for (const [deathType, count] of [...byDeathType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${deathType}: ${count}`);
  }
  
  console.log('\n');
}

/**
 * Save detailed report to JSON file
 */
async function saveDetailedReport(corrections, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    totalCorrections: corrections.length,
    corrections: corrections,
    summary: {
      byRole: {},
      byDeathType: {},
      gamesAffected: new Set(corrections.map(c => c.gameId)).size
    }
  };
  
  // Calculate summaries
  corrections.forEach(c => {
    const roleKey = c.secondaryRole ? `${c.mainRole} (${c.secondaryRole})` : c.mainRole;
    report.summary.byRole[roleKey] = (report.summary.byRole[roleKey] || 0) + 1;
    
    const deathKey = c.deathType || 'Survived';
    report.summary.byDeathType[deathKey] = (report.summary.byDeathType[deathKey] || 0) + 1;
  });
  
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Detailed report saved to: ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'data/gameLog.json';
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);
  
  console.log('🔍 Testing correctVictoriousStatusForDisconnectedPlayers function');
  console.log(`📁 Input file: ${absoluteInputPath}`);
  console.log('');
  
  try {
    // Read the original game log
    console.log('📖 Reading game log...');
    const content = await fs.readFile(absoluteInputPath, 'utf8');
    const originalGameLog = JSON.parse(content);
    
    console.log(`✓ Loaded game log with ${originalGameLog.TotalRecords} games`);
    
    // Create a deep clone for correction (don't modify original)
    const clonedGameLog = deepClone(originalGameLog);
    
    // Apply corrections
    console.log('\n🔧 Applying corrections...\n');
    const correctedGameLog = correctVictoriousStatusForDisconnectedPlayers(clonedGameLog);
    
    // Compare and report
    console.log('\n📊 Analyzing differences...');
    const corrections = compareGameLogs(originalGameLog, correctedGameLog);
    
    // Display report
    formatCorrectionsReport(corrections);
    
    // Save detailed report
    if (corrections.length > 0) {
      const reportPath = path.join(path.dirname(absoluteInputPath), 'corrections-report.json');
      await saveDetailedReport(corrections, reportPath);
    }
    
    // Offer to save corrected version
    if (corrections.length > 0) {
      console.log('💡 To apply these corrections permanently, you can:');
      console.log('   1. Re-run the data sync script (npm run sync-data-aws or npm run sync-data)');
      console.log('   2. Or manually save the corrected data by modifying this script\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`\nFile not found: ${absoluteInputPath}`);
      console.error('Please provide a valid path to gameLog.json');
      console.error('\nUsage: node scripts/test-corrections.js [path-to-gameLog.json]');
    }
    process.exit(1);
  }
}

main();
