# Google Apps Script Changes: MainRoleChanges Implementation

## Overview
Modified the Google Apps Script to replace the `MainRoleFinal` property with a `MainRoleChanges` array that tracks all role changes for each player during a game.

## Changes Made

### 1. Modified `getRawGameDataInNewFormat()` function
- **Added**: Loading of "Changements" sheet data
  ```javascript
  var roleChangesData = getLycanSheetData(LYCAN_SCHEMA.ROLECHANGES.SHEET);
  var roleChangesValues = roleChangesData.values;
  var roleChangesHeaders = roleChangesValues ? roleChangesValues[0] : [];
  var roleChangesDataRows = roleChangesValues ? roleChangesValues.slice(1) : [];
  ```

- **Updated**: Function call to pass role changes data to `buildPlayerStatsFromDetails()`
  ```javascript
  return buildPlayerStatsFromDetails(playerName, gameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows);
  ```

### 2. Modified `buildPlayerStatsFromDetails()` function
- **Added parameters**: `roleChangesHeaders`, `roleChangesDataRows`
- **Replaced**: `MainRoleFinal: null` with `MainRoleChanges: getRoleChangesForPlayer(playerName, gameId, roleChangesHeaders, roleChangesDataRows)`
- **Removed**: The logic that was setting `playerStats.MainRoleFinal` after object creation

### 3. Added new `getRoleChangesForPlayer()` function
```javascript
function getRoleChangesForPlayer(playerName, gameId, roleChangesHeaders, roleChangesDataRows) {
  if (!roleChangesDataRows || roleChangesDataRows.length === 0) {
    return [];
  }
  
  var changes = [];
  
  // Find all rows matching this player and game
  roleChangesDataRows.forEach(function(row) {
    var rowGameId = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.GAMEID)];
    var rowPlayer = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.PLAYER)];
    
    if (rowGameId == gameId && rowPlayer === playerName) {
      var newMainRole = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.NEWMAINROLE)];
      
      // Only add if the new main role is not empty
      if (newMainRole && newMainRole.trim() !== '') {
        changes.push({
          NewMainRole: newMainRole
        });
      }
    }
  });
  
  return changes;
}
```

### 4. Removed `determineMainRoleFinalWithDetails()` function
This function is no longer needed since we're now tracking all role changes in an array instead of just the final role.

## Data Structure

### Old Structure
```javascript
{
  Username: "PlayerName",
  MainRoleInitial: "Villageois",
  MainRoleFinal: "Zombie",  // Only final state
  // ... other properties
}
```

### New Structure
```javascript
{
  Username: "PlayerName",
  MainRoleInitial: "Villageois",
  MainRoleChanges: [  // All changes in order
    { NewMainRole: "Zombie" },
    { NewMainRole: "Loup" }  // If multiple changes occurred
  ],
  // ... other properties
}
```

## Key Features
1. **Preserves order**: Changes are kept in the same order as they appear in the "Changements" sheet
2. **Handles multiple changes**: If a player has multiple role changes in the same game, all are recorded
3. **Empty array for no changes**: Returns `[]` if no role changes occurred
4. **Filters empty values**: Only includes changes where `NEWMAINROLE` is not empty

## Compatibility Notes
- The new structure matches the format used in the game-generated JSON files (e.g., `Nales-20250912191416.json`)
- The `MainRoleChanges` array structure aligns with the existing `MainRoleChanges` property in game mod logs
- This maintains backward compatibility with the rest of the data structure
