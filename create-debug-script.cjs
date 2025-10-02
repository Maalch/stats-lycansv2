const fs = require('fs');

// Read the generate-achievements.js file and patch it with debug output
let scriptContent = fs.readFileSync('scripts/data-sync/generate-achievements.js', 'utf8');

// Add debug logging to the processSeriesAchievements function
const processSeriesDebug = `
console.log('DEBUG: processSeriesAchievements called for player:', playerName);
console.log('DEBUG: seriesData exists:', !!seriesData);
if (seriesData) {
  console.log('DEBUG: allLoupsSeries length:', seriesData.allLoupsSeries?.length || 0);
  const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
  console.log('DEBUG: topLoupSeries length:', topLoupSeries.length);
  const loupRank = findPlayerSeriesRank(topLoupSeries, playerName);
  console.log('DEBUG: loupRank for', playerName + ':', loupRank);
}
`;

// Insert debug code after the function declaration
scriptContent = scriptContent.replace(
  'function processSeriesAchievements(seriesData, playerName, suffix) {',
  `function processSeriesAchievements(seriesData, playerName, suffix) {
  ${processSeriesDebug}`
);

// Save to a temporary debug version
fs.writeFileSync('debug-generate-achievements.js', scriptContent);

console.log('Created debug version of achievement generation script');
console.log('Run: node debug-generate-achievements.js');