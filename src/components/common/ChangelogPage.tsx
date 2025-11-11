import { CHANGELOG } from '../../config/version';
import type { ChangelogEntry } from '../../config/version';
import { useNavigation } from '../../context/NavigationContext';

interface ChangelogPageProps {
  onClose: () => void;
}

export function ChangelogPage({ onClose }: ChangelogPageProps) {
  const { navigateToTab, updateNavigationState } = useNavigation();

  const handleLinkClick = (mainTab: string, subTab?: string, navigationState?: Record<string, any>) => {
    // Set navigation state first if provided
    if (navigationState) {
      updateNavigationState(navigationState);
    }
    // Then navigate to the tab
    navigateToTab(mainTab, subTab);
    onClose(); // Close the changelog after navigation
  };

  return (
    <div className="lycans-changelog-overlay">
      <div className="lycans-changelog-container">
        <header className="lycans-changelog-header">
          <h2>📝 Historique des Changements</h2>
          <button 
            className="lycans-changelog-close"
            onClick={onClose}
            title="Fermer"
          >
            ✕
          </button>
        </header>
        
        <div className="lycans-changelog-content">
          {CHANGELOG.map((entry, index) => (
            <ChangelogItem 
              key={entry.version} 
              entry={entry} 
              isLatest={index === 0}
              onLinkClick={handleLinkClick}
            />
          ))}
        </div>
        
        <footer className="lycans-changelog-footer">
          <p>
            Vous avez des suggestions d'améliorations ? 
            <a 
              href="mailto:admin@lycanstracker.fr" 
              className="lycans-changelog-contact"
              title="Contactez-nous pour vos suggestions"
            >
              📧 Contactez-nous !
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

interface ChangelogItemProps {
  entry: ChangelogEntry;
  isLatest: boolean;
  onLinkClick: (mainTab: string, subTab?: string, navigationState?: Record<string, any>) => void;
}

function ChangelogItem({ entry, isLatest, onLinkClick }: ChangelogItemProps) {
  return (
    <div className={`lycans-changelog-item ${isLatest ? 'latest' : ''}`}>
      <div className="lycans-changelog-item-header">
        <span className="lycans-changelog-version">
          {entry.version}
          {isLatest && <span className="lycans-changelog-latest-badge">Nouveau</span>}
        </span>
        <span className="lycans-changelog-date">{entry.date}</span>
      </div>
      <div className="lycans-changelog-description">
        {entry.description}
        {entry.link && (
          <>
            {' '}
            <button
              className="lycans-changelog-link"
              onClick={() => onLinkClick(entry.link!.mainTab, entry.link!.subTab, entry.link!.navigationState)}
              title={`Naviguer vers ${entry.link.text}`}
            >
              {entry.link.text}
            </button>
            .
          </>
        )}
      </div>
    </div>
  );
}