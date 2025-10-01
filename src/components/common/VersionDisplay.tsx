import { APP_VERSION } from '../../config/version';

interface VersionDisplayProps {
  onVersionClick: () => void;
}

export function VersionDisplay({ onVersionClick }: VersionDisplayProps) {
  return (
    <div 
      className="lycans-version-display"
      onClick={onVersionClick}
      title="Cliquez pour voir l'historique des changements"
    >
      <span className="lycans-version-label">v</span>
      <span className="lycans-version-number">{APP_VERSION}</span>
    </div>
  );
}