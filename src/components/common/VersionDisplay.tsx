import { APP_VERSION } from '../../config/version';

interface VersionDisplayProps {
  onVersionClick: () => void;
  onAchievementClick: () => void;
}

export function VersionDisplay({ onVersionClick, onAchievementClick }: VersionDisplayProps) {
  return (
    <div className="lycans-version-container">
      <div 
        className="lycans-version-badge" 
        onClick={onAchievementClick}
        title="Cliquez pour découvrir les Succès !"
      >
        🐺 NOUVEAUTÉ : SUCCÈS !
      </div>
      <div 
        className="lycans-version-display"
        onClick={onVersionClick}
        title="Cliquez pour voir l'historique des changements"
      >
        <span className="lycans-version-label">v</span>
        <span className="lycans-version-number">{APP_VERSION}</span>
      </div>
    </div>
  );
}