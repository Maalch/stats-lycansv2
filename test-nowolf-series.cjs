// Quick test to verify NoWolf series logic
const fs = require('fs');

// Read the gameLog data
const gameLogFile = JSON.parse(fs.readFileSync('./data/gameLog.json', 'utf8'));
const gameLogData = gameLogFile.GameStats;

console.log('🎮 Testing NoWolf Series Logic\n');
console.log(`Found ${gameLogData.length} games total\n`);

// Test a few games to see the camp assignments
const sampleGames = gameLogData.slice(0, 5);

sampleGames.forEach((game, index) => {
  console.log(`Game ${game.DisplayedId} (${game.StartDate.slice(0, 10)}):`);
  
  game.PlayerStats.forEach(player => {
    const mainRoleFinal = player.MainRoleFinal;
    const isWolf = mainRoleFinal?.includes('Loup') || false;
    const wouldCountForNoWolf = !isWolf;
    
    console.log(`  ${player.Username}: ${mainRoleFinal} -> ${wouldCountForNoWolf ? '✅ Counts for NoWolf' : '❌ Breaks NoWolf'}`);
  });
  
  console.log('');
});

console.log('🎯 Sample camp detection:');
const testRoles = ['Villageois', 'Loup-garou', 'Voyante', 'Sorcière', 'Cupidon', 'Chasseur'];
testRoles.forEach(role => {
  const getCampFromRole = (roleFinal) => {
    if (!roleFinal) return 'Autres';
    if (roleFinal.includes('Loup')) return 'Loup';
    // Based on the existing logic, everything else is either Villageois or Autres
    const specialRoles = ['Amoureux', 'Idiot', 'Agent'];
    if (specialRoles.some(special => roleFinal.includes(special))) return 'Autres';
    return 'Villageois';
  };
  
  const camp = getCampFromRole(role);
  const countsForNoWolf = camp !== 'Loup';
  console.log(`  ${role} -> ${camp} -> ${countsForNoWolf ? '✅ NoWolf' : '❌ Breaks NoWolf'}`);
});