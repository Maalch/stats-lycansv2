import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Load report ---
const reportPath = join(__dirname, 'duplicate-actions-report.json');
const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
console.log(`Loaded report: ${report.totalClusters} clusters, ${report.totalToRemove} entries to remove`);

// --- Build game-to-file map from source files ---
const sourceFiles = readdirSync(__dirname).filter(
  f => f.endsWith('.json') && f !== 'duplicate-actions-report.json' && f !== 'package.json'
);
console.log(`Found ${sourceFiles.length} source files`);

const gameToFile = new Map();
const fileDataCache = new Map();

for (const file of sourceFiles) {
  if (file === 'fix-duplicates.js') continue;
  const filePath = join(__dirname, file);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  fileDataCache.set(file, data);
  for (const game of data.GameStats) {
    gameToFile.set(game.Id, file);
  }
}
console.log(`Mapped ${gameToFile.size} games across source files\n`);

// --- Group removals by file → game → player → indices ---
// Structure: Map<fileName, Map<gameId, Map<playerName, number[]>>>
const removalsByFile = new Map();
let skippedClusters = 0;
let processedClusters = 0;

for (const cluster of report.clusters) {
  const file = gameToFile.get(cluster.gameId);
  if (!file) {
    skippedClusters++;
    continue;
  }
  processedClusters++;

  if (!removalsByFile.has(file)) removalsByFile.set(file, new Map());
  const fileMap = removalsByFile.get(file);

  if (!fileMap.has(cluster.gameId)) fileMap.set(cluster.gameId, new Map());
  const gameMap = fileMap.get(cluster.gameId);

  if (!gameMap.has(cluster.playerName)) gameMap.set(cluster.playerName, []);
  const indices = gameMap.get(cluster.playerName);

  for (const entry of cluster.entriesToRemove) {
    indices.push(entry.playerActionIndex);
  }
}

console.log(`Clusters to process: ${processedClusters}`);
console.log(`Clusters skipped (no source file): ${skippedClusters}\n`);

// --- Apply removals ---
let totalRemoved = 0;
let filesModified = 0;

for (const [fileName, gameMap] of removalsByFile) {
  const data = fileDataCache.get(fileName);
  let fileRemoved = 0;

  for (const [gameId, playerMap] of gameMap) {
    const game = data.GameStats.find(g => g.Id === gameId);
    if (!game) {
      console.error(`  ERROR: Game ${gameId} not found in ${fileName}`);
      continue;
    }

    for (const [playerName, indices] of playerMap) {
      const player = game.PlayerStats.find(p => p.Username === playerName);
      if (!player) {
        console.error(`  ERROR: Player "${playerName}" not found in game ${gameId}`);
        continue;
      }
      if (!player.Actions) {
        console.error(`  ERROR: Player "${playerName}" has no Actions in game ${gameId}`);
        continue;
      }

      // Sort indices descending so removal doesn't shift earlier indices
      const sortedIndices = [...new Set(indices)].sort((a, b) => b - a);

      for (const idx of sortedIndices) {
        if (idx < 0 || idx >= player.Actions.length) {
          console.error(`  ERROR: Index ${idx} out of range for ${playerName} (${player.Actions.length} actions) in ${gameId}`);
          continue;
        }
        player.Actions.splice(idx, 1);
        fileRemoved++;
      }
    }
  }

  if (fileRemoved > 0) {
    const filePath = join(__dirname, fileName);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    filesModified++;
    totalRemoved += fileRemoved;
    console.log(`  ${fileName}: removed ${fileRemoved} duplicate actions`);
  }
}

console.log(`\nDone! Removed ${totalRemoved} actions across ${filesModified} files.`);
if (skippedClusters > 0) {
  console.log(`${skippedClusters} clusters skipped (game not in available source files).`);
}
