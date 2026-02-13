# Stats Lycans v2

A comprehensive React + TypeScript dashboard for visualizing werewolf game statistics. Features advanced player analytics, Rankings system, voting behavior analysis, and interactive data exploration with full URL-based state sharing.

Built with in-game data logging (thanks to SoldatFlippy) and manual data curation (thanks to AmberAerin).

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Sync](#data-sync)
- [Key Documentation](#key-documentation)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Features

### Core Analytics
- **Player Statistics Dashboard:** Win rates, participation counts, role performance, camp-specific metrics
- **Rankings System:** 70+ unique Rankings across multiple categories (General, History, Comparison, Kills, Series)
- **Voting Behavior Analysis:** Aggressiveness scoring, targeting accuracy, survival rates when targeted
- **Death Analytics:** Death type distribution, location heatmaps, killer statistics, survival rates
- **Game Details View:** Comprehensive per-game breakdowns with player lineups, roles, and outcomes
- **Battle Royale Stats:** Dedicated BR mode analytics with kills, placements, and win rates

### Advanced Features
- **Player Selection Interface:** Centralized player search with integrated Ranking displays and clickable navigation
- **Multi-Source Data Support:** Main team and Discord team data with automatic source switching
- **URL-Based State Sharing:** Complete dashboard state serialization for shareable links
- **Interactive Drill-Down Navigation:** Click any player in any chart to explore their specific statistics
- **Player Highlighting System:** Persistent player highlighting across all visualizations
- **Smart Filtering:** Independent filters for game type, date ranges, maps, specific players, and camp-based analysis
- **Fullscreen Chart Mode:** Expand any chart for detailed examination
- **Theme Support:** Light/dark themes with theme-aware chart colors
- **Responsive Design:** Optimized for desktop and tablet viewing

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Maalch/stats-lycansv2.git
cd stats-lycansv2

# Install dependencies
npm install

# Start development server
npm run dev
```

Data files are included in the repository under `/data` and `/data/discord`. No API configuration required for local development.

## Development

### Available Commands

**Development:**
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Production build (outputs to docs/)
npm run preview          # Preview production build locally
```

**Data Sync:**
```bash
npm run sync-data-aws           # AWS sync for main team (recommended)
npm run sync-data-discord       # AWS sync for Discord team
npm run sync-data               # Legacy Google Sheets sync (deprecated)
npm run generate-Rankings   # Standalone Rankings generation
```

### Adding New Statistics

1. **Create computation function** in `src/utils/`
2. **Use base hook pattern:**
   ```typescript
   export function useNewStatsFromRaw() {
     return usePlayerStatsBase((gameData) => {
       return computeNewStats(gameData);
     });
   }
   ```
3. **Create chart component** with error handling and loading states
4. **Add to menu hierarchy** in `App.tsx`
5. **Integrate with NavigationContext** for drill-down support

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed patterns.

## Architecture

### Automated Sync (GitHub Actions)

- **Schedule:** Monday, Tuesday, Thursday at 8 PM UTC (post-game sync)
- **Workflows:**
  - `.github/workflows/update-data.yml` — Main team AWS sync
  - `.github/workflows/update-discorddata.yml` — Discord team AWS sync
- **Manual Triggers:** Available via workflow_dispatch with `full_sync` and `force_Rankings_recalc` options

## Architecture

### Frontend Stack
- **React 19** — Modern component architecture with hooks
- **TypeScript** — Type-safe development with strict mode
- **Vite** — Fast development server and optimized builds
- **Recharts** — Declarative charts with custom theming
- **CSS Custom Properties** — Theme system with light/dark mode

### State Management
- **SettingsContext** — Persistent filters via localStorage
- **NavigationContext** — Drill-down navigation with complex filters
- **FullscreenContext** — Chart fullscreen state

### Data Pipeline
- **Primary Source:** `gameLog.json` — Unified game data structure
- **Transformation Layer:** Backward compatibility with legacy interfaces
- **Pre-Calculation:** Server-side Rankings generation for performance
- **Multi-Source Support:** Main team and Discord team data switching

## Project Structure

```
stats-lycansv2/
├── src/
│   ├── components/          # React components by domain
│   │   ├── generalstats/   # Overall game statistics
│   │   ├── playerstats/    # Player-specific analytics
│   │   ├── gamedetails/    # Per-game breakdowns
│   │   ├── playerselection/ # Player search & Rankings
│   │   ├── settings/       # Configuration interface
│   │   └── common/         # Shared components (FullscreenChart, etc.)
│   ├── context/            # React contexts (Settings, Navigation, Fullscreen)
│   ├── hooks/              # Custom hooks with base hook pattern
│   │   └── utils/          # Hook utilities and processors
│   ├── utils/              # Pure computation functions
│   ├── types/              # TypeScript type definitions
│   └── config/             # App configuration (version, changelog)
├── data/                   # Main team data files
│   ├── gameLog.json        # Unified game data
│   ├── joueurs.json        # Player registry
│   ├── playerRankings.json  # Pre-calculated Rankings
│   └── discord/            # Discord team data
├── scripts/
│   └── data-sync/          # Data synchronization scripts
│       ├── fetch-data-unified.js    # AWS sync (primary)
│       └── generate-Rankings.js # Ranking generation
├── docs/                   # Production build output (GitHub Pages)
└── public/                 # Static assets for development
```

## Data Sync

### Automated Sync

GitHub Actions runs data synchronization automatically:
- **Schedule:** Monday, Tuesday, Thursday at 8 PM UTC
- **Main Team:** `.github/workflows/update-data.yml`
- **Discord Team:** `.github/workflows/update-discorddata.yml`
- **Manual Triggers:** Available with `full_sync` and `force_Rankings_recalc` options

### Manual Sync

```bash
# Recommended: AWS-based sync
npm run sync-data-aws        # Main team → /data
npm run sync-data-discord    # Discord team → /data/discord

# Legacy: Google Sheets sync (deprecated)
npm run sync-data

# Standalone Ranking generation
npm run generate-Rankings
```

### Data Sources

- **Primary:** AWS S3 bucket game logs (via `fetch-data-unified.js`)
- **Legacy:** Google Sheets API (via `fetch-data.js` - deprecated)
- **Multi-Team:** Configured in `scripts/data-sync/shared/data-sources.js`

## Deployment

### GitHub Pages Setup

1. Production builds output to the `docs/` folder
2. Configure repository settings: **Settings → Pages → Source: Deploy from branch → Branch: main → Folder: /docs**
3. Custom domain support via `docs/CNAME` file

### Build Process

```bash
npm run build
```

This command:
1. Runs TypeScript compilation check
2. Executes Vite production build
3. Copies data files to `docs/data/`
4. Generates static assets with hashed filenames

## Key Documentation

- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — Complete development guide
- **[NAVIGATION.md](NAVIGATION.md)** — Navigation system architecture
- **[URL_FILTERS.md](URL_FILTERS.md)** — URL parameter documentation
- **[CSS_ARCHITECTURE_VISUAL.md](CSS_ARCHITECTURE_VISUAL.md)** — Visual styling guide

## Contributing

Contributions are welcome! Please:
1. Follow the established architectural patterns (base hooks, context system)
2. Use `roleUtils.ts` for role-based logic (never compare roles directly)
3. Use `playerIdentification.ts` for player matching (never use raw usernames)
4. Add comprehensive error handling and loading states
5. Test across both main and discord data sources

Feel free to check the [issues page](../../issues) or open a pull request.

## Acknowledgements

- **Game Data & Logging:** SoldatFlippy
- **Data Curation:** AmberAerin and community contributors
- **Technologies:** [Vite](https://vitejs.dev/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Recharts](https://recharts.org/)

## License

Distributed under the MIT License. See `LICENSE` for more information.
