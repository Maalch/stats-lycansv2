import type { FunFact } from '../usePlayerInsights';
import './PlayerFunFacts.css';

interface PlayerFunFactsProps {
  funFacts: FunFact[];
}

export function PlayerFunFacts({ funFacts }: PlayerFunFactsProps) {
  if (funFacts.length === 0) {
    return (
      <div className="player-page-section funfacts-section">
        <h2 className="section-title">🎯 Faits intéressants</h2>
        <p className="no-data">Pas assez de données pour générer des faits intéressants.</p>
      </div>
    );
  }
  
  return (
    <div className="player-page-section funfacts-section">
      <h2 className="section-title">🎯 Faits intéressants</h2>
      
      <div className="funfacts-grid">
        {funFacts.map((fact, index) => (
          <div key={index} className="funfact-card">
            <div className="funfact-emoji">{fact.emoji}</div>
            <div className="funfact-content">
              <h4 className="funfact-title">{fact.title}</h4>
              <p className="funfact-description">{fact.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
