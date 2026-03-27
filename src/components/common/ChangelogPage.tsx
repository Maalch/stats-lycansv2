import { CHANGELOG } from '../../config/version';
import type { ChangelogEntry } from '../../config/version';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { AchievementStar } from '../playerselection/AchievementStar';

interface ChangelogPageProps {
  onClose: () => void;
}

export function ChangelogPage({ onClose }: ChangelogPageProps) {
  const { navigateToTab, updateNavigationState } = useNavigation();
  const { settings, updateSettings } = useSettings();

  const handleLinkClick = (mainTab: string, subTab?: string, navigationState?: Record<string, any>) => {
    // Set navigation state first if provided
    if (navigationState) {
      updateNavigationState(navigationState);
    }

    // For playerSelection links, sync view to settings and auto-select a default player
    if (mainTab === 'playerSelection') {
      const settingsUpdate: Record<string, any> = {};

      if (navigationState?.selectedPlayerSelectionView) {
        settingsUpdate.selectedPlayerSelectionView = navigationState.selectedPlayerSelectionView;
      }

      if (!settings.highlightedPlayer) {
        settingsUpdate.highlightedPlayer = settings.dataSource === 'discord' ? 'Nales' : 'Ponce';
      }

      if (Object.keys(settingsUpdate).length > 0) {
        updateSettings(settingsUpdate);
      }
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

/**
 * Render description text with colored achievement stars
 * Replaces patterns like (⭐/⭐⭐/⭐⭐⭐/🐺) with actual AchievementStar components
 */
function renderDescriptionWithStars(description: string) {
  // Pattern: (⭐/⭐⭐/⭐⭐⭐/🐺) where each section represents a tier
  const starPattern = /\(⭐\/⭐⭐\/⭐⭐⭐\/🐺\)/g;
  
  const parts: (string | React.JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = starPattern.exec(description)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(description.substring(lastIndex, match.index));
    }
    
    // Add colored star components
    parts.push(
      <span key={match.index} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', margin: '0 0.2rem' }}>
        <AchievementStar tier="bronze" filled={true} size={14} />
        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85em' }}>/</span>
        <AchievementStar tier="argent" filled={true} size={14} />
        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85em' }}>/</span>
        <AchievementStar tier="or" filled={true} size={14} />
        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85em' }}>/</span>
        <span style={{ fontSize: '14px' }}>🐺</span>
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < description.length) {
    parts.push(description.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : description;
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
        {renderDescriptionWithStars(entry.description)}
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