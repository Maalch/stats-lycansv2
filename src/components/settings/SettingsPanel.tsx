import { useSettings } from '../../context/SettingsContext';
import './SettingsPanel.css';

export function SettingsPanel() {
  const { settings, updateSettings, resetSettings } = useSettings();

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
        <h4>Filtres de Parties</h4>
        
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={settings.showOnlyModdedGames}
            onChange={(e) => updateSettings({ showOnlyModdedGames: e.target.checked })}
          />
          <span className="checkmark"></span>
          Afficher uniquement les parties moddées
          <small>Filtre toutes les statistiques pour ne montrer que les parties avec des rôles modifiés</small>
        </label>
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