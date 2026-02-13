

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Recently migrated from multiple JSON files to a unified `gameLog.json` structure while maintaining backward compatibility. Features a sophisticated Rankings system with server-side pre-calculation and comprehensive player highlighting across all charts.

## Architecture Overview

**Frontend:** React 19 + TypeScript, Vite, Recharts 3 for charts, d3-contour/d3-scale-chromatic for heatmaps  
**State:** Quad context system (`SettingsContext` + `NavigationContext` + `FullscreenContext` + `InfoContext`)  
**Data Pipeline:** Unified `gameLog.json` → `useCombinedRawData()` transformation → `useCombinedFilteredRawData()` → base hooks  
**Build System:** Vite outputs to `docs/` for GitHub Pages, inline Node.js scripts copy data files  
**Data Processing:** Hybrid approach - optimized base hook pattern for real-time stats + pre-calculated Rankings/titles JSON for performance  
**URL Sharing:** Settings persist via localStorage + URL parameters via centralized `urlManager.ts` (see `URL_FILTERS.md`)  
**Centralized Utilities:** `dataPath.ts` (data fetching), `logger.ts` (error handling), `chartConstants.ts` (chart limits/min-games)  
**Rankings System:** Server-side generation in `scripts/data-sync/` creates `playerRankings.json` consumed by client  
**Player Selection:** Dedicated page for player search, selection, Ranking display, and interactive navigation

## Critical Workflows

```bash
npm run dev                     # Dev server + copy data to public/data/
npm run build                   # TypeScript check + Vite build + copy data to docs/data/
npm run sync-data-aws           # AWS sync for main team (recommended)
npm run sync-data-discord       # AWS sync for Discord team
npm run sync-data               # Legacy Google Sheets sync
npm run generate-rankings   # Standalone Rankings generation + copy to public/
```

**Note:** `generate-titles` has no npm script — run directly: `cd scripts/data-sync && node generate-titles.js [main|discord]`

**Build Pipeline:** Inline Node.js scripts in `package.json` copy `/data` → `public/data/` (dev) or `docs/data/` (prod)  
**Data Sync:** 
  - Primary: AWS-based sync via `fetch-data-unified.js` (supports multiple teams via `shared/data-sources.js` config)
  - Legacy: Google Sheets sync via `fetch-data.js` (deprecated but maintained for backward compatibility)
  - Game data sync: Mon/Tue/Thu at 8 PM UTC via `update-data.yml` and `update-discorddata.yml`
  - Rankings & Titles: Weekly on Sunday at 6 AM UTC via `update-rankings-titles.yml`
  
**Environment:** No env vars needed locally - all data from static files. `STATS_LIST_URL` (AWS) and `LYCANS_API_BASE` (Google Sheets) secrets on GitHub Actions only.  
**Ranking Generation:** `scripts/data-sync/generate-rankings.js` processes all players, creates ranked lists, supports multiple teams via config
**Title Generation:** `scripts/data-sync/generate-titles.js` generates player titles based on statistics

## Data Architecture

**Primary Source:** `gameLog.json` - unified structure with nested `PlayerStats` arrays  
**Backward Compatibility:** `useCombinedRawData.tsx` transforms new structure to legacy interfaces  
**Legacy Interfaces:** `RawGameData`, `RawRoleData`, `RawPonceData` still work unchanged  
**Data Evolution:** Current format includes detailed vote tracking, color assignments, loot totals, player actions (gadgets/potions/sabotage), video clips, and comprehensive player stats per game
**Centralized Fetching:** Use `fetchDataFile()` / `fetchOptionalDataFile()` from `src/utils/dataPath.ts` — never construct fetch URLs manually

### Key Data Interfaces
```typescript
// New unified structure (current format)
interface GameLogEntry {
  Id: string; DisplayedId: string; StartDate: string; EndDate: string; MapName: string;
  HarvestGoal: number; HarvestDone: number; EndTiming: string | null;
  Version: string; Modded: boolean;
  Clips: Clip[];                  // Video clips associated with this game
  LegacyData: LegacyData | null;  // Legacy data (victory type, VODs, merged actions)
  PlayerStats: PlayerStat[];
}
interface PlayerStat {
  ID?: string | null;         // Steam ID - unique identifier (CRITICAL for player identification)
  Username: string;           // Display name (can vary: "Johnny" vs "[S.P.Q.R] Johnny Guitouze")
  Color?: string; MainRoleInitial: string; MainRoleChanges: RoleChange[];
  Power: string | null; SecondaryRole: string | null; 
  Victorious: boolean; DeathTiming: string | null; DeathDateIrl: string | null;
  DeathPosition: {x: number; y: number; z: number} | null;
  DeathType: DeathType | null; KillerName: string | null;  // DeathType from src/types/deathTypes.ts
  Votes: Vote[];
  SecondsTalkedOutsideMeeting: number; SecondsTalkedDuringMeeting: number;
  TotalCollectedLoot?: number;    // Total loot collected (optional for legacy data)
  Actions?: Action[];             // Actions performed (gadgets, potions, sabotage)
  LegacyActionsIncomplete?: boolean; // Flag for incomplete legacy action data
}
interface Vote {
  Day: number;           // Meeting number (1, 2, 3, etc.) — NOT a date
  Target: string;        // Player name or "Passé" for abstention
  Date: string | null;   // ISO date string (may be null for legacy data)
}
interface Action {
  Date: string; Timing: string;   // e.g., "N3" (Night 3), "J6" (Day 6)
  Position: { x: number; y: number; z: number };
  ActionType: string;             // "UseGadget", "DrinkPotion", "Sabotage"
  ActionName: string | null;      // "Diamant", "Invisible", "Vampire"
  ActionTarget: string | null;
}
interface Clip {
  ClipId: string; ClipUrl: string | null; ClipName: string | null;
  POVPlayer: string; OthersPlayers: string | null;
  RelatedClips: string | null; NextClip: string | null;
  NewName: string | null; AdditionalInfo: string | null; Tags: string[];
}

interface RoleChange {
  NewMainRole: string; // New main role after change
  RoleChangeDateIrl: string; // Date of role change
}

// Legacy interfaces (auto-transformed from gameLog)
interface RawGameData {
  Game: number; "Camp victorieux": string; "Liste des joueurs": string;
}
```

**Critical:** `Amoureux` is `MainRoleInitial`, not `SecondaryRole`. Solo roles win as their role name, not "Villageois". Recent data includes detailed vote tracking and death metadata.

## Role System Architecture (CRITICAL)

**ALWAYS use `src/utils/roleUtils.ts` helpers** for role checking - never compare `MainRoleInitial` directly for elite roles.

### Villageois Élite / Power System
The game has evolved its role format. "Chasseur" and "Alchimiste" were previously `MainRoleInitial` values, but are now Powers under the "Villageois Élite" role. New powers "Protecteur", "Disciple" and "Inquisiteur" were also added.

**Legacy Format (older games):**
```typescript
{ MainRoleInitial: "Chasseur", Power: null }
{ MainRoleInitial: "Alchimiste", Power: null }
```

**New Format (current games):**
```typescript
{ MainRoleInitial: "Villageois Élite", Power: "Chasseur" }
{ MainRoleInitial: "Villageois Élite", Power: "Alchimiste" }
{ MainRoleInitial: "Villageois Élite", Power: "Protecteur" }
{ MainRoleInitial: "Villageois Élite", Power: "Disciple" }
{ MainRoleInitial: "Villageois Élite", Power: "Inquisiteur" }


### Key Role Constants
```typescript
// All Villageois Élite powers
VILLAGEOIS_ELITE_POWERS = ['Chasseur', 'Alchimiste', 'Protecteur', 'Disciple', 'Inquisiteur']

// Legacy roles that became powers
LEGACY_ELITE_ROLES = ['Chasseur', 'Alchimiste']
```

### Camp Determination for Elite Roles
Villageois Élite and all its powers belong to the Villageois camp. The `getPlayerCampFromRole()` in `datasyncExport.js` handles this correctly.

### Player Identification & Name Resolution System (CRITICAL)

**ALWAYS use `playerIdentification.ts` utilities** - never compare players by username alone or display raw usernames.

#### Canonical Name Resolution (NEW SYSTEM)
All player names are **automatically normalized during data loading** using this hierarchy:
1. **Steam ID → joueurs.json** (PREFERRED) - canonical name from master player registry
2. **Legacy PLAYER_NAME_MAPPING** (fallback for players without Steam IDs)
3. **Original Username** (last resort)

```typescript
import { getPlayerId, getCanonicalPlayerName } from '../utils/playerIdentification';

// ✅ CORRECT: Use canonical names for display
const displayName = getCanonicalPlayerName(player); 
// Returns "Lutti" even if gameLog.json has "LuttiLutti", "[TAG] Lutti", etc.

// ✅ CORRECT: Group by unique ID
const playerId = getPlayerId(player); // Returns Steam ID if available, falls back to Username
const playerMap = new Map<string, Stats>();
playerMap.set(getPlayerId(player), stats); // Same Steam ID = 1 entry, prevents duplicates

// ❌ WRONG: Never use raw Username for display or grouping
const playerMap = new Map<string, Stats>();
playerMap.set(player.Username, stats); // Creates duplicates! ("Johnny" vs "[S.P.Q.R] Johnny")

#### Key Points
- **Names are pre-normalized**: By the time data reaches components, all `Username` fields already contain canonical names
- **Steam IDs are unique identifiers**: Use `getPlayerId()` for grouping, filtering, comparing
- **joueurs.json is the source of truth**: Master registry maps Steam IDs to canonical names
- **Automatic normalization**: Applied to `Username`, `KillerName`, and `Vote.Target` fields during data loading

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

### Quad Context System
```typescript
// SettingsContext - persistent filters via localStorage + URL params
const { settings, updateSettings } = useSettings();
// NavigationContext - drill-down navigation, chart state persistence, browser history
const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
// FullscreenContext - chart fullscreen overlay state
const { isFullscreen, toggleFullscreen } = useFullscreen();
// InfoContext - contextual help bubble toggle (used with InfoBubble component)
const { activeInfo, toggleInfo } = useInfo();
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
// Also supports render prop for fullscreen-aware rendering:
<FullscreenChart title="Title">
  {(isFullscreen: boolean) => <YourChart expanded={isFullscreen} />}
</FullscreenChart>
```

## Data Flow & Filtering

**Primary Flow:** `gameLog.json` → `useCombinedRawData()` → transformation → `useCombinedFilteredRawData()` → base hooks  
**Filter Application:** All hooks automatically respect `SettingsContext` filters (game type, date range, player inclusion/exclusion)  
**French Date Parsing:** Uses `parseFrenchDate()` for DD/MM/YYYY format compatibility  
**URL Sharing:** Complete settings state serialized to URL parameters (see `URL_FILTERS.md`) with localStorage fallback

### Dual Data Source System
**Main Source:** `/data/gameLog.json` + `/data/joueurs.json` (with player images, Twitch, YouTube links)  
**Discord Source:** `/data/discord/gameLog.json` + `/data/discord/joueurs.json` (with Steam IDs but no social media)

```typescript
// Data source switching via SettingsContext
const { settings } = useSettings();
// settings.dataSource: 'main' | 'discord'

// All data hooks automatically respect dataSource
const { data: gameLogData } = useGameLogData(); // Fetches from correct source
const { joueursData } = useJoueursData(); // Fetches matching joueurs.json
```

**Key Difference:** Main `joueurs.json` uses `SteamID` field (often null) + has social media (Twitch/YouTube/Image/Couleur). Discord `joueurs.json` uses `ID` field (always populated) + no social media.

**Pattern for Player Lookup:**
```typescript
// Try Steam ID first, fall back to name matching (joueurs.ts Player type uses SteamID field)
let playerInfo = joueursData?.Players?.find(p => p.SteamID === playerId);
if (!playerInfo) {
  playerInfo = joueursData?.Players?.find(p => p.Joueur === displayName);
}
```

### Game Domain Rules
**Camps:** Villageois, Loups, solo roles (`Amoureux`, `Idiot du Village`, `Agent`, etc.)  
**Special Cases:** `Traître` and `Louveteau` works with Loups, `Amoureux` always 2 players (win/lose together)  
**Victory Logic:** Pure role-based - solo roles win as their role name, not grouped into Villageois

## Project-Specific Conventions

**Component Structure:** Domain-based folders (`generalstats/`, `playerstats/`, `gamedetails/`, `settings/`, `playerselection/`, `brstats/`, `clips/`)  
**Menu System:** 6 main tabs in `App.tsx`: `playerSelection` (👤), `rankings` (🏆), `general` (🎯), `gameDetails` (📋), `clips` (🎬), `br` (⚔️) — each with sub-menus (`PLAYER_STATS_MENU`, `GENERAL_STATS_MENU`, `BR_STATS_MENU`)  
**Testing:** Visual testing via dev server only - no automated test suite  
**Language:** All UI and data labels in French ("Villageois", "Loups", "Camp victorieux")  
**Data Source Gating:** BR tab and some subtabs hidden when `dataSource === 'discord'`

## Adding Features Workflow

1. **New Statistics:** Create computation function in `utils/` → use base hook pattern → add to menu in `App.tsx`
2. **Data Access:** Use `useGameLogData()` for new features, legacy hooks for backward compatibility
3. **Navigation:** Integrate with `NavigationContext` for chart drill-downs
4. **Settings:** Add to `SettingsState` interface → ensure localStorage persistence
5. **Player Highlighting:** Extend chart data types with `isHighlightedAddition` for special inclusion logic
6. **Rankings:** Add processor in `src/hooks/utils/RankingProcessors/` → integrate in `scripts/data-sync/generate-rankings.js` → client consumes pre-calculated JSON

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

### Chart-Specific Filter Persistence Pattern
```typescript
// Charts with local filters should persist state via NavigationContext for Ranking navigation
const { navigationState, updateNavigationState } = useNavigation();

// Initialize from navigationState with fallback to defaults
const [minGames, setMinGames] = useState<number>(
  navigationState.chartNameState?.minGames || 5
);
const [campFilter, setCampFilter] = useState<CampFilter>(
  (navigationState.chartNameState?.campFilter as CampFilter) || 'all'
);

// Sync local state back to navigationState when it changes
useEffect(() => {
  const currentNavState = navigationState.chartNameState;
  if (!currentNavState || 
      currentNavState.minGames !== minGames ||
      currentNavState.campFilter !== campFilter) {
    updateNavigationState({
      chartNameState: { minGames, campFilter }
    });
  }
}, [minGames, campFilter, updateNavigationState]);
```

**Critical:** Each chart with local filters should have its own state key in `NavigationState` (e.g., `lootStatsState`, `deathStatisticsState`) to preserve filter values when navigating from Rankings.

## Integration Points

**GitHub Actions:** 3 workflows — `update-data.yml` (main sync), `update-discorddata.yml` (discord sync), `update-rankings-titles.yml` (weekly generation)  
**Data Fetching:** `src/utils/dataPath.ts` provides `fetchDataFile()` / `fetchOptionalDataFile()` for centralized, data-source-aware data loading  
**URL Management:** `src/utils/urlManager.ts` provides `parseUrlState()`, `replaceUrlState()`, `mergeUrlState()` with custom `urlchange` events  
**Logging:** `src/utils/logger.ts` — environment-aware logging (`error()` always, `warn()`/`info()`/`debug()` dev-only) + `handleFetchError()` + `validateData()`  
**Build Output:** GitHub Pages serves from `/docs` with custom domain (base path `/`)  
**Error Handling:** Static file loading only, graceful degradation via `fetchOptionalDataFile()` for missing data

## Development Patterns

### Error Boundary Pattern
```typescript
// All chart components use consistent error handling
if (isLoading) return <div>Chargement...</div>;
if (error) return <div>Erreur: {error}</div>;
if (!data) return <div>Aucune donnée disponible</div>;
```

### URL Parameters & Sharing
Centralized URL management via `urlManager.ts` with `mergeUrlState('push')` for navigation and `mergeUrlState('replace')` for silent updates. Settings priority: URL params > localStorage > defaults. `NavigationContext` handles `popstate` + custom `urlchange` events for browser back/forward. See `URL_FILTERS.md` for parameter details.

### Data Filtering Architecture
**Independent Filters:** System allows combining multiple filter types simultaneously (gameType, dateRange, mapName, playerFilter)  
**Filter Application:** Automatic filtering in `useCombinedFilteredRawData()` respects all `SettingsContext` state  
**URL Compatibility:** Legacy URL parameters automatically converted to independent filters for backward compatibility

**Filter Scope Pattern:** When a chart displays multiple views (e.g., total vs. normalized metrics), filters can have different scopes:
```typescript
// Example: Total chart shows all players, normalized chart applies minimum games filter
const totalLootData = useMemo(() => {
  // No minGames filter - shows all players
  return stats.sort((a, b) => b.totalLoot - a.totalLoot).slice(0, 20);
}, [lootData, settings.highlightedPlayer]); // Note: minGames NOT in dependency array

const normalizedLootData = useMemo(() => {
  // Apply minGames filter for normalized metrics
  const eligible = stats.filter(p => p.gamesPlayed >= minGames);
  return eligible.sort((a, b) => b.lootPer60Min - a.lootPer60Min).slice(0, 20);
}, [lootData, minGames, settings.highlightedPlayer]);
```
**Pattern:** Place filters only above the charts they apply to. Global filters (camp, date range) should be in `SettingsContext`, chart-specific filters (min games for specific views) should be local state persisted in `NavigationContext`.

### Theme System
Uses CSS custom properties (`--accent-primary`, `--chart-primary`) defined in `src/styles/theme/variables.css`. Theme-adjusted colors via `useThemeAdjustedColors()` hook from `src/utils/themeColors.ts` for consistent chart styling across light/dark themes. CSS organized in `src/styles/` with `base/`, `theme/`, `components/`, `utilities/` subdirectories.

### Chart Constants
Centralized in `src/config/chartConstants.ts`:
- `CHART_LIMITS.TOP_10/15/20/25/30` for ranking cutoffs
- `MIN_GAMES_DEFAULTS.STANDARD(5)/MEDIUM(10)/HIGH(15)` etc. for minimum game thresholds
- `MIN_GAMES_OPTIONS` arrays for dropdown menus (COMPACT, STANDARD, EXTENDED)

## Critical Debugging & Data Consistency

### Player Identification Pitfalls
**CRITICAL:** Never group or compare players by `Username` alone - use `playerIdentification.ts`:

```typescript
// ❌ WRONG: Creates duplicate entries for same player
gameData.forEach(game => {
  game.PlayerStats.forEach(player => {
    const key = player.Username; // "Johnny" vs "[S.P.Q.R] Johnny Guitouze" = 2 keys
    playerMap.set(key, stats);
  });
});

// ✅ CORRECT: Single entry per player using Steam ID
import { getPlayerId, getCanonicalPlayerName } from '../utils/playerIdentification';
gameData.forEach(game => {
  game.PlayerStats.forEach(player => {
    const key = getPlayerId(player); // Same Steam ID = 1 key
    const name = getCanonicalPlayerName(player); // Canonical name for display
    playerMap.set(key, { ...stats, displayName: name });
  });
});
```

### Data Source Consistency Pattern
**IMPORTANT:** Always use the same data source for related calculations to avoid mismatched statistics. Example from `DeathsView.tsx`:

```typescript
// ❌ WRONG: Using different data sources creates inconsistencies
const deathsFromDeathStats = deathStats.playerDeathStats; // Pre-calculated
const gamesFromRawData = calculateGamesFromGameLog(gameLogData); // Manual calculation

// ✅ CORRECT: Use consistent data source
const allPlayersWithStats = {};
deathStats.playerDeathStats.forEach((player) => {
  const gamesPlayed = playerGameCounts[player.playerName] || 0;
  allPlayersWithStats[player.playerName] = {
    totalDeaths: player.totalDeaths,    // From same source
    gamesPlayed: gamesPlayed,           // From consistent game count
    survivalRate: (gamesPlayed - player.totalDeaths) / gamesPlayed * 100
  };
});
```

### Common Data Filtering Pitfalls
1. **Camp Filtering:** Use `getPlayerCampFromRole(player.MainRoleInitial)` consistently - not `SecondaryRole`
2. **Game Counting:** Apply the same camp filter logic for both death counting and game counting to avoid rate calculation errors
3. **Player Lookup:** Always try Steam ID lookup first, then fall back to name matching for compatibility with both data sources

## Rankings System Architecture

**Server-Side Generation:** `scripts/data-sync/generate-rankings.js` processes `gameLog.json` → creates `playerRankings.json`  
**Client-Side Consumption:** `usePlayerRankings()` hook loads pre-calculated Rankings, falling back to real-time calculation for missing data  
**Ranking Structure:** Each player has `allGamesRankings` + `moddedOnlyRankings` arrays with rank, value, and navigation metadata  
**Performance:** Pre-calculation eliminates client-side ranking computation for 70+ players across 500+ games

### Ranking Processor Pattern
```typescript
// Server-side JavaScript (in data-sync/)
export function processNewRankings(playerStats, playerName, suffix) {
  const Rankings = [];
  // Ranking logic here
  return Rankings;
}

// Client-side TypeScript (in src/hooks/utils/RankingProcessors/)  
export function processNewRankings(playerStats: PlayerStat[], playerName: string, suffix: string): Ranking[] {
  // Same logic, TypeScript types
}
```

**Integration:** Add new processors to both `generate-rankings.js` and `usePlayerRankings.tsx` → Rankings auto-generate during data sync

### Ranking Categories Implemented
- **General:** Participations, win rates (good/bad Rankings)  
- **History:** Map-specific performance (Village 🏘️, Château 🏰 Rankings)
- **Comparison:** Player relationship stats, wolf/lover pairing performance
- **Kills:** Death statistics, survival rates, kill counts by role
- **Series:** Consecutive wins, camp streaks, role performance chains

## Player Titles System Architecture

**Server-Side Generation:** `scripts/data-sync/generate-titles.js` processes modded games only → creates `playerTitles.json` with unique primary titles  
**Client-Side Display:** `PlayerTitlesDisplay.tsx` shows sorted titles with crown on primary, ownership info, and priority explanations  
**Uniqueness System:** Each title ideally assigned to only one player as primary - player with strongest claim wins  
**Performance:** Pre-calculation with percentile-based distribution ensures fair title assignment across 25+ game minimum

### Title Generation Critical Patterns

**Claim Strength Algorithm (CRITICAL):**
```javascript
// Bad Rankings (EXTREME_LOW, LOW, BELOW_AVERAGE): lower percentile = stronger claim
// Good Rankings (EXTREME_HIGH, HIGH, ABOVE_AVERAGE): higher percentile = stronger claim
const isBadRanking = ['EXTREME_LOW', 'LOW', 'BELOW_AVERAGE'].includes(title.category);
const adjustedPercentile = isBadRanking ? (100 - percentile) : percentile;
const claimStrength = (priority * 1000) + (adjustedPercentile * 10) - titleIndex;
```

**Three-Pass Assignment System:**
1. **First Pass:** Assign unique primary titles to players with strongest claims (highest claimStrength)
2. **Second Pass:** Give remaining players their best available title (even if already used by someone else)
3. **Third Pass:** Add `primaryOwner` field to titles owned by other players for UI display

**Display Pattern:**
```typescript
// Titles sorted by priority (highest first) to explain selection
const sortedTitles = [...playerTitles.titles].sort((a, b) => (b.priority || 0) - (a.priority || 0));
const isPrimary = playerTitles.primaryTitle?.id === title.id; // Crown on primary
// Show ownership: {!isPrimary && title.primaryOwner && <div>{title.primaryOwner}</div>}
```

**Title Types:**
- **Basic:** Single stat-based (win rate, loot, survival, etc.)
- **Combination:** Multiple stat thresholds (e.g., "Le·a Détective" = high win + high voting accuracy + high talking)
- **Role:** Uncontrollable role assignment frequency (e.g., "L'Agneau" = frequent Amoureux)
- **Camp Balance:** Synthetic stat for balanced/specialist camp performance

**Percentile Thresholds:**
```javascript
EXTREME_HIGH: 85,   // Top 15%
HIGH: 65,           // Top 35%
ABOVE_AVERAGE: 55,  // Top 45%
AVERAGE: 48-52,
BELOW_AVERAGE: 45,  // Bottom 55%
LOW: 35,            // Bottom 35%
EXTREME_LOW: 15     // Bottom 15%
```

**Key Files:**
- `scripts/data-sync/generate-titles.js` - Server-side generation with claim strength logic
- `scripts/data-sync/shared/titleDefinitions.js` - Title definitions and combinations
- `src/components/playerselection/PlayerTitlesDisplay.tsx` - Client display component
- `src/hooks/usePlayerTitles.tsx` - Data loading hook with TypeScript interfaces

## Voting Statistics System

**New Feature:** Comprehensive voting behavior analysis with multiple views and metrics.

### Voting Analytics Components
```typescript
// Located in: src/components/playerstats/Voting/
VotingStatisticsChart.tsx       // Main voting dashboard with multiple views
VotingOverviewView.tsx          // Overall statistics with top performers
VotingBehaviorView.tsx          // Aggressiveness analysis
VotingAccuracyView.tsx          // Camp targeting accuracy
TargetedPlayersView.tsx         // Survival rates when targeted
```

**Core Utilities:** `src/utils/votingStatsUtils.ts` provides `calculateAggregatedVotingStats()` for cross-game analysis

**Key Metrics:**
- **Aggressiveness Score:** `votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7)` - measures voting activity
- **Accuracy Rate:** `(votesForEnemyCamp / totalVotes) * 100` - targeting correctness
- **Survival Rate:** `((timesTargeted - eliminatedByVote) / timesTargeted) * 100` - resilience when targeted

**Data Requirements:** Uses `PlayerStat.Votes` array with `Day` (meeting number), `Target`, and `Date` fields from `gameLog.json`

## Player Selection System

**New Feature (2024):** Centralized player search and selection interface with integrated Rankings display

### Player Selection Architecture
```typescript
// Located in: src/components/playerselection/
PlayerSelectionPage.tsx     // Main interface with search and player cards
RankingsDisplay.tsx     // Interactive Ranking cards with navigation
PlayerSelectionPage.css     // Styled components with animations
```

**Key Features:** Real-time player search, Ranking filtering (all games vs. modded), clickable Rankings that navigate to relevant statistics with proper filter states, player highlighting persistence across all charts.

**Data Source:** `usePreCalculatedPlayerRankings()` loads from `/data/playerRankings.json`

### Ranking Navigation Pattern
```typescript
// Rankings are clickable and automatically set appropriate filters
const handleRankingClick = (Ranking: Ranking, event: React.MouseEvent) => {
  // Reset filters, preserve highlighted player, navigate to specific chart
  clearNavigation();
  updateSettings({ /* appropriate filters for Ranking */ });
  navigateToTab(Ranking.redirectTo.tab);
}
```

**Critical:** Rankings automatically configure filters (modded games, map filters, minimum games) based on the Ranking context when clicked.

## Changelog System

**Version Management:** `src/config/version.ts` contains `APP_VERSION` constant and `CHANGELOG` array  
**Display Component:** `ChangelogPage.tsx` provides interactive changelog with navigation to specific features  
**Entry Format:** Each changelog entry can include clickable links that navigate to specific tabs with proper filter/state configuration

```typescript
// Changelog entry with navigation
{
  version: 'v1.5.1',
  date: '27/11/2025',
  description: 'Feature description',
  link: {
    mainTab: 'playerSelection',
    subTab: 'heatmap',
    text: 'Link text',
    navigationState: { selectedPlayerSelectionView: 'deathmap' } // Optional state
  }
}
```

**Integration:** Changelog button in `App.tsx` footer, version display persists across all pages

## Battle Royale Subsystem

**Separate data pipeline** from main gameLog — uses `rawBRData.json` via `useRawBRData()` hook with `fetchOptionalDataFile()` (graceful null for Discord).  
**Components:** `src/components/brstats/` — `BRParticipationsChart`, `BRWinRateChart`, `BRKillsStatsChart`, `BRMiniChart`  
**Filtering:** Own filter system via `useFilteredRawBRData()`, Mini BR (2-5 players) filtered from regular stats  
**Data source:** Only available for main team (`dataSource === 'main'`), BR tab hidden for Discord

## Clips System

**Embedded in game data:** `GameLogEntry.Clips[]` array stores video clips per game  
**Components:** `src/components/clips/ClipsPage.tsx` + `src/components/common/ClipViewer.tsx` (Twitch embed modal)  
**Hooks:** `useClips.ts` provides `useAllClips()` and `usePlayerClips(playerName)`  
**Utilities:** `src/utils/clipUtils.ts` handles Twitch embed URL conversion and display name resolution

## Death Types System

**Centralized constants:** `src/types/deathTypes.ts` provides type-safe `DEATH_TYPES` (25+ types) with `DeathType` union type  
**Categories:** `DEATH_TYPE_CATEGORIES` groups types (VOTING, WOLF_KILLS, CREATURE_KILLS, HUNTER_KILLS, etc.)  
**Dual use:** Also exported as `DeathTypeCode` in `src/utils/datasyncExport.js` for Node.js compatibility in data-sync scripts

## Integration Points & External Systems

**GitHub Actions:** 
  - `.github/workflows/update-data.yml` - Main team game data sync (Mon/Tue/Thu at 8 PM UTC)
  - `.github/workflows/update-discorddata.yml` - Discord team game data sync (Mon/Thu/Sat at 4 AM UTC)
  - `.github/workflows/update-rankings-titles.yml` - Weekly Rankings & titles generation (Sunday at 6 AM UTC)
  - Manual triggers via workflow_dispatch with `full_sync` option for data sync, `force_recalculation` for Rankings/titles
  
**Data Sources:**
  - Primary: AWS S3 bucket game logs (via `fetch-data-unified.js`)
  - Legacy: Google Sheets API (via `fetch-data.js` - deprecated)
  - Multi-team support via `scripts/data-sync/shared/data-sources.js` configuration
  
**Build Output:** GitHub Pages serves from `/docs` with custom domain (base path `/`)  
**Error Handling:** Static file loading only, graceful degradation for missing data

## Data Sync Scripts Architecture

**Unified AWS Sync (`fetch-data-unified.js`):**
```bash
# Supports multiple teams via configuration (game data only, no Rankings)
node fetch-data-unified.js main      # Main team to /data
node fetch-data-unified.js discord   # Discord team to /data/discord
```

**Rankings & Titles Generation:**
```bash
# Generate Rankings (supports incremental updates via cache)
node generate-rankings.js main           # Incremental update
node generate-rankings.js discord -f     # Force full recalculation

# Generate titles
node generate-titles.js main
node generate-titles.js discord
```

**Configuration Pattern (`shared/data-sources.js`):**
```javascript
export const DATA_SOURCES = {
  teamKey: {
    name: 'Team Name',
    outputDir: '../../data/teamname',
    gameFilter: (gameId) => gameId.startsWith('Prefix-'),
    generateJoueurs: true,
    modVersionLabel: 'Label for mod detection',
    indexDescription: 'Description for index.json'
  }
};
```

**Adding New Teams:** Edit `shared/data-sources.js` → run sync script with team key → data outputs to configured directory
