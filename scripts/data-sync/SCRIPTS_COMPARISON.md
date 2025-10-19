# Data Sync Scripts Comparison

## Quick Reference

| Aspect | fetch-data.js | fetch-data-aws.js | fetch-data-discord.js |
|--------|---------------|-------------------|-----------------------|
| **Data Source** | Legacy Google Sheets API | AWS S3 only | Discord Team AWS S3 only |
| **Environment Variables** | `LYCANS_API_BASE` | `STATS_LIST_URL` | `STATS_LIST_URL` |
| **GitHub Secret** | `LYCANS_API_BASE` | `STATS_LIST_URL` | `STATS_LIST_URL` |
| **npm Command** | `npm run sync-data` | `npm run sync-data-aws` | `npm run sync-data-discord` |
| **Output File** | `gameLog.json` | `gameLog.json` | `gameLog_TeamDiscord.json` |
| **Game Data** | ✅ From Legacy API | ✅ From AWS S3 | ✅ From Discord AWS S3 |
| **Battle Royale Data** | ✅ Fetched | ⚠️ Placeholder | ⚠️ Placeholder |
| **Player Data** | ✅ Fetched | ⚠️ Placeholder | ⚠️ Placeholder |
| **AWS Support** | ❌ Disabled | ✅ Active | ✅ Active |
| **Achievements** | ✅ Generated | ✅ Generated | ✅ Generated |
| **Use Case** | Legacy-focused | Main AWS data | Discord Team data |

## Command Reference

```bash
# Legacy-only sync (original)
npm run sync-data

# AWS-only sync (main data)
npm run sync-data-aws

# Discord Team AWS sync (separate output)
npm run sync-data-discord

# Achievements only (uses existing gameLog.json)
npm run generate-achievements
```

## File Outputs

### fetch-data.js Creates:
- ✅ `gameLog.json` - Unified game data from Legacy
- ✅ `gameLog-Legacy.json` - Raw legacy data
- ✅ `rawBRData.json` - Battle Royale data
- ✅ `joueurs.json` - Player data
- ✅ `playerAchievements.json` - Pre-calculated achievements
- ✅ `index.json` - Data source metadata

### fetch-data-aws.js Creates:
- ✅ `gameLog.json` - Unified game data from AWS
- ⚠️ `gameLog-Legacy.json` - Empty placeholder
- ⚠️ `rawBRData.json` - Empty placeholder
- ⚠️ `joueurs.json` - Empty placeholder
- ✅ `playerAchievements.json` - Pre-calculated achievements
- ✅ `index.json` - Data source metadata

### fetch-data-discord.js Creates:
- ✅ `gameLog_TeamDiscord.json` - Discord Team game data from AWS
- ⚠️ `gameLog-Legacy_TeamDiscord.json` - Empty placeholder
- ⚠️ `rawBRData_TeamDiscord.json` - Empty placeholder
- ⚠️ `joueurs_TeamDiscord.json` - Empty placeholder
- ✅ `playerAchievements_TeamDiscord.json` - Discord Team achievements
- ✅ `index_TeamDiscord.json` - Discord Team metadata

## Choosing the Right Script

### Use `fetch-data.js` if you need:
- Legacy Google Sheets data
- Battle Royale statistics
- Player information (joueurs)
- Complete historical data

### Use `fetch-data-aws.js` if you need:
- Main AWS S3 data only
- Faster sync (fewer API calls)
- Modded game versions
- No dependency on Google Sheets API
- Output to standard `gameLog.json`

### Use `fetch-data-discord.js` if you need:
- Discord Team's AWS S3 data
- Separate output file (`gameLog_TeamDiscord.json`)
- Independent Discord Team statistics
- No conflicts with main data files

## Migration Notes

If switching from legacy to AWS-only:
1. Ensure `STATS_LIST_URL` is configured
2. Run `npm run sync-data-aws`
3. Verify output in `data/gameLog.json`
4. Check that achievements were generated
5. Test frontend with new data

## Development Workflow

```bash
# 1. Fetch data (choose one)
npm run sync-data       # Legacy
npm run sync-data-aws   # AWS

# 2. Start dev server (auto-copies data)
npm run dev

# 3. Build for production
npm run build
```

## GitHub Actions

All scripts work with GitHub Actions:

```yaml
# For Legacy sync (.github/workflows/update-data.yml)
- name: Sync Data
  env:
    LYCANS_API_BASE: ${{ secrets.LYCANS_API_BASE }}
  run: npm run sync-data

# For Main AWS sync (.github/workflows/update-data.yml)
- name: Sync Data
  env:
    STATS_LIST_URL: ${{ secrets.STATS_LIST_URL }}
  run: npm run sync-data-aws

# For Discord Team sync (.github/workflows/update-discorddata.yml)
- name: Sync Discord Team Data
  env:
    STATS_LIST_URL: ${{ secrets.STATS_LIST_URL }}
  run: npm run sync-data-discord
```

## Workflow Files

| Script | Workflow File | Schedule | Secret Name |
|--------|--------------|----------|-------------|
| `fetch-data.js` | `update-data.yml` | 4 AM UTC | `LYCANS_API_BASE` |
| `fetch-data-aws.js` | `update-data.yml` | 4 AM UTC | `STATS_LIST_URL` |
| `fetch-data-discord.js` | `update-discorddata.yml` | 5 AM UTC | `STATS_LIST_URL` |
