---
name: frontend-statistics-charts
user-invocable: false
description: "Use when creating or modifying React statistics charts, Recharts dashboards, chart hooks, FullscreenChart views, statistics menu tabs or subtabs, chart filters, player highlighting, or chart drill-down navigation in stats-lycansv2."
---

# Frontend Statistics Charts

Use this skill for data-driven dashboard views and their client-side integration. Use `data-sync-statistics` for server-side compute modules, ranking generation, titles, achievements, and generated JSON contracts. Consult `.github/copilot-instructions.md` for the broader architecture.

## First Route The Request

Choose the owning surface before editing:

| Requested view | Owning location |
| --- | --- |
| Comparative player metric | `src/components/playerstats/` |
| Aggregate game metric | `src/components/generalstats/` |
| Battle Royale metric | `src/components/brstats/` and `useRawBRData` |
| Normal game-log data hook | `src/hooks/` using `usePlayerStatsBase()` or `useGameStatsBase()` |
| Menu registration and lazy loading | `src/App.tsx` |
| Shared global setting or filter | `SettingsContext` |
| Chart-local persisted state or drill-down | `NavigationContext` |

Do not directly fetch normal game data in a chart. Base hooks receive the correctly filtered game log through `useCombinedFilteredRawData()`.

## Hook And Component Contract

- Create a typed hook under `src/hooks/`. Use `usePlayerStatsBase()` for player-focused results and `useGameStatsBase()` for game-level results.
- Use the dedicated `useRawBRData` hooks for Battle Royale. Do not force BR data through normal game-log hooks.
- Return and handle the standard `{ data, isLoading, error }` result. Render loading, error, and empty-data states before rendering the chart.
- Derive, filter, sort, and limit chart datasets in `useMemo`. Reuse `CHART_LIMITS`, `MIN_GAMES_DEFAULTS`, and `MIN_GAMES_OPTIONS` from `src/config/chartConstants.ts`; do not duplicate cutoff constants.
- Use `ResponsiveContainer` for Recharts visualizations and wrap expandable charts with `FullscreenChart`. Use its render-prop child only when fullscreen needs a distinct layout, height, or data density.
- Keep UI labels, menu labels, empty states, and tooltips in French.

## Filters And Local State

- Global game type, date, map, and player filters are already applied by a base hook. Do not apply them again in a chart.
- Read `settings.highlightedPlayer` and `settings.dataSource` from `useSettings()` for global behavior. Do not create a second local source or highlighted-player state.
- For meaningful local settings such as selected view, camp, or minimum games, add a typed, chart-specific state entry in `NavigationState`. Initialize component state from it and synchronize with `updateNavigationState()` while preserving the chart's existing sibling fields.
- Persist chart state to the URL only when it needs to be shareable. Use `parseUrlState()` and `mergeUrlState()` from `urlManager`; use `push` for user navigation and `replace` for silent state or filter updates.

## Player Charts And Interaction

- Player names supplied by normal hooks are already canonical. For player-colored charts, use `useJoueursData()` with `useThemeAdjustedDynamicPlayersColor()` and the existing fallback utilities.
- When a top-N player chart supports global highlighting, append an eligible highlighted player missing from the cutoff with `isHighlightedAddition: true`. Reflect that state in the label, tooltip, and bar or cell styling.
- Use `navigateToGameDetails()` only when a datum maps unambiguously to game-detail filters. Pass a useful French `fromComponent` label.
- Use `navigateToTab()` for cross-chart routing. Do not manipulate browser history directly; all URL and history operations go through `urlManager` or the relevant context.

## Registering A Chart

1. Lazy-load the component in `src/App.tsx`:

   ```ts
   const NewChart = lazy(() => import('./components/path/NewChart')
     .then(m => ({ default: m.NewChart })));
   ```

2. Add a unique key, French label, component, and concise description to the matching menu: `PLAYER_STATS_MENU`, `GENERAL_STATS_MENU`, or `BR_STATS_MENU`.
3. Keep source availability honest. BR is unavailable for `discord`; other views lacking Discord data must be hidden or degrade gracefully according to the existing App pattern.

## Validation

Run `npm run build` after client changes. Then use `npm run dev` for visual validation and verify:

- loading, error, and empty-data states;
- global game, date, map, and player filters;
- local state restoration after tab changes;
- fullscreen rendering and responsive desktop/mobile layout;
- highlighted-player inclusion outside top-N cutoffs;
- drill-down and browser-back behavior when navigation was added;
- `main` and `discord` source behavior when supported.

Use `PlayersGeneralStatisticsChart.tsx` as the reference for filtered hooks, chart-local state, highlighting, fullscreen, and game-detail drill-down. Use `PlayerSeriesChart.tsx` for URL-backed local chart state.