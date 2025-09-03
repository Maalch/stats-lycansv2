

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Uses a **hybrid data pipeline** with static JSON files (updated weekly via GitHub Actions) and Apps Script API fallback.

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
**Data Sync:** GitHub Actions runs weekly on Saturday 4 AM UTC, can be manually triggered via workflow_dispatch  
**Environment Variables:** None required - all data comes from static JSON files

## Key Architectural Patterns

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

### Game rules
Players are divided into two main camps: Villageois (Villagers) and Loups (Wolves). Each camp has its own objectives and win conditions. Additionally, there are special camps that work for themselves, like Idiot Du Village, Agent, Cannibale, Amoureux, Espion, Scientifique, La Bête ... 
The only exception are:
- the camp Traître which works with the Loups camp
- if the Amoureux camp is in the game, there is always 2 players and they win/lose together
- if the Agent camp is in the game, there is always 2 players and only one of them can win
Player may also have additional secondary rôles in any camp 

### Lazy Loading with Named Exports
```typescript
// Required pattern for component imports in App.tsx
const Component = lazy(() => import('./path').then(m => ({ default: m.ComponentName })));
```

### Raw Data Processing Pattern
```typescript
// Base pattern for all *FromRaw hooks
const { data: rawGameData } = useFilteredRawGameData();
const { data: rawRoleData } = useFilteredRawRoleData();
const { data: rawBRData } = useFilteredRawBRData();
const { data: rawPonceData } = useFilteredRawPonceData();
```

### Settings-Aware Data Filtering
All raw data hooks automatically respect `SettingsContext` filters:
- Game type filter (all/modded/non-modded)
- Date range filtering  
- Player inclusion/exclusion filters

## Data Architecture

**Core Data Types:** `RawGameData`, `RawRoleData`, `RawPonceData` in `hooks/useRawGameData.tsx`  
**Data Service:** Simplified `DataService` in `dataService.ts` loads only from static JSON files  
**Color Schemes:** `lycansColorScheme` (camps/roles), `playersColor` (players) in `types/api.ts`  
**French Language:** All UI labels and data values in French ("Villageois", "Loups", etc.)

### Data Flow
1. GitHub Actions → Apps Script → `/data/*.json` (weekly sync)
2. Build scripts → copy to `public/data/` or `docs/data/`  
3. `useCombinedRawData()` → loads from static files directly
4. `useFiltered*Data()` → applies SettingsContext filters
5. `use*FromRaw()` → processes filtered data client-side

## Project-Specific Conventions

**Component Organization:** Domain-based (`generalstats/`, `playerstats/`, `gamedetails/`, `settings/`)  
**Context Usage:** Persistent settings via localStorage, fullscreen chart state, navigation state  
**No Test Suite:** Visual testing via dev server, verify chart rendering manually  
**Menu Structure:** Hierarchical tabs (`MAIN_TABS` → `*_STATS_MENU`) defined in `App.tsx`

## Adding Features

1. **New Statistics:** Create `use*FromRaw` hook → add to menu constants in `App.tsx`
2. **New Settings:** Add to `SettingsState` interface → ensure localStorage persistence  
3. **New Data Sources:** Add to `DATA_CONFIG` → update sync script → create interface
4. **Navigation Integration:** Use `NavigationContext` for chart drill-downs to `GameDetailsChart`

## Integration Points

**GitHub Actions:** `.github/workflows/update-data.yml` (weekly data sync)  
**Apps Script:** `scripts/data-sync/fetch-data.js` (endpoints: rawGameData, rawRoleData, rawPonceData, rawBRData)  
**Build Outputs:** GitHub Pages serves from `/docs` directory with base path `/stats-lycansv2/`  
**Development:** All processed data (player histories, computed stats) calculated client-side from raw data  
**Error Handling:** Static file loading only, localStorage persistence for settings
