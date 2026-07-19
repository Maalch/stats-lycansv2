# Stats Lycans Quick Reference

## Project Overview

React + TypeScript dashboard for werewolf game statistics visualization.

**Tech Stack:** React 19, TypeScript, Vite, Recharts, CSS Custom Properties  
**Build Output:** `docs/` folder (GitHub Pages)  
**Data Pipeline:** AWS S3 → fetch-data-unified.js → gameLog.json

## Key Directories

```
src/
├── components/      # React components by domain
├── context/         # React contexts (Settings, Navigation, Fullscreen)
├── hooks/           # Custom hooks with base hook pattern
├── utils/           # Pure computation functions
└── types/           # TypeScript type definitions

scripts/data-sync/   # Data sync scripts
data/                # Main team data files
data/discord/        # Discord team data files
docs/                # Production build output
```

## Essential Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run sync-data-aws    # Main team AWS sync
npm run sync-data-discord # Discord team AWS sync
npm run generate-rankings # Generate rankings from game data
```

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `STATS_LIST_URL` | GitHub Secret | AWS S3 StatsList.json URL |
| `LYCANSTRACKER_SECRET_ACTIONS` | GitHub Secret | GitHub PAT for commits |
| `LYCANS_API_BASE` | GitHub Secret | Legacy API (optional) |

## Data Sources

| Team | Game Prefixes | Output Directory |
|------|---------------|------------------|
| Main | `Ponce-`, `Tsuna-`, `khalen-` | `data/` |
| Discord | `Nales-` | `data/discord/` |

## Key Files

| File | Purpose |
|------|---------|
| `gameLog.json` | Unified game data |
| `joueurs.json` | Player registry |
| `playerRankings.json` | Pre-calculated rankings |
| `playerTitles.json` | Pre-calculated titles |
| `playerAchievements.json` | Pre-calculated achievements |

## Workflows

| Workflow | Schedule | Output |
|----------|----------|--------|
| update-data.yml | Mon/Tue/Thu 8 PM UTC | data/gameLog.json |
| update-discorddata.yml | Mon/Thu/Sat 4 AM UTC | data/discord/ |
| update-rankings-titles.yml | Sun 6 AM UTC | Rankings, titles, achievements |

## Documentation

- `.github/copilot-instructions.md` — Development patterns
- `scripts/data-sync/ARCHITECTURE.md` — Data pipeline architecture
- `scripts/data-sync/README.md` — Sync scripts usage
- `NAVIGATION.md` — Navigation system architecture
- `URL_FILTERS.md` — URL parameter documentation

## Environment Setup

**TODO: Upgrade Node.js to 22 or higher**
- Current: Node 18 (incompatible with Vite 7)
- Required: Node 22+ or 24+
- Install via nvm: `nvm install 22` or `nvm install --lts`
- Vite requires Node 20.19+, npm 12 requires Node 22+

## Common Tasks

### Add new player/team
1. Update `scripts/data-sync/shared/data-sources.js`
2. Add game filter for new prefix
3. Run sync script

### Update game data
1. Upload game logs to AWS S3
2. Update StatsList.json
3. Workflow runs automatically or trigger manually

### Local testing
```bash
# Set environment variable
export STATS_LIST_URL="https://bucket.s3.region.amazonaws.com/StatsList.json"

# Run sync
cd scripts/data-sync
npm install
node fetch-data-unified.js main
```

## Troubleshooting

**Workflow fails with "STATS_LIST_URL not found"**
→ Add `STATS_LIST_URL` secret in GitHub repository settings

**No games synced**
→ Check game IDs match expected prefixes (Ponce-, Tsuna-, Nales-, khalen-)

**Invalid JSON errors**
→ Validate StatsList.json and game log files are valid JSON

**Build fails**
→ Run `npm run build` locally to check for TypeScript errors
