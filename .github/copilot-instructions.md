

# Copilot Instructions for `stats-lycansv2`

This project is a Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. It uses a **hybrid data pipeline** with static JSON files (updated daily via GitHub Actions) and Apps Script API fallback.

## Architecture & Data Flow
- **Frontend:** React (TypeScript), Vite, Recharts for charting, dual context system (`SettingsContext` + `FullscreenContext`)
- **Data Pipeline:** Hybrid system - static JSON files in `/data` (primary) with Apps Script API fallback (`src/api/dataService.ts`)
- **Build System:** Vite outputs to `docs/` for GitHub Pages, with data copying via inline Node.js scripts in `package.json`
- **Data Processing:** Client-side calculations using `*FromRaw` hooks that process raw game/role/ponce data locally
- **Settings:** Persistent settings via `SettingsContext` with localStorage, including modded games filter

## Key Files & Architecture
- **Data Layer:** `src/hooks/useRawGameData.tsx` provides filtered raw data, `src/api/dataService.ts` handles hybrid static/API routing
- **Components:** Organized by domain - `generalstats/`, `playerstats/`, `settings/` with lazy loading in `App.tsx`
- **Hooks Pattern:** Dual hook system - legacy API hooks (`usePlayerStats`) and new raw data hooks (`usePlayerStatsFromRaw`)
- **Types:** `src/types/api.ts` defines color schemes (`lycansColorScheme`, `playersColor`) and data interfaces
- **Migration:** Multiple `*_MIGRATION.md` files document the ongoing migration from API to raw data processing

## Developer Workflows
- **Development:** `npm run dev` (copies data to `public/data/`)
- **Production:** `npm run build` (TypeScript check + Vite build + copy data to `docs/data/`)
- **Data Sync:** `npm run sync-data` (fetches fresh data from Apps Script to `/data`)
- **Debug:** GitHub Actions workflow can be manually triggered for data updates

## Critical Patterns & Conventions

### Data Processing Pattern
```typescript
// Raw data hooks process client-side, mirroring Apps Script logic
const { data: rawGameData } = useFilteredRawGameData();
const { data: rawRoleData } = useFilteredRawRoleData();
// Complex role assignment and winner detection logic
```

### Component Structure
```typescript
// Lazy-loaded components with specific import patterns
const Component = lazy(() => import('./path').then(m => ({ default: m.ComponentName })));
```

### Color Consistency
Use `lycansColorScheme` for camps/roles and `playersColor` for players. French labels throughout ("Villageois", "Loups", etc.).

### Settings Integration
All data hooks respect `settings.showOnlyModdedGames` filter via `useFilteredRaw*Data()` hooks.

## Data Migration Strategy
- **Current State:** Transitioning from Google Sheets API to static JSON + client processing
- **Hook Pairs:** Each stat has both API hook (`usePlayerStats`) and raw hook (`usePlayerStatsFromRaw`)
- **Complex Logic:** Player role assignment, winner detection, and camp mapping replicated from Apps Script
- **Performance:** Static data eliminates API call overhead, enables filtering without server changes

## Integration Points
- **GitHub Actions:** `.github/workflows/update-data.yml` syncs data daily at 6 AM UTC
- **Apps Script:** `src/ExternalData/GoogleScript.gs` still used for data sync and API fallback
- **Data Service:** Routes between static JSON and API based on `DATA_CONFIG` in `dataService.ts`
- **Build Pipeline:** Inline Node.js scripts copy `/data` to appropriate build locations

## Adding New Features
1. **New Statistics:** Create `use*FromRaw` hook processing filtered raw data, add to appropriate component menu
2. **New Settings:** Add to `SettingsState` interface, ensure localStorage persistence, integrate in raw data filters
3. **New Data Sources:** Add endpoint to `DATA_CONFIG`, ensure sync script handles it, create corresponding raw data interface

## Project-Specific Notes
- **French Language:** All UI labels and data values in French - maintain consistency
- **No Test Suite:** Visual testing via dev server, check chart rendering and data accuracy
- **Complex Role Logic:** Player camp assignment involves intricate multi-dataset joins (see migration docs)
- **Dual Architecture:** Currently supports both legacy API and new raw data approaches during migration

---
See `HYBRID_DATA_PIPELINE.md`, `*_MIGRATION.md` files, and `src/hooks/useRawGameData.tsx` for implementation details.
