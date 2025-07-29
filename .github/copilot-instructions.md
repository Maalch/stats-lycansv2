
# Copilot Instructions for `stats-lycans`

This project is a Vite-based React + TypeScript app for visualizing KPIs and statistics from a Google Sheet, deployed to GitHub Pages (output in `docs`).

## Architecture & Data Flow
- **Frontend:** React (TypeScript), Vite, Recharts for charts.
- **Data Source:** Google Sheets, accessed via a published Google Apps Script web API (`src/ExternalData/GoogleScript.gs`).
- **API Usage:** All data fetching is done via HTTP requests to the Apps Script endpoint, with actions like `?action=participationRate`, `?action=playersWithColors`, `?action=gameStats`.
- **Environment:** The API base URL is set in `.env` as `VITE_LYCANS_API_BASE`.
- **Build Output:** Production build is output to `docs/` for GitHub Pages hosting. The Vite `base` is set to `/stats-lycans/`.

## Key Files & Directories
- `src/components/GeneralKPI.tsx`: Main KPI/statistics dashboard, merges data from multiple hooks.
- `src/hooks/`: Contains hooks for fetching and shaping data from the API (`useGameStats`, `useParticipationRates`, `usePlayersWithColors`).
- `src/ExternalData/`: Contains Google Apps Script (`GoogleScript.gs`) and CSVs for local data reference.
- `vite.config.ts`: Sets build output and base path for GitHub Pages.
- `.env`: Stores the API base URL for the deployed Apps Script.

## Developer Workflows
- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build` (outputs to `docs/`)
- **Preview production build:** `npm run preview`
- **Lint:** `npm run lint`
- **Deploy:** Push to GitHub; ensure repo is configured to serve from `docs/`.

## Patterns & Conventions
- **Data Fetching:** Use custom React hooks in `src/hooks/` for all API calls. Each hook targets a specific API action.
- **Type Safety:** Define TypeScript types for all API responses and data structures.
- **Color Mapping:** Player color backgrounds are fetched from the Google Sheet via the API and merged into participation data for chart coloring.
- **Visualization:** Use Recharts for all charting; see `GeneralKPI.tsx` for bar chart example.
- **CSV Data:** Local CSVs in `src/ExternalData/` mirror Google Sheet structure for reference/testing, but production data comes from the API.
- **No direct Google Sheets API calls from frontend:** All data must go through the Apps Script endpoint.

## Integration Points
- **Google Apps Script:** All backend logic for aggregating stats is in `src/ExternalData/GoogleScript.gs`. Update this script to add new API actions or calculations.
- **Environment Variables:** Use `VITE_LYCANS_API_BASE` for the API root; do not hardcode URLs.

## Example: Adding a New KPI
1. Add a new action in `GoogleScript.gs` and deploy the script.
2. Create a new hook in `src/hooks/` to fetch the new data.
3. Add a new component or update an existing one to display the KPI.

## Project-Specific Notes
- **French language:** Some data and UI labels are in French; maintain consistency.
- **Fallbacks:** Use fallback colors or values if API data is missing.
- **Testing:** No formal test suite; test visually via `npm run dev` and by inspecting charts/components.

---
For more, see `README.md` and `vite.config.ts`.
