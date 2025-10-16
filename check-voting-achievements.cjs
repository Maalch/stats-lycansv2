const fs = require('fs');

// Check public data file that the app actually uses
const publicData = JSON.parse(fs.readFileSync('public/data/playerAchievements.json', 'utf8'));

console.log('\n=== Checking PUBLIC data file (what the app loads) ===');
const poncePubic = publicData.achievements.Ponce.allGamesAchievements.filter(a => a.category === 'voting');
console.log(`\nPonce has ${poncePubic.length} voting achievements in PUBLIC data:`);
poncePubic.forEach(a => {
  console.log(`  • ${a.title}`);
  console.log(`    ${a.description}`);
});

// Also check the source data file
const sourceData = JSON.parse(fs.readFileSync('data/playerAchievements.json', 'utf8'));
const ponceSource = sourceData.achievements.Ponce.allGamesAchievements.filter(a => a.category === 'voting');
console.log(`\nPonce has ${ponceSource.length} voting achievements in SOURCE data:`);
ponceSource.forEach(a => {
  console.log(`  • ${a.title}`);
});
