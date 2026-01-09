import type { Comparison } from '../usePlayerInsights';
import './PlayerComparisons.css';

interface PlayerComparisonsProps {
  comparisons: Comparison[];
}

export function PlayerComparisons({ comparisons }: PlayerComparisonsProps) {
  if (comparisons.length === 0) {
    return (
      <div className="player-page-section comparisons-section">
        <h2 className="section-title">📊 Comparaison aux moyennes</h2>
        <p className="no-data">Pas assez de données pour comparer.</p>
      </div>
    );
  }
  
  return (
    <div className="player-page-section comparisons-section">
      <h2 className="section-title">📊 Comparaison aux moyennes</h2>
      
      <div className="comparisons-list">
        {comparisons.map((comparison, index) => {
          const isPositive = comparison.difference > 0;
          const diffAbs = Math.abs(comparison.difference);
          const significantDiff = diffAbs > 5;
          
          return (
            <div key={index} className="comparison-row">
              <div className="comparison-label">{comparison.metric}</div>
              
              <div className="comparison-values">
                {/* Player Value */}
                <div className={`comparison-player-value ${isPositive ? 'positive' : 'negative'}`}>
                  {comparison.playerValue.toFixed(1)}{comparison.unit}
                </div>
                
                {/* Visual Bar */}
                <div className="comparison-bar-container">
                  <div className="comparison-bar-bg">
                    <div 
                      className={`comparison-bar-fill ${isPositive ? 'positive' : 'negative'}`}
                      style={{ 
                        width: `${Math.min(Math.abs(comparison.difference) * 2, 50)}%`,
                        [isPositive ? 'left' : 'right']: '50%'
                      }}
                    />
                    <div className="comparison-bar-center" />
                  </div>
                </div>
                
                {/* Difference Badge */}
                <div className={`comparison-diff ${isPositive ? 'positive' : 'negative'} ${significantDiff ? 'significant' : ''}`}>
                  {isPositive ? '+' : ''}{comparison.difference.toFixed(1)}
                </div>
              </div>
              
              {/* Global Average */}
              <div className="comparison-average">
                <span className="average-label">Moyenne:</span>
                <span className="average-value">
                  {comparison.globalAverage.toFixed(1)}{comparison.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="comparisons-legend">
        <span className="legend-item positive">● Au-dessus de la moyenne</span>
        <span className="legend-item negative">● En-dessous de la moyenne</span>
      </div>
    </div>
  );
}
