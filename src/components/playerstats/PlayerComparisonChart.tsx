import { useState, useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { usePlayerComparisonFromRaw } from '../../hooks/usePlayerComparisonFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { playersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function PlayerComparisonChart() {
  const { availablePlayers, generateComparison, isLoading, error } = usePlayerComparisonFromRaw();
  const { navigateToGameDetails } = useNavigation();
  
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('');
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('');
  const [showDetailedStats, setShowDetailedStats] = useState<boolean>(false);

  // Generate comparison data when both players are selected
  const comparisonData = useMemo(() => {
    if (!selectedPlayer1 || !selectedPlayer2 || selectedPlayer1 === selectedPlayer2) {
      return null;
    }
    return generateComparison(selectedPlayer1, selectedPlayer2);
  }, [selectedPlayer1, selectedPlayer2, generateComparison]);

  // Transform data for radar chart
  const radarData = useMemo(() => {
    if (!comparisonData) return [];

    return [
      {
        metric: 'Participation',
        [selectedPlayer1]: Math.round(comparisonData.player1.participationScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.participationScore),
        fullMark: 100
      },
      {
        metric: 'Taux de Victoire',
        [selectedPlayer1]: Math.round(comparisonData.player1.winRateScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.winRateScore),
        fullMark: 100
      },
      {
        metric: 'Régularité',
        [selectedPlayer1]: Math.round(comparisonData.player1.consistencyScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.consistencyScore),
        fullMark: 100
      },
      {
        metric: 'Maîtrise Villageois',
        [selectedPlayer1]: Math.round(comparisonData.player1.villageoisMastery),
        [selectedPlayer2]: Math.round(comparisonData.player2.villageoisMastery),
        fullMark: 100
      },
      {
        metric: 'Efficacité Loups',
        [selectedPlayer1]: Math.round(comparisonData.player1.loupsEfficiency),
        [selectedPlayer2]: Math.round(comparisonData.player2.loupsEfficiency),
        fullMark: 100
      },
      {
        metric: 'Adaptabilité Rôles',
        [selectedPlayer1]: Math.round(comparisonData.player1.specialRoleAdaptability),
        [selectedPlayer2]: Math.round(comparisonData.player2.specialRoleAdaptability),
        fullMark: 100
      }
    ];
  }, [comparisonData, selectedPlayer1, selectedPlayer2]);

  const handlePlayerDetailsClick = (playerName: string) => {
    navigateToGameDetails({ 
      selectedPlayer: playerName,
      fromComponent: 'Comparaison de Joueurs'
    });
  };

  if (isLoading) {
    return <div className="donnees-attente">Chargement des données de comparaison...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  return (
    <div className="lycans-player-comparison">
      <h2>Comparaison de Joueurs</h2>
      <p className="lycans-stats-info">
        Comparez les performances de deux joueurs à travers différents aspects du jeu. 
        Seuls les joueurs ayant participé à au moins 20 parties sont inclus pour garantir des données significatives.
      </p>

      {/* Player Selection */}
      <div className="lycans-player-selection">
        <div className="lycans-player-selector">
          <label htmlFor="player1-select">Joueur 1:</label>
          <select
            id="player1-select"
            value={selectedPlayer1}
            onChange={(e) => setSelectedPlayer1(e.target.value)}
            className="lycans-select"
          >
            <option value="">Sélectionner un joueur</option>
            {availablePlayers.map(player => (
              <option key={player} value={player}>{player}</option>
            ))}
          </select>
        </div>

        <div className="lycans-vs-indicator">VS</div>

        <div className="lycans-player-selector">
          <label htmlFor="player2-select">Joueur 2:</label>
          <select
            id="player2-select"
            value={selectedPlayer2}
            onChange={(e) => setSelectedPlayer2(e.target.value)}
            className="lycans-select"
          >
            <option value="">Sélectionner un joueur</option>
            {availablePlayers
              .filter(player => player !== selectedPlayer1)
              .map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {comparisonData && (
        <div className="lycans-comparison-results">
          {/* Radar Chart */}
          <div className="lycans-graphique-section">
            <h3>Comparaison Radar</h3>
            
            {/* Metrics Explanation */}
            <div className="lycans-radar-explanation">
              <p className="lycans-radar-info">
                <strong>Légende des métriques :</strong> Toutes les valeurs sont normalisées sur une échelle de 0 à 100 pour faciliter la comparaison.
              </p>
              <div className="lycans-metrics-grid">
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🎯 Participation</span>
                  <span className="lycans-metric-desc">Nombre de parties jouées par rapport au joueur le plus actif</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🏆 Taux de Victoire</span>
                  <span className="lycans-metric-desc">Pourcentage de victoires comparé à la moyenne générale</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">📊 Régularité</span>
                  <span className="lycans-metric-desc">Stabilité des performances au fil du temps (analyse des variations entre périodes de jeu)</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🏘️ Maîtrise Villageois</span>
                  <span className="lycans-metric-desc">Efficacité estimée en tant que Villageois</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🐺 Efficacité Loups</span>
                  <span className="lycans-metric-desc">Efficacité estimée en tant que Loup</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🎭 Adaptabilité Rôles</span>
                  <span className="lycans-metric-desc">Performance avec les rôles solo</span>
                </div>
              </div>
            </div>

            <FullscreenChart title={`Comparaison: ${selectedPlayer1} vs ${selectedPlayer2}`}>
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 40, right: 80, bottom: 40, left: 80 }}>
                    <PolarGrid gridType="polygon" />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      fontSize={12}
                      tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={0}
                      domain={[0, 100]}
                      fontSize={10}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      tickCount={6}
                    />
                    <Radar
                      name={selectedPlayer1}
                      dataKey={selectedPlayer1}
                      stroke={playersColor[selectedPlayer1] || '#0076FF'}
                      fill={playersColor[selectedPlayer1] || '#0076FF'}
                      fillOpacity={0.1}
                      strokeWidth={3}
                      dot={{ fill: playersColor[selectedPlayer1] || '#0076FF', strokeWidth: 2, r: 4 }}
                    />
                    <Radar
                      name={selectedPlayer2}
                      dataKey={selectedPlayer2}
                      stroke={playersColor[selectedPlayer2] || '#FF0000'}
                      fill={playersColor[selectedPlayer2] || '#FF0000'}
                      fillOpacity={0.1}
                      strokeWidth={3}
                      dot={{ fill: playersColor[selectedPlayer2] || '#FF0000', strokeWidth: 2, r: 4 }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        paddingTop: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                      iconType="line"
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}/100`,
                        name
                      ]}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>

          {/* Head-to-Head Statistics */}
          <div className="lycans-head-to-head-stats">
            <h3>Statistiques Face-à-Face</h3>
            
            {/* Overall Statistics */}
            <div className="lycans-h2h-section">
              <h4>📊 Toutes les parties communes</h4>
              <div className="lycans-h2h-summary">
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Parties communes:</span>
                  <span className="lycans-h2h-value">{comparisonData.headToHeadStats.commonGames}</span>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Victoires {selectedPlayer1}:</span>
                  <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                    {comparisonData.headToHeadStats.player1Wins}
                  </span>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Victoires {selectedPlayer2}:</span>
                  <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                    {comparisonData.headToHeadStats.player2Wins}
                  </span>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Durée moyenne:</span>
                  <span className="lycans-h2h-value">{comparisonData.headToHeadStats.averageGameDuration}</span>
                </div>
              </div>
            </div>

            {/* Opposing Camp Statistics */}
            {comparisonData.headToHeadStats.opposingCampGames > 0 && (
              <div className="lycans-h2h-section">
                <h4>⚔️ Camps opposés</h4>
                <p className="lycans-h2h-description">
                  Statistiques pour les parties où les deux joueurs étaient dans des camps différents
                </p>
                <div className="lycans-h2h-summary">
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Parties en opposition:</span>
                    <span className="lycans-h2h-value">{comparisonData.headToHeadStats.opposingCampGames}</span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Victoires {selectedPlayer1} (vs {selectedPlayer2}):</span>
                    <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                      {comparisonData.headToHeadStats.player1WinsAsOpponent}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Victoires {selectedPlayer2} (vs {selectedPlayer1}):</span>
                    <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                      {comparisonData.headToHeadStats.player2WinsAsOpponent}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Durée moyenne (opposition):</span>
                    <span className="lycans-h2h-value">{comparisonData.headToHeadStats.averageOpposingGameDuration}</span>
                  </div>
                  {comparisonData.headToHeadStats.opposingCampGames >= 3 && (
                    <div className="lycans-h2h-metric">
                      <span className="lycans-h2h-label">Taux de victoire {selectedPlayer1} (opposition):</span>
                      <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                        {((comparisonData.headToHeadStats.player1WinsAsOpponent / comparisonData.headToHeadStats.opposingCampGames) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {comparisonData.headToHeadStats.opposingCampGames >= 3 && (
                    <div className="lycans-h2h-metric">
                      <span className="lycans-h2h-label">Taux de victoire {selectedPlayer2} (opposition):</span>
                      <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                        {((comparisonData.headToHeadStats.player2WinsAsOpponent / comparisonData.headToHeadStats.opposingCampGames) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {comparisonData.headToHeadStats.opposingCampGames === 0 && (
              <div className="lycans-h2h-section">
                <h4>⚔️ Camps opposés</h4>
                <p className="lycans-h2h-description">
                  Aucune partie trouvée où ces deux joueurs étaient dans des camps opposés.
                </p>
              </div>
            )}
          </div>

          {/* Detailed Statistics Table */}
          <div className="lycans-detailed-stats">
            <div className="lycans-stats-toggle">
              <button
                className={`lycans-toggle-btn ${showDetailedStats ? 'active' : ''}`}
                onClick={() => setShowDetailedStats(!showDetailedStats)}
              >
                {showDetailedStats ? 'Masquer' : 'Afficher'} les Statistiques Détaillées
              </button>
            </div>

            {showDetailedStats && (
              <div className="lycans-stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>Métrique</th>
                      <th 
                        style={{ color: playersColor[selectedPlayer1] || '#0076FF', cursor: 'pointer' }}
                        onClick={() => handlePlayerDetailsClick(selectedPlayer1)}
                        title="Cliquer pour voir les détails"
                      >
                        {selectedPlayer1}
                      </th>
                      <th 
                        style={{ color: playersColor[selectedPlayer2] || '#FF0000', cursor: 'pointer' }}
                        onClick={() => handlePlayerDetailsClick(selectedPlayer2)}
                        title="Cliquer pour voir les détails"
                      >
                        {selectedPlayer2}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Parties Jouées</td>
                      <td>{comparisonData.player1.gamesPlayed}</td>
                      <td>{comparisonData.player2.gamesPlayed}</td>
                    </tr>
                    <tr>
                      <td>Taux de Victoire (%)</td>
                      <td>{comparisonData.player1.winRate.toFixed(1)}%</td>
                      <td>{comparisonData.player2.winRate.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td>Score de Participation (/100)</td>
                      <td>{Math.round(comparisonData.player1.participationScore)}</td>
                      <td>{Math.round(comparisonData.player2.participationScore)}</td>
                    </tr>
                    <tr>
                      <td>Score de Régularité (/100)</td>
                      <td>{Math.round(comparisonData.player1.consistencyScore)}</td>
                      <td>{Math.round(comparisonData.player2.consistencyScore)}</td>
                    </tr>
                    <tr>
                      <td>Maîtrise Villageois (/100)</td>
                      <td>{Math.round(comparisonData.player1.villageoisMastery)}</td>
                      <td>{Math.round(comparisonData.player2.villageoisMastery)}</td>
                    </tr>
                    <tr>
                      <td>Efficacité Loups (/100)</td>
                      <td>{Math.round(comparisonData.player1.loupsEfficiency)}</td>
                      <td>{Math.round(comparisonData.player2.loupsEfficiency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions when no players selected */}
      {(!selectedPlayer1 || !selectedPlayer2) && (
        <div className="lycans-comparison-instructions">
          <h3>Instructions</h3>
          <p>Sélectionnez deux joueurs différents pour voir leur comparaison détaillée.</p>
          <ul>
            <li><strong>Participation:</strong> Basé sur le nombre de parties jouées</li>
            <li><strong>Taux de Victoire:</strong> Comparé à la moyenne générale</li>
            <li><strong>Régularité:</strong> Régularité des performances - analyse les séquences et la variabilité entre différentes périodes de jeu</li>
            <li><strong>Maîtrise Villageois:</strong> Efficacité en tant que Villageois</li>
            <li><strong>Efficacité Loups:</strong> Réussite en tant que Loup</li>
            <li><strong>Adaptabilité Rôles:</strong> Performance avec les rôles solos</li>
          </ul>
        </div>
      )}

      {selectedPlayer1 && selectedPlayer2 && selectedPlayer1 === selectedPlayer2 && (
        <div className="lycans-comparison-error">
          <p>Veuillez sélectionner deux joueurs différents pour effectuer une comparaison.</p>
        </div>
      )}
    </div>
  );
}
