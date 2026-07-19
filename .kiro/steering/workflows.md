# GitHub Actions Workflows

## Overview

Four main workflows handle data synchronization and site deployment.

## Workflows Summary

| Workflow | Purpose | Schedule |
|----------|---------|----------|
| `update-data.yml` | Main team AWS sync | Mon/Tue/Thu 8 PM UTC |
| `update-discorddata.yml` | Discord team AWS sync | Mon/Thu/Sat 4 AM UTC |
| `update-anaeecorpdata.yml` | Anaee Corp AWS sync | Mon/Thu/Sat 4 AM UTC |
| `update-rankings-titles.yml` | Generate rankings/titles/achievements | Weekly (Sun 6 AM UTC) |
| `deploy-pages.yml` | Build and deploy to GitHub Pages | On push to main |

## update-data.yml

### Triggers
- **Schedule:** Monday, Tuesday, Thursday at 8 PM UTC
- **Manual:** `workflow_dispatch` with `full_sync` option
- **Push:** Changes to `.github/workflows/update-data.yml`

### Secrets Required
- `STATS_LIST_URL` — AWS S3 StatsList.json URL
- `LYCANSTRACKER_SECRET_ACTIONS` — GitHub token for commits
- `LYCANS_API_BASE` — (optional) Legacy Google Sheets API

### Steps
1. Checkout repository with `LYCANSTRACKER_SECRET_ACTIONS` token
2. Setup Node.js 24
3. Install dependencies in `scripts/data-sync`
4. Run `fetch-data.js` with environment variables
5. Validate data files (JSON structure, required files)
6. Copy data to `docs/data/`
7. Commit and push if changes

### Manual Trigger Options
- `full_sync: true` — Force full synchronization (ignore incremental cache)

## update-discorddata.yml

### Triggers
- **Schedule:** Monday, Thursday, Saturday at 4 AM UTC
- **Manual:** `workflow_dispatch` with `full_sync` option
- **Push:** Changes to `.github/workflows/update-discorddata.yml`

### Secrets Required
- `STATS_LIST_URL` — AWS S3 bucket URL
- `LYCANSTRACKER_SECRET_ACTIONS` — GitHub token for commits

### Steps
1. Checkout repository
2. Setup Node.js 24
3. Install dependencies
4. Run `fetch-data-unified.js discord`
5. Validate Discord team data files
6. Copy to `docs/data/discord/`
7. Commit and push if changes

## update-anaeecorpdata.yml

### Triggers
- **Schedule:** Monday, Thursday, Saturday at 4 AM UTC
- **Manual:** `workflow_dispatch` with `full_sync` option
- **Push:** Changes to `.github/workflows/update-anaeecorpdata.yml`

### Secrets Required
- `STATS_LIST_URL` — AWS S3 bucket URL
- `LYCANSTRACKER_SECRET_ACTIONS` — GitHub token for commits

### Steps
1. Checkout repository
2. Setup Node.js 24
3. Install dependencies
4. Run `fetch-data-unified.js anaeecorp`
5. Validate Anaee Corp team data files
6. Copy to `docs/data/anaeecorp/`
7. Commit and push if changes

### Purpose
Syncs game data for the Anaee Corp team (prefixes: `Holdener-`, `Anaee-`, `Rigner-`, `Karnarok-`)

## update-rankings-titles.yml

### Triggers
- **Schedule:** Weekly on Sunday at 6 AM UTC
- **Manual:** `workflow_dispatch` with `force_recalc` option

### Purpose
Generates pre-calculated data for performance:
- `playerRankings.json` — Top 10 rankings across categories
- `playerTitles.json` — Percentile-based player titles
- `playerAchievements.json` — Threshold-based achievements

### Output
- Main team: `data/playerRankings.json`, `data/playerTitles.json`, `data/playerAchievements.json`
- Discord team: `data/discord/` equivalents

## deploy-pages.yml

### Triggers
- **Push:** To `main` branch

### Steps
1. Checkout repository
2. Setup Node.js 24
3. Install dependencies (`npm ci`)
4. Run production build (`npm run build`)
5. Upload `docs/` folder as GitHub Pages artifact

## Required GitHub Secrets

| Secret | Description | Used By |
|--------|-------------|---------|
| `STATS_LIST_URL` | AWS S3 URL to StatsList.json | update-data.yml, update-discorddata.yml |
| `LYCANSTRACKER_SECRET_ACTIONS` | GitHub PAT for committing changes | All workflows |
| `LYCANS_API_BASE` | Legacy Google Sheets API URL (optional) | update-data.yml |

**Note:** All sync workflows now use XML-based S3 bucket listing. `STATS_LIST_URL` points to the S3 bucket root, which returns an XML `ListBucketResult` that is parsed to extract all game log files.

## Setting Up Secrets

1. Go to repository **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add each secret:
   - Name: `STATS_LIST_URL`
   - Value: `https://your-bucket.s3.region.amazonaws.com/StatsList.json`
4. Repeat for other secrets

## Manual Workflow Triggers

### Trigger via GitHub UI
1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Select options (e.g., `full_sync`)
5. Click **Run workflow**

### Trigger via GitHub CLI
```bash
# Main team full sync
gh workflow run update-data.yml -f full_sync=true

# Discord team full sync
gh workflow run update-discorddata.yml -f full_sync=true

# Force rankings recalculation
gh workflow run update-rankings-titles.yml -f force_recalc=true
```

## Workflow Permissions

All workflows require:
- `contents: write` — To commit and push changes
- Repository must allow GitHub Actions to create pull requests or push to branches

Configure in **Settings → Actions → General → Workflow permissions**:
- Select "Read and write permissions"
