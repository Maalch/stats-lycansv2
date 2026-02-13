# URL Parameters for Lycans Statistics

This document explains how to use URL parameters to share specific filter settings for the Lycans Statistics dashboard.

## Overview

You can now share the dashboard with specific filter settings by adding URL parameters. When someone opens a URL with these parameters, the dashboard will automatically apply the specified filters.

## URL Parameter Format

Base URL: `https://your-domain.com/stats-lycansv2/`

### Available Parameters

#### Filter Parameters
| Parameter | Values | Description | Example |
|-----------|--------|-------------|---------|
| `gameTypeEnabled` | `true` | Enable game type filter | `gameTypeEnabled=true` |
| `gameFilter` | `all`, `modded`, `non-modded` | Game type filter | `gameFilter=modded` |
| `dateRangeEnabled` | `true` | Enable date range filter | `dateRangeEnabled=true` |
| `dateStart` | `YYYY-MM-DD` | Start date for date range filter | `dateStart=2024-01-01` |
| `dateEnd` | `YYYY-MM-DD` | End date for date range filter | `dateEnd=2024-12-31` |
| `mapNameEnabled` | `true` | Enable map name filter | `mapNameEnabled=true` |
| `mapNameFilter` | `Village`, `Château`, `Autre` | Map name filter | `mapNameFilter=Village` |
| `playerFilterMode` | `none`, `include`, `exclude` | Player filter mode | `playerFilterMode=include` |
| `players` | `Player1,Player2,Player3` | Comma-separated list of players (URL encoded) | `players=Ponce,AmberAerin,Flippy` |
| `highlightedPlayer` | `PlayerName` | Player to highlight in charts | `highlightedPlayer=Ponce` |
| `dataSource` | `main`, `discord` | Data source to use | `dataSource=main` |

#### Navigation Parameters
| Parameter | Values | Description | Example |
|-----------|--------|-------------|---------|
| `tab` | `playerSelection`, `rankings`, `general`, `gameDetails`, `clips`, `br` | Main tab selection | `tab=rankings` |
| `subtab` | Varies by tab | Sub-tab selection | `subtab=deathStats` |
| `playerSelectionView` | `rankings`, `titles`, `evolution`, `camps`, `kills`, `roles`, `actions`, `roleactions`, `deathmap`, `talkingtime` | Player selection page view | `playerSelectionView=rankings` |
| `deathStatsView` | `killers`, `deaths`, `hunter`, `survival` | Death statistics chart view | `deathStatsView=deaths` |
| `seriesView` | `villageois`, `loup`, `nowolf`, `solo`, `wins`, `losses`, `deaths`, `survival` | Player series chart view | `seriesView=wins` |

## Usage Examples

### Example 1: Filter for modded games only
```
https://your-domain.com/stats-lycansv2/?filterMode=gameType&gameFilter=modded
```

### Example 2: Include specific players
```
https://your-domain.com/stats-lycansv2/?playerFilterMode=include&players=Ponce%2CAmberAerin%2CFlippy
```

### Example 3: Date range filter
```
https://your-domain.com/stats-lycansv2/?filterMode=dateRange&dateStart=2024-01-01&dateEnd=2024-06-30
```

### Example 4: Complex filter (modded games with specific players)
```
https://your-domain.com/stats-lycansv2/?gameTypeEnabled=true&gameFilter=modded&playerFilterMode=include&players=Ponce%2CAmberAerin
```

### Example 5: Navigate to specific chart view
```
https://your-domain.com/stats-lycansv2/?tab=rankings&subtab=deathStats&deathStatsView=survival
```

### Example 6: Navigate with filters applied
```
https://your-domain.com/stats-lycansv2/?tab=rankings&subtab=deathStats&deathStatsView=deaths&gameTypeEnabled=true&gameFilter=modded
```

### Example 7: Navigate to series chart with specific view
```
https://your-domain.com/stats-lycansv2/?tab=rankings&subtab=series&seriesView=wins
```

## How to Generate URLs

### Method 1: Using the Share Button
1. Go to the Settings tab (⚙️)
2. Configure your desired filters
3. Scroll down to "3. Partage des Filtres"
4. Click "🔗 Copier le lien" to copy the URL with current settings

### Method 2: Manual URL Construction
You can manually construct URLs by adding the appropriate parameters to the base URL.

## Important Notes

- **URL Encoding**: Player names with special characters or spaces should be URL encoded
- **Priority**: URL parameters take priority over saved settings in localStorage
- **Persistence**: When you change filters via the UI, the URL will be updated automatically
- **Browser Navigation**: Back/forward buttons will work with different filter states
- **Default Values**: Only parameters that differ from defaults are included in the URL

## Player Name Encoding

When including player names in URLs, special characters need to be encoded:
- Spaces: `%20` or `+`
- Commas in names: `%2C`
- Accented characters: Use proper URL encoding

Example: "Jean-Pierre Müller" → `Jean-Pierre%20M%C3%BCller`

## Browser Compatibility

This feature works in all modern browsers and uses the standard URLSearchParams API for parameter handling.
