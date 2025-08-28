# Navigation System for Game Details

This document explains how to implement and use the new navigation system that allows users to drill down from any component to view detailed game information.

## Overview

The navigation system consists of several key components:

1. **NavigationContext** - Manages navigation state and filters
2. **GameDetailsChart** - Displays detailed game information with filtering
3. **useGameDetailsFromRaw** - Hook for fetching and filtering game data
4. **Integration examples** - How to add navigation to existing components

## How It Works

### 1. Navigation Context

The `NavigationContext` provides:
- `currentView`: Current navigation state
- `navigationFilters`: Filters to apply when viewing game details
- `navigateToGameDetails(filters)`: Function to navigate to game details
- `navigateBack()`: Function to return to previous view
- `clearNavigation()`: Function to reset navigation state

### 2. Navigation Filters

When navigating to game details, you can pass filters:

```typescript
interface NavigationFilters {
  selectedPlayer?: string;        // Filter by specific player
  selectedGame?: number;          // Filter by specific game ID
  selectedCamp?: string;          // Filter by winning camp
  selectedVictoryType?: string;   // Filter by victory type
  fromComponent?: string;         // Track which component triggered navigation
}
```

### 3. Example Usage

Here's how to add navigation capability to any component:

```typescript
import { useNavigation } from '../../context/NavigationContext';

export function YourComponent() {
  const { navigateToGameDetails } = useNavigation();

  const handlePlayerClick = (playerName: string) => {
    navigateToGameDetails({
      selectedPlayer: playerName,
      fromComponent: 'Your Component Name'
    });
  };

  // In your JSX, add buttons or click handlers:
  return (
    <button onClick={() => handlePlayerClick('SomePlayer')}>
      View games for SomePlayer
    </button>
  );
}
```

## Adding Navigation to Chart Tooltips

For chart components using recharts, you can add navigation buttons directly in tooltips:

```typescript
<Tooltip
  content={({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'var(--bg-secondary)', padding: 8, borderRadius: 6 }}>
          <div><strong>{data.player}</strong></div>
          <div>Some stat: {data.value}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToGameDetails({
                selectedPlayer: data.player,
                fromComponent: 'Your Component'
              });
            }}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'var(--chart-color-1)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            View Games →
          </button>
        </div>
      );
    }
    return null;
  }}
/>
```

## Game Details Features

The Game Details component provides:

1. **Sortable table** - Click column headers to sort by different criteria
2. **Expandable rows** - Click "Voir" to view detailed game information
3. **Comprehensive data** - Shows roles, results, harvest data, and more
4. **Navigation breadcrumbs** - Shows active filters and allows return to previous component
5. **Responsive design** - Works on mobile and desktop

## Components That Support Navigation

Currently implemented:
- ✅ PlayersGeneralStatisticsChart - Added "View Games" buttons in tooltips
- ✅ GameDetailsChart - Main game details component

Still to implement:
- 🔄 PlayerGameHistoryChart
- 🔄 CampsChart (filter by camp)
- 🔄 VictoryTypesChart (filter by victory type)
- 🔄 Other components as needed

## Future Enhancements

Potential improvements:
1. **URL-based navigation** - Support browser back/forward buttons
2. **Deep linking** - Allow direct links to filtered game details
3. **More filter types** - Add filters for dates, game modes, etc.
4. **Export functionality** - Allow exporting filtered game data
5. **Game comparison** - Compare multiple games side by side

## Usage Tips

1. **Performance**: The game details component uses React.memo and optimized hooks for good performance
2. **Accessibility**: All buttons have proper ARIA labels and keyboard support
3. **Mobile-friendly**: The table is horizontally scrollable on small screens
4. **Filter persistence**: Filters are maintained when navigating between components

## Integration Checklist

To add navigation to a new component:

1. ✅ Import `useNavigation` hook
2. ✅ Add navigation buttons/handlers to your component
3. ✅ Pass appropriate filters when calling `navigateToGameDetails()`
4. ✅ Include a meaningful `fromComponent` name
5. ✅ Test the navigation flow
6. ✅ Update this documentation

## Example Implementation

See `PlayersGeneralStatisticsChart.tsx` for a complete example of how navigation is integrated into an existing component with chart tooltips.
