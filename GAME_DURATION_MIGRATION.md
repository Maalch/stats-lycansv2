# GameDurationInsights Component Migration to Raw Data

## Overview
Updated the GameDurationInsights component to use the new filtered raw data system instead of the computed API endpoint. This enables client-side filtering based on settings (e.g., modded games only).

## Changes Made

### 1. New Hook: `useGameDurationAnalysisFromRaw`
- **File**: `src/hooks/useGameDurationAnalysisFromRaw.tsx`
- **Purpose**: Computes game duration statistics client-side from filtered raw data
- **Logic**: Implements the same calculation logic as the Google Apps Script `_computeGameDurationAnalysis` function

### 2. Updated Component
- **File**: `src/components/generalstats/GameDurationInsights.tsx`
- **Changes**: 
  - Import updated to use `useGameDurationAnalysisFromRaw` instead of `useGameDurationAnalysis`
  - Added null safety checks for data processing
  - Maintained exact same UI and chart structure

## Key Features

### Data Processing Logic
The new hook processes raw game data to calculate:
- **Average, min, max days**: Basic duration statistics
- **Day distribution**: Count of games by number of days
- **Duration by winner camp**: Average game length by winning camp
- **Duration by player count**: Average game length by number of players
- **Duration by wolf ratio**: Average game length by wolf-to-player percentage

### Client-Side Filtering
- Automatically respects settings.showOnlyModdedGames filter
- Real-time updates when settings change
- No additional API calls needed

### Type Safety
- Uses existing TypeScript interfaces (`GameDurationAnalysisResponse`, `DayDistribution`, `CampDaysData`)
- Proper error handling and loading states
- Consistent return format matching original API structure

## Performance Benefits
- Reduces API calls by using cached raw data
- Enables real-time filtering without server requests
- Maintains same user experience with better responsiveness

## Backward Compatibility
- Component interface unchanged
- Chart rendering identical to original
- Same error handling and loading states
- French language labels preserved

## Testing
- Development server runs successfully on http://localhost:5174/stats-lycansv2/
- No TypeScript or lint errors
- Charts render with same visual appearance
- Settings integration ready for use

## Next Steps
This migration pattern can be applied to other statistics components:
1. Create filtered raw data computation hook
2. Update component to use new hook
3. Maintain existing UI/UX
4. Enable settings-based filtering

The GameDurationInsights component now serves as a template for migrating other statistics components to the new raw data architecture.
