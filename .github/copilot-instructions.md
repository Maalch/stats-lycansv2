

# Copilot Instructions for `stats-lycansv2`

This project is a Vite-based React + TypeScript dashboard for visualizing KPIs and statistics from a Google Sheet, deployed to GitHub Pages (output in `docs`).

## Architecture & Data Flow
- **Frontend:** React (TypeScript), Vite, Recharts for all charting.
- **Data Source:** Google Sheets, accessed via a published Google Apps Script web API (`src/ExternalData/GoogleScript.gs`).
- **Performance Strategy:** Uses `StatsContext` provider with `combinedStats` endpoint to fetch multiple datasets in a single API call at app startup.
- **API Usage:** Primary endpoint is `?action=combinedStats&stats=campWinStats,harvestStats,...` for batched data. Legacy individual endpoints still available.
- **Environment:** The API base URL is set in `.env` as `VITE_LYCANS_API_BASE`.
- **Build Output:** Production build is output to `docs/` for GitHub Pages hosting. The Vite `base` is set to `/stats-lycansv2/`.

## Key Files & Directories
- `src/components/`: Contains all chart and dashboard components (e.g., `CampWinRateChart.tsx`, `HarvestProgressChart.tsx`, `RoleSurvivalRateChart.tsx`, `GameDurationInsights.tsx`, `PlayerStatisticsChart.tsx`).
- `src/hooks/`: Contains hooks that consume `StatsContext` for data access (e.g., `useCampWinStats`, `usePlayerStats`, `useGameDurationAnalysis`).
- `src/context/StatsContext.tsx`: Global state provider that fetches combined stats at app startup and shares data across hooks.
- `src/api/statsApi.tsx`: Contains `fetchCombinedStats()` function for API communication.
- `src/ExternalData/`: Contains Google Apps Script (`GoogleScript.gs`), utility functions (`Utils.gs`), and CSVs for local data reference.
- `vite.config.ts`: Sets build output and base path for GitHub Pages.
- `.env`: Stores the API base URL for the deployed Apps Script.

## Developer Workflows
- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build` (outputs to `docs/`)
- **Preview production build:** `npm run preview`
- **Lint:** `npm run lint`
- **Deploy:** Push to GitHub; ensure repo is configured to serve from `docs/`.

## Patterns & Conventions
- **Data Fetching:** All hooks in `src/hooks/` consume `StatsContext` instead of making direct API calls. Context fetches all common stats at app startup via `combinedStats` endpoint.
- **Context Usage Pattern:** Hooks extract specific data from `combinedData` object (e.g., `combinedData.campWinStats`) and return consistent interface with `{ data, isLoading, error }`.
- **App Wrapper:** Entire app must be wrapped with `<StatsProvider>` in `App.tsx` for hooks to access shared data.
- **Type Safety:** Define TypeScript types for all API responses and data structures. See `src/types/api.ts` for shared types and color schemes.
- **Color Mapping:** Use `lycansColorScheme` from `src/types/api.ts` for consistent camp/role coloring in charts. Fallback to a default color if not found.
- **Visualization:** Use Recharts for all charting. Bar, Pie, and Line charts are used throughout. See existing components for patterns.
- **Component Structure:** Each major dashboard section is a separate component, lazy-loaded in `App.tsx` and selectable via the main menu.
- **Google Apps Script Architecture:** 
  - Use `_compute*` internal functions that accept preloaded data for code reuse
  - Both `*Raw()` (fresh data) and `*WithData()` (preloaded data) versions for each stat function
  - `combinedStats` endpoint uses `*WithData()` functions to share loaded sheet data across calculations
- **CSV Data:** Local CSVs in `src/ExternalData/` mirror Google Sheet structure for reference/testing, but production data comes from the API.
- **No direct Google Sheets API calls from frontend:** All data must go through the Apps Script endpoint.
- **French language:** Most data and UI labels are in French; maintain consistency in new code.
- **Fallbacks:** Use fallback colors or values if API data is missing.

## Integration Points
- **Google Apps Script:** All backend logic for aggregating stats is in `src/ExternalData/GoogleScript.gs`. Update this script to add new API actions or calculations. Utility constants and helpers are in `Utils.gs`.
- **Environment Variables:** Use `VITE_LYCANS_API_BASE` for the API root; do not hardcode URLs.
- **Cache Management:** Apps Script uses `CacheService` with max 6-hour expiration. Use `clearCombinedStatsCache()` and `test_combinedStats()` debug functions.
- **Data Schema:** `LYCAN_SCHEMA` in `Utils.gs` defines sheet structure. New `WINNERLIST` column provides explicit winner data vs. inferring from camps.

## Example: Adding a New KPI or Chart
1. Add a new action in `GoogleScript.gs` and deploy the script.
2. Create both `_compute*()` internal function and `*WithData()` function for data reuse.
3. Add the new stat to `combinedStats` endpoint in `getCombinedStatsRaw()`.
4. Update `StatsContext` to include the new stat in the fetch list.
5. Create a new hook in `src/hooks/` that extracts data from context.
6. Add a new component or update an existing one to display the KPI/chart.
7. Add the component to the menu in `App.tsx` if it is a new dashboard section.

## Project-Specific Notes
- **Testing:** No formal test suite; test visually via `npm run dev` and by inspecting charts/components.
- **Error Handling:** Display user-friendly error and loading states in all components.
- **Performance:** Use lazy loading for dashboard sections in `App.tsx`.
- **Debug Tools:** Use `test_combinedStats()` in Apps Script editor to test combined endpoint functionality.

---
For more, see `README.md`, `vite.config.ts`, and `src/ExternalData/GoogleScript.gs`.
