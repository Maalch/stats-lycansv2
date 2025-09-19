import { useSettings } from '../../context/SettingsContext';
import './SettingsBadge.css';

export function SettingsBadge() {
  const { settings } = useSettings();

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    
    if (settings.gameFilter !== 'all') count++;
    if (settings.filterMode === 'dateRange' && (settings.dateRange.start || settings.dateRange.end)) count++;
    if (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) count++;
    if (settings.highlightedPlayer) count++;
    
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
