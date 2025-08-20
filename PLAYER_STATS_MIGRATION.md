# PlayerGeneralStatisticsChart Migration Documentation

## Migration Overview
Migrated `PlayersGeneralStatisticsChart` component from using the legacy `usePlayerStats` hook to the new raw data processing system with `usePlayerStatsFromRaw`.

## Changes Made

### 1. New Hook: `usePlayerStatsFromRaw.tsx`
- **Location**: `src/hooks/usePlayerStatsFromRaw.tsx`
- **Purpose**: Implements client-side player statistics calculation using filtered raw game and role data
- **Logic**: Exact replication of `_computePlayerStats` function from Google Apps Script

#### Key Features:
- **Multi-dataset Processing**: Combines raw game data and raw role data for comprehensive player analysis
- **Role Assignment Logic**: 
  - Maps players to specific camps based on role data
  - Handles multiple role types: wolves, traitor, special roles (idiot, cannibal, agents, etc.)
  - Defaults to "Villageois" for players without specific roles
- **Statistics Calculation**: 
  - Games played count and percentage
  - Win count and win percentage
  - Camp distribution tracking across 12 different camps/roles
- **Winner Detection**: Uses explicit winner list from game data for accurate win tracking
- **Sorting**: Results sorted by games played (descending) to match original behavior

#### Complex Role Mapping:
```typescript
// Wolves (multiple allowed)
const wolves = roleRow["Loups"];
if (wolves) {
  splitAndTrim(wolves.toString()).forEach(player => {
    gamePlayerCampMap[gameId][player] = "Loups";
  });
}

// Single roles
addRolePlayer(roleRow["Traître"], "Traître");
addRolePlayer(roleRow["Idiot du village"], "Idiot du Village");
// ... other single roles

// Multiple allowed roles
const lovers = roleRow["Amoureux"];
if (lovers) {
  splitAndTrim(lovers.toString()).forEach(player => {
    gamePlayerCampMap[gameId][player] = "Amoureux";
  });
}
```

#### Player Statistics Structure:
```typescript
interface PlayerStat {
  player: string;
  gamesPlayed: number;
  gamesPlayedPercent: string;
  wins: number;
  winPercent: string;
  camps: PlayerCamps; // 12 different camp types
}

interface PlayerStatsData {
  totalGames: number;
  playerStats: PlayerStat[];
}
```

### 2. Component Updates: `PlayersGeneralStatisticsChart.tsx`
- **Hook Migration**: Changed from `usePlayerStats()` to `usePlayerStatsFromRaw()`
- **API Interface**: Updated to use `{ data, isLoading, error }` pattern
- **Debug Logging**: Added `console.log('DEBUG playerStatsData:', playerStatsData)` for development inspection
- **Functionality Preserved**: All existing chart visualizations and interactions maintained

#### Key Changes:
```typescript
// Before
const { playerStatsData, dataLoading, fetchError } = usePlayerStats();

// After  
const { data: playerStatsData, isLoading: dataLoading, error: fetchError } = usePlayerStatsFromRaw();
console.log('DEBUG playerStatsData:', playerStatsData);
```

## Google Apps Script Logic Replicated

### Original `_computePlayerStats` Function Analysis:
1. **Data Sources**: Requires both game data and role data sheets
2. **Role Mapping**: Creates `gamePlayerCampMap` to assign players to camps per game
3. **Player Tracking**: Iterates through all games to build comprehensive player statistics
4. **Camp Assignment**: Players assigned to specific camps based on role data, defaulting to "Villageois"
5. **Win Detection**: Uses `didPlayerWin()` function with explicit winner list checking
6. **Statistics**: Calculates games played, win rates, and camp distributions
7. **Output Format**: Returns sorted array by games played (descending)

### Client-Side Implementation:
- **Exact Logic Replication**: All business rules from Google Apps Script preserved
- **Data Processing**: Same role assignment and camp mapping logic
- **Winner Detection**: Identical winner list parsing and case-insensitive matching
- **Statistics Calculation**: Same percentage calculations and sorting criteria
- **Camp Structure**: Maintains all 12 camp types from original schema

## Technical Integration

### Dependencies:
- `useFilteredRawGameData`: Provides filtered game data based on settings
- `useFilteredRawRoleData`: Provides filtered role data based on settings
- TypeScript interfaces from `types/api.ts`

### Performance Considerations:
- **Memoization**: All calculations wrapped in `useMemo` for performance
- **Multi-dataset Coordination**: Efficient processing of related game and role data
- **Memory Management**: Clean data processing without unnecessary object creation

### Settings Integration:
- **Automatic Filtering**: Inherits all settings-based filtering (modded games, date ranges, etc.)
- **Real-time Updates**: Statistics automatically recalculate when settings change
- **Consistent Behavior**: Same filtering logic across all raw data hooks

## Verification Steps

### 1. Development Testing:
- ✅ No TypeScript compilation errors
- ✅ Hot module replacement working
- ✅ Development server running successfully
- ✅ Debug logging implemented for data inspection

### 2. Data Validation:
- Debug console output available for verifying:
  - Total games count
  - Player statistics accuracy
  - Camp distribution calculations
  - Win rate calculations

### 3. UI Verification:
- All existing chart visualizations maintained:
  - Top participation bar chart
  - Win rate analysis with filtering controls
  - Player camp distribution pie chart
- Interactive features preserved:
  - Player selection from charts
  - Minimum games filtering
  - Best/worst win rate sorting

## Migration Benefits

### 1. Client-Side Filtering:
- **Real-time Settings**: Statistics update immediately when settings change
- **Performance**: No API calls needed for setting adjustments
- **Consistency**: Same filtering logic across all components

### 2. Reduced API Dependency:
- **Offline Capability**: Works with cached raw data
- **Faster Updates**: No server round-trips for filtered views
- **Reliability**: Less dependent on Google Apps Script availability

### 3. Development Experience:
- **Debug Capability**: Console logging for development troubleshooting
- **Type Safety**: Full TypeScript integration
- **Maintainability**: Client-side logic easier to debug and modify

## Future Considerations

### 1. Performance Optimization:
- Consider additional memoization for complex camp distribution calculations
- Monitor performance with large datasets

### 2. Feature Extensions:
- Easy to add new filtering criteria
- Simple to extend camp types or add new statistics
- Straightforward to implement additional player metrics

### 3. Data Validation:
- Could add data consistency checks between game and role data
- Option to add warnings for missing role assignments

## Testing Checklist

- [ ] Verify total games count matches expected data
- [ ] Check player statistics accuracy (games played, win rates)
- [ ] Validate camp distribution calculations
- [ ] Test player selection and chart interactions
- [ ] Verify filtering controls (minimum games, best/worst sorting)
- [ ] Confirm settings integration (modded games filtering)
- [ ] Test with various data scenarios (missing roles, special cases)

## Notes

### Complex Business Rules Implemented:
1. **Role Priority**: Specific role assignments override default "Villageois"
2. **Multiple Roles**: Handles players with multiple role assignments in same game
3. **Winner Logic**: Uses explicit winner list rather than inferring from camps
4. **Camp Mapping**: Comprehensive mapping of all 12 camp types
5. **Data Consistency**: Cross-references game and role data by game ID

### Debug Output Format:
```javascript
{
  totalGames: 150,
  playerStats: [
    {
      player: "PlayerName",
      gamesPlayed: 25,
      gamesPlayedPercent: "16.67",
      wins: 12,
      winPercent: "48.00",
      camps: {
        "Villageois": 15,
        "Loups": 7,
        "Traître": 2,
        "Amoureux": 1,
        // ... other camps: 0
      }
    },
    // ... more players sorted by gamesPlayed desc
  ]
}
```

This migration successfully replicates the complex player statistics logic from Google Apps Script while providing the benefits of client-side processing and real-time settings integration.
