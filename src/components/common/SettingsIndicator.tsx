import { useSettings } from '../../context/SettingsContext';
import './SettingsIndicator.css';

interface FilterInfo {
  id: string;
  label: string;
  type: 'gameType' | 'dateRange' | 'mapName' | 'playerFilter' | 'highlightedPlayer';
}

export function SettingsIndicator() {
  const { settings, updateSettings } = useSettings();

  // Check if any non-default settings are active
  const hasActiveFilters = (() => {
    if (settings.independentFilters) {
      const filters = settings.independentFilters;
      return (
        (filters.gameTypeEnabled && filters.gameFilter !== 'all') ||
        (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) ||
        (filters.mapNameEnabled && filters.mapNameFilter !== 'all') ||
        (filters.playerFilter.mode !== 'none' && filters.playerFilter.players.length > 0) ||
        settings.highlightedPlayer
      );
    }
    return false; // No filters active if independentFilters not available
  })();

  if (!hasActiveFilters) {
    return null; // Don't show indicator when no filters are active
  }

  const getFilterSummary = (): FilterInfo[] => {
    const filters: FilterInfo[] = [];

    if (settings.independentFilters) {
      const independentFilters = settings.independentFilters;

      // Game type filter
      if (independentFilters.gameTypeEnabled && independentFilters.gameFilter !== 'all') {
        filters.push({
          id: 'gameType',
          label: independentFilters.gameFilter === 'modded' ? 'Parties moddées' : 'Parties non-moddées',
          type: 'gameType'
        });
      }

      // Date range filter
      if (independentFilters.dateRangeEnabled) {
        if (independentFilters.dateRange.start || independentFilters.dateRange.end) {
          const start = independentFilters.dateRange.start ? new Date(independentFilters.dateRange.start).toLocaleDateString('fr-FR') : '';
          const end = independentFilters.dateRange.end ? new Date(independentFilters.dateRange.end).toLocaleDateString('fr-FR') : '';
          
          let label = '';
          if (start && end) {
            label = `Période: ${start} - ${end}`;
          } else if (start) {
            label = `Depuis: ${start}`;
          } else if (end) {
            label = `Jusqu'à: ${end}`;
          }
          
          filters.push({
            id: 'dateRange',
            label,
            type: 'dateRange'
          });
        } else {
          filters.push({
            id: 'dateRange',
            label: 'Filtre par date (aucune date sélectionnée)',
            type: 'dateRange'
          });
        }
      }

      // Map name filter
      if (independentFilters.mapNameEnabled && independentFilters.mapNameFilter !== 'all') {
        const mapLabels = {
          'village': 'Carte: Village',
          'chateau': 'Carte: Château',
          'others': 'Carte: Autres'
        };
        filters.push({
          id: 'mapName',
          label: mapLabels[independentFilters.mapNameFilter] || 'Carte: Inconnue',
          type: 'mapName'
        });
      }

      // Player filter
      if (independentFilters.playerFilter.mode !== 'none' && independentFilters.playerFilter.players.length > 0) {
        const playerCount = independentFilters.playerFilter.players.length;
        const modeText = independentFilters.playerFilter.mode === 'include' ? 'Inclure' : 'Exclure';
        
        let label = '';
        if (playerCount === 1) {
          // Show player name for single player
          label = `${modeText} ${independentFilters.playerFilter.players[0]}`;
        } else {
          // Show count for multiple players
          const playerText = 'joueurs';
          label = `${modeText} ${playerCount} ${playerText}`;
        }
        
        filters.push({
          id: 'playerFilter',
          label,
          type: 'playerFilter'
        });
      }
    }

    // Highlighted player (same for both systems)
    if (settings.highlightedPlayer) {
      filters.push({
        id: 'highlightedPlayer',
        label: `🎯 Mettre en évidence ${settings.highlightedPlayer}`,
        type: 'highlightedPlayer'
      });
    }

    return filters;
  };

  const removeFilter = (filterType: FilterInfo['type']) => {
    if (!settings.independentFilters) return;

    const updatedFilters = { ...settings.independentFilters };

    switch (filterType) {
      case 'gameType':
        updatedFilters.gameTypeEnabled = false;
        updatedFilters.gameFilter = 'all';
        break;
      case 'dateRange':
        updatedFilters.dateRangeEnabled = false;
        updatedFilters.dateRange = { start: null, end: null };
        break;
      case 'mapName':
        updatedFilters.mapNameEnabled = false;
        updatedFilters.mapNameFilter = 'all';
        break;
      case 'playerFilter':
        updatedFilters.playerFilter = { mode: 'none', players: [] };
        break;
      case 'highlightedPlayer':
        updateSettings({ highlightedPlayer: null });
        return; // Early return since we're not updating independentFilters
    }

    updateSettings({ independentFilters: updatedFilters });
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
          {filters.map((filter) => (
            <span key={filter.id} className="settings-indicator-filter">
              <span className="settings-indicator-filter-text">
                {filter.label}
              </span>
              <button
                className="settings-indicator-filter-remove"
                onClick={() => removeFilter(filter.type)}
                title={`Supprimer le filtre: ${filter.label}`}
                aria-label={`Supprimer le filtre: ${filter.label}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}