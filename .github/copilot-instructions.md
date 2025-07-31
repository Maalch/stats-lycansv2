

# Copilot Instructions for `stats-lycansv2`

This project is a Vite-based React + TypeScript dashboard for visualizing KPIs and statistics from a Google Sheet, deployed to GitHub Pages (output in `docs`).

## Architecture & Data Flow
- **Frontend:** React (TypeScript), Vite, Recharts for all charting.
- **Data Source:** Google Sheets, accessed via a published Google Apps Script web API (`src/ExternalData/GoogleScript.gs`).
- **API Usage:** All data fetching is done via HTTP requests to the Apps Script endpoint, with actions like `?action=campWinStats`, `?action=harvestStats`, `?action=roleSurvivalStats`, `?action=gameDurationAnalysis`, `?action=playerStats`.
- **Environment:** The API base URL is set in `.env` as `VITE_LYCANS_API_BASE`.
- **Build Output:** Production build is output to `docs/` for GitHub Pages hosting. The Vite `base` is set to `/stats-lycansv2/`.

## Key Files & Directories
- `src/components/`: Contains all chart and dashboard components (e.g., `CampWinRateChart.tsx`, `HarvestProgressChart.tsx`, `RoleSurvivalRateChart.tsx`, `GameDurationInsights.tsx`, `PlayerStatisticsChart.tsx`).
- `src/hooks/`: Contains hooks for fetching and shaping data from the API (e.g., `useGameStats`, `usePlayerStats`, `usePlayersWithColors`).
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
- **Data Fetching:** Use custom React hooks in `src/hooks/` for all API calls. Each hook targets a specific API action and returns `{ data, isLoading, error }` or similar.
- **Type Safety:** Define TypeScript types for all API responses and data structures. See `src/types/api.ts` for shared types and color schemes.
- **Color Mapping:** Use `lycansColorScheme` from `src/types/api.ts` for consistent camp/role coloring in charts. Fallback to a default color if not found.
- **Visualization:** Use Recharts for all charting. Bar, Pie, and Line charts are used throughout. See `CampWinRateChart.tsx` and `PlayerStatisticsChart.tsx` for examples.
- **Component Structure:** Each major dashboard section is a separate component, lazy-loaded in `App.tsx` and selectable via the main menu.
- **CSV Data:** Local CSVs in `src/ExternalData/` mirror Google Sheet structure for reference/testing, but production data comes from the API.
- **No direct Google Sheets API calls from frontend:** All data must go through the Apps Script endpoint.
- **French language:** Most data and UI labels are in French; maintain consistency in new code.
- **Fallbacks:** Use fallback colors or values if API data is missing.

## Integration Points
- **Google Apps Script:** All backend logic for aggregating stats is in `src/ExternalData/GoogleScript.gs`. Update this script to add new API actions or calculations. Utility constants and helpers are in `Utils.gs`.
- **Environment Variables:** Use `VITE_LYCANS_API_BASE` for the API root; do not hardcode URLs.

## Example: Adding a New KPI or Chart
1. Add a new action in `GoogleScript.gs` and deploy the script.
2. Create a new hook in `src/hooks/` to fetch the new data.
3. Add a new component or update an existing one to display the KPI/chart.
4. Add the component to the menu in `App.tsx` if it is a new dashboard section.

## Project-Specific Notes
- **Testing:** No formal test suite; test visually via `npm run dev` and by inspecting charts/components.
- **Error Handling:** Display user-friendly error and loading states in all components.
- **Performance:** Use lazy loading for dashboard sections in `App.tsx`.

---
For more, see `README.md`, `vite.config.ts`, and `src/ExternalData/GoogleScript.gs`.
