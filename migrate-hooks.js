#!/usr/bin/env node

/**
 * Migration script to help update existing hooks to use the new optimized system
 * 
 * Usage:
 * 1. Update imports in your hooks from './useRawGameData' to './useCombinedRawData'
 * 2. Replace hook patterns with base hook patterns
 * 3. Extract computation logic into pure functions
 * 
 * This script provides guidance and examples for common patterns.
 */

console.log(`
🚀 Raw Data Hooks Migration Guide
=================================

## Steps to migrate your existing hooks:

### 1. Update imports:
FROM: import { useFilteredRawGameData } from './useRawGameData';
TO:   import { useFilteredRawGameData } from './useCombinedRawData';
      // OR use the combined hook for better performance:
      import { useCombinedFilteredRawData } from './useCombinedRawData';

### 2. Use utility functions for common operations:
FROM: const splitAndTrim = (str: string | null): string[] => {
        return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
      };
TO:   import { splitAndTrim } from './utils/dataUtils';

### 3. Use base hooks for simpler patterns:
FROM: export function useMyStatsFromRaw() {
        const { data: rawGameData, isLoading, error } = useFilteredRawGameData();
        
        const stats = useMemo(() => {
          if (!rawGameData || rawGameData.length === 0) return null;
          // computation logic...
        }, [rawGameData]);
        
        return { stats, isLoading, error };
      }

TO:   function computeMyStats(gameData: RawGameData[]): MyStatsType | null {
        if (gameData.length === 0) return null;
        // computation logic...
      }
      
      export function useMyStatsFromRaw() {
        const { data: stats, isLoading, error } = useGameStatsBase(computeMyStats);
        return { stats, isLoading, error };
      }

### 4. For hooks that need multiple data sources:
FROM: Multiple separate useFiltered*Data() calls
TO:   const { gameData, roleData, ponceData, isLoading, error } = useCombinedFilteredRawData();

### 5. Extract helper functions to utils:
- splitAndTrim()
- didPlayerWin()
- getPlayerCamp()
- buildGamePlayerCampMap()
- formatLycanDate()
- parseFrenchDate()

## Benefits of the new system:
✅ Reduced API calls (one combined call vs multiple individual calls)
✅ Consistent filtering across all data types
✅ Shared utility functions reduce code duplication
✅ Base hooks simplify common patterns
✅ Better performance through optimized data fetching
✅ Easier testing with pure computation functions

## Example migration for a simple hook:

// BEFORE:
export function useGameDurationAnalysisFromRaw() {
  const { data: rawGameData, isLoading, error } = useFilteredRawGameData();

  const durationAnalysis = useMemo(() => {
    if (!rawGameData || rawGameData.length === 0) return null;
    
    const stats = { /* computation */ };
    return stats;
  }, [rawGameData]);

  return { durationAnalysis, fetchingData: isLoading, apiError: error };
}

// AFTER:
function computeGameDurationAnalysis(gameData: RawGameData[]): GameDurationAnalysisResponse | null {
  if (gameData.length === 0) return null;
  
  const stats = { /* computation */ };
  return stats;
}

export function useGameDurationAnalysisFromRaw() {
  const { data: durationAnalysis, isLoading, error } = useGameStatsBase(computeGameDurationAnalysis);
  return { durationAnalysis, fetchingData: isLoading, apiError: error };
}

Start by updating one hook at a time, testing to ensure everything works correctly!
`);

process.exit(0);
