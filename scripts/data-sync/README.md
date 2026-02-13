# Data Sync Scripts

This folder contains scripts for syncing and processing Lycans game data and generating pre-calculated Rankings.

## Files

- **`fetch-data-unified.js`** - Unified AWS data synchronization script (supports multiple teams)
- **`fetch-data.js`** - Legacy-only data synchronization script (Google Sheets API)
- **`generate-Rankings.js`** - Standalone script for generating player Rankings from game data
- **`shared/data-sources.js`** - Configuration for different data sources/teams
- **`shared/sync-utils.js`** - Shared utility functions for data syncing
- **`package.json`** - Node.js dependencies for the scripts

## Quick Start

### Sync Main Team Data (AWS)
```bash
npm run sync-data-aws
```

### Sync Discord Team Data (AWS)
```bash
npm run sync-data-discord
```

### Sync Legacy Data (Google Sheets)
```bash
npm run sync-data
```

## Scripts

### fetch-data-unified.js (AWS-Only - Recommended)

**NEW:** Unified AWS data sync script that supports multiple teams through configuration.

**Usage:**
```bash
# Main team
cd scripts/data-sync
node fetch-data-unified.js main
# or from project root:
npm run sync-data-aws

# Discord team
cd scripts/data-sync
node fetch-data-unified.js discord
# or from project root:
npm run sync-data-discord
```

**Environment Variables:**
- `STATS_LIST_URL` - URL for AWS S3 bucket stats list

**Features:**
- Single codebase for all AWS syncs
- Configuration-based team support
- Automatic game filtering per team
- Auto-generates joueurs.json for teams (when configured)
- Generates player Rankings automatically
- Creates unified `gameLog.json` format
- Outputs to team-specific directories

**Adding New Teams:**

Edit `shared/data-sources.js`:
```javascript
export const DATA_SOURCES = {
  newTeam: {
    name: 'New Team',
    outputDir: '../../data/newteam',
    gameFilter: (gameId) => gameId.startsWith('NewTeam-'),
    generateJoueurs: true,
    modVersionLabel: 'New Team - Multiple AWS Versions',
    indexDescription: 'Game logs for New Team.'
  }
};
```

Then run: `node fetch-data-unified.js newTeam`

### generate-Rankings.js

A standalone script that generates player Rankings from existing game data. This can be run independently to update Rankings without fetching fresh data.

**Usage:**
```bash
cd scripts/data-sync
node generate-Rankings.js
```

## Generated Data

### playerRankings.json

Structure:
```json
{
  "generatedAt": "2025-10-01T07:20:43.136Z",
  "totalPlayers": 74,
  "totalGames": 537,
  "totalModdedGames": 257,
  "Rankings": {
    "PlayerName": {
      "playerId": "PlayerName",
      "allGamesRankings": [...],
      "moddedOnlyRankings": [...]
    }
  }
}
```

### Ranking Types

Currently generates **General Rankings** and **History Rankings**:

#### General Rankings (🏆🎯)
- **🎯 Top 10 Participations** - Most active players by game count
- **🏆 Top 10 Win Rate (min. 10 games)** - Best win rates with minimum games
- **🌟 Top 10 Win Rate Expert (min. 50 games)** - Best win rates for experienced players
- **💀 Top 10 Worst Win Rate (min. 10 games)** - Lowest win rates with minimum games
- **☠️ Top 10 Worst Win Rate Expert (min. 50 games)** - Lowest win rates for experienced players

#### History Rankings (🏘️🏰)
- **🏘️ Top 10 Village** - Best win rates on Village map (min. 10 games)
- **🏰 Top 10 Château** - Best win rates on Château map (min. 10 games)

Each Ranking includes:
- `id` - Unique identifier
- `title` - Display title with emoji and rank
- `description` - Detailed description with rank and value
- `type` - "good" or "bad"
- `category` - "general" or "history" (more categories planned)
- `rank` - Position in top 10 (1-10)
- `value` - The actual metric value
- `redirectTo` - Navigation target for UI

## Integration

The Rankings generation is integrated into:

1. **`npm run sync-data`** - Full data sync including Rankings
2. **`npm run generate-Rankings`** - Standalone Rankings generation + copy to public folder
3. **GitHub Actions** - Weekly automated data sync (including Rankings)

## Performance Benefits

By pre-calculating Rankings server-side, we:
- Reduce client-side computation load
- Ensure consistent rankings across all users
- Enable faster page loads for the player selection interface
- Centralize Ranking logic for easier maintenance and updates

## Future Enhancements

Planned Ranking categories:
- **Performance** - Camp-specific win rates and specializations
- **Series** - Win/loss streaks and momentum
- **Kills** - Death statistics and elimination patterns
- **Comparison** - Head-to-head records between players

Each category will have its own processor module following the same pattern as `generalRankings.js` and `historyRankings.js`.