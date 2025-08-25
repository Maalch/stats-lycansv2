import { useMemo, useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import type { GameFilter, FilterMode, PlayerFilterMode } from '../../context/SettingsContext';
import type { RawGameData } from '../../hooks/useRawGameData';
import './SettingsPanel.css';

export function SettingsPanel() {

  const { settings, updateSettings, resetSettings } = useSettings();
  const [rawGameData, setRawGameData] = useState<RawGameData[] | null>(null);

  // Fetch unfiltered game data to get all players
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/rawGameData.json`);
        const result = await response.json();
        setRawGameData(result.data || []);
      } catch (error) {
        console.error('Error fetching raw game data:', error);
      }
    };
    fetchData();
  }, []);

  // Get sorted list of players from the UNFILTERED data to avoid disappearing players
  const availablePlayers = useMemo(() => {
    if (!rawGameData) return [];
    
    const allPlayers = new Set<string>();
    rawGameData.forEach((game: RawGameData) => {
      const playerList = game["Liste des joueurs"];
      if (playerList) {
        const players = playerList.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        players.forEach((player: string) => allPlayers.add(player));
      }
    });
    
    return Array.from(allPlayers).sort();
  }, [rawGameData]);

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
    updateSettings({ playerFilter: { ...settings.playerFilter, players: [...availablePlayers] } });
  };

  const handleDeselectAllPlayers = () => {
    updateSettings({ playerFilter: { ...settings.playerFilter, players: [] } });
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
            <h3>Filtre Principal</h3>
          </div>

          <div className="settings-group">
            <h4>Mode de Filtrage</h4>
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
                  Par type de partie
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
                  Par plage de dates
                </span>
              </label>
            </div>
          </div>

          {settings.filterMode === 'gameType' && (
            <div className="settings-group">
              <h4>Filtres de Parties</h4>
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
                    Toutes les parties
                    <small>Affiche toutes les parties disponibles</small>
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
              <h4>Plage de dates</h4>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500 }}>
                  Début
                  <input
                    type="date"
                    value={settings.dateRange.start || ''}
                    onChange={e => handleDateChange('start', e.target.value)}
                    style={{ marginTop: 4, fontSize: '1rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
                    max={settings.dateRange.end || undefined}
                  />
                </label>
                <span style={{ fontWeight: 600 }}>—</span>
                <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500 }}>
                  Fin
                  <input
                    type="date"
                    value={settings.dateRange.end || ''}
                    onChange={e => handleDateChange('end', e.target.value)}
                    style={{ marginTop: 4, fontSize: '1rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
                    min={settings.dateRange.start || undefined}
                  />
                </label>
              </div>
              <small style={{ color: 'var(--text-secondary, #6c757d)', marginTop: 8, display: 'block' }}>
                Affiche uniquement les parties comprises dans la plage de dates sélectionnée.
              </small>
            </div>
          )}
        </div>
        
        {/* SECTION 2: Additional Player Filter */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Filtre Additionnel par Joueurs</h3>
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
                  <small>Affiche uniquement les parties où au moins un des joueurs listés a participé</small>
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
                    Sélection des joueurs ({settings.playerFilter.players.length} sélectionné{settings.playerFilter.players.length !== 1 ? 's' : ''})
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
                  {availablePlayers.map(player => (
                    <label key={player} className="settings-player-checkbox">
                      <input
                        type="checkbox"
                        checked={settings.playerFilter.players.includes(player)}
                        onChange={() => handlePlayerToggle(player)}
                      />
                      <span className="settings-player-checkmark"></span>
                      <span className="settings-player-name">{player}</span>
                    </label>
                  ))}
                </div>
                
                <small style={{ color: 'var(--text-secondary, #6c757d)', marginTop: 8, display: 'block' }}>
                  Sélectionnez les joueurs à {settings.playerFilter.mode === 'include' ? 'inclure' : 'exclure'} dans le filtrage.
                </small>
              </div>
            )}
          </div>
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