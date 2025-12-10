# Incremental Achievements Generation

## Overview

The achievements generation system now supports **incremental processing** to avoid recalculating all player statistics from scratch each time new games are added.

## How It Works

### Cache Structure

A cache file (`playerStatsCache.json`) is created in each data directory (e.g., `data/playerStatsCache.json`, `data/discord/playerStatsCache.json`) containing:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-10T12:00:00Z",
  "lastProcessedGameId": null,
  
  "allGames": {
    "totalGames": 662,
    "playerStats": { 
      "[playerId]": {
        "playerId": "76561198...",
        "playerName": "Ponce",
        "gamesPlayed": 500,
        "wins": 275,
        "camps": { ... }
      }
    },
    "seriesState": {
      "[playerId]": {
        "currentWinSeries": 3,
        "longestWinSeries": { ... },
        ...
      }
    },
    "globalStats": { ... }
  },
  
  "moddedGames": { ... }
}
```

### Incremental Process Flow

1. **Load cache** - Existing player statistics and series state
2. **Detect new games** - Compare game count in cache vs current data
3. **Process new games only** - Update stats for affected players
4. **Recalculate rankings** - Sort all players (fast, even with 85+ players)
5. **Save updated cache** - Persist for next run

### Performance Benefits

**Before (full recalculation):**
- Process all 662 games every time
- Compute stats for all 85 players from scratch
- ~2-3 seconds for full dataset

**After (incremental):**
- Process only new games (typically 1-5 games per day)
- Update stats for only affected players (~10-15 players per game)
- ~0.5 seconds when no new games, ~1 second with new games

**Net speedup:** ~50-80% when most games are already processed

## Usage

### Standalone Script

```bash
# Normal mode (uses cache if available)
node scripts/data-sync/generate-achievements.js main

# Force full recalculation (ignores cache)
node scripts/data-sync/generate-achievements.js main --force-full

# Different data source
node scripts/data-sync/generate-achievements.js discord
```

### Integrated with Data Sync

The incremental mode is automatically used in:
- `scripts/data-sync/fetch-data.js` (main team sync)
- `scripts/data-sync/fetch-data-unified.js` (AWS-only sync)

No code changes needed - it will detect and use the cache automatically.

## Cache Management

### When Cache is Created

- **First run** - No cache exists, performs full calculation, then saves cache
- **Subsequent runs** - Loads cache, detects new games, updates incrementally

### When Cache is Invalidated

The cache is automatically recreated (full recalculation) if:
- Cache version mismatch (e.g., after system upgrade)
- Cache file is corrupted or unreadable
- `--force-full` flag is used

### Manual Cache Deletion

```bash
# Remove cache to force full recalculation next run
Remove-Item data/playerStatsCache.json

# Or on Unix systems
rm data/playerStatsCache.json
```

## Implementation Details

### What's Cached

**Player Stats (incremental):**
- Games played, wins, camp performance
- Cumulative counters that can be incrementally updated

**Series State (incremental):**
- Current win/loss/camp streaks
- Longest streak records
- Tracked chronologically per player

**Not Cached (always recalculated):**
- Map statistics (fast)
- Death statistics (fast)
- Hunter statistics (fast)
- Voting statistics (fast)
- Camp performance vs average (requires global averages)

### Why Some Stats Aren't Cached

Rankings require comparing all players, so the final achievement generation step always processes the full player list. However, the expensive part (reading and processing all games) is skipped for unchanged data.

For stats like death rates, voting accuracy, etc., the computation is fast enough (~100-200ms) that caching adds complexity without meaningful performance gains.

### Key Functions

**Cache Management:**
- `loadCache(dataDir)` - Load cache or create empty
- `saveCache(dataDir, cache)` - Save updated cache
- `detectNewGames(games, datasetCache)` - Identify new games
- `getAffectedPlayers(newGames)` - Find players in new games

**Compute Functions:**
- `updatePlayerStatsIncremental()` - Update player stats with new games only
- `updatePlayerSeriesDataIncremental()` - Continue series tracking from saved state
- `computePlayerStats()` - Full recalculation (fallback)

**Main Entry Points:**
- `generateAllPlayerAchievements()` - Full recalculation
- `generateAllPlayerAchievementsIncremental()` - Incremental update

## Troubleshooting

### Cache not being used

**Symptom:** Every run says "performing full calculation"
**Cause:** Cache file doesn't exist or is invalid
**Solution:** Check if `data/playerStatsCache.json` exists, verify JSON is valid

### Achievements differ after incremental vs full

**Symptom:** Different achievements when using cache vs `--force-full`
**Cause:** Bug in incremental computation logic
**Solution:** Use `--force-full` and report issue - incremental should match full results exactly

### Cache growing too large

**Symptom:** Cache file >10MB
**Cause:** Normal with 85+ players and comprehensive stats
**Solution:** This is expected. Cache size scales with player count, not game count.

## Future Optimizations

Potential improvements not yet implemented:

1. **Partial series reconstruction** - Store series state to avoid recomputing series from all games
2. **Differential achievements** - Only regenerate achievements for affected players
3. **Compressed cache** - gzip compression for large player sets
4. **Cache versioning** - Semantic versioning for gradual migrations

## Technical Notes

### Game Ordering

Games are processed chronologically using `DisplayedId` which is assigned based on timestamp parsing. This ensures series tracking remains consistent across runs.

### Player Identification

Players are identified by Steam ID (from `player.ID` field) to handle username changes. The cache stores both `playerId` and `playerName` (latest known name).

### Data Sources

Each data source (main, discord) has its own independent cache in its respective directory:
- `data/playerStatsCache.json` - Main team
- `data/discord/playerStatsCache.json` - Discord team

This allows different sync schedules without cross-contamination.
