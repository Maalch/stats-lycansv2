

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Recently migrated from multiple JSON files to a unified `gameLog.json` structure while maintaining backward compatibility.

## Architecture Overview

**Frontend:** React 19 + TypeScript, Vite, Recharts for charts, triple context system (`SettingsContext` + `FullscreenContext` + `NavigationContext`)  
**Data Pipeline:** Unified `gameLog.json` with transformation layer for backward compatibility  
**Build System:** Vite outputs to `docs/` for GitHub Pages, inline Node.js scripts copy data files  
**Data Processing:** Client-side calculations using optimized base hook pattern with pure computation functions

## Critical Workflows

```bash
npm run dev          # Dev server + copy data to public/data/
npm run build        # TypeScript check + Vite build + copy data to docs/data/
npm run sync-data    # Fetch fresh data from Apps Script to /data
```

**Build Pipeline:** Inline Node.js scripts in `package.json` copy `/data` → `public/data/` (dev) or `docs/data/` (prod)  
**Data Sync:** GitHub Actions runs weekly, manually triggerable via workflow_dispatch  
**Environment:** No env vars needed locally - all data from static files. `LYCANS_API_BASE` secret on GitHub only.

## Data Architecture Migration (RECENT CHANGE)

**New Primary Source:** `gameLog.json` - unified structure with nested `PlayerStats` arrays  
**Backward Compatibility:** `useCombinedRawData.tsx` transforms new structure to legacy interfaces  
**Legacy Interfaces:** `RawGameData`, `RawRoleData`, `RawPonceData` still work unchanged  

### Key Data Interfaces
```typescript
// New unified structure
interface GameLogEntry {
  Id: string; StartDate: string; PlayerStats: PlayerStat[];
}
interface PlayerStat {
  Username: string; MainRoleInitial: string; Victorious: boolean;
}

// Legacy interfaces (auto-transformed from gameLog)
interface RawGameData {
  Game: number; "Camp victorieux": string; "Liste des joueurs": string;
}
```

**Critical:** `Amoureux` is `MainRoleInitial`, not `SecondaryRole`. Solo roles win as their role name, not "Villageois".

## Key Architectural Patterns

### Base Hook System (PREFERRED PATTERN)
```typescript
// Optimized pattern for new statistics
const { data, isLoading, error } = usePlayerStatsBase(
  (gameData, roleData) => computePlayerStats(gameData, roleData)
);

// Base hook hierarchy: useBaseStats → useGameStatsBase → usePlayerStatsBase → useFullStatsBase
```

### Triple Context System
```typescript
// SettingsContext - persistent filters via localStorage
const { settings, updateSettings } = useSettings();
// NavigationContext - drill-down navigation with complex filters
const { navigateToGameDetails, filters } = useNavigation();
// FullscreenContext - chart fullscreen state
const { isFullscreen, toggleFullscreen } = useFullscreen();
```

### Navigation Context for Drill-Down
```typescript
// Complex filter navigation between charts
navigateToGameDetails({ 
  selectedPlayer: 'Ponce', 
  campFilter: { selectedCamp: 'Loups', campFilterMode: 'wins-only' },
  fromComponent: 'Statistiques Joueurs' 
});
```

### Lazy Loading Pattern
```typescript
// Required pattern for App.tsx component imports
const Component = lazy(() => import('./path').then(m => ({ default: m.ComponentName })));
```

## Data Flow & Filtering

**Primary Flow:** `gameLog.json` → `useCombinedRawData()` → transformation → `useCombinedFilteredRawData()` → base hooks  
**Filter Application:** All hooks automatically respect `SettingsContext` filters (game type, date range, player inclusion/exclusion)  
**French Date Parsing:** Uses `parseFrenchDate()` for DD/MM/YYYY format compatibility

### Game Domain Rules
**Camps:** Villageois, Loups, solo roles (`Amoureux`, `Idiot du Village`, `Agent`, etc.)  
**Special Cases:** `Traître` works with Loups, `Amoureux` always 2 players (win/lose together)  
**Victory Logic:** Pure role-based - solo roles win as their role name, not grouped into Villageois

## Project-Specific Conventions

**Component Structure:** Domain-based folders (`generalstats/`, `playerstats/`, `gamedetails/`, `settings/`)  
**Menu System:** Hierarchical tabs (`MAIN_TABS` → `*_STATS_MENU`) in `App.tsx`  
**Testing:** Visual testing via dev server only - no automated test suite  
**Language:** All UI and data labels in French ("Villageois", "Loups", "Camp victorieux")

## Adding Features Workflow

1. **New Statistics:** Create computation function in `utils/` → use base hook pattern → add to menu in `App.tsx`
2. **Data Access:** Use `useGameLogData()` for new features, legacy hooks for backward compatibility
3. **Navigation:** Integrate with `NavigationContext` for chart drill-downs
4. **Settings:** Add to `SettingsState` interface → ensure localStorage persistence

### Base Hook Template
```typescript
export function useNewStatsFromRaw() {
  return usePlayerStatsBase((gameData, roleData) => {
    // Pure computation function here
    return computeNewStats(gameData, roleData);
  });
}
```

## Integration Points

**GitHub Actions:** `.github/workflows/update-data.yml` for weekly data sync  
**Apps Script:** `scripts/data-sync/fetch-data.js` fetches from Google Sheets  
**Build Output:** GitHub Pages serves from `/docs` with base path `/stats-lycansv2/`  
**Error Handling:** Static file loading only, graceful degradation for missing data
