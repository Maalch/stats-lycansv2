/**
 * check-duplicate-actions.js
 *
 * Scans a gameLog.json for actions that share the same (ActionType + ActionName)
 * and occur within a configurable time window for the same player in the same game.
 *
 * For each cluster of duplicates, the FIRST occurrence is kept; all others are
 * reported as entries to remove.
 *
 * Usage (from repo root):
 *   node scripts/check-duplicate-actions.js [path/to/gameLog.json] [--threshold <seconds>] [--out <output.json>]
 *
 * Defaults:
 *   path      : data/gameLog.json
 *   threshold : 1 second
 *   out       : (none — only prints to console unless specified)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// --- CLI args ---------------------------------------------------------------

const DEFAULT_PATH = resolve('data/gameLog.json');
const DEFAULT_THRESHOLD_SECONDS = 1;

const args = process.argv.slice(2);

let filePath = DEFAULT_PATH;
let thresholdSeconds = DEFAULT_THRESHOLD_SECONDS;
let outPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--threshold' && args[i + 1] !== undefined) {
    thresholdSeconds = parseFloat(args[++i]);
  } else if (args[i] === '--out' && args[i + 1] !== undefined) {
    outPath = resolve(args[++i]);
  } else if (!args[i].startsWith('--')) {
    filePath = resolve(args[i]);
  }
}

const THRESHOLD_MS = thresholdSeconds * 1000;

// --- Load data --------------------------------------------------------------

console.log(`Loading  : ${filePath}`);
console.log(`Threshold: ${thresholdSeconds}s\n`);

const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
const games = raw.GameStats ?? [];

// --- Analysis ---------------------------------------------------------------
// For each (ActionType + ActionName) key within a player+game, we walk the
// time-sorted list and find consecutive clusters where every successive gap
// is ≤ threshold.  The first entry of each cluster is kept; the rest are
// flagged as duplicates to remove.

// Each element of `clusters` describes one duplicate cluster.
const clusters = [];

// Each element of `toRemove` is a precise identifier of an action to delete.
const toRemove = [];

for (const game of games) {
  const gameId = game.Id ?? game.DisplayedId ?? '(unknown)';
  const gameDate = (game.StartDate ?? '').slice(0, 10);

  for (const player of (game.PlayerStats ?? [])) {
    const playerName = player.Username ?? '(unknown)';
    const actions = player.Actions ?? [];

    // Sort a working copy by date, keeping original index for precise removal
    const keyed = actions
      .map((a, idx) => ({ ...a, _idx: idx }))
      .filter(a => a.Date && a.ActionType && a.ActionName)
      .sort((a, b) => new Date(a.Date) - new Date(b.Date));

    // Group by (ActionType + ActionName + ActionTarget)
    const byKey = new Map();
    for (const entry of keyed) {
      const key = `${entry.ActionType}|${entry.ActionName}|${entry.ActionTarget ?? ''}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(entry);
    }

    for (const [, entries] of byKey) {
      // Walk entries and group consecutive ones within threshold into clusters
      let clusterStart = 0;
      while (clusterStart < entries.length) {
        const clusterEntries = [entries[clusterStart]];

        let i = clusterStart + 1;
        while (
          i < entries.length &&
          new Date(entries[i].Date) - new Date(entries[i - 1].Date) <= THRESHOLD_MS
        ) {
          clusterEntries.push(entries[i]);
          i++;
        }

        if (clusterEntries.length > 1) {
          // First entry is canonical; the rest are duplicates
          const keep = clusterEntries[0];
          const dupes = clusterEntries.slice(1);

          clusters.push({
            gameId,
            gameDate,
            playerName,
            actionType: keep.ActionType,
            actionName: keep.ActionName,
            timing: keep.Timing,
            keepDate: keep.Date,
            dupeCount: dupes.length,
            dupes: dupes.map(d => ({ date: d.Date, timing: d.Timing, _idx: d._idx })),
          });

          for (const d of dupes) {
            toRemove.push({
              gameId,
              playerName,
              actionType: d.ActionType,
              actionName: d.ActionName,
              timing: d.Timing,
              date: d.Date,
              _playerActionIndex: d._idx,
            });
          }
        }

        clusterStart = i;
      }
    }
  }
}

// --- Console output ---------------------------------------------------------

if (clusters.length === 0) {
  console.log('✅ No duplicate actions found within the time window.');
  process.exit(0);
}

console.log(`⚠️  ${clusters.length} duplicate cluster(s) found (${toRemove.length} entries to remove):\n`);

// Group clusters by game
const byGame = new Map();
for (const c of clusters) {
  const key = `${c.gameId} (${c.gameDate})`;
  if (!byGame.has(key)) byGame.set(key, []);
  byGame.get(key).push(c);
}

for (const [gameKey, gameClusters] of [...byGame.entries()].sort()) {
  console.log(`Game: ${gameKey}`);

  // Sub-group by player
  const byPlayer = new Map();
  for (const c of gameClusters) {
    if (!byPlayer.has(c.playerName)) byPlayer.set(c.playerName, []);
    byPlayer.get(c.playerName).push(c);
  }

  for (const [player, playerClusters] of byPlayer) {
    console.log(`  Player: ${player}`);
    for (const c of playerClusters) {
      const spanMs = new Date(c.dupes.at(-1).date) - new Date(c.keepDate);
      const spanLabel = spanMs < 1000 ? `${spanMs}ms` : `${(spanMs / 1000).toFixed(2)}s`;
      console.log(
        `    [${c.actionType}] "${c.actionName}" @${c.timing}` +
        `  — keep 1, remove ${c.dupeCount}  (span: ${spanLabel})`
      );
      console.log(`      Keep  : ${c.keepDate}`);
      for (const d of c.dupes) {
        console.log(`      Remove: ${d.date}  (index ${d._idx})`);
      }
    }
  }
  console.log();
}

// --- Summary ----------------------------------------------------------------

console.log('--- Summary by ActionType ---');
const byType = new Map();
for (const c of clusters) {
  byType.set(c.actionType, (byType.get(c.actionType) ?? 0) + c.dupeCount);
}
for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(20)} ${count} duplicate(s) to remove`);
}

console.log('\n--- Summary by ActionName ---');
const byName = new Map();
for (const c of clusters) {
  const k = `${c.actionType} / ${c.actionName}`;
  byName.set(k, (byName.get(k) ?? 0) + c.dupeCount);
}
for (const [name, count] of [...byName.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name.padEnd(40)} ${count} duplicate(s) to remove`);
}

console.log(`\nTotal: ${toRemove.length} entries to remove across ${byGame.size} game(s).`);

// --- JSON output ------------------------------------------------------------

if (outPath) {
  const output = {
    generatedAt: new Date().toISOString(),
    thresholdSeconds,
    sourceFile: filePath,
    totalClusters: clusters.length,
    totalToRemove: toRemove.length,
    clusters: clusters.map(c => ({
      gameId: c.gameId,
      gameDate: c.gameDate,
      playerName: c.playerName,
      actionType: c.actionType,
      actionName: c.actionName,
      timing: c.timing,
      keepDate: c.keepDate,
      entriesToRemove: c.dupes.map(d => ({
        date: d.date,
        timing: d.timing,
        playerActionIndex: d._idx,
      })),
    })),
  };
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n📄 JSON report written to: ${outPath}`);
}
