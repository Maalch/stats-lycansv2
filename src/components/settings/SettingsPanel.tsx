import { useSettings } from '../../context/SettingsContext';
import type { GameFilter, FilterMode, PlayerFilterMode } from '../../context/SettingsContext';
import './SettingsPanel.css';

export function SettingsPanel() {

  const { settings, updateSettings, resetSettings } = useSettings();

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

  const handlePlayerListChange = (value: string) => {
    const players = value
      .split(',')
      .map(player => player.trim())
      .filter(player => player.length > 0);
    updateSettings({ playerFilter: { ...settings.playerFilter, players } });
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
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Liste des joueurs (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={settings.playerFilter.players.join(', ')}
                  onChange={e => handlePlayerListChange(e.target.value)}
                  placeholder="Joueur1, Joueur2, Joueur3..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '1rem',
                    border: '1px solid var(--border-color, #ccc)',
                    borderRadius: '4px',
                    background: 'var(--bg-primary, white)',
                    color: 'var(--text-primary, #333)'
                  }}
                />
                <small style={{ color: 'var(--text-secondary, #6c757d)', marginTop: 4, display: 'block' }}>
                  Entrez les noms des joueurs séparés par des virgules. La casse sera ignorée.
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="settings-info">
        <p>
          <strong>Fonctionnement des filtres:</strong> Le filtre principal (Section 1) détermine la base des parties affichées. 
          Le filtre par joueurs (Section 2) s'applique ensuite sur cette sélection pour affiner davantage les résultats.
        </p>
        <p style={{ marginTop: 8 }}>
          <strong>Note:</strong> Les changements de paramètres sont sauvegardés automatiquement 
          et s'appliquent à toutes les statistiques affichées.
        </p>
      </div>
    </div>
  );
}