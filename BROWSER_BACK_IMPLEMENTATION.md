# Browser Back Button Implementation

## Summary

Implemented full browser back/forward button support for the Lycans statistics dashboard. All navigation (tabs, game details) and settings are now synchronized with URL parameters and browser history.

## Changes Made

### 1. Centralized URL Management (`src/utils/urlManager.ts`)

Created a new utility to centralize all URL and browser history operations:

- **`UrlState` interface** - Defines all URL parameters
- **`parseUrlState()`** - Parses current URL into UrlState object
- **`buildUrlSearch(state)`** - Converts UrlState to URL search string
- **`pushUrlState(state)`** - Updates URL using `pushState` (creates history entry)
- **`replaceUrlState(state)`** - Updates URL using `replaceState` (silent update)
- **`mergeUrlState(state, method)`** - Merges new state with current URL

### 2. Updated SettingsContext (`src/context/SettingsContext.tsx`)

- Migrated from direct `URLSearchParams` usage to centralized `urlManager`
- Refactored `parseSettingsFromUrl()` to use `parseUrlState()` and new `urlStateToSettings()` helper
- Updated `updateUrlFromSettings()` to use `replaceUrlState()` instead of manual `replaceState`
- Updated `generateUrlWithSettings()` to use `buildUrlSearch()`
- Settings changes use `replaceState` (silent) to avoid cluttering history

### 3. Enhanced NavigationContext (`src/context/NavigationContext.tsx`)

- Added URL persistence for `currentView` (game details navigation)
- Added URL persistence for key navigation filters: `selectedPlayer`, `selectedGame`, `fromComponent`
- Added `popstate` event listener to restore navigation state on browser back/forward
- `navigateToGameDetails()` now uses `pushState` to create history entry
- `navigateBack()` now calls `window.history.back()` instead of just clearing state
- `clearNavigation()` clears URL parameters using `replaceState`
- Initialize view from URL on mount for direct link support

### 4. Updated App.tsx

- Imported `mergeUrlState` from `urlManager`
- Updated `updateTabUrl()` to use `mergeUrlState()` with `'push'` method
- Tab changes now properly create history entries
- Removed direct `URLSearchParams` manipulation

### 5. Updated Documentation

- Updated [NAVIGATION.md](NAVIGATION.md) with browser back button details
- Added architecture notes about URL management and history entry rules
- Documented the centralized URL manager approach

## How It Works

### URL Parameters

The system now manages these URL parameters:

**Settings (SettingsContext):**
- `gameTypeEnabled`, `gameFilter` - Game type filtering
- `dateRangeEnabled`, `dateStart`, `dateEnd` - Date range filtering
- `mapNameEnabled`, `mapNameFilter` - Map filtering
- `playerFilterMode`, `players` - Player inclusion/exclusion
- `highlightedPlayer` - Player to highlight across charts
- `dataSource` - 'main' or 'discord' team data
- `tab`, `subtab` - Current tab selection
- `playerSelectionView` - Player selection page view

**Navigation (NavigationContext):**
- `view` - Current navigation view ('gameDetails' or '')
- `selectedPlayer` - Player filter for game details
- `selectedGame` - Specific game to display
- `fromComponent` - Source component that triggered navigation

### History Entry Rules

**Create history entry (pushState):**
- User clicks a main tab or subtab
- User navigates to game details from a chart
- → User can use browser back button to return

**Silent update (replaceState):**
- User changes filter settings (game type, date range, etc.)
- User changes highlighted player
- → Avoids cluttering browser history with filter changes

### Popstate Event Handling

Both contexts listen to `popstate` events:

**SettingsContext:**
- Restores all settings from URL parameters
- Updates tab/subtab state in App.tsx via settings.tab/subtab

**NavigationContext:**
- Restores currentView ('gameDetails' or '')
- Restores navigation filters (selectedPlayer, selectedGame, fromComponent)

**App.tsx:**
- Syncs local tab state with settings.tab/subtab on change
- Updates submenu selection based on URL parameters

## Benefits

1. **Browser Navigation** - Back/forward buttons work as expected
2. **Shareable Links** - URLs include all state, can be shared
3. **Deep Linking** - Direct links to specific views work
4. **Consistent Behavior** - All URL operations centralized
5. **No Code Duplication** - Single source of truth for URL management
6. **Maintainability** - Easy to add new URL parameters

## Testing

Test the following scenarios:

1. **Tab Navigation:**
   - Click through different main tabs
   - Click browser back button → should return to previous tab
   - Click subtabs within a section
   - Browser back button → should return to previous subtab

2. **Game Details Navigation:**
   - Navigate from a chart to game details
   - Browser back button → should return to chart
   - Copy URL and open in new tab → should show game details

3. **Settings Changes:**
   - Change filters while on a chart
   - Browser back button → should NOT go to previous filter state
   - URL should update but not create history entry

4. **Highlighted Player:**
   - Select a player to highlight
   - Navigate through tabs → player stays highlighted
   - Browser back → player highlighting persists

5. **Shareable Links:**
   - Set filters and navigate to specific view
   - Copy URL and open in new tab → exact state restored
   - Share URL with someone else → they see same view

## Migration Notes

- No breaking changes to existing code
- All existing functionality preserved
- URL parameters remain backward compatible
- Chart components don't need changes (except to use navigation features)

## Future Enhancements

Possible additions:
- Persist chart-specific state (min games filters, view modes) to URL
- Add more navigation filters to URL (camp filter, date filter, etc.)
- Implement URL parameter validation and error handling
- Add analytics to track which navigation flows users prefer
