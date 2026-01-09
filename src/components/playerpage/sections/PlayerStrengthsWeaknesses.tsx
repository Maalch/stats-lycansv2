import type { StrengthWeakness } from '../usePlayerInsights';
import './PlayerStrengthsWeaknesses.css';

interface PlayerStrengthsWeaknessesProps {
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
}

function getCategoryIcon(category: StrengthWeakness['category']): string {
  switch (category) {
    case 'camp': return '🏕️';
    case 'map': return '🗺️';
    case 'role': return '🎭';
    case 'voting': return '🗳️';
    case 'survival': return '💪';
    case 'general': return '📊';
    default: return '✨';
  }
}

export function PlayerStrengthsWeaknesses({ strengths, weaknesses }: PlayerStrengthsWeaknessesProps) {
  const hasStrengths = strengths.length > 0;
  const hasWeaknesses = weaknesses.length > 0;
  
  if (!hasStrengths && !hasWeaknesses) {
    return (
      <div className="player-page-section strengths-weaknesses-section">
        <h2 className="section-title">💡 Points forts & Points faibles</h2>
        <p className="no-data">Pas assez de données pour analyser les forces et faiblesses.</p>
      </div>
    );
  }
  
  return (
    <div className="player-page-section strengths-weaknesses-section">
      <h2 className="section-title">💡 Points forts & Points faibles</h2>
      
      <div className="sw-container">
        {/* Strengths */}
        {hasStrengths && (
          <div className="sw-column strengths-column">
            <h3 className="sw-column-title">
              <span className="sw-icon">✅</span>
              Points forts
            </h3>
            <ul className="sw-list">
              {strengths.map((strength, index) => (
                <li key={index} className="sw-item strength-item">
                  <span className="sw-category-icon">{getCategoryIcon(strength.category)}</span>
                  <span className="sw-description">{strength.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Weaknesses */}
        {hasWeaknesses && (
          <div className="sw-column weaknesses-column">
            <h3 className="sw-column-title">
              <span className="sw-icon">⚠️</span>
              Axes d'amélioration
            </h3>
            <ul className="sw-list">
              {weaknesses.map((weakness, index) => (
                <li key={index} className="sw-item weakness-item">
                  <span className="sw-category-icon">{getCategoryIcon(weakness.category)}</span>
                  <span className="sw-description">{weakness.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
