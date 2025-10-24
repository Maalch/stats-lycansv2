# Data Sync Optimization

## Overview

The data sync scripts have been reorganized to eliminate code duplication and improve maintainability.

## Changes Made

### Before (3 separate scripts with duplicated code)
- `fetch-data-aws.js` - Main team sync (355 lines)
- `fetch-data-discord.js` - Discord team sync (305 lines) 
- `generate-discord-joueurs.js` - Standalone joueurs generator (105 lines)

**Total: ~765 lines with ~80% duplication**

### After (1 unified script + shared modules)
- `fetch-data-unified.js` - Single configurable sync script (120 lines)
- `shared/sync-utils.js` - Reusable sync functions (300 lines)
- `shared/data-sources.js` - Data source configurations (20 lines)

**Total: ~440 lines, no duplication, easier to maintain**

## New Architecture

```
scripts/data-sync/
├── fetch-data-unified.js      # Main entry point
├── shared/
│   ├── data-sources.js        # Configuration for different teams
│   └── sync-utils.js          # Shared utility functions
├── generate-achievements.js   # Achievement generation (unchanged)
├── compute-stats.js           # Statistics computation (unchanged)
└── processors/                # Achievement processors (unchanged)
```

## Usage

### Sync Main Team Data
```bash
npm run sync-data-aws
# or
cd scripts/data-sync && node fetch-data-unified.js main
```

### Sync Discord Team Data
```bash
npm run sync-data-discord
# or
cd scripts/data-sync && node fetch-data-unified.js discord
```

### Adding a New Data Source

1. Edit `shared/data-sources.js`:
```javascript
export const DATA_SOURCES = {
  // ... existing sources ...
  
  newTeam: {
    name: 'New Team',
    outputDir: '../../data/newteam',
    gameFilter: (gameId) => gameId.startsWith('NewTeam-'),
    generateJoueurs: true,
    modVersionLabel: 'New Team - Multiple AWS Versions',
    indexDescription: 'Game logs for New Team.'
  }
};
```

2. Add npm script to `package.json`:
```json
"sync-data-newteam": "cd scripts/data-sync && npm install && node fetch-data-unified.js newteam"
```

3. Run the sync:
```bash
npm run sync-data-newteam
```

## Benefits

✅ **90% less code duplication** - Shared functions in one place  
✅ **Easier maintenance** - Fix bugs once, affects all syncs  
✅ **Simple to add new teams** - Just add config, no new script  
✅ **Consistent behavior** - All syncs use same logic  
✅ **Better testing** - Test shared utilities once  

## Migration Complete

The old scripts have been removed:
- ✓ `fetch-data-aws.js` (removed - replaced by unified script)
- ✓ `fetch-data-discord.js` (removed - replaced by unified script)
- ✓ `generate-discord-joueurs.js` (removed - functionality built into unified sync)

## Migration Notes

- All functionality from the old scripts is preserved
- npm scripts still work the same way
- Output files and directories remain unchanged
- GitHub Actions workflows should continue to work without modification
