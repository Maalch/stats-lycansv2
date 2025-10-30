import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import type { GameLogEntry } from '../../hooks/useCombinedRawData';
import type { GameFilter, MapNameFilter, PlayerFilterMode } from '../../context/SettingsContext';
import { ShareableUrl } from '../common/ShareableUrl';
import './SettingsPanel.css';
import { getPlayerId } from '../../utils/playerIdentification';
import { getDataFileUrl, DATA_FILES } from '../../utils/dataPath';
import type { DataSource } from '../../utils/dataPath';

export function SettingsPanel() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [gameLogData, setGameLogData] = useState<GameLogEntry[] | null>(null);
  
  // Ensure independent filters are initialized
  useEffect(() => {
    if (!settings.independentFilters) {
      // Initialize with default independent filters
      const independentFilters = {
        gameTypeEnabled: false,
        gameFilter: 'all' as GameFilter,
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: false,
        mapNameFilter: 'all' as MapNameFilter,
        playerFilter: { mode: 'none' as PlayerFilterMode, players: [] },
      };
      
      updateSettings({ 
        useIndependentFilters: true, 
        independentFilters 
      });
    }
  }, [settings, updateSettings]);

  // Fetch unfiltered game data to get all players
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dataSource = settings.dataSource as DataSource;
        const url = getDataFileUrl(dataSource, DATA_FILES.GAME_LOG);
        const response = await fetch(url);
        const result = await response.json();
        setGameLogData(result.GameStats || []);
      } catch (error) {
        console.error('Error fetching game log data:', error);
      }
    };
    fetchData();
  }, [settings.dataSource]); // Re-fetch when dataSource changes

  // Helper to parse ISO date string to Date
  const parseISODate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  // Get filtered games based on enabled filters
  const filteredGames = useMemo(() => {
    if (!gameLogData || !settings.independentFilters) return [];

    return gameLogData.filter(game => {
      const filters = settings.independentFilters!;
      
      // Apply game type filter if enabled
      if (filters.gameTypeEnabled && filters.gameFilter !== 'all') {
        if (filters.gameFilter === 'modded' && !game.Modded) return false;
        if (filters.gameFilter === 'non-modded' && game.Modded) return false;
      }
      
      // Apply date range filter if enabled
      if (filters.dateRangeEnabled && (filters.dateRange.start || filters.dateRange.end)) {
        const gameDateObj = parseISODate(game.StartDate);
        if (!gameDateObj) return false;
        if (filters.dateRange.start) {
          const startObj = new Date(filters.dateRange.start);
          if (gameDateObj < startObj) return false;
        }
        if (filters.dateRange.end) {
          const endObj = new Date(filters.dateRange.end);
          if (gameDateObj > endObj) return false;
        }
      }
      
      // Apply map name filter if enabled
      if (filters.mapNameEnabled && filters.mapNameFilter !== 'all') {
        const mapName = game.MapName || '';
        if (filters.mapNameFilter === 'village' && mapName !== 'Village') return false;
        if (filters.mapNameFilter === 'chateau' && mapName !== 'Château') return false;
        if (filters.mapNameFilter === 'others' && (mapName === 'Village' || mapName === 'Château')) return false;
      }

      // Apply player filter (supports both IDs and names for backward compatibility)
      if (filters.playerFilter.mode !== 'none' && filters.playerFilter.players.length > 0) {
        const gamePlayerNames = game.PlayerStats.map(p => p.Username.toLowerCase());
        const gamePlayerIds = game.PlayerStats.map(p => getPlayerId(p).toLowerCase());

        if (filters.playerFilter.mode === 'include') {
          const hasAllPlayers = filters.playerFilter.players.every((player: string) => {
            const term = String(player).toLowerCase();
            return gamePlayerIds.includes(term) || gamePlayerNames.includes(term);
          });
          if (!hasAllPlayers) return false;
        } else if (filters.playerFilter.mode === 'exclude') {
          const hasAnyPlayer = filters.playerFilter.players.some((player: string) => {
            const term = String(player).toLowerCase();
            return gamePlayerIds.includes(term) || gamePlayerNames.includes(term);
          });
          if (hasAnyPlayer) return false;
        }
      }
      
      return true;
    });
  }, [gameLogData, settings.independentFilters]);

  // Get all players from filtered games
  const playersFromFilteredGames = useMemo(() => {
    const allPlayers = new Set<string>();
    filteredGames.forEach((game: GameLogEntry) => {
      game.PlayerStats.forEach((playerStat) => {
        // Player names are already normalized during data loading
        allPlayers.add(playerStat.Username);
      });
    });
    return Array.from(allPlayers).sort();
  }, [filteredGames]);

  // Get player compatibility data for include/exclude logic
  const playerCompatibility = useMemo(() => {
    const compatibility: Record<string, Set<string>> = {};
    
    filteredGames.forEach((game: GameLogEntry) => {
      // Player names are already normalized during data loading
      const players = game.PlayerStats.map(p => p.Username);
      
      players.forEach((player: string) => {
        if (!compatibility[player]) {
          compatibility[player] = new Set();
        }
        players.forEach((otherPlayer: string) => {
          if (player !== otherPlayer) {
            compatibility[player].add(otherPlayer);
          }
        });
      });
    });
    
    return compatibility;
  }, [filteredGames]);

  // Calculate selectable players based on current player filter selections
  const { availablePlayers, selectablePlayers } = useMemo(() => {
    const available = playersFromFilteredGames;
    
    if (!settings.independentFilters?.playerFilter || 
        settings.independentFilters.playerFilter.mode === 'none' || 
        settings.independentFilters.playerFilter.players.length === 0) {
      return { availablePlayers: available, selectablePlayers: new Set(available) };
    }
    
    const selectable = new Set<string>();
    const playerFilter = settings.independentFilters.playerFilter;
    
    if (playerFilter.mode === 'include') {
      available.forEach(player => {
        if (playerFilter.players.includes(player)) {
          selectable.add(player);
        } else {
          const hasPlayedWithAll = playerFilter.players.every(selectedPlayer => 
            playerCompatibility[player]?.has(selectedPlayer) || false
          );
          if (hasPlayedWithAll) {
            selectable.add(player);
          }
        }
      });
    } else if (playerFilter.mode === 'exclude') {
      available.forEach(player => {
        if (playerFilter.players.includes(player)) {
          selectable.add(player);
        } else {
          const hasGamesWithoutExcluded = filteredGames.some(game => {
            const gamePlayers = game.PlayerStats
              .flatMap(p => [p.Username.toLowerCase(), (p.ID ?? p.Username).toLowerCase()]);
            const playerInGame = gamePlayers.includes(player.toLowerCase());
            if (!playerInGame) return false;
            
            const hasExcludedPlayer = playerFilter.players.some(excludedPlayer => 
              gamePlayers.includes(excludedPlayer.toLowerCase())
            );
            return !hasExcludedPlayer;
          });
          
          if (hasGamesWithoutExcluded) {
            selectable.add(player);
          }
        }
      });
    }
    
    return { availablePlayers: available, selectablePlayers: selectable };
  }, [playersFromFilteredGames, settings.independentFilters?.playerFilter, playerCompatibility, filteredGames]);

  // Handlers for independent filters
  const handleGameTypeToggle = (enabled: boolean) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        gameTypeEnabled: enabled 
      } 
    });
  };

  const handleGameFilterChange = (filter: GameFilter) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        gameFilter: filter 
      } 
    });
  };

  const handleDateRangeToggle = (enabled: boolean) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        dateRangeEnabled: enabled 
      } 
    });
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        dateRange: { 
          ...settings.independentFilters.dateRange, 
          [field]: value || null 
        } 
      } 
    });
  };

  const handleMapNameToggle = (enabled: boolean) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        mapNameEnabled: enabled 
      } 
    });
  };

  const handleMapNameFilterChange = (filter: MapNameFilter) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        mapNameFilter: filter 
      } 
    });
  };

  const handlePlayerFilterModeChange = (mode: PlayerFilterMode) => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        playerFilter: { 
          ...settings.independentFilters.playerFilter, 
          mode 
        } 
      } 
    });
  };

  const handlePlayerToggle = (playerName: string) => {
    if (!settings.independentFilters) return;
    const currentPlayers = settings.independentFilters.playerFilter.players;
    const isSelected = currentPlayers.includes(playerName);
    
    if (isSelected) {
      const newPlayers = currentPlayers.filter(p => p !== playerName);
      updateSettings({ 
        independentFilters: { 
          ...settings.independentFilters, 
          playerFilter: { 
            ...settings.independentFilters.playerFilter, 
            players: newPlayers 
          } 
        } 
      });
    } else {
      updateSettings({ 
        independentFilters: { 
          ...settings.independentFilters, 
          playerFilter: { 
            ...settings.independentFilters.playerFilter, 
            players: [...currentPlayers, playerName] 
          } 
        } 
      });
    }
  };

  const handleSelectAllPlayers = () => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        playerFilter: { 
          ...settings.independentFilters.playerFilter, 
          players: [...selectablePlayers] 
        } 
      } 
    });
  };

  const handleDeselectAllPlayers = () => {
    if (!settings.independentFilters) return;
    updateSettings({ 
      independentFilters: { 
        ...settings.independentFilters, 
        playerFilter: { 
          ...settings.independentFilters.playerFilter, 
          players: [] 
        } 
      } 
    });
  };

  const handleHighlightedPlayerChange = (playerName: string) => {
    updateSettings({ highlightedPlayer: playerName || null });
  };
  /*
  const handleDataSourceChange = (dataSource: 'main' | 'discord') => {
    updateSettings({ dataSource });
  };*/

  const handleResetFilters = () => {
    resetSettings();
  };

  // Count active filters for summary
  const activeFilterCount = useMemo(() => {
    if (!settings.independentFilters) return 0;
    let count = 0;
    if (settings.independentFilters.gameTypeEnabled && settings.independentFilters.gameFilter !== 'all') count++;
    if (settings.independentFilters.dateRangeEnabled && (settings.independentFilters.dateRange.start || settings.independentFilters.dateRange.end)) count++;
    if (settings.independentFilters.mapNameEnabled && settings.independentFilters.mapNameFilter !== 'all') count++;
    if (settings.independentFilters.playerFilter.mode !== 'none' && settings.independentFilters.playerFilter.players.length > 0) count++;
    return count;
  }, [settings.independentFilters]);

  if (!settings.independentFilters) {
    return <div>Chargement des paramètres...</div>;
  }

  return (
    <div className="settings-panel">
      {/* Header with active filter summary */}
      <div className="settings-header">
        <div>
          <h3>Paramètres de Filtrage</h3>
          {activeFilterCount > 0 && (
            <p style={{ 
              margin: '0.5rem 0 0 0', 
              color: 'var(--accent-primary)', 
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div>
          <button 
            onClick={handleResetFilters}
            className="settings-reset-btn"
            type="button"
          >
            Réinitialiser
          </button>
        </div>
      </div>

{/* Data Source Selection Section : not active for now

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>🎲 Source de Données</h3>
        </div>
        <div className="settings-group">
          <p className="settings-explanation">
            Sélectionnez la source de données à afficher : équipe principale (Ponce) ou équipe Discord (Nales).
          </p>
          <div className="settings-radio-group-inline" style={{ marginTop: '1rem' }}>
            <label className="settings-radio-inline">
              <input
                type="radio"
                name="dataSource"
                value="main"
                checked={settings.dataSource === 'main'}
                onChange={() => handleDataSourceChange('main')}
              />
              <span>Équipe Principale (Ponce)</span>
            </label>
            <label className="settings-radio-inline">
              <input
                type="radio"
                name="dataSource"
                value="discord"
                checked={settings.dataSource === 'discord'}
                onChange={() => handleDataSourceChange('discord')}
              />
              <span>Équipe Discord (Nales)</span>
            </label>
          </div>
          {settings.dataSource === 'discord' && (
            <p className="settings-info-text" style={{ marginTop: '0.5rem' }}>
              ℹ️ Affichage des données de l'équipe Discord. Les jeux commencent par "Nales-".
            </p>
          )}
        </div>
      </div>
}

      {/* Highlighted Player Section (always visible) */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>🎯 Joueur à Mettre en Évidence</h3>
        </div>
        <div className="settings-group">
          <p className="settings-explanation">
            Sélectionnez un joueur qui sera toujours affiché et mis en évidence dans tous les graphiques généraux, 
            même s'il n'est pas dans le top classement.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <label htmlFor="highlighted-player-select" className="settings-label">
              Joueur à mettre en évidence :
            </label>
            <select
              id="highlighted-player-select"
              value={settings.highlightedPlayer || ''}
              onChange={(e) => handleHighlightedPlayerChange(e.target.value)}
              className="settings-select"
            >
              <option value="">Aucun joueur sélectionné</option>
              {availablePlayers.map(player => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
            {settings.highlightedPlayer && (
              <p className="settings-info-text">
                Le joueur "{settings.highlightedPlayer}" sera mis en évidence dans tous les graphiques.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Independent Filter Sections */}
      <div className="settings-filters-container">
        
        {/* Game Type Filter */}
        <div className={`settings-filter-card ${settings.independentFilters.gameTypeEnabled ? 'active' : ''}`}>
          <div className="settings-filter-header">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.independentFilters.gameTypeEnabled}
                onChange={(e) => handleGameTypeToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <h4>🎮 Filtrer par Type de Partie</h4>
            <div className="settings-filter-status">
              {settings.independentFilters.gameTypeEnabled && settings.independentFilters.gameFilter !== 'all' && (
                <span className="filter-active-badge">
                  {settings.independentFilters.gameFilter === 'modded' ? 'Moddées' : 'Non-moddées'}
                </span>
              )}
            </div>
          </div>
          
          {settings.independentFilters.gameTypeEnabled && (
            <div className="settings-filter-content">
              <div className="settings-radio-group-inline">
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="gameFilter"
                    value="all"
                    checked={settings.independentFilters.gameFilter === 'all'}
                    onChange={() => handleGameFilterChange('all')}
                  />
                  <span>Toutes</span>
                </label>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="gameFilter"
                    value="modded"
                    checked={settings.independentFilters.gameFilter === 'modded'}
                    onChange={() => handleGameFilterChange('modded')}
                  />
                  <span>Moddées</span>
                </label>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="gameFilter"
                    value="non-modded"
                    checked={settings.independentFilters.gameFilter === 'non-modded'}
                    onChange={() => handleGameFilterChange('non-modded')}
                  />
                  <span>Non-moddées</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className={`settings-filter-card ${settings.independentFilters.dateRangeEnabled ? 'active' : ''}`}>
          <div className="settings-filter-header">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.independentFilters.dateRangeEnabled}
                onChange={(e) => handleDateRangeToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <h4>📅 Filtrer par Période</h4>
            <div className="settings-filter-status">
              {settings.independentFilters.dateRangeEnabled && (settings.independentFilters.dateRange.start || settings.independentFilters.dateRange.end) && (
                <span className="filter-active-badge">
                  {settings.independentFilters.dateRange.start || 'Début'} - {settings.independentFilters.dateRange.end || 'Fin'}
                </span>
              )}
            </div>
          </div>
          
          {settings.independentFilters.dateRangeEnabled && (
            <div className="settings-filter-content">
              <div className="settings-date-inputs">
                <div>
                  <label htmlFor="date-start" className="settings-label">Du :</label>
                  <input
                    id="date-start"
                    type="date"
                    value={settings.independentFilters.dateRange.start || ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="settings-input"
                  />
                </div>
                <div>
                  <label htmlFor="date-end" className="settings-label">Au :</label>
                  <input
                    id="date-end"
                    type="date"
                    value={settings.independentFilters.dateRange.end || ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="settings-input"
                  />
                </div>
              </div>
              <small className="settings-hint">
                Laissez vide pour ne pas limiter le début ou la fin de la période.
              </small>
            </div>
          )}
        </div>

        {/* Map Name Filter */}
        <div className={`settings-filter-card ${settings.independentFilters.mapNameEnabled ? 'active' : ''}`}>
          <div className="settings-filter-header">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.independentFilters.mapNameEnabled}
                onChange={(e) => handleMapNameToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <h4>🗺️ Filtrer par Carte</h4>
            <div className="settings-filter-status">
              {settings.independentFilters.mapNameEnabled && settings.independentFilters.mapNameFilter !== 'all' && (
                <span className="filter-active-badge">
                  {settings.independentFilters.mapNameFilter === 'village' ? 'Village' : 
                   settings.independentFilters.mapNameFilter === 'chateau' ? 'Château' : 'Autres'}
                </span>
              )}
            </div>
          </div>
          
          {settings.independentFilters.mapNameEnabled && (
            <div className="settings-filter-content">
              <div className="settings-radio-group-inline">
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="mapNameFilter"
                    value="all"
                    checked={settings.independentFilters.mapNameFilter === 'all'}
                    onChange={() => handleMapNameFilterChange('all')}
                  />
                  <span>Toutes</span>
                </label>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="mapNameFilter"
                    value="village"
                    checked={settings.independentFilters.mapNameFilter === 'village'}
                    onChange={() => handleMapNameFilterChange('village')}
                  />
                  <span>Village</span>
                </label>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="mapNameFilter"
                    value="chateau"
                    checked={settings.independentFilters.mapNameFilter === 'chateau'}
                    onChange={() => handleMapNameFilterChange('chateau')}
                  />
                  <span>Château</span>
                </label>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="mapNameFilter"
                    value="others"
                    checked={settings.independentFilters.mapNameFilter === 'others'}
                    onChange={() => handleMapNameFilterChange('others')}
                  />
                  <span>Autres</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Player Filter */}
        <div className={`settings-filter-card ${settings.independentFilters.playerFilter.mode !== 'none' ? 'active' : ''}`}>
          <div className="settings-filter-header">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.independentFilters.playerFilter.mode !== 'none'}
                onChange={(e) => handlePlayerFilterModeChange(e.target.checked ? 'include' : 'none')}
              />
              <span className="toggle-slider"></span>
            </label>
            <h4>👥 Filtrer par Joueurs</h4>
            <div className="settings-filter-status">
              {settings.independentFilters.playerFilter.mode !== 'none' && settings.independentFilters.playerFilter.players.length > 0 && (
                <span className="filter-active-badge">
                  {settings.independentFilters.playerFilter.players.length} joueur{settings.independentFilters.playerFilter.players.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          {settings.independentFilters.playerFilter.mode !== 'none' && (
            <div className="settings-filter-content">
              {/* Player filter mode selection */}
              <div className="settings-radio-group-inline" style={{ marginBottom: '1rem' }}>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="playerFilterMode"
                    value="include"
                    checked={settings.independentFilters.playerFilter.mode === 'include'}
                    onChange={() => handlePlayerFilterModeChange('include')}
                  />
                  <span>Inclure</span>
                </label>
                <label className="settings-radio-inline">
                  <input
                    type="radio"
                    name="playerFilterMode"
                    value="exclude"
                    checked={settings.independentFilters.playerFilter.mode === 'exclude'}
                    onChange={() => handlePlayerFilterModeChange('exclude')}
                  />
                  <span>Exclure</span>
                </label>
              </div>

              {/* Player selection */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="settings-label">
                    Joueurs ({settings.independentFilters.playerFilter.players.length} sélectionné{settings.independentFilters.playerFilter.players.length > 1 ? 's' : ''}) :
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllPlayers}
                      className="settings-btn-small"
                      disabled={selectablePlayers.size === 0}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPlayers}
                      className="settings-btn-small"
                      disabled={settings.independentFilters.playerFilter.players.length === 0}
                    >
                      Aucun
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="settings-player-grid">
                {availablePlayers.map(player => {
                  const isSelected = settings.independentFilters!.playerFilter.players.includes(player);
                  const isSelectable = selectablePlayers.has(player);
                  
                  return (
                    <label
                      key={player}
                      className={`settings-player-option ${isSelected ? 'selected' : ''} ${!isSelectable ? 'disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isSelectable}
                        onChange={() => handlePlayerToggle(player)}
                      />
                      <span>{player}</span>
                    </label>
                  );
                })}
              </div>
              
              <small className="settings-hint">
                Sélectionnez les joueurs à {settings.independentFilters.playerFilter.mode === 'include' ? 'inclure dans' : 'exclure du'} le filtrage.
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="settings-info">
        <p>
          <strong>Résumé:</strong> {filteredGames.length} partie{filteredGames.length > 1 ? 's' : ''} 
          {activeFilterCount > 0 ? ` (avec ${activeFilterCount} filtre${activeFilterCount > 1 ? 's' : ''} actif${activeFilterCount > 1 ? 's' : ''})` : ' (aucun filtre actif)'}
          {settings.highlightedPlayer && ` • "${settings.highlightedPlayer}" mis en évidence`}
          {settings.dataSource === 'discord' && ` • 📊 Équipe Discord`}
        </p>
      </div>
      
      {/* Shareable URL */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>🔗 Partage des Filtres</h3>
        </div>
        <div className="settings-group">
          <p className="settings-explanation">
            Copiez le lien ci-dessous pour partager les filtres actuels avec d'autres personnes.
            Ils pourront ouvrir le site avec ces mêmes filtres appliqués.
          </p>
          <ShareableUrl />
        </div>
      </div>
      

    </div>
  );
}