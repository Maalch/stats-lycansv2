import type { PredictionResult, TrainedModel, PlayerModifier } from '../../../types/whatIfSimulator';

interface PredictionDisplayProps {
  prediction: PredictionResult | null;
  model: TrainedModel | null;
  playerModifiers: PlayerModifier[];
}

export function PredictionDisplay({ prediction, model, playerModifiers }: PredictionDisplayProps) {
  if (!prediction || !model) {
    return (
      <div className="whatif-prediction">
        <div className="whatif-prediction-title">🎯 Prédiction</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configurez une composition pour voir la prédiction.
        </div>
      </div>
    );
  }

  const confidenceLevel = prediction.confidence >= 0.6 ? 'high' :
    prediction.confidence >= 0.3 ? 'medium' : 'low';
  const confidenceLabel = confidenceLevel === 'high' ? 'Élevée' :
    confidenceLevel === 'medium' ? 'Moyenne' : 'Faible';

  const bars = [
    { label: 'Villageois', prob: prediction.villageoisWinProb, className: 'villageois' },
    { label: 'Loups', prob: prediction.loupWinProb, className: 'loup' },
    { label: 'Solo', prob: prediction.soloWinProb, className: 'solo' },
  ];

  return (
    <div className="whatif-prediction">
      <div className="whatif-prediction-title">
        🎯 Probabilités de victoire
      </div>

      <div className="whatif-prob-bars">
        {bars.map(bar => (
          <div key={bar.className} className="whatif-prob-row">
            <span className="whatif-prob-label">{bar.label}</span>
            <div className="whatif-prob-bar-container">
              <div
                className={`whatif-prob-bar-fill ${bar.className}`}
                style={{ width: `${Math.max(bar.prob * 100, 5)}%` }}
              >
                <span className="whatif-prob-value">
                  {(bar.prob * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="whatif-confidence">
        <span>Confiance :</span>
        <span className={`whatif-confidence-badge ${confidenceLevel}`}>
          {confidenceLabel}
        </span>
        <span>·</span>
        <span>Basé sur {prediction.sampleSize} parties</span>
      </div>

      {prediction.confidence < 0.2 && (
        <div className="whatif-warning" style={{ marginTop: '0.5rem' }}>
          ⚠️ Peu de données historiques pour cette composition — la prédiction est peu fiable.
        </div>
      )}

      {playerModifiers.length > 0 && (
        <div className="whatif-player-modifiers">
          {playerModifiers.map(mod => (
            <span key={mod.playerId} className="whatif-modifier-tag">
              {mod.playerName} :&nbsp;
              <span className={mod.winRateDelta >= 0 ? 'positive' : 'negative'}>
                {mod.winRateDelta >= 0 ? '+' : ''}{(mod.winRateDelta * 100).toFixed(1)}%
              </span>
              &nbsp;({mod.gamesPlayed}p)
            </span>
          ))}
        </div>
      )}

      {model && (
        <div className="whatif-model-info" style={{ marginTop: '0.5rem' }}>
          <span
            title="Taux de bonnes prédictions du modèle sur l'ensemble des parties historiques. Valeur fixe, indépendante de la composition choisie."
          >
            Fiabilité du modèle (globale) : {(model.accuracy * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
