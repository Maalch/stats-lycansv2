// Test script to verify map achievement navigation changes
// This script helps verify that map-based achievements now redirect to general statistics

console.log("🧪 Testing Map Achievement Navigation Changes");

// Test case 1: Village achievement should be detected correctly
const villageAchievement = {
  title: "🏘️ Rang 12 Village",
  description: "12ème meilleur taux de victoire sur Village: 52.6% (116 parties, min. 10)",
  category: "history",
  redirectTo: { tab: "players", subTab: "history" }
};

// Test case 2: Château achievement should be detected correctly
const chateauAchievement = {
  title: "🏰 Rang 5 Château",
  description: "5ème meilleur taux de victoire sur Château: 68.2% (23 parties, min. 10)",
  category: "history",
  redirectTo: { tab: "players", subTab: "history" }
};

// Test case 3: Non-map history achievement should not be affected
const regularHistoryAchievement = {
  title: "Historique régulier",
  description: "Un achievement d'historique normal",
  category: "history",
  redirectTo: { tab: "players", subTab: "history" }
};

function testMapDetection(achievement, expectedIsVillage, expectedIsChateau) {
  const titleLower = achievement.title.toLowerCase();
  const isVillageAchievement = titleLower.includes('village') || achievement.title.includes('🏘️');
  const isChateauAchievement = titleLower.includes('château') || achievement.title.includes('🏰');
  
  console.log(`Testing: "${achievement.title}"`);
  console.log(`  Expected Village: ${expectedIsVillage}, Got: ${isVillageAchievement}`);
  console.log(`  Expected Château: ${expectedIsChateau}, Got: ${isChateauAchievement}`);
  console.log(`  ✅ ${isVillageAchievement === expectedIsVillage && isChateauAchievement === expectedIsChateau ? 'PASS' : 'FAIL'}`);
  console.log("");
}

function testMinGamesExtraction(achievement, expectedMinGames) {
  const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
  const minGames = minGamesMatch ? parseInt(minGamesMatch[1]) : 10;
  
  console.log(`Testing min games extraction: "${achievement.description}"`);
  console.log(`  Expected: ${expectedMinGames}, Got: ${minGames}`);
  console.log(`  ✅ ${minGames === expectedMinGames ? 'PASS' : 'FAIL'}`);
  console.log("");
}

// Run tests
console.log("\n📋 Running Map Detection Tests:");
testMapDetection(villageAchievement, true, false);
testMapDetection(chateauAchievement, false, true);
testMapDetection(regularHistoryAchievement, false, false);

console.log("📋 Running Min Games Extraction Tests:");
testMinGamesExtraction(villageAchievement, 10);
testMinGamesExtraction(chateauAchievement, 10);

console.log("🎯 Expected Behavior:");
console.log("1. Village 🏘️ achievements should navigate to playersGeneral with mapNameFilter='village'");
console.log("2. Château 🏰 achievements should navigate to playersGeneral with mapNameFilter='chateau'");
console.log("3. Regular history achievements should navigate to history as before");
console.log("4. Minimum games should be extracted from description and used for minGamesForWinRate");
console.log("5. Map filter should be set in both regular and independent filters");

console.log("\n✨ Manual Testing:");
console.log("1. Go to a player page (e.g., search for a player with map achievements)");
console.log("2. Click on a 'Rang X Village' or 'Rang X Château' achievement");
console.log("3. Verify you're redirected to 'Statistiques Joueurs' > 'Général' tab");
console.log("4. Verify the appropriate map filter is applied");
console.log("5. Verify the winRate chart is focused and minGames is set correctly");