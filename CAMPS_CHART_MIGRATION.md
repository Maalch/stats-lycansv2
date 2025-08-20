# CampsChart Component Migration to Raw Data

## Overview
Updated the CampsChart component to use the new filtered raw data system instead of the computed API endpoints. This enables client-side filtering based on settings (e.g., modded games only) and provides real-time camp statistics updates with complex multi-source data processing.

## Changes Made

### 1. New Hook: `useCampWinStatsFromRaw`
- **File**: `src/hooks/useCampWinStatsFromRaw.tsx`
- **Purpose**: Computes camp win statistics client-side from filtered raw game data
- **Logic**: Implements the same calculation logic as the Google Apps Script `_computeCampWinStats` function

### 2. New Hook: `usePlayerCampPerformanceFromRaw`
- **File**: `src/hooks/usePlayerCampPerformanceFromRaw.tsx`
- **Purpose**: Computes player camp performance statistics client-side from filtered raw game and role data
- **Logic**: Implements the same calculation logic as the Google Apps Script `_computePlayerCampPerformance` function

### 3. Updated Component
- **File**: `src/components/generalstats/CampsChart.tsx`
- **Changes**: 
  - Import updated to use both new raw data hooks
  - Maintained exact same UI and chart structure
  - Same error handling and loading states

## Key Features

### Camp Win Statistics (`useCampWinStatsFromRaw`)
Processes raw game data to calculate:
- **Total games**: Count of games with valid winner camp data
- **Camp statistics**: For each winning camp:
  - Number of wins
  - Win rate percentage
- **Solo camps**: Track appearances of solo roles like "La Bête", "Chasseur de primes", etc.

### Player Camp Performance (`usePlayerCampPerformanceFromRaw`)
Processes both raw game data and raw role data to calculate:
- **Camp averages**: Overall statistics for each camp:
  - Total games the camp participated in
  - Overall win rate for the camp
- **Player performance**: Individual player analysis:
  - Games played in each camp (minimum 5 games threshold)
  - Win rate in each camp
  - Performance differential vs camp average
- **Role mapping**: Complex role assignments from role data:
  - Wolves, Traitor, Idiot du Village, Cannibale, Espion
  - La Bête, Chasseur de primes, Vaudou
  - Multiple-player roles: Agent, Scientifique, Amoureux

### Camp Assignment Logic
The hook implements sophisticated camp assignment rules:
- **Default**: All players start as "Villageois"
- **Special roles override**: Players with specific roles get assigned to those camps
- **Special win conditions**: 
  - Traitor wins when Wolves win
  - Other special camp win rules as defined in the original logic

### Data Processing Complexity
This migration demonstrates the most complex data processing so far:
- **Multi-source data**: Requires both game data and role data
- **Cross-referencing**: Maps game IDs between datasets
- **Player tracking**: Tracks individual player performance across multiple camps
- **Statistical calculations**: Calculates performance differentials and comparisons
- **Minimum thresholds**: Applies 5-game minimum for meaningful statistics

## Chart Visualizations

### 1. Summary Cards
- **Camps analyzed**: Number of different camps tracked
- **Players evaluated**: Count of players with sufficient data
- **Total games**: Overall game count for analysis

### 2. Victory Distribution Pie Chart
- Shows proportion of wins by each camp
- Groups small camps (<5%) into "Autres" category
- Interactive tooltips with detailed breakdowns

### 3. Average Win Rate Bar Chart
- Comparison of win rates across all camps
- Sorted by win rate (descending)
- Shows which camps are most/least successful

### 4. Game Distribution Pie Chart
- Shows how many games each camp participated in
- Demonstrates camp frequency in the game meta
- Groups small camps for clarity

## Performance Benefits
- Reduces API calls by using cached raw data
- Enables real-time filtering without server requests
- Maintains same user experience with better responsiveness
- Supports complex multi-dataset operations client-side

## Data Validation & Edge Cases
The hooks handle various scenarios:
- **Missing role data**: Safely defaults players to "Villageois"
- **Empty winner lists**: Handles games without clear winners
- **Solo role parsing**: Correctly splits comma-separated solo roles
- **Case sensitivity**: Normalizes player names for comparison
- **Special characters**: Handles French accented characters properly

## Type Safety & Error Handling
- Full TypeScript support with complex nested interfaces
- Proper error propagation from both data sources
- Loading state coordination between multiple hooks
- Null safety checks throughout the processing pipeline

## Client-Side Filtering Integration
- Automatically respects `settings.showOnlyModdedGames` filter
- Real-time updates when settings change
- Consistent filtering across both game and role datasets
- No additional API calls needed

## Backward Compatibility
- Component interface unchanged
- Chart rendering identical to original
- Same error handling and loading states
- French language labels preserved
- Same color scheme and visual design
- Identical tooltip and interaction behavior

## Testing & Validation
- Development server runs successfully on http://localhost:5173/stats-lycansv2/
- No TypeScript or lint errors
- Hot module replacement working correctly
- All charts render with same visual appearance
- Complex data processing verified against original API results

## Architecture Impact
This migration establishes the most complex raw data processing pattern:
1. **Multi-source coordination**: Demonstrates how to combine multiple raw datasets
2. **Cross-dataset referencing**: Shows game ID mapping between datasets
3. **Complex business logic**: Implements sophisticated camp assignment and win condition rules
4. **Performance optimization**: Handles large datasets efficiently on the client
5. **Statistical accuracy**: Maintains exact parity with server-side calculations

## Data Flow Architecture
```
Raw Game Data + Raw Role Data → Filter (settings) → Complex Processing → Multiple Charts
```

1. `useFilteredRawGameData()` and `useFilteredRawRoleData()` provide filtered datasets
2. `useCampWinStatsFromRaw()` processes game data for win statistics
3. `usePlayerCampPerformanceFromRaw()` cross-references both datasets for performance analysis
4. Component renders multiple interconnected charts
5. Settings changes trigger automatic recalculations across all datasets

## Next Steps & Template Usage
This migration pattern provides the foundation for other complex multi-dataset components:
1. Create multiple filtered raw data hooks as needed
2. Implement complex cross-referencing logic
3. Maintain statistical accuracy with original server calculations
4. Enable comprehensive settings-based filtering
5. Preserve existing UI/UX while adding powerful client-side capabilities

The CampsChart component now serves as the most advanced template for migrating complex statistics components to the new raw data architecture, demonstrating:
- **Multi-dataset coordination**
- **Complex business logic implementation**
- **Advanced statistical calculations**
- **Performance optimization techniques**
- **Comprehensive type safety**

This establishes the complete foundation for migrating all remaining statistics components to support the comprehensive modded games filtering system.
