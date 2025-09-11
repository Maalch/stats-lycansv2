# URL Parameters for Lycans Statistics

This document explains how to use URL parameters to share specific filter settings for the Lycans Statistics dashboard.

## Overview

You can now share the dashboard with specific filter settings by adding URL parameters. When someone opens a URL with these parameters, the dashboard will automatically apply the specified filters.

## URL Parameter Format

Base URL: `https://your-domain.com/stats-lycansv2/`

### Available Parameters

| Parameter | Values | Description | Example |
|-----------|--------|-------------|---------|
| `filterMode` | `gameType`, `dateRange` | Primary filter mode | `filterMode=gameType` |
| `gameFilter` | `all`, `modded`, `non-modded` | Game type filter (when filterMode=gameType) | `gameFilter=modded` |
| `dateStart` | `YYYY-MM-DD` | Start date for date range filter | `dateStart=2024-01-01` |
| `dateEnd` | `YYYY-MM-DD` | End date for date range filter | `dateEnd=2024-12-31` |
| `playerFilterMode` | `none`, `include`, `exclude` | Player filter mode | `playerFilterMode=include` |
| `players` | `Player1,Player2,Player3` | Comma-separated list of players (URL encoded) | `players=Ponce,AmberAerin,Flippy` |

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
https://your-domain.com/stats-lycansv2/?filterMode=gameType&gameFilter=modded&playerFilterMode=include&players=Ponce%2CAmberAerin
```

## How to Generate URLs

### Method 1: Using the Share Button
1. Go to the Settings tab (⚙️)
2. Configure your desired filters
3. Scroll down to "3. Partage des Paramètres"
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
