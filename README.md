# Stats Lycans v2

A comprehensive React + TypeScript dashboard for visualizing werewolf game statistics from in-game data logs and manual data via google sheet doc (thanks to Soldat Flippy and AmberAerin). Features advanced player analytics, achievements system, voting behavior analysis, and interactive data exploration with full URL-based state sharing.

## Table of Contents

- [Purpose](#purpose)
- [Features](#features)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Development Workflow](#development-workflow)
- [Data Sync](#data-sync)
- [Key Technologies](#key-technologies)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Purpose

Stats Lycans v2 provides comprehensive statistical analysis and visualization for werewolf game sessions. The application processes detailed game logs to generate player achievements, track performance metrics across multiple dimensions, and enable deep-dive analysis through interactive charts with sophisticated filtering and navigation.

## Features

### Core Analytics
- **Player Statistics Dashboard:** Win rates, participation counts, role performance, camp-specific metrics
- **Achievements System:** 70+ unique achievements across multiple categories (General, History, Comparison, Kills, Series)
- **Voting Behavior Analysis:** Aggressiveness scoring, targeting accuracy, survival rates when targeted
- **Death Analytics:** Death type distribution, location heatmaps, killer statistics, survival rates
- **Game Details View:** Comprehensive per-game breakdowns with player lineups, roles, and outcomes
- **Battle Royale Stats:** Dedicated BR mode analytics with kills, placements, and win rates

### Advanced Features
- **Player Selection Interface:** Centralized player search with integrated achievement displays and clickable navigation
- **Multi-Source Data Support:** Main team and Discord team data with automatic source switching
- **URL-Based State Sharing:** Complete dashboard state serialization for shareable links
- **Interactive Drill-Down Navigation:** Click any player in any chart to explore their specific statistics
- **Player Highlighting System:** Persistent player highlighting across all visualizations
- **Smart Filtering:** Independent filters for game type, date ranges, maps, specific players, and camp-based analysis
- **Fullscreen Chart Mode:** Expand any chart for detailed examination
- **Theme Support:** Light/dark themes with theme-aware chart colors
- **Responsive Design:** Optimized for desktop and tablet viewing

## Architecture

### Frontend
- **Framework:** React 19 + TypeScript with Vite build system
- **State Management:** Triple context system (SettingsContext + NavigationContext + FullscreenContext)
- **Charts:** Recharts library with custom theme integration
- **Styling:** CSS custom properties with domain-based component structure

### Data Pipeline
- **Prbash
   git clone https://github.com/Maalch/stats-lycansv2.git
   cd stats-lycansv2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Data files:**
   - Data files are included in the repository under `/data` and `/data/discord`
   - No API configuration required for local development
   - Static JSON files are automatically copied during build process
- **Manual Syn Workflow

### Basic Commands
```bash
npm run dev              # Start dev server + copy data to public/data/
npm run build            # TypeScript check + Vite build + copy data to docs/data/
npm run preview          # Preview production build locally
```

### Data Sync Commands
```bash
npm run sync-data-aws           # AWS sync for main team (recommended)
npm run sync-data-discord       # AWS sync for Discord team
npm run sync-data               # Legacy Google Sheets sync (deprecated)
npm run generate-achievements   # Standalone achievements generation
```

### Development Patterns

#### Adding New Statistics
1. Create computation function in `src/utils/`
2. Use base hook pattern: `usePlayerStatsBase()` or `useGameStatsBase()`
3. Create chart component with error handling and loading states
4. Add to menu hierarchy in `App.tsx`
5. Iata Sync

### Automated Sync (GitHub Actions)
- **Schedule:** Monday, Tuesday, Thursday at 8 PM UTC (post-game sync)
- **Workflows:** 
  -Key Technologies

- **React 19** — Modern component architecture with hooks
- **TypeScript** — Type-safe development with strict mode
- **Vite** — Fast development server and optimized production builds
- **Recharts** — Declarative chart library with custom theming
- **CSS Custom Properties** — Theme system with light/dark mode support

## Project Structure

```
stats-lycansv2/
├── src/
│   ├── components/          # React components by domain
│   │   ├── generalstats/   # Overall game statistics
│   │   ├── playerstats/    # Player-specific analytics
│   │   ├── gamedetails/    # Per-game breakdowns
│   │   ├── playerselection/ # Player search & achievements
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
│   ├── playerAchievements.json  # Pre-calculated achievements
│   └── discord/            # Discord team data
├── scripts/
│   └── data-sync/          # Data synchronization scripts
│       ├── fetch-data-unified.js    # AWS sync (primary)
│       ├── generate-achievements.js # Achievement genera

### Development Guidelines
1. Follow the established architectural patterns (base hooks, context system)
2. Use `roleUtils.ts` for all role-based logic (never compare roles directly)
3. Use `playerIdentification.ts` for player matching (never use raw usernames)
4. Add comprehensive error handling and loading states
5. Integrate with NavigationContext for drill-down support
6. Test across both main and discord data sources

### Adding Features
See the detailed workflow in [.github/copilot-instructions.md](.github/copilot-instructions.md) for:
- Adding new statistics and charts
- Creating achievement processors
- Integrating with the navigation system
- Player highlighting patterns

## Key Documentation

- **[NAVIGATION.md](NAVIGATION.md)** — Navigation system architecture
- **[URL_FILTERS.md](URL_FILTERS.md)** — URL parameter documentation
- **[VOTING_STATISTICS.md](VOTING_STATISTICS.md)** — Voting analytics system
- **[CSS_ARCHITECTURE_VISUAL.md](CSS_ARCHITECTURE_VISUAL.md)** — Visual styling guide
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — Complete development guide

## Acknowledgements

- **Game Data:** In-game logging system by SoldatFlippy
- **Data Curation:** AmberAerin and community contributors
- **Technologies:** [Vite](https://vitejs.dev/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Recharts](https://recharts.org/)

## License

Distributed under the MIT License
- Map selections and camp filters
- Navigation state preservation

See [URL_FILTERS.md](URL_FILTERS.md) for complete documentation.

### Local Storage
Settings automatically persist to localStorage with URL parameter override capability.

## Deployment

### GitHub Pages
- Production builds output to the `docs/` folder
- Configure GitHub repository settings to serve from `/docs` directory on `main` branch
- Custom domain support via `docs/CNAME` file

### Build Process
1. TypeScript compilation check
2. Vite build with production optimizations
3. Automatic data file copying to `docs/data/`
4. Static asset generation with hashed filenames
export function useNewStatsFromRaw() {
  return usePlayerStatsBase((gameData) => {
    return computeNewStats(gameData);
  });
}
```

#### Component Pattern
```typescript
import { FullscreenChart } from '../common/FullscreenChart';

export function NewStatsChart() {
  const { data, isLoading, error } = useNewStatsFromRaw();
  
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!data) return <div>Aucune donnée disponible</div>;
  
  return (
    <FullscreenChart title="Chart Title">
      {/* Chart implementation */}
    </FullscreenChart>
  );
}
```
   ```sh
   git clone https://github.com/Maalch/stats-lycansv2.git
   cd stats-lycansv2
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure Google Sheets API:**
   - Set up credentials and permissions in the Google Cloud Console.
   - Update the environment variables or configuration files as required to enable API access.

## Development

- `npm run dev` — Start the local development server.
- `npm run build` — Build the app for production (outputs to `docs`).
- `npm run preview` — Preview the production build locally.

## Deployment

- Production builds are output to the `docs` folder.
- In your GitHub repository settings, configure GitHub Pages to serve from the `/docs` directory on the `main` branch.

## Configuration

You can further enhance code quality by using recommended ESLint plugins:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues) or open a pull request.

## Acknowledgements

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## License

Distributed under the MIT License. See `LICENSE` for more information.
