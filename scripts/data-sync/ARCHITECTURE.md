# Data Sync Architecture Overview

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Legacy     │  │  Main AWS    │  │  Discord Team AWS    │  │
│  │ Google Sheets│  │   S3 Bucket  │  │     S3 Bucket        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼──────────────────┼──────────────────────┼──────────────┘
          │                  │                      │
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SYNC SCRIPTS                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │fetch-data.js │  │fetch-data-   │  │fetch-data-discord.js │  │
│  │              │  │aws.js        │  │                      │  │
│  │ Legacy sync  │  │ AWS sync     │  │ Discord Team sync    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼──────────────────┼──────────────────────┼──────────────┘
          │                  │                      │
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OUTPUT FILES                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ gameLog.json │  │ gameLog.json │  │gameLog_TeamDiscord   │  │
│  │ rawBRData    │  │ (placeholders│  │.json                 │  │
│  │ joueurs.json │  │  for legacy) │  │ (placeholders)       │  │
│  │ achievements │  │ achievements │  │ achievements_Team    │  │
│  │              │  │              │  │ Discord.json         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                  │                      │
          └──────────────────┴──────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BUILD PROCESS                                  │
├─────────────────────────────────────────────────────────────────┤
│  npm run build → Copy all files to docs/data/ for GitHub Pages  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND                                       │
├─────────────────────────────────────────────────────────────────┤
│  React app loads data from /data/*.json files                   │
│  - Main stats from gameLog.json                                 │
│  - Discord Team stats from gameLog_TeamDiscord.json (optional)  │
└─────────────────────────────────────────────────────────────────┘
```

## GitHub Actions Workflows

```
┌────────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS WORKFLOWS                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  update-data.yml (4 AM UTC daily)                   │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  Secret: STATS_LIST_URL                             │  │
│  │  Script: fetch-data-unified.js main                 │  │
│  │  Output: data/gameLog.json + related files          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  update-discorddata.yml (5 AM UTC daily)           │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  Secret: STATS_LIST_URL                             │  │
│  │  Script: fetch-data-unified.js discord              │  │
│  │  Output: data/discord/gameLog.json + related files  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## File Naming Convention

```
┌────────────────────────────────────────────────────────────┐
│                  FILE NAMING PATTERN                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Main Data Files:                                          │
│  ├── gameLog.json                                          │
│  ├── playerAchievements.json                              │
│  ├── rawBRData.json                                        │
│  ├── joueurs.json                                          │
│  └── index.json                                            │
│                                                            │
│  Discord Team Files (with _TeamDiscord suffix):            │
│  ├── gameLog_TeamDiscord.json                             │
│  ├── playerAchievements_TeamDiscord.json                  │
│  ├── rawBRData_TeamDiscord.json                           │
│  ├── joueurs_TeamDiscord.json                             │
│  └── index_TeamDiscord.json                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Data Flow: Discord Team Sync

```
1. GitHub Actions triggers at 5 AM UTC
   │
   ▼
2. Workflow reads DISCORD_STATS_LIST_URL secret
   │
   ▼
3. fetch-data-discord.js fetches StatsList.json from S3
   │
   ▼
4. Script fetches all game log files listed
   │
   ▼
5. Games are deduplicated by ID and sorted by StartDate
   │
   ▼
6. Unified data saved to gameLog_TeamDiscord.json
   │
   ▼
7. Achievements generated → playerAchievements_TeamDiscord.json
   │
   ▼
8. Placeholder files created for compatibility
   │
   ▼
9. Workflow validates all output files
   │
   ▼
10. Files copied to docs/data/ directory
   │
   ▼
11. Changes committed and pushed to repository
   │
   ▼
12. GitHub Pages serves updated files
```

## npm Scripts Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    npm run sync-data                         │
├─────────────────────────────────────────────────────────────┤
│  cd scripts/data-sync → npm install → node fetch-data.js    │
│  Output: gameLog.json (from Legacy API)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  npm run sync-data-aws                       │
├─────────────────────────────────────────────────────────────┤
│  cd scripts/data-sync → npm install → node fetch-data-      │
│  unified.js main                                             │
│  Output: data/gameLog.json (from AWS S3)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                npm run sync-data-discord                     │
├─────────────────────────────────────────────────────────────┤
│  cd scripts/data-sync → npm install → node fetch-data-      │
│  unified.js discord                                          │
│  Output: data/discord/gameLog.json (filtered AWS games)     │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

```
┌──────────────────────────────────────────────────────────────┐
│                  ENVIRONMENT VARIABLES                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  fetch-data.js:                                              │
│  └── LYCANS_API_BASE (Google Sheets API URL)                │
│                                                              │
│  fetch-data-unified.js:                                      │
│  └── STATS_LIST_URL (AWS S3 StatsList URL)                  │
│      Used by both 'main' and 'discord' configurations       │
│                                                              │
│  GitHub Secrets:                                             │
│  ├── LYCANS_API_BASE (for legacy sync, if used)             │
│  └── STATS_LIST_URL (for all AWS syncs)                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
stats-lycansv2/
│
├── .github/
│   └── workflows/
│       ├── update-data.yml          # Main data sync workflow
│       └── update-discorddata.yml   # Discord Team workflow
│
├── scripts/
│   └── data-sync/
│       ├── fetch-data-unified.js    # Unified AWS sync (main/discord)
│       ├── fetch-data.js            # Legacy sync script
│       ├── generate-achievements.js # Achievement generator
│       ├── compute-stats.js         # Statistics computation
│       ├── helpers.js               # Helper functions
│       ├── shared/
│       │   ├── data-sources.js      # Team configurations
│       │   └── sync-utils.js        # Shared sync utilities
│       ├── processors/              # Achievement processors
│       ├── package.json             # Script dependencies
│       ├── README.md                # Scripts overview
│       ├── OPTIMIZATION.md          # Optimization guide
│       └── OPTIMIZATION_SUMMARY.md  # Code reduction summary
│
├── data/                            # Main team data directory
│   ├── gameLog.json                 # Main game data
│   ├── playerAchievements.json      # Main achievements
│   ├── joueurs.json                 # Player data (placeholder)
│   ├── discord/                     # Discord team subdirectory
│   │   ├── gameLog.json             # Discord team games
│   │   ├── playerAchievements.json  # Discord achievements
│   │   └── joueurs.json             # Discord players
│   ├── playerAchievements_TeamDiscord.json  # Discord achievements
│   └── ...                          # Other data files
│
├── docs/                            # Built for GitHub Pages
│   └── data/                        # Copied during build
│       ├── gameLog.json
│       ├── gameLog_TeamDiscord.json
│       └── ...
│
└── src/                             # React frontend
    └── (frontend loads from /data/*.json)
```

## Comparison Matrix

```
┌───────────────┬──────────────┬──────────────┬──────────────────┐
│   Feature     │ Legacy Sync  │ Main AWS     │ Discord Team AWS │
├───────────────┼──────────────┼──────────────┼──────────────────┤
│ Data Source   │ Google Sheet │ AWS S3       │ AWS S3           │
│ Output File   │ gameLog.json │ gameLog.json │ gameLog_Team...  │
│ BR Data       │ ✅ Yes       │ ⚠️ Placeholder│ ⚠️ Placeholder   │
│ Player Data   │ ✅ Yes       │ ⚠️ Placeholder│ ⚠️ Placeholder   │
│ Achievements  │ ✅ Yes       │ ✅ Yes       │ ✅ Yes           │
│ Workflow      │ update-data  │ update-data  │ update-discord   │
│ Schedule      │ 4 AM UTC     │ 4 AM UTC     │ 5 AM UTC         │
│ Conflicts     │ With AWS     │ With Legacy  │ None (separate)  │
└───────────────┴──────────────┴──────────────┴──────────────────┘
```

## Integration Points

```
                    ┌──────────────────┐
                    │  GitHub Secrets  │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
         ┌──────────▼────────┐  ┌─────▼──────────────┐
         │ LYCANS_API_BASE   │  │ STATS_LIST_URL     │
         │ STATS_LIST_URL    │  │ DISCORD_STATS_     │
         │                   │  │ LIST_URL           │
         └──────────┬────────┘  └─────┬──────────────┘
                    │                  │
         ┌──────────▼────────┐  ┌─────▼──────────────┐
         │ update-data.yml   │  │ update-discord     │
         │ (Main workflow)   │  │ data.yml           │
         └──────────┬────────┘  └─────┬──────────────┘
                    │                  │
         ┌──────────▼────────┐  ┌─────▼──────────────┐
         │ Sync scripts      │  │ fetch-data-        │
         │ (legacy/aws)      │  │ discord.js         │
         └──────────┬────────┘  └─────┬──────────────┘
                    │                  │
         ┌──────────▼────────┐  ┌─────▼──────────────┐
         │ gameLog.json      │  │ gameLog_Team       │
         │ + related files   │  │ Discord.json       │
         └──────────┬────────┘  └─────┬──────────────┘
                    │                  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ docs/data/       │
                    │ (GitHub Pages)   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ React Frontend   │
                    └──────────────────┘
```
