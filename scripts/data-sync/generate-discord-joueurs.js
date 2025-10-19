import fs from 'fs/promises';
import path from 'path';

const DISCORD_DATA_DIR = '../../data/discord';
const ABSOLUTE_DISCORD_DATA_DIR = path.resolve(process.cwd(), DISCORD_DATA_DIR);

async function extractPlayersFromGameLog() {
  console.log('🔍 Extracting players from Discord Team game log...');
  
  try {
    // Read the Discord team game log
    const gameLogPath = path.join(ABSOLUTE_DISCORD_DATA_DIR, 'gameLog.json');
    const gameLogData = await fs.readFile(gameLogPath, 'utf8');
    const gameLog = JSON.parse(gameLogData);
    
    // Map to track players and their color occurrences
    const playerColorMap = new Map();
    
    // Iterate through all games and player stats
    gameLog.GameStats.forEach(game => {
      if (game.PlayerStats && Array.isArray(game.PlayerStats)) {
        game.PlayerStats.forEach(playerStat => {
          const username = playerStat.Username;
          const color = playerStat.Color;
          
          if (!username) return; // Skip if no username
          
          if (!playerColorMap.has(username)) {
            playerColorMap.set(username, {
              colors: {},
              gamesPlayed: 0
            });
          }
          
          const playerData = playerColorMap.get(username);
          playerData.gamesPlayed++;
          
          if (color) {
            playerData.colors[color] = (playerData.colors[color] || 0) + 1;
          }
        });
      }
    });
    
    console.log(`✓ Found ${playerColorMap.size} unique players`);
    
    // Create players array with most common color
    const players = [];
    
    for (const [username, data] of playerColorMap.entries()) {
      // Find the most common color for this player
      let mostCommonColor = null;
      let maxCount = 0;
      
      for (const [color, count] of Object.entries(data.colors)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonColor = color;
        }
      }
      
      players.push({
        Joueur: username,
        Image: null, // No image data available from game log
        Twitch: null, // No Twitch data available from game log
        Youtube: null, // No Youtube data available from game log
        Couleur: mostCommonColor || "Gris" // Default to Gris if no color found
      });
    }
    
    // Sort players alphabetically by username
    players.sort((a, b) => a.Joueur.localeCompare(b.Joueur));
    
    // Create the joueurs data structure
    const joueursData = {
      TotalRecords: players.length,
      Players: players,
      description: "Player data extracted from Discord Team game logs. Social media links not available."
    };
    
    return joueursData;
    
  } catch (error) {
    console.error('❌ Failed to extract players:', error.message);
    throw error;
  }
}

async function saveJoueursFile(joueursData) {
  console.log('💾 Saving Discord Team joueurs.json...');
  
  try {
    const joueursPath = path.join(ABSOLUTE_DISCORD_DATA_DIR, 'joueurs.json');
    await fs.writeFile(joueursPath, JSON.stringify(joueursData, null, 2), 'utf8');
    console.log(`✓ Saved joueurs.json with ${joueursData.TotalRecords} players`);
    
    // Display players for verification
    console.log('\n📋 Players extracted:');
    joueursData.Players.forEach(player => {
      console.log(`   - ${player.Joueur.padEnd(20)} (${player.Couleur})`);
    });
    
  } catch (error) {
    console.error('❌ Failed to save joueurs.json:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Generating Discord Team joueurs.json from game log...\n');
  
  try {
    const joueursData = await extractPlayersFromGameLog();
    await saveJoueursFile(joueursData);
    
    console.log('\n✅ Discord Team joueurs.json generated successfully!');
  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    process.exit(1);
  }
}

main();
