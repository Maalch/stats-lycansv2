/**
 * Achievement Level Analysis Script
 * 
 * Reads playerAchievements.json and produces a detailed recap of all achievements,
 * showing which players have reached each level. Helps identify thresholds that
 * are too low (too many Lycans) or too high (no one reaches even Bronze).
 * 
 * Usage:
 *   node analyze-achievements.js [main|discord]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { DATA_SOURCES } from './shared/data-sources.js';
import { ACHIEVEMENT_TIERS, ACHIEVEMENT_CATEGORIES } from './shared/achievementDefinitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIER_ORDER = ['bronze', 'argent', 'or', 'lycans'];
const TIER_LABELS = { bronze: '🥉 Bronze', argent: '🥈 Argent', or: '🥇 Or', lycans: '🐺 Lycans' };

/**
 * @param {string} sourceKey - 'main' or 'discord'
 */
async function main(sourceKey) {
  const dataSource = DATA_SOURCES[sourceKey];
  if (!dataSource) {
    console.error(`❌ Unknown data source: ${sourceKey}`);
    console.error(`   Available: ${Object.keys(DATA_SOURCES).join(', ')}`);
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, '../..');
  const dataDir = path.resolve(rootDir, dataSource.outputDir);
  const achievementsPath = path.join(dataDir, 'playerAchievements.json');
  const outputPath = path.join(dataDir, 'achievementAnalysis.txt');

  // Load achievements data
  let data;
  try {
    const raw = await fs.readFile(achievementsPath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Cannot read ${achievementsPath}: ${err.message}`);
    console.error(`   Run generate-achievements.js ${sourceKey} first.`);
    process.exit(1);
  }

  const { achievementDefinitions, players, totalPlayers, totalGames, teamName } = data;
  const playerMap = players; // { playerId: { playerName, achievements: [...] } }

  // Build a lookup: achievementId → { levelKey → [{ playerName, currentValue }] }
  const achievementStats = new Map();

  for (const def of achievementDefinitions) {
    const levelMap = new Map();
    // Initialize all levels
    for (const level of def.levels) {
      const key = `${level.tier}-${level.subLevel}`;
      levelMap.set(key, []);
    }
    achievementStats.set(def.id, { definition: def, levelMap, playerValues: [] });
  }

  // Iterate all players and populate
  for (const player of Object.values(playerMap)) {
    for (const ach of player.achievements) {
      const stats = achievementStats.get(ach.id);
      if (!stats) continue;

      // Record player value for this achievement
      stats.playerValues.push({ playerName: player.playerName, currentValue: ach.currentValue });

      // Record which levels they unlocked
      for (const unlocked of ach.unlockedLevels) {
        const key = `${unlocked.tier}-${unlocked.subLevel}`;
        const arr = stats.levelMap.get(key);
        if (arr) {
          arr.push({ playerName: player.playerName, value: ach.currentValue });
        }
      }
    }
  }

  // Group achievements by category
  const categories = {};
  for (const def of achievementDefinitions) {
    if (!categories[def.category]) categories[def.category] = [];
    categories[def.category].push(def.id);
  }

  // Build report
  const lines = [];
  const sep = '='.repeat(90);
  const sep2 = '-'.repeat(90);

  lines.push(sep);
  lines.push(`ACHIEVEMENT LEVEL ANALYSIS — ${teamName}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total players: ${totalPlayers} | Total games: ${totalGames}`);
  lines.push(sep);

  // Summary warnings
  const warnings = [];
  const emptyAchievements = [];

  for (const [achId, stats] of achievementStats) {
    const { definition: def, levelMap, playerValues } = stats;

    // Check for lycans tier over-saturation (>10% of players)
    for (const level of def.levels) {
      if (level.tier === 'lycans') {
        const key = `${level.tier}-${level.subLevel}`;
        const count = levelMap.get(key)?.length || 0;
        if (count > 0 && count > totalPlayers * 0.1) {
          warnings.push(`⚠️  HIGH LYCANS: "${def.name}" (${def.id}) — ${count}/${totalPlayers} players (${pct(count, totalPlayers)}) at Lycans level (threshold: ${level.threshold})`);
        }
      }
    }

    // Check for no players having any level at all
    const anyUnlocked = [...levelMap.values()].some(arr => arr.length > 0);
    if (!anyUnlocked) {
      // Check if at least bronze-1 threshold is reasonable
      const minThreshold = def.levels[0]?.threshold;
      const maxPlayerValue = Math.max(0, ...playerValues.map(p => p.currentValue));
      emptyAchievements.push({ def, minThreshold, maxPlayerValue });
    }
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('⚠️  POTENTIAL ISSUES — LYCANS TIER TOO EASY');
    lines.push(sep2);
    for (const w of warnings) lines.push(w);
  }

  if (emptyAchievements.length > 0) {
    lines.push('');
    lines.push('ℹ️  ACHIEVEMENTS WITH ZERO UNLOCKS');
    lines.push(sep2);
    for (const { def, minThreshold, maxPlayerValue } of emptyAchievements) {
      const flag = maxPlayerValue === 0 ? '(no player has any value)' : `(closest: ${maxPlayerValue}/${minThreshold})`;
      lines.push(`   "${def.name}" (${def.id}) — Bronze 1 threshold: ${minThreshold} ${flag}`);
    }
  }

  // Per-achievement details, grouped by category
  const categoryOrder = Object.entries(data.categories || {})
    .sort(([, a], [, b]) => a.order - b.order);

  for (const [catKey, catInfo] of categoryOrder) {
    const achIds = categories[catKey];
    if (!achIds || achIds.length === 0) continue;

    lines.push('');
    lines.push(sep);
    lines.push(`${catInfo.emoji}  ${catInfo.label.toUpperCase()} (${catKey})`);
    lines.push(sep);

    for (const achId of achIds) {
      const stats = achievementStats.get(achId);
      if (!stats) continue;
      const { definition: def, levelMap, playerValues } = stats;

      lines.push('');
      const catInfo = ACHIEVEMENT_CATEGORIES[def.category] || { emoji: '❓', label: def.category };
      lines.push(`${def.emoji} ${def.name} [${def.id}] — ${catInfo.emoji} ${catInfo.label}`);
      lines.push(`   ${def.explanation}`);
      if (def.requiresBRData) lines.push(`   ⚠️  BR-only (main team)`);

      // Player value distribution summary
      const values = playerValues.map(p => p.currentValue).sort((a, b) => b - a);
      const playersWithValue = values.filter(v => v > 0);
      if (playersWithValue.length > 0) {
        const max = playersWithValue[0];
        const median = playersWithValue[Math.floor(playersWithValue.length / 2)];
        const avg = (playersWithValue.reduce((s, v) => s + v, 0) / playersWithValue.length).toFixed(1);
        lines.push(`   📊 ${playersWithValue.length}/${totalPlayers} players active | max: ${max} | median: ${median} | avg: ${avg}`);
      } else {
        lines.push(`   📊 0/${totalPlayers} players have any value for this achievement`);
      }

      // Per-level breakdown
      // Group levels by tier for cleaner display
      let prevTier = null;
      for (const level of def.levels) {
        const key = `${level.tier}-${level.subLevel}`;
        const players = levelMap.get(key) || [];
        const tierLabel = TIER_LABELS[level.tier] || level.tier;
        const tierPrefix = level.tier !== prevTier ? `\n   ${tierLabel}` : '';
        prevTier = level.tier;

        if (tierPrefix) lines.push(tierPrefix);

        const countStr = `${players.length} player${players.length !== 1 ? 's' : ''}`;
        const pctStr = pct(players.length, totalPlayers);

        if (players.length === 0) {
          lines.push(`      L${level.subLevel} (≥${level.threshold}): — none —`);
        } else if (players.length <= 15) {
          const names = players
            .sort((a, b) => b.value - a.value)
            .map(p => `${p.playerName} (${p.value})`)
            .join(', ');
          lines.push(`      L${level.subLevel} (≥${level.threshold}): ${countStr} (${pctStr}) → ${names}`);
        } else {
          // Too many players to list individually — show top 10 + count
          const topNames = players
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map(p => `${p.playerName} (${p.value})`)
            .join(', ');
          lines.push(`      L${level.subLevel} (≥${level.threshold}): ${countStr} (${pctStr}) → ${topNames}, ... +${players.length - 10} more`);
        }
      }
    }
  }

  // Global summary table
  lines.push('');
  lines.push(sep);
  lines.push('GLOBAL SUMMARY — PLAYERS PER TIER');
  lines.push(sep);
  lines.push('');
  lines.push(padR('Achievement', 45) + TIER_ORDER.map(t => padR(TIER_LABELS[t], 14)).join(''));
  lines.push('-'.repeat(45 + 14 * TIER_ORDER.length));

  for (const [catKey, catInfo] of categoryOrder) {
    const achIds = categories[catKey];
    if (!achIds || achIds.length === 0) continue;

    lines.push(`\n${catInfo.emoji} ${catInfo.label}`);

    for (const achId of achIds) {
      const stats = achievementStats.get(achId);
      if (!stats) continue;
      const { definition: def, levelMap } = stats;

      // For each tier, count max level reached per player
      const tierCounts = {};
      for (const tier of TIER_ORDER) {
        // Count players who reached at least one sub-level of this tier
        const tierLevels = def.levels.filter(l => l.tier === tier);
        const maxSubLevel = Math.max(...tierLevels.map(l => l.subLevel), 0);
        // Count players at the highest sub-level of this tier
        if (maxSubLevel > 0) {
          const key = `${tier}-${maxSubLevel}`;
          tierCounts[tier] = levelMap.get(key)?.length || 0;
        } else {
          tierCounts[tier] = 0;
        }
      }

      const name = def.emoji + ' ' + truncate(def.name, 42);
      const cells = TIER_ORDER.map(t => {
        const count = tierCounts[t];
        return padR(count > 0 ? `${count}` : '-', 14);
      }).join('');

      lines.push(padR(name, 45) + cells);
    }
  }

  // Write output  
  const report = lines.join('\n') + '\n';
  await fs.writeFile(outputPath, report, 'utf-8');

  console.log(`✅ Analysis written to ${outputPath}`);
  console.log(`   ${achievementDefinitions.length} achievements analyzed across ${totalPlayers} players`);
  if (warnings.length > 0) console.log(`   ⚠️  ${warnings.length} potential Lycans-tier issues detected`);
  if (emptyAchievements.length > 0) console.log(`   ℹ️  ${emptyAchievements.length} achievements with zero unlocks`);

  // Also print the warnings summary to console
  if (warnings.length > 0) {
    console.log('');
    for (const w of warnings) console.log(w);
  }
}

function pct(count, total) {
  if (total === 0) return '0%';
  return (count / total * 100).toFixed(1) + '%';
}

function padR(str, len) {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}

// Parse CLI args
const args = process.argv.slice(2);
const sourceKey = args.find(a => !a.startsWith('-')) || 'main';

main(sourceKey).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
