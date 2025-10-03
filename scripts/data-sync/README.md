# Data Sync Scripts

This folder contains scripts for syncing and processing Lycans game data and generating pre-calculated achievements.

## Files

- **`fetch-data.js`** - Main data synchronization script that fetches game data from external sources and generates achievements
- **`generate-achievements.js`** - Standalone script for generating player achievements from game data
- **`package.json`** - Node.js dependencies for the scripts

## Scripts

### fetch-data.js

The main data sync script that:
1. Fetches legacy data from Google Sheets API (if available)
2. Merges data into unified `gameLog.json` format
3. Generates player achievements automatically
4. Creates data index and metadata files

**Usage:**
```bash
cd scripts/data-sync
node fetch-data.js
```

**Environment Variables:**
- `LYCANS_API_BASE` - Base URL for the legacy Google Sheets API
- `STATS_LIST_URL` - URL for AWS S3 bucket stats list (currently disabled)

### generate-achievements.js

A standalone script that generates player achievements from existing game data. This can be run independently to update achievements without fetching fresh data.

**Usage:**
```bash
cd scripts/data-sync
node generate-achievements.js
```

## Generated Data

### playerAchievements.json

Structure:
```json
{
  "generatedAt": "2025-10-01T07:20:43.136Z",
  "totalPlayers": 74,
  "totalGames": 537,
  "totalModdedGames": 257,
  "achievements": {
    "PlayerName": {
      "playerId": "PlayerName",
      "allGamesAchievements": [...],
      "moddedOnlyAchievements": [...]
    }
  }
}
```

### Achievement Types

Currently generates **General Achievements** and **History Achievements**:

#### General Achievements (🏆🎯)
- **🎯 Top 10 Participations** - Most active players by game count
- **🏆 Top 10 Win Rate (min. 10 games)** - Best win rates with minimum games
- **🌟 Top 10 Win Rate Expert (min. 50 games)** - Best win rates for experienced players
- **💀 Top 10 Worst Win Rate (min. 10 games)** - Lowest win rates with minimum games
- **☠️ Top 10 Worst Win Rate Expert (min. 50 games)** - Lowest win rates for experienced players

#### History Achievements (🏘️🏰)
- **🏘️ Top 10 Village** - Best win rates on Village map (min. 10 games)
- **🏰 Top 10 Château** - Best win rates on Château map (min. 10 games)

Each achievement includes:
- `id` - Unique identifier
- `title` - Display title with emoji and rank
- `description` - Detailed description with rank and value
- `type` - "good" or "bad"
- `category` - "general" or "history" (more categories planned)
- `rank` - Position in top 10 (1-10)
- `value` - The actual metric value
- `redirectTo` - Navigation target for UI

## Integration

The achievements generation is integrated into:

1. **`npm run sync-data`** - Full data sync including achievements
2. **`npm run generate-achievements`** - Standalone achievements generation + copy to public folder
3. **GitHub Actions** - Weekly automated data sync (including achievements)

## Performance Benefits

By pre-calculating achievements server-side, we:
- Reduce client-side computation load
- Ensure consistent rankings across all users
- Enable faster page loads for the player selection interface
- Centralize achievement logic for easier maintenance and updates

## Future Enhancements

Planned achievement categories:
- **Performance** - Camp-specific win rates and specializations
- **Series** - Win/loss streaks and momentum
- **Kills** - Death statistics and elimination patterns
- **Comparison** - Head-to-head records between players

Each category will have its own processor module following the same pattern as `generalAchievements.js` and `historyAchievements.js`.