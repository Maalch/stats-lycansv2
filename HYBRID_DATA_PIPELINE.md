# Hybrid Data Pipeline Implementation

This document describes the implementation of the GitHub-based data pipeline with Apps Script API fallback for the Lycans Stats project.

## Overview

The hybrid approach combines:
- **Static JSON data** updated daily via GitHub Actions
- **Apps Script API** for real-time/parameterized queries
- **Automatic fallback** between static and API data

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Google Sheets │    │   GitHub Actions │    │   Static JSON   │
│                 │───▶│   (Daily Sync)   │───▶│   Files (/data) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐              │
│   Apps Script   │    │   Data Service   │◀─────────────┘
│   API           │◀──▶│   (Hybrid)       │
└─────────────────┘    └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   React App      │
                       └──────────────────┘
```

## Components

### 1. GitHub Actions Workflow (`.github/workflows/update-data.yml`)
- Runs daily at 6 AM UTC
- Fetches data from Google Sheets via Apps Script
- Commits updated JSON files to repository
- Can be triggered manually

### 2. Data Sync Script (`scripts/data-sync/fetch-data.js`)
- Fetches data from all static endpoints
- Saves as JSON files in `/data` directory
- Creates metadata index with last update time

### 3. Hybrid Data Service (`src/api/dataService.ts`)
- Routes requests to static data or API based on configuration
- Automatic fallback when static data unavailable
- Caches data index for performance

### 4. Updated API Layer (`src/api/statsApi.tsx`)
- Individual functions for each endpoint
- Uses hybrid data service under the hood
- Maintains backward compatibility

## Data Flow

### Static Data (Daily Updates)
1. GitHub Actions runs on schedule
2. Fetches data from Apps Script endpoints
3. Saves JSON files to `/data/` directory
4. Commits changes to repository
5. Frontend serves static JSON files

### Dynamic Data (Real-time)
1. Frontend requests parameterized data
2. Data service routes to Apps Script API
3. Results returned directly (not cached)

## Configuration

### Environment Variables
- `LYCANS_API_BASE` - Apps Script API URL (required for dynamic data)

### Data Source Configuration (`src/api/dataService.ts`)
```typescript
endpoints: {
  // Static data - updated daily
  campWinStats: 'static',
  harvestStats: 'static',
  gameDurationAnalysis: 'static',
  playerStats: 'static',
  playerPairingStats: 'static',
  playerCampPerformance: 'static',
  
  // Dynamic data - always use API
  playerGameHistory: 'api',
  
  // Hybrid - static for basic requests, API for complex
  combinedStats: 'hybrid'
}
```

## Benefits

### Performance
- ✅ Faster loading for most common data
- ✅ Reduced API quota usage
- ✅ Better caching at CDN level

### Reliability
- ✅ Automatic fallback when static data fails
- ✅ Maintains functionality during API outages
- ✅ Graceful degradation

### Scalability
- ✅ Reduced server load
- ✅ Better user experience
- ✅ Clear upgrade path to full database

## Usage

### Manual Data Sync
```bash
npm run sync-data
```

### Build with Data
```bash
npm run build
```

### Test the System
```bash
node scripts/test-sync.js
```

## Monitoring

### Data Freshness Component
The `DataStatus` component shows:
- Last update time
- Data age indicator
- Visual status (green/yellow/red)

### Example Usage
```tsx
import { DataStatus } from './components/common/DataStatus';

<DataStatus className="mb-4" />
```

## Migration Notes

### Existing Code Compatibility
- All existing API calls continue to work
- No breaking changes to component interfaces
- Gradual migration possible

### Performance Monitoring
- Monitor static data load times
- Track API fallback frequency
- Watch GitHub Actions execution

## Troubleshooting

### Static Data Not Loading
1. Check `/data/index.json` exists
2. Verify GitHub Actions completed successfully
3. Check browser console for fetch errors

### API Fallback Issues
1. Verify `LYCANS_API_BASE` environment variable
2. Check Apps Script deployment status
3. Review network requests in developer tools

### GitHub Actions Failures
1. Check workflow logs in GitHub Actions tab
2. Verify API base URL secret is set
3. Ensure sufficient API quotas remain

## Future Enhancements

1. **Incremental Updates** - Only update changed data
2. **Compression** - Gzip JSON files for smaller transfers
3. **CDN Integration** - Serve static data from CDN
4. **Database Migration** - Move to full database when needed
