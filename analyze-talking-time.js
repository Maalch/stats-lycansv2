// analyze-talking-time.js
import fs from 'fs';

// Load data
const gameLogData = JSON.parse(fs.readFileSync('./data/gameLog.json', 'utf8'));
const joueursData = JSON.parse(fs.readFileSync('./data/joueurs.json', 'utf8'));

// Helper: Get player camp from role (matching datasyncExport.js logic)
function getPlayerCampFromRole(roleName, groupOptions = {}, power = null) {
  if (!roleName) return 'Villageois';
  
  const { regroupLovers = true, regroupVillagers = true, regroupWolfSubRoles = false } = groupOptions;
  
  // Handle Villageois Élite: use the Power field as the effective role
  if (roleName === 'Villageois Élite' && power) {
    roleName = power;
  }
  
  // Handle Amoureux roles
  if (roleName === 'Amoureux Loup' || roleName === 'Amoureux Villageois') {
    return regroupLovers ? 'Amoureux' : roleName;
  }
  
  // Handle Villager-type roles (including legacy Chasseur/Alchimiste and new powers)
  if (roleName === 'Villageois Élite' || roleName === 'Chasseur' || roleName === 'Alchimiste' || 
      roleName === 'Protecteur' || roleName === 'Disciple') {
    return regroupVillagers ? 'Villageois' : roleName;
  }

  if (roleName === 'Zombie') {
    return 'Vaudou';
  }
  
  // Handle Traitor role
  if (roleName === 'Traître' || roleName === 'Louveteau') {
    return regroupWolfSubRoles ? 'Loup' : roleName;
  }
  
  // Special roles keep their role name as camp
  return roleName;
}

function getPlayerMainCampFromRole(roleName, power = null) {
  if (!roleName) return 'Villageois';
  
  // Pass the power parameter to correctly resolve Villageois Élite roles
  const resolvedRole = getPlayerCampFromRole(roleName, { regroupWolfSubRoles: true, regroupVillagers: true }, power);

  // Loups camp (now includes Traître automatically)
  if (resolvedRole === 'Loup') {
    return 'Loup';
  }
  else if (resolvedRole === 'Villageois') {
    return 'Villageois';
  }
  else {
    return 'Autres';
  }
}

// Helper: Calculate game duration in seconds
function calculateGameDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end - start) / 1000);
}

// Helper: Check if game has talking data
function gameHasTalkingData(game) {
  return game.PlayerStats.some(p => 
    p.SecondsTalkedOutsideMeeting > 0 || p.SecondsTalkedDuringMeeting > 0
  );
}

// Helper: Get canonical player name
function getCanonicalPlayerName(player) {
  if (player.ID) {
    const joueur = joueursData.Players.find(j => j.ID === player.ID);
    if (joueur) return joueur.Joueur;
  }
  return player.Username;
}

// Analyze talking time by camp
const playerCampStats = new Map();

gameLogData.GameStats
  .filter(gameHasTalkingData)
  .forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerName = getCanonicalPlayerName(player);
      const camp = getPlayerMainCampFromRole(player.MainRoleInitial, player.Power);
      const duration = calculateGameDuration(
        game.StartDate, 
        player.DeathDateIrl || game.EndDate
      );
      
      if (duration <= 0) return;
      
      const key = `${playerName}|${camp}`;
      
      if (!playerCampStats.has(key)) {
        playerCampStats.set(key, {
          playerName,
          camp,
          games: 0,
          totalTalkTime: 0,
          totalDuration: 0
        });
      }
      
      const stats = playerCampStats.get(key);
      stats.games++;
      stats.totalTalkTime += (player.SecondsTalkedOutsideMeeting || 0) + 
                             (player.SecondsTalkedDuringMeeting || 0);
      stats.totalDuration += duration;
    });
  });

// Calculate per-60min rates
const playerResults = new Map();

for (const [_, stats] of playerCampStats) {
  const per60min = stats.totalDuration > 0 
    ? (stats.totalTalkTime / stats.totalDuration) * 3600 
    : 0;
  
  if (!playerResults.has(stats.playerName)) {
    playerResults.set(stats.playerName, {
      name: stats.playerName,
      Villageois: { per60min: 0, games: 0 },
      Loup: { per60min: 0, games: 0 },
      Autres: { per60min: 0, games: 0 }
    });
  }
  
  const result = playerResults.get(stats.playerName);
  result[stats.camp] = { per60min, games: stats.games };
}

// Find players who talk more as Loup
const loupTalkers = [];

for (const [_, player] of playerResults) {
  // Only consider players with at least 3 games in both camps
  if (player.Loup.games >= 3 && player.Villageois.games >= 3) {
    const diff = player.Loup.per60min - player.Villageois.per60min;
    if (diff > 0) {
      loupTalkers.push({
        name: player.name,
        loupTime: player.Loup.per60min,
        loupGames: player.Loup.games,
        villageoisTime: player.Villageois.per60min,
        villageoisGames: player.Villageois.games,
        difference: diff,
        percentageMore: (diff / player.Villageois.per60min) * 100
      });
    }
  }
}

// Sort by difference
loupTalkers.sort((a, b) => b.difference - a.difference);

// Format seconds to minutes:seconds
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m${secs.toString().padStart(2, '0')}s`;
}

// Print results
console.log('\n=== Joueurs qui parlent PLUS en Loup qu\'en Villageois ===\n');
console.log('(Minimum 3 parties dans chaque camp)\n');

// DEBUG: Print Kao's stats specifically
const kaoStats = playerResults.get('Kao');
if (kaoStats) {
  console.log('=== DEBUG: Stats de Kao ===');
  console.log('Villageois:', kaoStats.Villageois);
  console.log('Loup:', kaoStats.Loup);
  console.log('Autres:', kaoStats.Autres);
  console.log('');
}

if (loupTalkers.length === 0) {
  console.log('Aucun joueur ne parle plus en Loup qu\'en Villageois!');
} else {
  loupTalkers.forEach((player, index) => {
    console.log(`${index + 1}. ${player.name}`);
    console.log(`   Loup:       ${formatTime(player.loupTime)}/60min (${player.loupGames} parties)`);
    console.log(`   Villageois: ${formatTime(player.villageoisTime)}/60min (${player.villageoisGames} parties)`);
    console.log(`   Différence: +${formatTime(player.difference)} (+${player.percentageMore.toFixed(1)}%)`);
    console.log('');
  });
}

console.log(`\nTotal: ${loupTalkers.length} joueur(s) trouvé(s)\n`);
