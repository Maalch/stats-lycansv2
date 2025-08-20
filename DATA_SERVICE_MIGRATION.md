# DataService and StatsApi Migration Guide

## Overview
Updated the data service layer to support the new raw data architecture where statistics are computed client-side instead of using pre-computed API endpoints.

## Key Changes Made

### 1. DataService Configuration Update
**File:** `src/api/dataService.ts`

#### Before (Hybrid System)
- Static computed endpoints (campWinStats, playerStats, etc.)
- Hybrid endpoints for complex queries
- Pre-generated player game histories

#### After (Raw Data System)
- **Static endpoints:** Only raw sheet exports (rawGameData, rawRoleData, rawPonceData)
- **API endpoints:** Legacy computed endpoints (for fallback only)
- **Removed:** Hybrid endpoint support and player game history loading

#### Configuration Changes
```typescript
// OLD CONFIG
endpoints: {
  campWinStats: 'static',
  harvestStats: 'static',
  // ... other computed stats
  playerGameHistory: 'hybrid'
}

// NEW CONFIG  
endpoints: {
  // Raw data (static files)
  rawGameData: 'static',
  rawRoleData: 'static', 
  rawPonceData: 'static',
  
  // Legacy computed endpoints (API fallback only)
  campWinStats: 'api',
  harvestStats: 'api',
  // ... other computed stats
}
```

### 2. StatsApi Function Updates
**File:** `src/api/statsApi.tsx`

#### New Raw Data Functions
```typescript
export async function fetchRawGameData()
export async function fetchRawRoleData() 
export async function fetchRawPonceData()
```

#### Deprecated Legacy Functions
All computed endpoint functions are now deprecated with warnings:
- `fetchCampWinStats()` → Use `useCampWinStatsFromRaw` hook
- `fetchPlayerStats()` → Use `usePlayerStatsFromRaw` hook  
- `fetchPlayerGameHistory()` → Use `usePlayerGameHistoryFromRaw` hook
- And all other computed statistics functions

#### Updated Utility Functions
- `getRawDataFreshness()` - Check freshness of raw data
- `isRawDataAvailable()` - Verify raw data availability
- Removed player-specific static data helpers

## Migration Impact

### 3. Components Using Old API
Components still using the old statsApi functions will see deprecation warnings but continue to work via API fallback. However, they should be migrated to use raw data hooks:

#### Migration Path
```typescript
// OLD - Direct API calls
import { fetchCampWinStats } from '../api/statsApi';
const data = await fetchCampWinStats();

// NEW - Raw data hooks  
import { useCampWinStatsFromRaw } from '../hooks/useCampWinStatsFromRaw';
const { campWinStats, isLoading, error } = useCampWinStatsFromRaw();
```

### 4. Data Flow Changes

#### Before (Multi-Source)
```
Components → StatsApi → DataService → Static Files OR API
```

#### After (Raw Data First)
```
Components → Raw Data Hooks → useFilteredRawGameData/useFilteredRawRoleData
           ↘ (fallback) → StatsApi → DataService → API
```

## Benefits Achieved

### 1. Performance Improvements
- **Faster Load Times:** Raw data loaded once, statistics computed in-memory
- **Real-Time Filtering:** Date ranges and modded game filters work instantly
- **Reduced API Calls:** No individual requests for each statistic

### 2. Enhanced Functionality  
- **Dynamic Filtering:** Settings-based filtering without server round-trips
- **Consistent Data:** All components use same filtered raw dataset
- **Better UX:** Immediate response to filter changes

### 3. Simplified Architecture
- **Clear Separation:** Raw data vs. computed statistics
- **Single Source:** All statistics derive from same raw data
- **Type Safety:** Full TypeScript support for client-side calculations

## Verification Steps

### 1. Raw Data Loading
```typescript
// Test raw data access
import { fetchRawGameData } from '../api/statsApi';
const rawData = await fetchRawGameData();
console.log('Raw game records:', rawData.data?.length);
```

### 2. Legacy Function Warnings
```typescript
// Should show deprecation warning
import { fetchCampWinStats } from '../api/statsApi';
const data = await fetchCampWinStats(); // Warning logged
```

### 3. Hook Integration
```typescript
// Test new raw data hooks
import { useCampWinStatsFromRaw } from '../hooks/useCampWinStatsFromRaw';
const { campWinStats } = useCampWinStatsFromRaw();
```

## Next Steps

### 1. Component Migration
- Identify remaining components using deprecated statsApi functions
- Migrate to appropriate raw data hooks
- Remove deprecated function calls

### 2. Data Sync Process
- Update CI/CD to only sync raw data files
- Remove pre-computed endpoint generation
- Verify daily raw data updates

### 3. Performance Monitoring
- Monitor client-side computation performance
- Optimize raw data hooks if needed
- Consider caching strategies for complex calculations

## Backward Compatibility

### Legacy Support
- Deprecated functions remain functional via API fallback
- Gradual migration path for existing components
- No breaking changes to existing functionality

### API Fallback
- If raw data unavailable, system falls back to API endpoints
- Graceful degradation for network issues
- Maintains full functionality during transition

This migration establishes the foundation for a pure client-side statistics system while maintaining backward compatibility during the transition period.
