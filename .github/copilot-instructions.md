

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Recently migrated from multiple JSON files to a unified `gameLog.json` structure while maintaining backward compatibility.

## Architecture Overview

**Frontend:** React 19 + TypeScript, Vite, Recharts for charts, triple context system (`SettingsContext` + `FullscreenContext` + `NavigationContext`)  
**Data Pipeline:** Unified `gameLog.json` with transformation layer for backward compatibility  
**Build System:** Vite outputs to `docs/` for GitHub Pages, inline Node.js scripts copy data files  
**Data Processing:** Client-side calculations using optimized base hook pattern (`useBaseStats` → `useGameStatsBase` → `usePlayerStatsBase` → `useFullStatsBase`) with pure computation functions  
**URL Sharing:** Settings persist via localStorage + URL parameters for shareable dashboard states

## Critical Workflows

```bash
npm run dev          # Dev server + copy data to public/data/
npm run build        # TypeScript check + Vite build + copy data to docs/data/
npm run sync-data    # Fetch fresh data from Apps Script to /data
```

**Build Pipeline:** Inline Node.js scripts in `package.json` copy `/data` → `public/data/` (dev) or `docs/data/` (prod)  
**Data Sync:** GitHub Actions runs weekly (Mon/Tue 4AM UTC), manually triggerable via workflow_dispatch  
**Environment:** No env vars needed locally - all data from static files. `LYCANS_API_BASE` + `STATS_LIST_URL` secrets on GitHub only.

## Data Architecture Migration (RECENT CHANGE)

**New Primary Source:** `gameLog.json` - unified structure with nested `PlayerStats` arrays  
**Backward Compatibility:** `useCombinedRawData.tsx` transforms new structure to legacy interfaces  
**Legacy Interfaces:** `RawGameData`, `RawRoleData`, `RawPonceData` still work unchanged  
**Data Evolution:** Recent format includes detailed vote tracking, color assignments, and enhanced death metadata  

### Key Data Interfaces
```typescript
// New unified structure (current format)
interface GameLogEntry {
  Id: string; DisplayedId: string; StartDate: string; EndDate: string; MapName: string;
  HarvestGoal: number; HarvestDone: number; EndTiming: string | null;
  Version: string; Modded: boolean; PlayerStats: PlayerStat[];
}
interface PlayerStat {
  Username: string; Color?: string; MainRoleInitial: string; MainRoleFinal: string | null;
  Power: string | null; SecondaryRole: string | null; 
  Victorious: boolean; DeathTiming: string | null;
  DeathPosition: {x: number; y: number; z: number} | null;
  DeathType: string | null; KillerName: string | null;
  Votes: Array<{Target: string; Date: string}>; // New voting data
}

// Legacy interfaces (auto-transformed from gameLog)
interface RawGameData {
  Game: number; "Camp victorieux": string; "Liste des joueurs": string;
}
```

**Critical:** `Amoureux` is `MainRoleInitial`, not `SecondaryRole`. Solo roles win as their role name, not "Villageois". Recent data includes detailed vote tracking and death metadata.

## Key Architectural Patterns

### Base Hook System (PREFERRED PATTERN)
```typescript
// Optimized pattern for new statistics
const { data, isLoading, error } = usePlayerStatsBase(
  (gameData) => computePlayerStats(gameData)
);

// Base hook hierarchy: useBaseStats → useGameStatsBase → usePlayerStatsBase → useFullStatsBase
// Located in: src/hooks/utils/baseStatsHook.ts
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

### Player Highlighting System 
```typescript
// SettingsContext includes highlightedPlayer field with URL/localStorage persistence
const { settings } = useSettings();
// Chart components extend data types for highlighting logic
interface ChartPlayerStat extends PlayerStat {
  isHighlightedAddition?: boolean; // Player added outside normal criteria
}
// Complex inclusion logic: show highlighted players even if below min games or outside top rankings
```

### Lazy Loading Pattern
```typescript
// Required pattern for App.tsx component imports
const Component = lazy(() => import('./path').then(m => ({ default: m.ComponentName })));
```

### Fullscreen Chart Pattern
```typescript
// Wrap charts with FullscreenChart for zoom functionality
import { FullscreenChart } from '../common/FullscreenChart';
<FullscreenChart title="Chart Title">
  <YourChart />
</FullscreenChart>
```

## Data Flow & Filtering

**Primary Flow:** `gameLog.json` → `useCombinedRawData()` → transformation → `useCombinedFilteredRawData()` → base hooks  
**Filter Application:** All hooks automatically respect `SettingsContext` filters (game type, date range, player inclusion/exclusion)  
**French Date Parsing:** Uses `parseFrenchDate()` for DD/MM/YYYY format compatibility  
**URL Sharing:** Complete settings state serialized to URL parameters (see `URL_PARAMETERS.md`) with localStorage fallback

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
5. **Player Highlighting:** Extend chart data types with `isHighlightedAddition` for special inclusion logic

### Base Hook Template
```typescript
export function useNewStatsFromRaw() {
  return usePlayerStatsBase((gameData) => {
    // Pure computation function here
    return computeNewStats(gameData);
  });
}
```

### Component File Structure
```typescript
// Typical chart component pattern
import { useNewStatsFromRaw } from '../../hooks/useNewStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';

export function NewStatsChart() {
  const { data, isLoading, error } = useNewStatsFromRaw();
  
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!data) return <div>Aucune donnée disponible</div>;
  
  return (
    <FullscreenChart title="Titre du Graphique">
      {/* Chart implementation */}
    </FullscreenChart>
  );
}
```

### Chart Highlighting Pattern
```typescript
// For charts with player highlighting support
interface ChartPlayerStat extends PlayerStat {
  isHighlightedAddition?: boolean;
}

// Multi-level highlighting in Recharts Cell components
<Cell 
  key={`cell-${index}`}
  fill={
    settings.highlightedPlayer === entry.player ? 'var(--accent-primary)' :
    isHighlightedAddition ? 'var(--accent-secondary)' :
    hoveredPlayer === entry.player ? 'var(--accent-hover)' : 
    'var(--chart-primary)'
  }
  stroke={isHighlightedFromSettings ? "var(--accent-primary)" : "none"}
  strokeWidth={isHighlightedFromSettings ? 3 : 0}
  strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
  opacity={isHighlightedAddition ? 0.8 : 1}
/>

// X-axis player name highlighting
<XAxis 
  tick={({ x, y, payload }) => (
    <text
      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
    >
      {payload.value}
    </text>
  )}
/>
```

## Integration Points

**GitHub Actions:** `.github/workflows/update-data.yml` for weekly data sync  
**Apps Script:** `scripts/data-sync/fetch-data.js` fetches from Google Sheets  
**Build Output:** GitHub Pages serves from `/docs` with custom domain (base path `/`)  
**Error Handling:** Static file loading only, graceful degradation for missing data

## Development Patterns

### Error Boundary Pattern
```typescript
// All chart components use consistent error handling
if (isLoading) return <div>Chargement...</div>;
if (error) return <div>Erreur: {error}</div>;
if (!data) return <div>Aucune donnée disponible</div>;
```

### URL Parameters & Sharing
Complete settings serialization via `generateUrlWithSettings()` enables shareable dashboard states. Settings persist in localStorage with URL parameter override capability. See `SettingsContext.tsx` for implementation details.

### Data Filtering Architecture
**Independent Filters:** System allows combining multiple filter types simultaneously (gameType, dateRange, mapName, playerFilter)  
**Filter Application:** Automatic filtering in `useCombinedFilteredRawData()` respects all `SettingsContext` state  
**URL Compatibility:** Legacy URL parameters automatically converted to independent filters for backward compatibility

### Theme System
Uses CSS custom properties (`--accent-primary`, `--chart-primary`) with theme-adjusted colors via `useThemeAdjusted*Color()` hooks for consistent chart styling across light/dark themes.
