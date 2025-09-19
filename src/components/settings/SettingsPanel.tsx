import { useMemo, useState, useEffect, useRef } from 'react';
import { useSettings } from '../../context/SettingsContext';
import type { GameFilter, FilterMode, PlayerFilterMode } from '../../context/SettingsContext';
import type { GameLogEntry } from '../../hooks/useCombinedRawData';
import { ShareableUrl } from '../common/ShareableUrl';
import './SettingsPanel.css';

export function SettingsPanel() {

  const { settings, updateSettings, resetSettings } = useSettings();
  const [gameLogData, setGameLogData] = useState<GameLogEntry[] | null>(null);
  
  // Ref to track previous primary filter values
  const prevPrimaryFilter = useRef({
    filterMode: settings.filterMode,
    gameFilter: settings.gameFilter,
    dateStart: settings.dateRange.start,
    dateEnd: settings.dateRange.end
  });

  // Fetch unfiltered game data to get all players
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/gameLog.json`);
        const result = await response.json();
        setGameLogData(result.GameStats || []);
      } catch (error) {
        console.error('Error fetching game log data:', error);
      }
    };
    fetchData();
  }, []);

  // Reset player filter when primary filter changes to avoid inconsistencies
  useEffect(() => {
    const current = {
      filterMode: settings.filterMode,
      gameFilter: settings.gameFilter,
      dateStart: settings.dateRange.start,
      dateEnd: settings.dateRange.end
    };

    // Check if any primary filter value has changed
    const hasChanged = 
      prevPrimaryFilter.current.filterMode !== current.filterMode ||
      prevPrimaryFilter.current.gameFilter !== current.gameFilter ||
      prevPrimaryFilter.current.dateStart !== current.dateStart ||
      prevPrimaryFilter.current.dateEnd !== current.dateEnd;

    // Reset player filter if primary filter changed and there are selected players
    if (hasChanged && settings.playerFilter.players.length > 0) {
      updateSettings({ 
        playerFilter: { 
          mode: settings.playerFilter.mode, 
          players: [] 
        } 
      });
    }

    // Update the ref with current values
    prevPrimaryFilter.current = current;
  }, [settings.filterMode, settings.gameFilter, settings.dateRange.start, settings.dateRange.end, settings.playerFilter.players.length, updateSettings]);

  // Helper to parse ISO date string to Date
  const parseISODate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  // Filter games based on current primary filter (game type or date range)
  const filteredGames = useMemo(() => {
    if (!gameLogData) return [];

    return gameLogData.filter(game => {
      // Apply game type filter
      if (settings.filterMode === 'gameType') {
        if (settings.gameFilter === 'modded' && !game.Modded) return false;
        if (settings.gameFilter === 'non-modded' && game.Modded) return false;
      }
      
      // Apply date range filter
      if (settings.filterMode === 'dateRange') {
        if (settings.dateRange.start || settings.dateRange.end) {
          const gameDateObj = parseISODate(game.StartDate);
          if (!gameDateObj) return false;
          if (settings.dateRange.start) {
            const startObj = new Date(settings.dateRange.start);
            if (gameDateObj < startObj) return false;
          }
          if (settings.dateRange.end) {
            const endObj = new Date(settings.dateRange.end);
            if (gameDateObj > endObj) return false;
          }
        }
      }
      
      return true;
    });
  }, [gameLogData, settings.filterMode, settings.gameFilter, settings.dateRange]);

  // Get all players from filtered games (based on primary filter)
  const playersFromFilteredGames = useMemo(() => {
    const allPlayers = new Set<string>();
    filteredGames.forEach((game: GameLogEntry) => {
      game.PlayerStats.forEach((playerStat) => {
        allPlayers.add(playerStat.Username);
      });
    });
    return Array.from(allPlayers);
  }, [filteredGames]);

  // Get player compatibility data for include/exclude logic
  const playerCompatibility = useMemo(() => {
    const compatibility: Record<string, Set<string>> = {};
    
    filteredGames.forEach((game: GameLogEntry) => {
      const players = game.PlayerStats.map(p => p.Username);
      
      // For each player, record who they've played with
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

  // Calculate which players should be selectable based on current player filter selections
  const { availablePlayers, selectablePlayers } = useMemo(() => {
    const available = playersFromFilteredGames.sort();
    
    if (settings.playerFilter.mode === 'none' || settings.playerFilter.players.length === 0) {
      return { availablePlayers: available, selectablePlayers: new Set(available) };
    }
    
    const selectable = new Set<string>();
    
    if (settings.playerFilter.mode === 'include') {
      // For include mode: only show players who have played with ALL currently selected players
      available.forEach(player => {
        if (settings.playerFilter.players.includes(player)) {
          // Already selected players are always selectable
          selectable.add(player);
        } else {
          // Check if this player has played with ALL selected players
          const hasPlayedWithAll = settings.playerFilter.players.every(selectedPlayer => 
            playerCompatibility[player]?.has(selectedPlayer) || false
          );
          if (hasPlayedWithAll) {
            selectable.add(player);
          }
        }
      });
    } else if (settings.playerFilter.mode === 'exclude') {
      // For exclude mode: only show players who have NOT played ONLY with the excluded players
      available.forEach(player => {
        if (settings.playerFilter.players.includes(player)) {
          // Already selected players are always selectable
          selectable.add(player);
        } else {
          // Check if this player has games without any of the excluded players
          const hasGamesWithoutExcluded = filteredGames.some(game => {
            const gamePlayers = game.PlayerStats.map(p => p.Username.toLowerCase());
            const playerInGame = gamePlayers.includes(player.toLowerCase());
            if (!playerInGame) return false;
            
            // Check if any excluded player is in this game
            const hasExcludedPlayer = settings.playerFilter.players.some(excludedPlayer => 
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
  }, [playersFromFilteredGames, settings.playerFilter, playerCompatibility, filteredGames]);

  const handleFilterModeChange = (mode: FilterMode) => {
    updateSettings({ filterMode: mode });
  };

  const handleGameFilterChange = (filter: GameFilter) => {
    updateSettings({ gameFilter: filter });
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    updateSettings({ dateRange: { ...settings.dateRange, [field]: value || null } });
  };

  const handlePlayerFilterModeChange = (mode: PlayerFilterMode) => {
    updateSettings({ playerFilter: { ...settings.playerFilter, mode } });
  };

  const handlePlayerToggle = (playerName: string) => {
    const currentPlayers = settings.playerFilter.players;
    const isSelected = currentPlayers.includes(playerName);
    
    if (isSelected) {
      // Remove player
      const newPlayers = currentPlayers.filter(p => p !== playerName);
      updateSettings({ playerFilter: { ...settings.playerFilter, players: newPlayers } });
    } else {
      // Add player
      updateSettings({ playerFilter: { ...settings.playerFilter, players: [...currentPlayers, playerName] } });
    }
  };

  const handleSelectAllPlayers = () => {
    updateSettings({ playerFilter: { ...settings.playerFilter, players: [...selectablePlayers] } });
  };

  const handleDeselectAllPlayers = () => {
    updateSettings({ playerFilter: { ...settings.playerFilter, players: [] } });
  };

  const handleHighlightedPlayerChange = (playerName: string) => {
    updateSettings({ highlightedPlayer: playerName || null });
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Paramètres de Filtrage</h3>
        <button 
          onClick={resetSettings}
          className="settings-reset-btn"
          type="button"
        >
          Réinitialiser
        </button>
      </div>
      
      <div className="settings-sections-container">
        {/* SECTION 1: Primary Filter Mode */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>1. Filtre Principal</h3>
          </div>

          <div className="settings-group">
            <h4>Mode de Filtrage</h4>
            <p className="settings-explanation">
              Choisissez le type de filtre principal à appliquer aux données :
            </p>
            <div className="settings-radio-group" style={{ flexDirection: 'row', gap: '2rem' }}>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="filterMode"
                  value="gameType"
                  checked={settings.filterMode === 'gameType'}
                  onChange={() => handleFilterModeChange('gameType')}
                />
                <span className="radio-mark"></span>
                <span className="settings-radio-content">
                  Filtrer par type de partie
                  <small>Sélectionner selon le type de jeu (moddé/standard)</small>
                </span>
              </label>
              <label className="settings-radio">
                <input
                  type="radio"
                  name="filterMode"
                  value="dateRange"
                  checked={settings.filterMode === 'dateRange'}
                  onChange={() => handleFilterModeChange('dateRange')}
                />
                <span className="radio-mark"></span>
                <span className="settings-radio-content">
                  Filtrer par période
                  <small>Sélectionner selon une plage de dates</small>
                </span>
              </label>
            </div>
          </div>

          {settings.filterMode === 'gameType' && (
            <div className="settings-group">
              <h4>Filtres de Type de Partie</h4>
              <div className="settings-radio-group">
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="gameFilter"
                    value="all"
                    checked={settings.gameFilter === 'all'}
                    onChange={() => handleGameFilterChange('all')}
                  />
                  <span className="radio-mark"></span>
                  <span className="settings-radio-content">
                    Tous les types de parties
                    <small>Inclut toutes les parties, moddées et non-moddées</small>
                  </span>
                </label>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="gameFilter"
                    value="modded"
                    checked={settings.gameFilter === 'modded'}
                    onChange={() => handleGameFilterChange('modded')}
                  />
                  <span className="radio-mark"></span>
                  <span className="settings-radio-content">
                    Parties moddées uniquement
                    <small>Affiche uniquement les parties avec des rôles modifiés</small>
                  </span>
                </label>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="gameFilter"
                    value="non-modded"
                    checked={settings.gameFilter === 'non-modded'}
                    onChange={() => handleGameFilterChange('non-modded')}
                  />
                  <span className="radio-mark"></span>
                  <span className="settings-radio-content">
                    Parties non-moddées uniquement
                    <small>Affiche uniquement les parties avec des rôles standards</small>
                  </span>
                </label>
              </div>
            </div>
          )}

          {settings.filterMode === 'dateRange' && (
            <div className="settings-group">
              <h4>Filtres de Dates</h4>
              <div className="settings-radio-group">
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="dateFilter"
                    value="all"
                    checked={!settings.dateRange.start && !settings.dateRange.end}
                    onChange={() => {
                      updateSettings({ dateRange: { start: null, end: null } });
                    }}
                  />
                  <span className="radio-mark"></span>
                  <span className="settings-radio-content">
                    Toutes les dates
                    <small>Affiche toutes les parties sans restriction de date</small>
                  </span>
                </label>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="dateFilter"
                    value="custom"
                    checked={!!(settings.dateRange.start || settings.dateRange.end)}
                    onChange={() => {
                      // When selecting custom range, set a default range if none exists
                      if (!settings.dateRange.start && !settings.dateRange.end) {
                        const today = new Date();
                        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                        updateSettings({ 
                          dateRange: { 
                            start: oneMonthAgo.toISOString().split('T')[0], 
                            end: today.toISOString().split('T')[0] 
                          } 
                        });
                      }
                    }}
                  />
                  <span className="radio-mark"></span>
                  <span className="settings-radio-content">
                    Plage de dates personnalisée
                    <small>Définir une période spécifique à analyser</small>
                  </span>
                </label>
              </div>
              
              {(settings.dateRange.start || settings.dateRange.end) && (
                <div className="settings-nested-group">
                  <div className="settings-date-inputs">
                    <label className="settings-date-label">
                      Date de début
                      <input
                        type="date"
                        value={settings.dateRange.start || ''}
                        onChange={e => handleDateChange('start', e.target.value)}
                        className="settings-date-input"
                        max={settings.dateRange.end || undefined}
                      />
                    </label>
                    <span className="settings-date-separator">—</span>
                    <label className="settings-date-label">
                      Date de fin
                      <input
                        type="date"
                        value={settings.dateRange.end || ''}
                        onChange={e => handleDateChange('end', e.target.value)}
                        className="settings-date-input"
                        min={settings.dateRange.start || undefined}
                      />
                    </label>
                  </div>
                  <small style={{ color: 'var(--text-secondary, #6c757d)', marginTop: 8, display: 'block' }}>
                    Laissez vide pour ne pas limiter le début ou la fin de la période.
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* SECTION 2: Additional Player Filter */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>2. Filtre Additionnel par Joueurs</h3>
          </div>

          <div className="settings-group">
            <div className="settings-radio-group">
              <label className="settings-radio">
                <input
                  type="radio"
                  name="playerFilterMode"
                  value="none"
                  checked={settings.playerFilter.mode === 'none'}
                  onChange={() => handlePlayerFilterModeChange('none')}
                />
                <span className="radio-mark"></span>
                <span className="settings-radio-content">
                  Aucun filtre par joueur
                  <small>Affiche toutes les parties sans restriction par joueur</small>
                </span>
              </label>
              
              <label className="settings-radio">
                <input
                  type="radio"
                  name="playerFilterMode"
                  value="include"
                  checked={settings.playerFilter.mode === 'include'}
                  onChange={() => handlePlayerFilterModeChange('include')}
                />
                <span className="radio-mark"></span>
                <span className="settings-radio-content">
                  Inclure seulement les parties avec ces joueurs
                  <small>Affiche uniquement les parties où TOUS les joueurs sélectionnés ont participé ensemble</small>
                </span>
              </label>
              
              <label className="settings-radio">
                <input
                  type="radio"
                  name="playerFilterMode"
                  value="exclude"
                  checked={settings.playerFilter.mode === 'exclude'}
                  onChange={() => handlePlayerFilterModeChange('exclude')}
                />
                <span className="radio-mark"></span>
                <span className="settings-radio-content">
                  Exclure les parties avec ces joueurs
                  <small>Affiche uniquement les parties où aucun des joueurs listés n'a participé</small>
                </span>
              </label>
            </div>
            
            {(settings.playerFilter.mode === 'include' || settings.playerFilter.mode === 'exclude') && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 500 }}>
                    Sélection des joueurs ({settings.playerFilter.players.length} sélectionné{settings.playerFilter.players.length !== 1 ? 's' : ''} sur {selectablePlayers.size} disponible{selectablePlayers.size !== 1 ? 's' : ''})
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllPlayers}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border-color, #ccc)',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary, #f0f0f0)',
                        color: 'var(--text-primary, #333)',
                        cursor: 'pointer'
                      }}
                    >
                      Tout sélectionner
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPlayers}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border-color, #ccc)',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary, #f0f0f0)',
                        color: 'var(--text-primary, #333)',
                        cursor: 'pointer'
                      }}
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>
                
                <div className="settings-player-grid">
                  {availablePlayers.map(player => {
                    const isSelectable = selectablePlayers.has(player);
                    const isSelected = settings.playerFilter.players.includes(player);
                    
                    return (
                      <label 
                        key={player} 
                        className={`settings-player-checkbox ${!isSelectable ? 'disabled' : ''}`}
                        style={{ 
                          opacity: isSelectable ? 1 : 0.5,
                          cursor: isSelectable ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => isSelectable && handlePlayerToggle(player)}
                          disabled={!isSelectable}
                        />
                        <span className="settings-player-checkmark"></span>
                        <span className="settings-player-name" title={!isSelectable && !isSelected ? 
                          `${player} n'a ${settings.playerFilter.mode === 'include' ? 
                            'pas joué avec tous les joueurs sélectionnés' : 
                            'que des parties avec les joueurs exclus'
                          }` : player
                        }>
                          {player}
                        </span>
                      </label>
                    );
                  })}
                </div>
                
                <small style={{ color: 'var(--text-secondary, #6c757d)', marginTop: 8, display: 'block' }}>
                  Sélectionnez les joueurs à {settings.playerFilter.mode === 'include' ? 'inclure' : 'exclure'} dans le filtrage.
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* SECTION 3: Highlighted Player */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>3. Joueur à Mettre en Évidence</h3>
        </div>
        <div className="settings-group">
          <p className="settings-explanation">
            Sélectionnez un joueur qui sera toujours affiché et mis en évidence dans tous les graphiques généraux, 
            même s'il n'est pas dans le top classement.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <label htmlFor="highlighted-player-select" style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: 'var(--text-primary)', 
              fontWeight: '500' 
            }}>
              Joueur à mettre en évidence :
            </label>
            <select
              id="highlighted-player-select"
              value={settings.highlightedPlayer || ''}
              onChange={(e) => handleHighlightedPlayerChange(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              <option value="">Aucun joueur sélectionné</option>
              {availablePlayers.map(player => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
            {settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                marginTop: '0.5rem',
                fontStyle: 'italic'
              }}>
                Le joueur "{settings.highlightedPlayer}" sera mis en évidence dans tous les graphiques.
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>4. Partage des Paramètres</h3>
        </div>
        <div className="settings-group">
          <p className="settings-explanation">
            Copiez le lien ci-dessous pour partager les paramètres actuels avec d'autres personnes.
            Ils pourront ouvrir le site avec ces mêmes filtres appliqués.
          </p>
          <ShareableUrl />
        </div>
      </div>
      
      <div className="settings-info">
        <p>
          <strong>Note:</strong> Les changements de paramètres sont sauvegardés automatiquement 
          et s'appliquent à toutes les statistiques affichées.
        </p>
      </div>
    </div>
  );
}