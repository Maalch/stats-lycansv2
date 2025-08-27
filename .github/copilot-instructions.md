

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Uses a **hybrid data pipeline** with static JSON files (updated weekly via GitHub Actions) and Apps Script API fallback.

## Architecture Overview

**Frontend:** React (TypeScript), Vite, Recharts for charting, dual context system (`SettingsContext` + `FullscreenContext`)  
**Data Pipeline:** Hybrid - static JSON files in `/data` (primary) with Apps Script API fallback (`src/api/dataService.ts`)  
**Build System:** Vite outputs to `docs/` for GitHub Pages, with data copying via inline Node.js scripts in `package.json`  
**Data Processing:** Client-side calculations using `*FromRaw` hooks that process raw game/role/ponce data locally

## Critical Workflows

```bash
npm run dev          # Dev server + copy data to public/data/
npm run build        # TypeScript check + Vite build + copy data to docs/data/
npm run sync-data    # Fetch fresh data from Apps Script to /data
```

**Build Pipeline:** Inline Node.js in package.json scripts copies `/data` → `public/data/` (dev) or `docs/data/` (prod)  
**Data Sync:** GitHub Actions runs weekly on Saturday 4 AM UTC, can be manually triggered

## Key Architectural Patterns

### Dual Hook System (Migration Pattern)
```typescript
// Each stat has legacy API hook AND new raw data hook
const { data } = usePlayerStats();         // Legacy API
const { data } = usePlayerStatsFromRaw();  // New raw data processing
```

### Lazy Loading with Named Exports
```typescript
// Required pattern for component imports in App.tsx
const Component = lazy(() => import('./path').then(m => ({ default: m.ComponentName })));
```

### Raw Data Processing Hook
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

**Core Data Types:** `RawGameData`, `RawRoleData`, `RawPonceData` in `useRawGameData.tsx`  
**Data Service:** `DATA_CONFIG` in `dataService.ts` routes between static JSON and API  
**Color Schemes:** `lycansColorScheme` (camps/roles), `playersColor` (players) in `types/api.ts`  
**French Language:** All UI labels and data values in French ("Villageois", "Loups", etc.)

### Data Flow
1. GitHub Actions → Apps Script → `/data/*.json` (weekly sync)
2. Build scripts → copy to `public/data/` or `docs/data/`
3. `useRawData<T>()` → loads from static files or API fallback
4. `useFiltered*Data()` → applies SettingsContext filters
5. `use*FromRaw()` → processes filtered data client-side

## Project-Specific Conventions

**Component Organization:** Domain-based (`generalstats/`, `playerstats/`, `settings/`)  
**Context Usage:** Persistent settings via localStorage, fullscreen chart state  
**No Test Suite:** Visual testing via dev server, verify chart rendering manually  
**Complex Logic:** Player camp assignment involves multi-dataset joins (see `usePlayerStatsFromRaw.tsx`)

## Adding Features

1. **New Statistics:** Create `use*FromRaw` hook → add to menu constants in `App.tsx`
2. **New Settings:** Add to `SettingsState` interface → ensure localStorage persistence
3. **New Data Sources:** Add to `DATA_CONFIG` → update sync script → create interface

## Integration Points

**GitHub Actions:** `.github/workflows/update-data.yml` (weekly data sync)  
**Apps Script:** `scripts/data-sync/fetch-data.js` (API endpoints: rawGameData, rawRoleData, rawPonceData)  
**Build Outputs:** GitHub Pages serves from `/docs` directory  
**Environment:** `LYCANS_API_BASE` for Apps Script URL, dev/prod path handling in `dataService.ts`
