import { useSettings } from '../../context/SettingsContext';
import type { GameFilter, FilterMode } from '../../context/SettingsContext';
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
      
      <div className="settings-info">
        <p>
          <strong>Note:</strong> Les changements de paramètres sont sauvegardés automatiquement 
          et s'appliquent à toutes les statistiques affichées.
        </p>
      </div>
    </div>
  );
}