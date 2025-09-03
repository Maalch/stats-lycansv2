// Debug script to analyze series data
import fs from 'fs';

// Read the data files
const gameData = JSON.parse(fs.readFileSync('public/data/rawGameData.json', 'utf8'));
const roleData = JSON.parse(fs.readFileSync('public/data/rawRoleData.json', 'utf8'));

console.log('Total games:', gameData.data.length);
console.log('Total role records:', roleData.data.length);

// Get all unique players
const allPlayers = new Set();
gameData.data.forEach(game => {
  if (game["Liste des joueurs"]) {
    game["Liste des joueurs"].split(', ').forEach(player => {
      allPlayers.add(player.trim());
    });
  }
});

console.log('Total unique players:', allPlayers.size);
console.log('Players:', Array.from(allPlayers).sort());

// Check most recent games to see the pattern
const recentGames = gameData.data.slice(-10);
console.log('\nLast 10 games:');
recentGames.forEach(game => {
  console.log(`Game ${game.Game}: ${game["Camp victorieux"]} victory on ${game.Date}`);
  console.log(`  Players: ${game["Liste des joueurs"]}`);
  console.log(`  Winners: ${game["Liste des gagnants"]}`);
});

// Let's manually check a few players' recent games to see if 19/72 makes sense
const testPlayers = ['Ponce', 'Bytell', 'Khalen'];
console.log('\nAnalyzing recent games for test players:');

testPlayers.forEach(playerName => {
  console.log(`\n${playerName}:`);
  
  // Get this player's recent games (last 10)
  const playerGames = gameData.data
    .filter(game => game["Liste des joueurs"] && game["Liste des joueurs"].includes(playerName))
    .slice(-10);
    
  let lastCamp = null;
  playerGames.forEach(game => {
    const isWinner = game["Liste des gagnants"] && game["Liste des gagnants"].includes(playerName);
    const camp = game["Camp victorieux"];
    
    // Determine player's camp - if they won, they were in the winning camp
    // Otherwise, we need to check role data or assume opposite
    let playerCamp = 'Unknown';
    if (isWinner) {
      playerCamp = camp;
    } else {
      // They lost, so they were likely in the opposite camp
      if (camp === 'Villageois') {
        playerCamp = 'Loups';
      } else if (camp === 'Loups') {
        playerCamp = 'Villageois';
      }
    }
    
    console.log(`  Game ${game.Game}: ${playerCamp} (${isWinner ? 'Won' : 'Lost'})`);
    lastCamp = playerCamp;
  });
  
  console.log(`  Last camp: ${lastCamp}`);
});
