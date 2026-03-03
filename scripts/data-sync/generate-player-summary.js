/**
 * Player Summary Generation System
 *
 * Generates a lightweight playerSummary.json with per-player quick stats
 * for use in the Twitch Extension. Avoids the need to download the full
 * gameLog.json (~15MB) inside an extension iframe.
 *
 * Stats per player:
 *   - Identity:     playerName, image, twitchUrl (from joueurs.json)
 *   - Basics:       totalGames, totalWins, winRate
 *   - Streaks:      currentStreak (+win / -loss), longestWinStreak
 *   - Preferences:  favoriteRole, favoriteMap
 *   - Camps:        campStats { Villageois, Loup, Autres } win rates
 *   - Recent:       last10Games (role, map, outcome, date)
 *
 * Usage:
 *   node generate-player-summary.js [main|discord]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getPlayerId,
  getCanonicalPlayerName,
  getPlayerCampFromRole,
} from '../../src/utils/datasyncExport.js';
import { DATA_SOURCES } from './shared/data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick the most-used key from a frequency map. */
function topKey(freqMap) {
  let best = null;
  let bestCount = 0;
  for (const [k, v] of Object.entries(freqMap)) {
    if (v > bestCount) {
      bestCount = v;
      best = k;
    }
  }
  return best;
}

/** Round to one decimal place. */
function pct(wins, games) {
  if (!games) return 0;
  return Math.round((wins / games) * 1000) / 10;
}

/**
 * Resolve the main camp bucket (Villageois | Loup | Autres) for a player slot.
 */
function resolveMainCamp(role, power) {
  const camp = getPlayerCampFromRole(
    role,
    { regroupLovers: true, regroupVillagers: true, regroupWolfSubRoles: true },
    power || null
  );
  if (camp === 'Villageois') return 'Villageois';
  if (camp === 'Loup') return 'Loup';
  return 'Autres';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(sourceKey) {
  const startTime = Date.now();

  const dataSource = DATA_SOURCES[sourceKey];
  if (!dataSource) {
    console.error(`❌ Unknown data source: ${sourceKey}`);
    console.error(`   Available: ${Object.keys(DATA_SOURCES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📊 Generating Player Summary for ${dataSource.name}`);
  console.log('='.repeat(60));

  const rootDir = path.resolve(__dirname, '../..');
  const dataDir = path.resolve(rootDir, dataSource.outputDir);
  const gameLogPath = path.join(dataDir, 'gameLog.json');
  const joueursPath = path.join(dataDir, 'joueurs.json');
  const outputPath = path.join(dataDir, 'playerSummary.json');

  // ── Load game log ────────────────────────────────────────────────────────
  console.log(`\n📂 Loading data from ${dataDir}...`);
  let gameLog;
  try {
    gameLog = JSON.parse(await fs.readFile(gameLogPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Cannot read gameLog.json: ${err.message}`);
    process.exit(1);
  }

  // Filter corrupted games (no EndDate) and sort chronologically (oldest first)
  const allGames = (gameLog.GameStats || [])
    .filter(g => g.EndDate)
    .sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));

  console.log(`  📊 Valid games: ${allGames.length}`);

  // ── Load joueurs.json ────────────────────────────────────────────────────
  let joueursData = null;
  try {
    joueursData = JSON.parse(await fs.readFile(joueursPath, 'utf-8'));
    console.log(`  👥 Joueurs: ${joueursData.Players?.length || 0} players`);
  } catch {
    console.log('  ⚠️  joueurs.json not found — identity info will be incomplete');
  }

  // ── Build per-player accumulators ───────────────────────────────────────
  const acc = new Map(); // playerId → accumulator object

  for (const game of allGames) {
    for (const player of (game.PlayerStats || [])) {
      const playerId = getPlayerId(player);
      if (!playerId) continue;

      if (!acc.has(playerId)) {
        acc.set(playerId, {
          playerId,
          playerName: getCanonicalPlayerName(player, joueursData),
          totalGames: 0,
          totalWins: 0,
          roleCount: {},
          mapCount: {},
          campStats: {
            Villageois: { games: 0, wins: 0 },
            Loup:        { games: 0, wins: 0 },
            Autres:      { games: 0, wins: 0 },
          },
          history: [], // chronological list of game outcomes
        });
      }

      const a = acc.get(playerId);
      const role = player.MainRoleInitial || 'Inconnu';
      const map  = game.MapName || 'Inconnu';
      const camp = resolveMainCamp(role, player.Power);
      const won  = player.Victorious === true;

      a.totalGames++;
      if (won) a.totalWins++;

      a.roleCount[role] = (a.roleCount[role] || 0) + 1;
      a.mapCount[map]   = (a.mapCount[map]   || 0) + 1;

      a.campStats[camp].games++;
      if (won) a.campStats[camp].wins++;

      a.history.push({
        gameId:     game.Id,
        date:       game.StartDate,
        mapName:    map,
        role,
        power:      player.Power || null,
        camp,
        victorious: won,
      });
    }
  }

  // ── Post-process and build final output ──────────────────────────────────
  const players = {};

  for (const [playerId, a] of acc) {
    // Favorite role / map
    const favoriteRole = topKey(a.roleCount) || 'Inconnu';
    const favoriteMap  = topKey(a.mapCount)  || 'Inconnu';

    // Camp win rates
    const campStats = {};
    for (const [camp, s] of Object.entries(a.campStats)) {
      campStats[camp] = { games: s.games, wins: s.wins, winRate: pct(s.wins, s.games) };
    }

    // Current streak: scan history from the end
    let currentStreak = 0;
    if (a.history.length > 0) {
      const lastOutcome = a.history[a.history.length - 1].victorious;
      for (let i = a.history.length - 1; i >= 0; i--) {
        if (a.history[i].victorious === lastOutcome) {
          currentStreak += lastOutcome ? 1 : -1;
        } else break;
      }
    }

    // Longest win streak
    let longestWinStreak = 0;
    let tempStreak = 0;
    for (const g of a.history) {
      if (g.victorious) {
        tempStreak++;
        longestWinStreak = Math.max(longestWinStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Last 10 games (newest first)
    const last10Games = a.history.slice(-10).reverse();
    const lastGameDate = a.history[a.history.length - 1]?.date || null;

    // Resolve identity from joueurs.json
    let image    = null;
    let twitchUrl = null;
    if (joueursData?.Players) {
      const joueur = joueursData.Players.find(
        p => p.SteamID === playerId || p.ID === playerId || p.Joueur === a.playerName
      );
      if (joueur) {
        image     = joueur.Image || null;
        twitchUrl = joueur.Twitch || null;
      }
    }

    players[playerId] = {
      playerId,
      playerName:      a.playerName,
      image,
      twitchUrl,
      totalGames:      a.totalGames,
      totalWins:       a.totalWins,
      winRate:         pct(a.totalWins, a.totalGames),
      currentStreak,
      longestWinStreak,
      favoriteRole,
      favoriteMap,
      campStats,
      lastGameDate,
      last10Games,
    };
  }

  // ── Write output ─────────────────────────────────────────────────────────
  const output = {
    version:      '1.0.0',
    generatedAt:  new Date().toISOString(),
    teamName:     dataSource.name,
    totalPlayers: Object.keys(players).length,
    totalGames:   allGames.length,
    players,
  };

  console.log(`\n💾 Writing ${outputPath}...`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileStat = await fs.stat(outputPath);
  const fileSizeKB = (fileStat.size / 1024).toFixed(1);

  console.log(`\n✅ Player summary generated in ${elapsed}s`);
  console.log(`   📦 Output size: ${fileSizeKB} KB`);
  console.log(`   👥 Players: ${output.totalPlayers}`);
  console.log(`   🎮 Games processed: ${output.totalGames}`);
  console.log('');
}

// ── CLI entry point ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const sourceKey = args.find(a => !a.startsWith('-')) || 'main';

main(sourceKey).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
