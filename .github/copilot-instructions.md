

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Uses a **static data pipeline** with JSON files (updated weekly via GitHub Actions).

## Architecture Overview

**Frontend:** React 19 + TypeScript, Vite, Recharts for charts, triple context system (`SettingsContext` + `FullscreenContext` + `NavigationContext`)  
**Data Pipeline:** Static JSON files in `/data` (updated weekly via GitHub Actions)  
**Build System:** Vite outputs to `docs/` for GitHub Pages, with data copying via inline Node.js scripts in `package.json`  
**Data Processing:** Client-side calculations using `*FromRaw` hooks that process raw game/role/ponce data locally

## Critical Workflows

```bash
npm run dev          # Dev server + copy data to public/data/
npm run build        # TypeScript check + Vite build + copy data to docs/data/
npm run sync-data    # Fetch fresh data from Apps Script to /data
```

**Build Pipeline:** Inline Node.js in package.json scripts copies `/data` → `public/data/` (dev) or `docs/data/` (prod)  
**Data Sync:** GitHub Actions runs twice a week, can be manually triggered via workflow_dispatch  
**Environment Variables:** None required - all data comes from static JSON files. secrets.LYCANS_API_BASE on GitHub for data sync only.

## Key Architectural Patterns

### Triple Context System
```typescript
// SettingsContext - persistent filters via localStorage
const { settings, updateSettings } = useSettings();
// NavigationContext - drill-down navigation with filters
const { navigateToGameDetails } = useNavigation();
// FullscreenContext - chart fullscreen state
const { isFullscreen, toggleFullscreen } = useFullscreen();
```

### Navigation Context for Drill-Down Views
```typescript
// Navigate from any chart to GameDetailsChart with filters
const { navigateToGameDetails } = useNavigation();
navigateToGameDetails({ 
  selectedPlayer: 'Ponce', 
  selectedCamp: 'Loups',
  fromComponent: 'Statistiques Joueurs' 
});
```

### Lazy Loading with Named Exports
```typescript
// Required pattern for component imports in App.tsx
const Component = lazy(() => import('./path').then(m => ({ default: m.ComponentName })));
```

### Optimized Data Processing Pattern
```typescript
// New centralized pattern using base hooks
const { data: playerStats, isLoading, error } = usePlayerStatsBase(
  (gameData, roleData) => computePlayerStats(gameData, roleData)
);

// Legacy pattern (avoid for new features)
const { data: rawGameData } = useFilteredRawGameData();
const { data: rawRoleData } = useFilteredRawRoleData();
```

### Base Hook Hierarchy
```typescript
// useBaseStats - core hook with options for data requirements
// useGameStatsBase - game data only
// usePlayerStatsBase - game + role data  
// useFullStatsBase - game + role + ponce data
```

## Data Architecture

**Core Data Types:** `RawGameData`, `RawRoleData`, `RawPonceData` in `hooks/useCombinedRawData.tsx`  
**Color Schemes:** `lycansColorScheme` (camps/roles), `playersColor` (players) in `types/api.ts`  
**French Language:** All UI labels and data values in French ("Villageois", "Loups", etc.)

### Data Flow
1. GitHub Actions → Apps Script → `/data/*.json` (weekly sync)
2. Build scripts → copy to `public/data/` or `docs/data/`  
3. `useCombinedRawData()` → loads from static files directly
4. `useCombinedFilteredRawData()` → applies SettingsContext filters consistently
5. `use*FromRaw()` → processes filtered data client-side using pure computation functions

### Settings-Aware Data Filtering
All data hooks automatically respect `SettingsContext` filters:
- Game type filter (all/modded/non-modded)  
- Date range filtering with French date parsing
- Player inclusion/exclusion filters (all selected must be present vs any selected excludes game)

### Game Domain Rules
Players are divided into camps: **Villageois** (Villagers) and **Loups** (Wolves). Special camps work independently: `Idiot Du Village`, `Agent`, `Cannibale`, `Amoureux`, `Espion`, `Scientifique`, `La Bête`. Exceptions:
- `Traître` camp works with Loups
- `Amoureux` camp always has 2 players (win/lose together)  
- `Agent` camp has 2 players (only one can win)

## Project-Specific Conventions

**Component Organization:** Domain-based (`generalstats/`, `playerstats/`, `gamedetails/`, `settings/`)  
**Context Usage:** Persistent settings via localStorage, fullscreen chart state, navigation state  
**No Test Suite:** Visual testing via dev server, verify chart rendering manually  
**Menu Structure:** Hierarchical tabs (`MAIN_TABS` → `*_STATS_MENU`) defined in `App.tsx`

## Adding Features

1. **New Statistics:** Create `use*FromRaw` hook using base hook pattern → add computation function to `utils/` → add to menu constants in `App.tsx`
2. **New Settings:** Add to `SettingsState` interface → ensure localStorage persistence in `SettingsContext`
3. **New Data Sources:** Update interfaces in `useCombinedRawData.tsx`
4. **Navigation Integration:** Use `NavigationContext` for chart drill-downs to `GameDetailsChart`

### Base Hook Migration Pattern
When creating new statistics hooks, use the optimized base hook pattern:
```typescript
export function useNewStatsFromRaw() {
  const { data, isLoading, error } = usePlayerStatsBase(
    (gameData, roleData) => computeNewStats(gameData, roleData)
  );
  return { data, isLoading, error };
}
```

## Integration Points

**GitHub Actions:** `.github/workflows/update-data.yml` (weekly data sync)  
**Apps Script:** `scripts/data-sync/fetch-data.js` (endpoints: rawGameData, rawRoleData, rawPonceData, rawBRData)  
**Build Outputs:** GitHub Pages serves from `/docs` directory with base path `/stats-lycansv2/`  
**Development:** All processed data (player histories, computed stats) calculated client-side from raw data  
**Error Handling:** Static file loading only, localStorage persistence for settings
