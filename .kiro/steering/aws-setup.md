# AWS S3 Bucket Setup for Stats Lycans

## Overview

Stats Lycans fetches game data from AWS S3 buckets. The system supports multiple teams (Main, Discord) through a unified sync script.

## Required GitHub Secret

### `STATS_LIST_URL`

**Expected Format:**
```
https://<bucket-name>.s3.<region>.amazonaws.com/StatsList.json
```

**Examples:**
```
https://lycans-stats-bucket.s3.eu-west-3.amazonaws.com/StatsList.json
https://my-lycans-data.s3.us-east-1.amazonaws.com/StatsList.json
```

**What this URL returns:**

The `StatsList.json` file must contain a JSON array of S3 URLs pointing to individual game log files:

```json
[
  "https://<bucket-name>.s3.<region>.amazonaws.com/Ponce-20250116183045.json",
  "https://<bucket-name>.s3.<region>.amazonaws.com/Tsuna-20250117091522.json",
  "https://<bucket-name>.s3.<region>.amazonaws.com/Nales-20250118102030.json",
  "https://<bucket-name>.s3.<region>.amazonaws.com/khalen-20250119113045.json"
]
```

## File Naming Convention

Individual game log files must follow this pattern:
```
<Prefix>-YYYYMMDDHHMMSS.json
```

- **Prefix:** Player/host identifier (e.g., `Ponce-`, `Tsuna-`, `Nales-`, `khalen-`)
- **Date format:** YYYYMMDDHHMMSS (year, month, day, hour, minute, second)

**Examples:**
- `Ponce-20250116183045.json` — Game hosted by Ponce on 2025-01-16 at 18:30:45
- `Nales-20250118102030.json` — Game hosted by Nales on 2025-01-18 at 10:20:30

## Game Log File Structure

Each game log file must contain:

```json
{
  "ModVersion": "1.2.3",
  "GameStats": [
    {
      "Id": "Ponce-20250116183045",
      "StartDate": "2025-01-16T18:30:45Z",
      "EndDate": "2025-01-16T19:45:30Z",
      "MapName": "Village",
      "PlayerStats": [
        {
          "Username": "PlayerName",
          "ID": "SteamID123",
          "MainRoleInitial": "Loup",
          "Victorious": true,
          ...
        }
      ]
    }
  ]
}
```

## Team Filtering

The sync script filters games by ID prefix based on team configuration:

| Team | Allowed Prefixes | Output Directory |
|------|------------------|------------------|
| Main | `Ponce-`, `Tsuna-`, `khalen-` | `data/` |
| Discord | `Nales-` | `data/discord/` |

## GitHub Actions Workflows

### Main Team: `.github/workflows/update-data.yml`
- **Schedule:** Monday, Tuesday, Thursday at 8 PM UTC
- **Secrets used:** `STATS_LIST_URL`, `LYCANS_API_BASE` (legacy, optional), `LYCANSTRACKER_SECRET_ACTIONS`

### Discord Team: `.github/workflows/update-discorddata.yml`
- **Schedule:** Monday, Thursday, Saturday at 4 AM UTC
- **Secrets used:** `STATS_LIST_URL`, `LYCANSTRACKER_SECRET_ACTIONS`

## Incremental Sync Behavior

The sync script supports incremental updates:

1. **File-level filtering:** Only fetches session files from the last 7 days
2. **Game-level updates:** Refreshes games from the last 6 hours
3. **Full sync:** Use `--full` flag or workflow input to fetch all files

## AWS S3 Bucket Configuration

### Bucket Policy (Public Read Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<bucket-name>/*"
    }
  ]
}
```

### CORS Configuration (if needed)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Required GitHub Secrets

| Secret | Description | Used By |
|--------|-------------|---------|
| `STATS_LIST_URL` | S3 URL to StatsList.json | All sync workflows |
| `LYCANSTRACKER_SECRET_ACTIONS` | GitHub token for commits | All workflows |
| `LYCANS_API_BASE` | Legacy Google Sheets API (optional) | `update-data.yml` |

## Testing the Setup

### Local Test
```bash
cd scripts/data-sync
npm install
STATS_LIST_URL="https://your-bucket.s3.region.amazonaws.com/StatsList.json" \
  node fetch-data-unified.js main
```

### Verify StatsList.json
```bash
curl -s "https://your-bucket.s3.region.amazonaws.com/StatsList.json" | jq '.'
```

## Troubleshooting

### Common Issues

1. **"STATS_LIST_URL environment variable not found"**
   - Set the `STATS_LIST_URL` secret in GitHub repository settings

2. **"No game log files found in AWS S3 bucket"**
   - Ensure `StatsList.json` exists and contains valid URLs
   - Check bucket permissions allow public read access

3. **"Failed to fetch any AWS game log files"**
   - Verify individual game log URLs are accessible
   - Check JSON structure matches expected format

4. **Games filtered out**
   - Verify game IDs match the expected prefixes for the team
   - Main team: `Ponce-`, `Tsuna-`, `khalen-`
   - Discord team: `Nales-`
