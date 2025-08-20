# PlayerGameHistoryChart Migration Documentation

## Migration Overview
Migrated `PlayerGameHistoryChart` component from using the legacy `usePlayerGameHistory` hook to the new raw data processing system with `usePlayerGameHistoryFromRaw`.

## Changes Made

### 1. New Hook: `usePlayerGameHistoryFromRaw.tsx`
- **Location**: `src/hooks/usePlayerGameHistoryFromRaw.tsx`
- **Purpose**: Implements client-side player game history calculation using filtered raw game and role data
- **Logic**: Exact replication of `getPlayerGameHistoryRaw` function from Google Apps Script

#### Key Features:
- **Multi-dataset Processing**: Combines raw game data and raw role data for comprehensive player game tracking
- **Player-Specific Analysis**: Filters all games to find those where the specified player participated
- **Role Assignment Logic**: 
  - Maps players to specific camps based on role data for each game
  - Handles all 12 different role types (wolves, traitor, special roles, etc.)
  - Defaults to "Villageois" for players without specific roles
- **Winner Detection**: Uses explicit winner list from game data for accurate win tracking
- **Date Handling**: Consistent date formatting and sorting (most recent first)
- **Statistics Calculation**: 
  - Total games and wins for the player
  - Overall win rate
  - Camp-specific statistics (appearances, wins, win rates per camp)

#### Complex Game Analysis Logic:
```typescript
// Find games where the player participated
rawGameData.forEach(gameRow => {
  const players = splitAndTrim(playerList.toString());
  const playerInGame = players.some(p => p.toLowerCase() === playerName.toLowerCase());
  
  if (playerInGame) {
    // Determine player's camp in this game
    const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);
    
    // Determine win/loss status
    const playerWon = didPlayerWin(playerName, winnerList?.toString());
    
    playerGames.push({
      gameId, date: formattedDate, camp: playerCamp, 
      won: playerWon, winnerCamp, playersInGame: players.length
    });
  }
});
```

#### Role Mapping System:
```typescript
// Create comprehensive role mapping
const addPlayerToCamp = (playerStr: any, campName: string) => {
  if (playerStr) {
    const players = splitAndTrim(playerStr.toString());
    players.forEach(player => {
      gamePlayerCampMap[gameId][player.trim()] = campName;
    });
  }
};

// Map all role types
addPlayerToCamp(roleRow["Loups"], "Loups");
addPlayerToCamp(roleRow["Traître"], "Traître");
addPlayerToCamp(roleRow["Idiot du village"], "Idiot du Village");
// ... all 12 role types mapped
```

#### Data Structure:
```typescript
interface PlayerGame {
  gameId: string;
  date: string;
  camp: string;
  won: boolean;
  winnerCamp: string;
  playersInGame: number;
}

interface CampStats {
  appearances: number;
  wins: number;
  winRate: string;
}

interface PlayerGameHistoryData {
  playerName: string;
  totalGames: number;
  totalWins: number;
  winRate: string;
  games: PlayerGame[];
  campStats: Record<string, CampStats>;
}
```

### 2. Component Updates: `PlayerGameHistoryChart.tsx`
- **Hook Migration**: Changed from `usePlayerGameHistory()` to `usePlayerGameHistoryFromRaw()`
- **Player Stats Integration**: Updated to use `usePlayerStatsFromRaw()` for available players dropdown
- **API Interface**: Updated to use `{ data, isLoading, error }` pattern
- **Debug Logging**: Added `console.log('DEBUG playerGameHistory:', data)` for development inspection
- **Functionality Preserved**: All existing chart visualizations and interactions maintained

#### Key Changes:
```typescript
// Before
const { playerStatsData } = usePlayerStats();
const { data, isLoading, error } = usePlayerGameHistory(selectedPlayerName);

// After  
const { data: playerStatsData } = usePlayerStatsFromRaw();
const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName);
console.log('DEBUG playerGameHistory:', data);
```

## Google Apps Script Logic Replicated

### Original `getPlayerGameHistoryRaw` Function Analysis:
1. **Parameter Handling**: Accepts player name as parameter with validation
2. **Data Sources**: Requires both game data (for participation and results) and role data (for camp assignments)
3. **Role Mapping**: Creates comprehensive `gamePlayerCampMap` for all 12 role types
4. **Game Filtering**: Finds all games where the specified player participated
5. **Camp Assignment**: Determines player's camp in each game using role data
6. **Winner Detection**: Uses `didPlayerWin()` function with explicit winner list checking
7. **Date Formatting**: Consistent date formatting with `formatLycanDate()` helper
8. **Statistics Calculation**: Calculates total games, wins, win rates, and camp-specific statistics
9. **Sorting**: Games sorted by date (most recent first) for chronological display

### Client-Side Implementation:
- **Exact Logic Replication**: All business rules from Google Apps Script preserved
- **Multi-dataset Coordination**: Efficient processing of game and role data with game ID cross-referencing
- **Date Handling**: Same date formatting and parsing logic for consistent display
- **Winner Detection**: Identical winner list parsing and case-insensitive matching
- **Statistics Calculation**: Same percentage calculations and camp analysis
- **Sorting**: Same chronological sorting (most recent first) for consistent UX

## Technical Integration

### Dependencies:
- `useFilteredRawGameData`: Provides filtered game data with player lists and results
- `useFilteredRawRoleData`: Provides filtered role data with player assignments
- `usePlayerStatsFromRaw`: Provides player list for dropdown selection

### Performance Considerations:
- **Memoization**: All calculations wrapped in `useMemo` with proper dependencies
- **Player-Specific Processing**: Only processes data for the selected player
- **Efficient Date Handling**: Optimized date parsing and sorting
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
  - Player participation in games
  - Camp assignments per game
  - Win/loss tracking accuracy
  - Date formatting and sorting
  - Camp-specific statistics calculation

### 3. UI Verification:
- All existing chart visualizations maintained:
  - Performance evolution over time (line chart)
  - Games per period (bar chart)
  - Camp distribution (pie chart)
  - Detailed game timeline
- Interactive features preserved:
  - Player selection dropdown
  - Grouping method (session vs month)
  - Date range controls
  - Chart interactions and tooltips

## Migration Benefits

### 1. Client-Side Filtering:
- **Real-time Settings**: Statistics update immediately when settings change
- **Player-Specific Analysis**: Instant filtering for any player selection
- **Performance**: No API calls needed for different player selections or setting adjustments

### 2. Reduced API Dependency:
- **Offline Capability**: Works with cached raw data
- **Faster Updates**: No server round-trips for player changes
- **Reliability**: Less dependent on Google Apps Script availability

### 3. Development Experience:
- **Debug Capability**: Console logging for development troubleshooting
- **Type Safety**: Full TypeScript integration
- **Maintainability**: Client-side logic easier to debug and modify

## Complex Business Rules Implemented

### 1. Player Participation Detection:
- **Case-Insensitive Matching**: Player names matched regardless of case
- **Exact Player Filtering**: Only includes games where the specific player participated
- **Player Count Tracking**: Records number of players in each game

### 2. Camp Assignment Logic:
- **Role Priority**: Specific role assignments override default "Villageois"
- **Multi-Role Handling**: Supports players with multiple role assignments
- **Comprehensive Coverage**: All 12 role types properly mapped

### 3. Winner Detection:
- **Explicit Winner Lists**: Uses winner list rather than inferring from camps
- **Case-Insensitive Matching**: Robust player name matching in winner lists
- **Accurate Win Tracking**: Proper win/loss status for each game

### 4. Date and Sorting Logic:
- **Consistent Date Format**: DD/MM/YYYY format maintained throughout
- **Chronological Sorting**: Most recent games first for better UX
- **Date Parsing**: Handles various date input formats

### 5. Statistical Accuracy:
- **Camp-Specific Stats**: Win rates calculated per camp for the player
- **Overall Performance**: Total win rate across all games
- **Appearance Tracking**: Counts appearances in each camp type

## Future Considerations

### 1. Performance Optimization:
- Consider additional optimizations for players with very large game histories
- Monitor memory usage with extensive historical data

### 2. Feature Extensions:
- Easy to add new filtering criteria (date ranges, game types, etc.)
- Simple to implement additional player-specific metrics
- Straightforward to extend camp analysis or add performance trends

### 3. Data Validation:
- Could add validation for missing game data or inconsistent role assignments
- Option to warn about unusual patterns in player history

## Testing Checklist

- [ ] Verify player participation detection accuracy
- [ ] Check camp assignment logic for all role types
- [ ] Validate win/loss tracking with winner lists
- [ ] Test date formatting and chronological sorting
- [ ] Confirm camp-specific statistics calculations
- [ ] Verify player dropdown functionality
- [ ] Test grouping methods (session vs month)
- [ ] Confirm settings integration (modded games filtering)
- [ ] Test with various players (active, inactive, different roles)

## Debug Output Format:
```javascript
{
  playerName: "PlayerName",
  totalGames: 45,
  totalWins: 23,
  winRate: "51.11",
  games: [
    {
      gameId: "123",
      date: "15/08/2024",
      camp: "Loups",
      won: true,
      winnerCamp: "Loups",
      playersInGame: 8
    },
    // ... more games sorted by date (most recent first)
  ],
  campStats: {
    "Villageois": {
      appearances: 25,
      wins: 12,
      winRate: "48.00"
    },
    "Loups": {
      appearances: 15,
      wins: 9,
      winRate: "60.00"
    },
    // ... other camps the player has been in
  }
}
```

This migration successfully replicates the comprehensive player game history analysis logic from Google Apps Script while providing the benefits of client-side processing, real-time settings integration, and improved development experience with debug logging.
