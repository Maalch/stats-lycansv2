# Winner Column Implementation

## Overview
Added a conditional "Vainqueur" column to the GameDetailsChart that displays winning players from navigation context filters.

## Changes Made

### 1. Updated Type Definitions
- Added 'winner' to the `SortField` type to enable sorting by winner column

### 2. Added Logic to Determine Target Players
- `getTargetPlayers()`: Function that extracts player names from different navigation filters:
  - `navigationFilters.selectedPlayer` (single player)
  - `navigationFilters.playerPairFilter.selectedPlayerPair` (pair of players)
  - `navigationFilters.multiPlayerFilter.selectedPlayers` (multiple players)

### 3. Conditional Column Display
- `showWinnerColumn`: Boolean flag that determines if the winner column should be displayed
- Only shows when there are target players from navigation filters

### 4. Winner Calculation Logic
- `getGameWinners(game)`: Function that filters the game's winners list to only show target players who won
- Compares winner names case-insensitively
- Returns comma-separated list of winning target players
- Returns empty string if no target players won

### 5. Table Structure Updates
- Added conditional header cell with sorting capability
- Added conditional body cell displaying filtered winners
- Updated colspan for game details row (7 → 8 when winner column is shown)

### 6. Sorting Integration
- Added 'winner' case to sorting logic
- Uses `getGameWinners()` to generate sortable values

## Usage Examples

### Single Player Filter
When navigation filter has:
```typescript
navigationFilters.selectedPlayer = "John"
```
Column shows "John" only in games where John won, empty otherwise.

### Player Pair Filter
When navigation filter has:
```typescript
navigationFilters.playerPairFilter = {
  selectedPlayerPair: ["John", "Bob"],
  selectedPairRole: "wolves"
}
```
Column shows:
- "John" if only John won
- "Bob" if only Bob won  
- "John, Bob" if both won
- Empty if neither won

### Multi-Player Filter
When navigation filter has:
```typescript
navigationFilters.multiPlayerFilter = {
  selectedPlayers: ["John", "Bob", "Alice"],
  playersFilterMode: "all-common-games"
}
```
Column shows any combination of the three players who won that specific game.

## Technical Notes
- Column is completely hidden when no relevant navigation filters are set
- Case-insensitive player name matching
- Integrates with existing sorting and pagination systems
- Uses existing game data structure (`game.winners` field)
