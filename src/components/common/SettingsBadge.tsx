import { useSettings } from '../../context/SettingsContext';
import './SettingsBadge.css';

export function SettingsBadge() {
  const { settings } = useSettings();

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    
    // Use independent filters if available, otherwise fall back to legacy
    if (settings.independentFilters) {
      const filters = settings.independentFilters;
      
      if (filters.gameTypeEnabled && filters.gameFilter !== 'all') count++;
      if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) count++;
      if (filters.mapNameEnabled && filters.mapNameFilter !== 'all') count++;
      if (filters.playerFilter.mode !== 'none' && filters.playerFilter.players.length > 0) count++;
      if (settings.highlightedPlayer) count++;
    } else {
      // Legacy fallback
      if (settings.gameFilter !== 'all') count++;
      if (settings.filterMode === 'dateRange' && (settings.dateRange.start || settings.dateRange.end)) count++;
      if (settings.filterMode === 'mapName' && settings.mapNameFilter !== 'all') count++;
      if (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) count++;
      if (settings.highlightedPlayer) count++;
    }
    
    return count;
  };

  const activeCount = getActiveFilterCount();

  if (activeCount === 0) {
    return null;
  }

  return (
    <span className="settings-badge" title={`${activeCount} filtre(s) actif(s)`}>
      {activeCount}
    </span>
  );
}
