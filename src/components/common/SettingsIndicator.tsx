import { useSettings } from '../../context/SettingsContext';
import './SettingsIndicator.css';

export function SettingsIndicator() {
  const { settings } = useSettings();

  // Check if any non-default settings are active
  const hasActiveFilters = 
    settings.gameFilter !== 'all' ||
    settings.filterMode === 'dateRange' ||
    (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) ||
    settings.highlightedPlayer;

  if (!hasActiveFilters) {
    return null; // Don't show indicator when no filters are active
  }

  const getFilterSummary = () => {
    const filters = [];

    // Game type filter
    if (settings.filterMode === 'gameType' && settings.gameFilter !== 'all') {
      filters.push(
        settings.gameFilter === 'modded' ? 'Parties moddées' : 'Parties non-moddées'
      );
    }

    // Date range filter
    if (settings.filterMode === 'dateRange') {
      if (settings.dateRange.start || settings.dateRange.end) {
        const start = settings.dateRange.start ? new Date(settings.dateRange.start).toLocaleDateString('fr-FR') : '';
        const end = settings.dateRange.end ? new Date(settings.dateRange.end).toLocaleDateString('fr-FR') : '';
        
        if (start && end) {
          filters.push(`Période: ${start} - ${end}`);
        } else if (start) {
          filters.push(`Depuis: ${start}`);
        } else if (end) {
          filters.push(`Jusqu'à: ${end}`);
        }
      } else {
        filters.push('Filtre par date (aucune date sélectionnée)');
      }
    }

    // Player filter
    if (settings.playerFilter.mode !== 'none' && settings.playerFilter.players.length > 0) {
      const playerCount = settings.playerFilter.players.length;
      const modeText = settings.playerFilter.mode === 'include' ? 'Inclure' : 'Exclure';
      
      if (playerCount === 1) {
        // Show player name for single player
        filters.push(`${modeText} ${settings.playerFilter.players[0]}`);
      } else {
        // Show count for multiple players
        const playerText = 'joueurs';
        filters.push(`${modeText} ${playerCount} ${playerText}`);
      }
    }

    // Highlighted player
    if (settings.highlightedPlayer) {
      filters.push(`🎯 Mettre en évidence ${settings.highlightedPlayer}`);
    }

    return filters;
  };

  const filters = getFilterSummary();

  return (
    <div className="settings-indicator">
      <div className="settings-indicator-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
        </svg>
      </div>
      <div className="settings-indicator-content">
        <span className="settings-indicator-label">Filtres actifs:</span>
        <div className="settings-indicator-filters">
          {filters.map((filter, index) => (
            <span key={index} className="settings-indicator-filter">
              {filter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}