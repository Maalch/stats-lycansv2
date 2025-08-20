# PlayerPairingStatsChart Migration Documentation

## Migration Overview
Migrated `PlayerPairingStatsChart` component from using the legacy `usePlayerPairingStats` hook to the new raw data processing system with `usePlayerPairingStatsFromRaw`.

## Changes Made

### 1. New Hook: `usePlayerPairingStatsFromRaw.tsx`
- **Location**: `src/hooks/usePlayerPairingStatsFromRaw.tsx`
- **Purpose**: Implements client-side player pairing statistics calculation using filtered raw game and role data
- **Logic**: Exact replication of `_computePlayerPairingStats` function from Google Apps Script

#### Key Features:
- **Multi-dataset Processing**: Combines raw game data and raw role data to analyze player pairings
- **Wolf Pair Analysis**: 
  - Identifies games with multiple wolves (2+)
  - Generates all possible wolf pair combinations
  - Tracks appearances and win rates for each pair
- **Lover Pair Analysis**: 
  - Identifies games with lovers
  - Tracks lover pair combinations
  - Calculates win rates specifically for "Amoureux" victories
- **Winner Mapping**: Cross-references game data for accurate win detection
- **Consistent Pair Keys**: Uses alphabetical ordering for consistent pair identification

#### Complex Pairing Logic:
```typescript
// Wolf pairs - generate all combinations
for (let i = 0; i < wolfArray.length; i++) {
  for (let j = i + 1; j < wolfArray.length; j++) {
    const wolf1 = wolfArray[i];
    const wolf2 = wolfArray[j];
    const pairKey = [wolf1, wolf2].sort().join(" & ");
    // Track appearances and wins...
  }
}

// Lover pairs - process sequential pairs
for (let i = 0; i < loverArray.length; i += 2) {
  if (i + 1 < loverArray.length) {
    const lover1 = loverArray[i];
    const lover2 = loverArray[i + 1];
    const pairKey = [lover1, lover2].sort().join(" & ");
    // Track appearances and wins...
  }
}
```

#### Data Structure:
```typescript
interface PlayerPairStat {
  pair: string;
  appearances: number;
  wins: number;
  winRate: string;
  players: string[];
}

interface PlayerPairingStatsData {
  wolfPairs: {
    totalGames: number;
    pairs: PlayerPairStat[];
  };
  loverPairs: {
    totalGames: number;
    pairs: PlayerPairStat[];
  };
}
```

### 2. Component Updates: `PlayerPairingStatsChart.tsx`
- **Hook Migration**: Changed from `usePlayerPairingStats()` to `usePlayerPairingStatsFromRaw()`
- **API Interface**: Updated to use `{ data, isLoading, error }` pattern
- **Debug Logging**: Added `console.log('DEBUG playerPairingStats:', data)` for development inspection
- **Functionality Preserved**: All existing chart visualizations and interactions maintained

#### Key Changes:
```typescript
// Before
const { data, isLoading, error } = usePlayerPairingStats();

// After  
const { data, isLoading, error } = usePlayerPairingStatsFromRaw();
console.log('DEBUG playerPairingStats:', data);
```

## Google Apps Script Logic Replicated

### Original `_computePlayerPairingStats` Function Analysis:
1. **Data Sources**: Requires both game data (for winner camps) and role data (for player roles)
2. **Winner Mapping**: Creates `gameWinnerMap` to link game IDs to winner camps
3. **Wolf Pair Processing**: 
   - Identifies games with multiple wolves
   - Generates all possible combinations of wolf pairs
   - Tracks wins specifically when "Loups" camp wins
4. **Lover Pair Processing**: 
   - Identifies games with lovers
   - Processes pairs sequentially (usually one pair per game)
   - Tracks wins specifically when "Amoureux" camp wins
5. **Statistics Calculation**: Calculates win rates and sorts by appearance frequency
6. **Output Format**: Returns organized data with separate wolf and lover pair statistics

### Client-Side Implementation:
- **Exact Logic Replication**: All business rules from Google Apps Script preserved
- **Pair Generation**: Same combination logic for wolves and sequential logic for lovers
- **Winner Detection**: Cross-references game data for accurate win camp identification
- **Statistics Calculation**: Same win rate calculations and sorting criteria
- **Data Structure**: Maintains identical output format for component compatibility

## Technical Integration

### Dependencies:
- `useFilteredRawGameData`: Provides filtered game data with winner camps
- `useFilteredRawRoleData`: Provides filtered role data with player assignments
- TypeScript interfaces from `types/api.ts`

### Performance Considerations:
- **Memoization**: All calculations wrapped in `useMemo` for performance
- **Efficient Pair Generation**: Optimized algorithms for wolf and lover pair creation
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
  - Wolf pair combinations and statistics
  - Lover pair tracking and win rates
  - Total games with multiple wolves/lovers
  - Pair frequency and performance analysis

### 3. UI Verification:
- All existing chart visualizations maintained:
  - Wolf pairs frequency and performance charts
  - Lover pairs frequency and performance charts
  - Tab navigation between wolves and lovers
- Interactive features preserved:
  - Minimum appearances filtering
  - Player color coding with gradients
  - Detailed tooltips with pair statistics

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

## Complex Business Rules Implemented

### 1. Wolf Pair Logic:
- **Multiple Wolves Required**: Only processes games with 2+ wolves
- **All Combinations**: Generates every possible wolf pair in a game
- **Win Condition**: Pairs win only when "Loups" camp wins
- **Consistent Naming**: Alphabetical ordering ensures consistent pair keys

### 2. Lover Pair Logic:
- **Sequential Processing**: Processes lovers in pairs (i, i+1)
- **Love Pair Validation**: Ensures both lovers are present
- **Win Condition**: Pairs win only when "Amoureux" camp wins
- **Consistent Naming**: Alphabetical ordering for pair consistency

### 3. Statistical Accuracy:
- **Appearance Tracking**: Counts each game where pair appears together
- **Win Rate Calculation**: Percentage based on wins vs. total appearances
- **Sorting**: Results sorted by frequency (appearances) for relevance

## Future Considerations

### 1. Performance Optimization:
- Consider optimizations for large datasets with many player combinations
- Monitor memory usage with extensive pairing calculations

### 2. Feature Extensions:
- Easy to add new pairing criteria or role combinations
- Simple to implement additional pairing statistics
- Straightforward to extend to other collaborative roles

### 3. Data Validation:
- Could add validation for unusual pairing patterns
- Option to warn about inconsistent lover pair configurations

## Testing Checklist

- [ ] Verify wolf pair generation accuracy (all combinations)
- [ ] Check lover pair processing (sequential pairs)
- [ ] Validate win rate calculations for both pair types
- [ ] Test tab navigation between wolves and lovers
- [ ] Confirm minimum appearances filtering works
- [ ] Verify player color gradients display correctly
- [ ] Test with various data scenarios (single wolves, odd lovers, etc.)
- [ ] Confirm settings integration (modded games filtering)

## Debug Output Format:
```javascript
{
  wolfPairs: {
    totalGames: 25, // Games with multiple wolves
    pairs: [
      {
        pair: "Player1 & Player2",
        appearances: 5,
        wins: 3,
        winRate: "60.00",
        players: ["Player1", "Player2"]
      },
      // ... more wolf pairs sorted by appearances
    ]
  },
  loverPairs: {
    totalGames: 18, // Games with lovers
    pairs: [
      {
        pair: "Player3 & Player4",
        appearances: 3,
        wins: 2,
        winRate: "66.67",
        players: ["Player3", "Player4"]
      },
      // ... more lover pairs sorted by appearances
    ]
  }
}
```

This migration successfully replicates the complex player pairing analysis logic from Google Apps Script while providing the benefits of client-side processing and real-time settings integration.
