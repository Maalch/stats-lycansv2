import fs from 'fs/promises';

async function testAchievements() {
  try {
    // Read the generated achievements
    const achievementsContent = await fs.readFile('./data/playerAchievements.json', 'utf-8');
    const data = JSON.parse(achievementsContent);

    console.log('📊 Achievement Testing Results:');
    console.log(`   - Total players: ${data.totalPlayers}`);
    console.log(`   - Total games: ${data.totalGames}`);
    console.log(`   - Total modded games: ${data.totalModdedGames}`);
    console.log(`   - Players with achievements: ${Object.keys(data.achievements).length}`);
    
    // Show first few player names
    const playerNames = Object.keys(data.achievements).slice(0, 10);
    console.log(`   - First 10 players: ${playerNames.join(', ')}`);
    
    // Test a specific player (Ponce)
    const ponceAchievements = data.achievements['Ponce'];
    if (ponceAchievements) {
      console.log(`   - Ponce all games achievements: ${ponceAchievements.allGamesAchievements.length}`);
      console.log(`   - Ponce modded achievements: ${ponceAchievements.moddedOnlyAchievements.length}`);
      
      // Show a sample achievement
      const sampleAchievement = ponceAchievements.allGamesAchievements[0];
      console.log(`   - Sample achievement: ${sampleAchievement.title}`);
      console.log(`   - Achievement description: ${sampleAchievement.description}`);
      console.log(`   - Achievement type: ${sampleAchievement.type}`);
      console.log(`   - Achievement category: ${sampleAchievement.category}`);
    }

    // Test achievement categories
    const allAchievements = Object.values(data.achievements).flatMap(player => 
      [...player.allGamesAchievements, ...player.moddedOnlyAchievements]
    );
    
    const categories = [...new Set(allAchievements.map(a => a.category))];
    console.log(`   - Achievement categories found: ${categories.join(', ')}`);
    
    console.log('✅ Achievements file structure looks good!');
    
  } catch (error) {
    console.error('❌ Error testing achievements:', error.message);
  }
}

testAchievements();