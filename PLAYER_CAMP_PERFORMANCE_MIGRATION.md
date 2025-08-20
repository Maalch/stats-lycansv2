# PlayerCampPerformanceChart Migration to Raw Data System

## Overview
This document details the migration of the PlayerCampPerformanceChart component from using the API-based `usePlayerCampPerformance` hook to the new raw data system with `usePlayerCampPerformanceFromRaw`.

## Files Changed

### Component Updated
- **File:** `src/components/playerstats/PlayerCampPerformanceChart.tsx`
- **Changes:** 
  - Updated import from `usePlayerCampPerformance` to `usePlayerCampPerformanceFromRaw`
  - Added debug logging to inspect player camp performance data
  - No changes to UI components or visualization logic required

### Hook Already Implemented
- **File:** `src/hooks/usePlayerCampPerformanceFromRaw.tsx`
- **Status:** Already implemented with complete Google Apps Script logic replication
- **Features:**
  - Processes raw game and role data to calculate player performance by camp
  - Implements complex role assignment logic across 12 different camp types
  - Calculates camp averages and individual player performance differentials
  - Applies minimum games threshold (5 games) for statistical significance

## Google Apps Script Logic Replicated

The `usePlayerCampPerformanceFromRaw` hook implements the same logic as the `_computePlayerCampPerformance` function from Google Apps Script:

### Key Business Logic
1. **Camp Assignment from Role Data:**
   - Wolves: Players listed in "Loups" column
   - Special roles: Traître, Idiot du Village, Cannibale, Espion, etc.
   - Multiple players: Agents, Scientists, Lovers
   - Default: Villageois (if no specific role found)

2. **Camp Statistics Calculation:**
   - Count total games played by each camp
   - Count wins by each camp (including special rules like Traître wins with Loups)
   - Calculate camp average win rates

3. **Player Performance Analysis:**
   - Track individual player performance in each camp they've played
   - Calculate player win rates by camp
   - Compute performance differential (player rate - camp average)
   - Apply minimum games threshold for inclusion

4. **Data Transformation:**
   - Sort players by total games played
   - Sort camp performances by performance differential
   - Filter out players with insufficient games in specific camps

### Advanced Features
- **Special Win Conditions:** Handles cases like Traitor winning when Wolves win
- **Winner Detection:** Uses explicit winner list from games data
- **Multi-Role Handling:** Properly processes camps with multiple players (Agents, Scientists, Lovers)
- **Performance Benchmarking:** Compares individual performance to camp-wide averages

## Technical Implementation

### Data Flow
1. **Raw Data Input:** 
   - `useFilteredRawGameData()` provides game information including player lists and winners
   - `useFilteredRawRoleData()` provides role assignments per game

2. **Processing Steps:**
   - Create game-to-player-camp mapping from role data
   - Calculate camp-level statistics (participation and win rates)
   - Analyze individual player performance by camp
   - Apply statistical thresholds and transformations

3. **Output Format:**
   - `campAverages`: Array of camp statistics with overall win rates
   - `playerPerformance`: Array of player data with camp-specific performance metrics
   - `minGamesRequired`: Threshold for statistical significance

### Component Integration
- **No UI Changes:** All existing charts and visualizations work unchanged
- **Data Compatibility:** Output format matches exactly with API-based system
- **Filter Integration:** Inherits date range and game type filtering from raw data hooks

## Verification Steps

1. **Development Server Testing:**
   ```bash
   npm run dev
   ```
   Navigate to Player Camp Performance section and verify:
   - All camp performance charts render correctly
   - Player selection and filtering work as expected
   - Performance differentials display properly

2. **Console Debug Output:**
   Check browser console for debug log:
   ```
   PlayerCampPerformanceChart - playerCampPerformance: {object}
   ```

3. **Data Quality Validation:**
   - Verify camp averages match expected values
   - Check player performance calculations against known results
   - Ensure minimum games threshold is properly applied

## Benefits of Migration

### Performance Improvements
- **Reduced API Calls:** Eliminates individual API requests for player camp performance
- **Client-Side Filtering:** Real-time filtering without server round-trips
- **Shared Data Pipeline:** Leverages cached raw data across multiple components

### Enhanced Functionality
- **Dynamic Filtering:** Real-time date range and game type filtering
- **Consistent Data:** All components use same filtered dataset
- **Debug Capabilities:** Client-side inspection of calculations and data transformations

### Maintainability
- **Single Source Logic:** All business logic centralized in TypeScript hooks
- **Type Safety:** Full TypeScript integration with compile-time error detection
- **Simplified Debugging:** Client-side calculation debugging and validation

## Next Steps

1. **Monitor Performance:** Observe page load times and data processing efficiency
2. **User Testing:** Verify all interactive features work correctly with filtered data
3. **Data Validation:** Compare results with original API endpoints for accuracy
4. **Settings Integration:** Ensure proper integration with global filter settings

## Migration Pattern Established

This migration completes the raw data system implementation for player-specific statistics. The established pattern includes:

- **Complex Data Processing:** Multi-dataset coordination for sophisticated analysis
- **Statistical Calculations:** Performance benchmarking and threshold applications
- **Role Assignment Logic:** Comprehensive camp determination across all game types
- **Debug Infrastructure:** Logging and inspection capabilities for ongoing development

This pattern can be applied to future components requiring similar player-specific analysis and performance calculations.
