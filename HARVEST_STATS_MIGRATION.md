# HarvestProgressChart Component Migration to Raw Data

## Overview
Updated the HarvestProgressChart component to use the new filtered raw data system instead of the computed API endpoint. This enables client-side filtering based on settings (e.g., modded games only) and provides real-time harvest statistics updates.

## Changes Made

### 1. New Hook: `useHarvestStatsFromRaw`
- **File**: `src/hooks/useHarvestStatsFromRaw.tsx`
- **Purpose**: Computes harvest statistics client-side from filtered raw data
- **Logic**: Implements the same calculation logic as the Google Apps Script `_computeHarvestStats` function

### 2. Updated Component
- **File**: `src/components/generalstats/HarvestProgressChart.tsx`
- **Changes**: 
  - Import updated to use `useHarvestStatsFromRaw` instead of `useHarvestStats`
  - Added null safety checks for data processing
  - Maintained exact same UI and chart structure

## Key Features

### Data Processing Logic
The new hook processes raw game data to calculate:
- **Average harvest**: Mean harvest amount per game
- **Average harvest percentage**: Overall percentage of harvest achieved across all games
- **Games with harvest**: Count of games that had harvest data
- **Harvest distribution**: Categorization of games by harvest percentage ranges:
  - 0-25%: Very low harvest
  - 26-50%: Low harvest
  - 51-75%: Medium harvest
  - 76-99%: High harvest
  - 100%: Complete harvest
- **Harvest by winner**: Average harvest percentage for each winning camp

### Harvest Distribution Categories
The hook categorizes harvest percentages into 5 ranges based on the decimal value:
- **0-25%**: `harvestPercent <= 0.25`
- **26-50%**: `0.25 < harvestPercent <= 0.50`
- **51-75%**: `0.50 < harvestPercent <= 0.75`
- **76-99%**: `0.75 < harvestPercent <= 0.99`
- **100%**: `harvestPercent >= 1.0`

### Client-Side Filtering
- Automatically respects `settings.showOnlyModdedGames` filter
- Real-time updates when settings change
- No additional API calls needed

### Type Safety
- Uses existing TypeScript interfaces (`HarvestStatsResponse`, `HarvestDistribution`, `CampHarvestData`)
- Proper error handling and loading states
- Consistent return format matching original API structure

## Chart Visualizations

### 1. Summary Cards
- **Average harvest percentage**: Overall harvest efficiency
- **Total games with harvest**: Number of games that recorded harvest data

### 2. Pie Chart - Harvest Distribution
- Visual breakdown of games by harvest percentage ranges
- Color-coded segments with French labels
- Interactive tooltips showing game counts

### 3. Bar Chart - Average Harvest by Winner Camp
- Comparison of harvest efficiency by winning camp
- Sorted by average harvest percentage (descending)
- Shows which camps tend to win with higher/lower harvest levels

## Performance Benefits
- Reduces API calls by using cached raw data
- Enables real-time filtering without server requests
- Maintains same user experience with better responsiveness

## Data Validation
The hook handles various data scenarios:
- **Null/undefined values**: Safely skips invalid harvest data
- **NaN values**: Validates numeric harvest and percentage values
- **Empty strings**: Treats as null for camp names
- **Zero values**: Properly includes in calculations

## Backward Compatibility
- Component interface unchanged
- Chart rendering identical to original
- Same error handling and loading states
- French language labels preserved
- Same color scheme and visual design

## Testing
- Development server runs successfully on http://localhost:5173/stats-lycansv2/
- No TypeScript or lint errors
- Charts render with same visual appearance
- Settings integration ready for use
- Pie chart and bar chart maintain original functionality

## Next Steps
This migration pattern establishes the foundation for other statistics components:
1. Create filtered raw data computation hook
2. Update component to use new hook
3. Maintain existing UI/UX
4. Enable settings-based filtering

The HarvestProgressChart component now serves as another template alongside GameDurationInsights for migrating statistics components to the new raw data architecture, specifically demonstrating:
- Complex data categorization (percentage ranges)
- Multiple chart types (pie + bar)
- Camp-based analysis
- Statistical aggregations with proper averaging

## Data Flow
```
Raw Game Data → Filter (settings) → Harvest Calculations → Charts
```

1. `useFilteredRawGameData()` provides filtered data based on settings
2. `useHarvestStatsFromRaw()` processes data client-side
3. Component renders charts with same visual structure
4. Settings changes trigger automatic recalculations
