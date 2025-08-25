//This script does some data verification between game data and role data

const fs = require('fs');

// Read both JSON files
const rawGameData = JSON.parse(fs.readFileSync('./data/rawGameData.json', 'utf8'));
const rawRoleData = JSON.parse(fs.readFileSync('./data/rawRoleData.json', 'utf8'));

console.log('🔍 Checking for data errors...\n');

const errors = [];

// Helper function to parse player lists
function parsePlayerList(playerString) {
  if (!playerString || playerString.trim() === '') return [];
  return playerString.split(',').map(p => p.trim()).filter(p => p !== '');
}

// Helper function to extract players from role data
function extractPlayersFromRoles(roleEntry) {
  const players = [];
  const roleColumns = ['Loups', 'Traître', 'Idiot du village', 'Cannibale', 'Agent', 'Espion', 'Scientifique', 'Amoureux', 'La Bête', 'Chasseur de primes', 'Vaudou'];
  
  roleColumns.forEach(role => {
    if (roleEntry[role] && roleEntry[role].trim() !== '') {
      const rolePlayers = parsePlayerList(roleEntry[role]);
      players.push(...rolePlayers);
    }
  });
  
  return players;
}

// Check each game
rawGameData.data.forEach((game, index) => {
  if (!game.Game) return; // Skip empty entries
  
  const gameNumber = game.Game;
  console.log(`Checking Game ${gameNumber}...`);
  
  // Find corresponding role data
  const roleData = rawRoleData.data.find(role => role.Game === gameNumber);
  
  if (!roleData) {
    errors.push(`❌ Game ${gameNumber}: No corresponding role data found`);
    return;
  }
  
  // Parse player lists
  const allPlayers = parsePlayerList(game["Liste des joueurs"]);
  const winners = parsePlayerList(game["Liste des gagnants"]);
  const rolePlayers = extractPlayersFromRoles(roleData);
  
  // Check 1: Winners should be in the player list
  winners.forEach(winner => {
    if (!allPlayers.includes(winner)) {
      errors.push(`❌ Game ${gameNumber}: Winner "${winner}" not found in player list`);
    }
  });
  
  // Check 2: Role players should be in the player list
  rolePlayers.forEach(rolePlayer => {
    if (!allPlayers.includes(rolePlayer)) {
      errors.push(`❌ Game ${gameNumber}: Role player "${rolePlayer}" not found in player list`);
    }
  });
  
  // Check 3: Number of wolves should match role data
  const wolvesInRole = parsePlayerList(roleData.Loups || '');
  const expectedWolves = game["Nombre de loups"];
  if (wolvesInRole.length !== expectedWolves) {
    errors.push(`❌ Game ${gameNumber}: Expected ${expectedWolves} wolves, but found ${wolvesInRole.length} in role data: ${wolvesInRole.join(', ')}`);
  }
  
  // Check 4: Check for duplicate players in same game roles
  const rolePlayerCounts = {};
  rolePlayers.forEach(player => {
    rolePlayerCounts[player] = (rolePlayerCounts[player] || 0) + 1;
  });
  
  Object.keys(rolePlayerCounts).forEach(player => {
    if (rolePlayerCounts[player] > 1) {
      errors.push(`❌ Game ${gameNumber}: Player "${player}" appears ${rolePlayerCounts[player]} times in role assignments`);
    }
  });
  
  // Check 5: Validate camp victory logic
  const camp = game["Camp victorieux"];
  if (camp === "Loups") {
    // If wolves won, check if any wolves are in winners list
    const wolvesWon = wolvesInRole.some(wolf => winners.includes(wolf));
    if (!wolvesWon) {
      errors.push(`❌ Game ${gameNumber}: Wolves won but no wolves found in winners list`);
    }
  } else if (camp === "Villageois") {
    // If villagers won, winners should not include any wolf or any solo role
    let invalidWinners = [];
    // Check wolves
    wolvesInRole.forEach(wolf => {
      if (winners.includes(wolf)) {
        invalidWinners.push(wolf);
      }
    });
    // Check solo roles
    const soloRoles = ["Idiot du village", "Cannibale", "Agent", "Espion", "Scientifique", "Amoureux", "La Bête", "Chasseur de primes", "Vaudou"];
    soloRoles.forEach(role => {
      const soloPlayers = parsePlayerList(roleData[role] || '');
      soloPlayers.forEach(player => {
        if (winners.includes(player)) {
          invalidWinners.push(player);
        }
      });
    });
    if (invalidWinners.length > 0) {
      errors.push(`❌ Game ${gameNumber}: Villagers won but winner list includes wolf or solo role(s): ${invalidWinners.join(', ')}`);
    }
  }
});

// Report results
console.log('\n📊 Data Check Results:');
console.log(`Total games checked: ${rawGameData.data.filter(g => g.Game).length}`);
console.log(`Total errors found: ${errors.length}\n`);

if (errors.length > 0) {
  console.log('🚨 ERRORS FOUND:');
  errors.forEach(error => console.log(error));
} else {
  console.log('✅ No errors found in the data!');
}

// Additional statistics
console.log('\n📈 Additional Statistics:');
const gamesWithData = rawGameData.data.filter(g => g.Game);
console.log(`Games in rawGameData: ${gamesWithData.length}`);
console.log(`Games in rawRoleData: ${rawRoleData.data.filter(r => r.Game).length}`);

// Check for games that exist in one but not the other
const gameDataNumbers = new Set(gamesWithData.map(g => g.Game));
const roleDataNumbers = new Set(rawRoleData.data.filter(r => r.Game).map(r => r.Game));

const missingInRoleData = [...gameDataNumbers].filter(num => !roleDataNumbers.has(num));
const missingInGameData = [...roleDataNumbers].filter(num => !gameDataNumbers.has(num));

if (missingInRoleData.length > 0) {
  console.log(`❌ Games missing in role data: ${missingInRoleData.join(', ')}`);
}
if (missingInGameData.length > 0) {
  console.log(`❌ Games missing in game data: ${missingInGameData.join(', ')}`);
}
