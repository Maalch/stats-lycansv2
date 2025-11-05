# Color Statistics Feature

## Overview
New statistics feature that analyzes player color usage and performance across all games.

## Location
**Menu:** Joueurs (Players) → Couleurs (Colors)

## Statistics Provided

### 1. Win Rate by Color Chart
- Shows the average win rate for each player color
- Colors are sorted by win rate (descending)
- Each bar is colored to match the actual game color
- Tooltip shows:
  - Win rate percentage
  - Total wins / total player instances
  - Number of games where the color appeared

### 2. Average Players per Color Chart
- Shows how many players on average use each color per game
- Colors are sorted by average usage (descending)
- Useful to identify popular colors
- Tooltip shows:
  - Average players per game
  - Total player instances across all games
  - Number of games where the color appeared

### 3. Summary Statistics Grid
- Quick overview of all color statistics in a card layout
- Each card shows:
  - Win rate percentage
  - Average players per game
  - Total games count
- Color-coded left border for easy identification

## Implementation Details

### Data Processing
- **Hook:** `useColorStatsFromRaw()`
- **Utility:** `computeColorStats()` in `colorStatsUtils.ts`
- **Pattern:** Follows the base hook pattern using `useGameStatsBase()`

### Color Mapping
Uses the centralized `useThemeAdjustedFrenchColorMapping()` hook from `types/api.ts` for consistent color representation across the application. This ensures:
- **Theme Support**: Colors automatically adjust for light/dark themes
- **Consistency**: Same color system used in GameDetailView and other components
- **Maintainability**: Single source of truth for color definitions

French color names mapped to hex values:
- Rouge → #FF0000 (Red)
- Bleu royal → #4169E1 (Royal Blue)
- Bleu foncé → #00008B (Dark Blue)
- Vert foncé → #006400 (Dark Green)
- Vert pomme → #8DB600 (Apple Green)
- Jaune → #FFFF00 (Yellow)
- Orange → #FFA500 (Orange)
- Violet → #8B00FF (Violet)
- Rose → #FF69B4 (Pink)
- Marron → #8B4513 (Brown)
- Gris → #808080 (Grey)
- Turquoise → #40E0D0 (Turquoise)

**Total colors found:** 12

### Key Calculations
1. **Win Rate:** (Total Wins / Total Player Instances) × 100
2. **Average Players per Game:** Total Player Instances / Games with Color
3. **Games with Color:** Unique count of games where at least one player used the color

### Data Source
All data comes from `gameLog.json` → `PlayerStats[].Color` field

## Filter Support
- Respects all global filters (game type, date range, player inclusion/exclusion)
- Automatically updates when settings change via `SettingsContext`

## Files Modified/Created
1. **Created:** `src/hooks/utils/colorStatsUtils.ts` - Statistics computation logic
2. **Created:** `src/hooks/useColorStatsFromRaw.tsx` - React hook
3. **Created:** `src/components/playerstats/ColorStatisticsChart.tsx` - UI component
4. **Modified:** `src/App.tsx` - Added to player stats menu

## Usage
Navigate to: **Joueurs** → **Couleurs**

The statistics will automatically calculate based on the current filter settings.

## Interesting Findings (As of Analysis)
Based on all games in the dataset:
- **Best Win Rate:** Vert foncé (Dark Green) - 52.45%
- **Most Popular Color:** Vert pomme (Apple Green) - 1.41 players per game
- **Total Colors Available:** 12 different colors
- **Highest Participation:** Bleu foncé (Dark Blue) - appeared in 596 games

These statistics will update dynamically based on your filter selections (game type, date range, etc.).
