

# Copilot Instructions for `stats-lycansv2`

A Vite-based React + TypeScript dashboard for visualizing werewolf game statistics. Recently migrated from multiple JSON files to a unified `gameLog.json` structure while maintaining backward compatibility. Features a sophisticated achievements system with server-side pre-calculation and comprehensive player highlighting across all charts.

## Architecture Overview

**Frontend:** React 19 + TypeScript, Vite, Recharts for charts, triple context system (`SettingsContext` + `FullscreenContext` + `NavigationContext`)  
**Data Pipeline:** Unified `gameLog.json` with transformation layer for backward compatibility + server-side achievements pre-calculation  
**Build System:** Vite outputs to `docs/` for GitHub Pages, inline Node.js scripts copy data files  
**Data Processing:** Hybrid approach - optimized base hook pattern for real-time stats + pre-calculated achievements JSON for performance  
**URL Sharing:** Settings persist via localStorage + URL parameters for shareable dashboard states (see `URL_FILTERS.md`)
**Achievements System:** Server-side generation in `scripts/data-sync/` creates `playerAchievements.json` consumed by client
**Player Selection:** Dedicated page for player search, selection, and achievement display with interactive navigation

## Critical Workflows

```bash
npm run dev                     # Dev server + copy data to public/data/
npm run build                   # TypeScript check + Vite build + copy data to docs/data/
npm run sync-data-aws           # AWS sync for main team (recommended)
npm run sync-data-discord       # AWS sync for Discord team
npm run sync-data               # Legacy Google Sheets sync
npm run generate-achievements   # Standalone achievements generation + copy to public/
```

**Build Pipeline:** Inline Node.js scripts in `package.json` copy `/data` → `public/data/` (dev) or `docs/data/` (prod)  
**Data Sync:** 
  - Primary: AWS-based sync via `fetch-data-unified.js` (supports multiple teams via `shared/data-sources.js` config)
  - Legacy: Google Sheets sync via `fetch-data.js` (deprecated but maintained for backward compatibility)
  - GitHub Actions runs Mon/Tue/Thu at 8 PM UTC (post-game sync), manually triggerable via workflow_dispatch
  - Auto-generates achievements + joueurs.json for configured teams
  
**Environment:** No env vars needed locally - all data from static files. `STATS_LIST_URL` (AWS) and `LYCANS_API_BASE` (Google Sheets) secrets on GitHub Actions only.  
**Achievement Generation:** `scripts/data-sync/generate-achievements.js` processes all players, creates ranked lists, supports multiple teams via config

## Data Architecture Migration (RECENT CHANGE)

**New Primary Source:** `gameLog.json` - unified structure with nested `PlayerStats` arrays  
**Backward Compatibility:** `useCombinedRawData.tsx` transforms new structure to legacy interfaces  
**Legacy Interfaces:** `RawGameData`, `RawRoleData`, `RawPonceData` still work unchanged  
**Data Evolution:** Recent format includes detailed vote tracking, color assignments, enhanced death metadata, and comprehensive player stats per game

### Key Data Interfaces
```typescript
// New unified structure (current format)
interface GameLogEntry {
  Id: string; DisplayedId: string; StartDate: string; EndDate: string; MapName: string;
  HarvestGoal: number; HarvestDone: number; EndTiming: string | null;
  Version: string; Modded: boolean; PlayerStats: PlayerStat[];
}
interface PlayerStat {
  ID?: string | null;         // Steam ID - unique identifier (CRITICAL for player identification)
  Username: string;           // Display name (can vary: "Johnny" vs "[S.P.Q.R] Johnny Guitouze")
  Color?: string; MainRoleInitial: string; MainRoleChanges: RoleChange[];
  Power: string | null; SecondaryRole: string | null; 
  Victorious: boolean; DeathTiming: string | null; DeathDateIrl: string | null;
  DeathPosition: {x: number; y: number; z: number} | null;
  DeathType: string | null; KillerName: string | null;
  Votes: Vote[]; // Array of votes with Target and Date
  SecondsTalkedOutsideMeeting: number; SecondsTalkedDuringMeeting: number; //number of seconds talked in that game
}
interface Vote {
  Target: string; Date: string; // ISO date string when vote was cast
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

**Key Difference:** Main `joueurs.json` uses `SteamID` field (often null) + has social media. Discord `joueurs.json` uses `ID` field (always populated) + no social media.

**Pattern for Player Lookup:**
```typescript
// Try Steam ID first, fall back to name matching
let playerInfo = joueursData?.Players?.find(p => p.ID === playerId);
if (!playerInfo) {
  playerInfo = joueursData?.Players?.find(p => p.Joueur === displayName);
}
```

### Game Domain Rules
**Camps:** Villageois, Loups, solo roles (`Amoureux`, `Idiot du Village`, `Agent`, etc.)  
**Special Cases:** `Traître` and `Louveteau` works with Loups, `Amoureux` always 2 players (win/lose together)  
**Victory Logic:** Pure role-based - solo roles win as their role name, not grouped into Villageois

## Project-Specific Conventions

**Component Structure:** Domain-based folders (`generalstats/`, `playerstats/`, `gamedetails/`, `settings/`, `playerselection/`)  
**Menu System:** Hierarchical tabs (`MAIN_TABS` → `*_STATS_MENU`) in `App.tsx` with Player Selection as primary tab  
**Testing:** Visual testing via dev server only - no automated test suite  
**Language:** All UI and data labels in French ("Villageois", "Loups", "Camp victorieux")

## Adding Features Workflow

1. **New Statistics:** Create computation function in `utils/` → use base hook pattern → add to menu in `App.tsx`
2. **Data Access:** Use `useGameLogData()` for new features, legacy hooks for backward compatibility
3. **Navigation:** Integrate with `NavigationContext` for chart drill-downs
4. **Settings:** Add to `SettingsState` interface → ensure localStorage persistence
5. **Player Highlighting:** Extend chart data types with `isHighlightedAddition` for special inclusion logic
6. **Achievements:** Add processor in `src/hooks/utils/achievementProcessors/` → integrate in `scripts/data-sync/generate-achievements.js` → client consumes pre-calculated JSON

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

## Achievements System Architecture

**Server-Side Generation:** `scripts/data-sync/generate-achievements.js` processes `gameLog.json` → creates `playerAchievements.json`  
**Client-Side Consumption:** `usePlayerAchievements()` hook loads pre-calculated achievements, falling back to real-time calculation for missing data  
**Achievement Structure:** Each player has `allGamesAchievements` + `moddedOnlyAchievements` arrays with rank, value, and navigation metadata  
**Performance:** Pre-calculation eliminates client-side ranking computation for 70+ players across 500+ games

### Achievement Processor Pattern
```typescript
// Server-side JavaScript (in data-sync/)
export function processNewAchievements(playerStats, playerName, suffix) {
  const achievements = [];
  // Ranking logic here
  return achievements;
}

// Client-side TypeScript (in src/hooks/utils/achievementProcessors/)  
export function processNewAchievements(playerStats: PlayerStat[], playerName: string, suffix: string): Achievement[] {
  // Same logic, TypeScript types
}
```

**Integration:** Add new processors to both `generate-achievements.js` and `usePlayerAchievements.tsx` → achievements auto-generate during data sync

### Achievement Categories Implemented
- **General:** Participations, win rates (good/bad achievements)  
- **History:** Map-specific performance (Village 🏘️, Château 🏰 achievements)
- **Comparison:** Player relationship stats, wolf/lover pairing performance
- **Kills:** Death statistics, survival rates, kill counts by role
- **Series:** Consecutive wins, camp streaks, role performance chains

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

**Data Requirements:** Uses `PlayerStat.Votes` array with `Target` and `Date` fields from `gameLog.json`

## Player Selection System

**New Feature (2024):** Centralized player search and selection interface with integrated achievements display

### Player Selection Architecture
```typescript
// Located in: src/components/playerselection/
PlayerSelectionPage.tsx     // Main interface with search and player cards
AchievementsDisplay.tsx     // Interactive achievement cards with navigation
PlayerSelectionPage.css     // Styled components with animations
```

**Key Features:** Real-time player search, achievement filtering (all games vs. modded), clickable achievements that navigate to relevant statistics with proper filter states, player highlighting persistence across all charts.

**Data Source:** `usePreCalculatedPlayerAchievements()` loads from `/data/playerAchievements.json`

### Achievement Navigation Pattern
```typescript
// Achievements are clickable and automatically set appropriate filters
const handleAchievementClick = (achievement: Achievement, event: React.MouseEvent) => {
  // Reset filters, preserve highlighted player, navigate to specific chart
  clearNavigation();
  updateSettings({ /* appropriate filters for achievement */ });
  navigateToTab(achievement.redirectTo.tab);
}
```

**Critical:** Achievements automatically configure filters (modded games, map filters, minimum games) based on the achievement context when clicked.

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

## Integration Points & External Systems

**GitHub Actions:** 
  - `.github/workflows/update-data.yml` - Main team AWS sync (Mon/Tue/Thu at 8 PM UTC)
  - `.github/workflows/update-discorddata.yml` - Discord team AWS sync
  - Manual triggers via workflow_dispatch with `full_sync` and `force_achievements_recalc` options
  
**Data Sources:**
  - Primary: AWS S3 bucket game logs (via `fetch-data-unified.js`)
  - Legacy: Google Sheets API (via `fetch-data.js` - deprecated)
  - Multi-team support via `scripts/data-sync/shared/data-sources.js` configuration
  
**Build Output:** GitHub Pages serves from `/docs` with custom domain (base path `/`)  
**Error Handling:** Static file loading only, graceful degradation for missing data

## Data Sync Scripts Architecture

**Unified AWS Sync (`fetch-data-unified.js`):**
```bash
# Supports multiple teams via configuration
node fetch-data-unified.js main      # Main team to /data
node fetch-data-unified.js discord   # Discord team to /data/discord
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
