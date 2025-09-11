import { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { usePlayerComparisonFromRaw } from '../../hooks/usePlayerComparisonFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { playersColor, lycansColorScheme } from '../../types/api';

export function PlayerComparisonChart() {
  const { availablePlayers, generateComparison, isLoading, error } = usePlayerComparisonFromRaw();
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  
  // Use persistent navigation state instead of local state
  const selectedPlayer1 = navigationState.playerComparisonState?.selectedPlayer1 || '';
  const selectedPlayer2 = navigationState.playerComparisonState?.selectedPlayer2 || '';
  const showDetailedStats = navigationState.playerComparisonState?.showDetailedStats || false;

  // Update functions to use navigation state
  const setSelectedPlayer1 = (player: string) => {
    updateNavigationState({ 
      playerComparisonState: { 
        selectedPlayer1: player,
        selectedPlayer2: selectedPlayer2,
        showDetailedStats: showDetailedStats
      }
    });
  };

  const setSelectedPlayer2 = (player: string) => {
    updateNavigationState({ 
      playerComparisonState: { 
        selectedPlayer1: selectedPlayer1,
        selectedPlayer2: player,
        showDetailedStats: showDetailedStats
      }
    });
  };

  const setShowDetailedStats = (show: boolean) => {
    updateNavigationState({ 
      playerComparisonState: { 
        selectedPlayer1: selectedPlayer1,
        selectedPlayer2: selectedPlayer2,
        showDetailedStats: show
      }
    });
  };

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
        metric: 'Score de Victoire',
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

  const handleCommonGamesClick = () => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'all-common-games'
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handleOpposingGamesClick = () => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'opposing-camps'
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handlePlayerScoreCardClick = (playerName: string) => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'opposing-camps',
          winnerPlayer: playerName
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handleCommonGameVictoryClick = (playerName: string) => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'all-common-games',
          winnerPlayer: playerName
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handleSameCampGamesClick = () => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'same-camp'
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handleSameCampWinsClick = () => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'same-camp',
          winnerPlayer: selectedPlayer1 // Both players are in same camp, so either one works
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handleSameLoupsGamesClick = () => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'same-camp'
        },
        campFilter: {
          selectedCamp: 'Loups',
          campFilterMode: 'all-assignments'
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  const handleSameLoupsWinsClick = () => {
    if (selectedPlayer1 && selectedPlayer2) {
      navigateToGameDetails({
        multiPlayerFilter: {
          selectedPlayers: [selectedPlayer1, selectedPlayer2],
          playersFilterMode: 'same-camp',
          winnerPlayer: selectedPlayer1 // Both players are in same camp, so either one works
        },
        campFilter: {
          selectedCamp: 'Loups',
          campFilterMode: 'wins-only'
        },
        fromComponent: 'Comparaison de Joueurs'
      });
    }
  };

  if (isLoading) {
    return <div className="donnees-attente">Chargement des données de comparaison...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  return (
    <div className="lycans-player-comparison">
      <h2>⚔️ FACE A FACE ⚔️</h2>
      <p className="lycans-stats-info">
        Seuls les joueurs ayant participé à au moins 30 parties sont inclus pour garantir des données significatives.
      </p>

      {/* Player Selection */}
      <div className="lycans-player-selection">
        <div className="lycans-player-selector">
          <label htmlFor="player1-select">⚔️ Joueur 1:</label>
          <select
            id="player1-select"
            value={selectedPlayer1}
            onChange={(e) => setSelectedPlayer1(e.target.value)}
            className="lycans-select"
          >
            <option value="">Choisir un joueur</option>
            {availablePlayers.map(player => (
              <option key={player} value={player}>{player}</option>
            ))}
          </select>
        </div>

        <div className="lycans-vs-indicator">⚔️ VS ⚔️</div>

        <div className="lycans-player-selector">
          <label htmlFor="player2-select">⚔️ Joueur 2:</label>
          <select
            id="player2-select"
            value={selectedPlayer2}
            onChange={(e) => setSelectedPlayer2(e.target.value)}
            className="lycans-select"
          >
            <option value="">Choisir un joueur</option>
            {availablePlayers
              .filter(player => player !== selectedPlayer1)
              .map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Battle Results */}
      {comparisonData && (
        <div className="lycans-comparison-results">
          {/* Versus Battle Interface */}
          <div className="lycans-graphique-section">
            <h3>⚔️ FACE A FACE ⚔️</h3>
            
            {/* Versus Arena with Score Display */}
            <div className="lycans-versus-arena">
              {/* Player 1 Score Card */}
              <div 
                className="lycans-player-score-card lycans-player1-card lycans-clickable"
                onClick={() => handlePlayerScoreCardClick(selectedPlayer1)}
                title={`Cliquer pour voir les victoires de ${selectedPlayer1} contre ${selectedPlayer2}`}
              >
                <div className="lycans-player-avatar">
                  <div className="lycans-player-initials" style={{ backgroundColor: playersColor[selectedPlayer1] || '#0076FF' }}>
                    {selectedPlayer1.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <h4 className="lycans-player-name" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                  {selectedPlayer1}
                </h4>
                <div className="lycans-score-display">
                  <div className="lycans-score-number" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                    {comparisonData.headToHeadStats.player1WinsAsOpponent}
                  </div>
                  <div className="lycans-score-label">Victoires<br />en Opposition</div>
                </div>
                {comparisonData.headToHeadStats.opposingCampGames >= 3 && (
                  <div className="lycans-win-rate">
                    {((comparisonData.headToHeadStats.player1WinsAsOpponent / comparisonData.headToHeadStats.opposingCampGames) * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Center Radar Chart */}
              <div className="lycans-radar-container">
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
              </div>

              {/* Player 2 Score Card */}
              <div 
                className="lycans-player-score-card lycans-player2-card lycans-clickable"
                onClick={() => handlePlayerScoreCardClick(selectedPlayer2)}
                title={`Cliquer pour voir les victoires de ${selectedPlayer2} contre ${selectedPlayer1}`}
              >
                <div className="lycans-player-avatar">
                  <div className="lycans-player-initials" style={{ backgroundColor: playersColor[selectedPlayer2] || '#FF0000' }}>
                    {selectedPlayer2.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <h4 className="lycans-player-name" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                  {selectedPlayer2}
                </h4>
                <div className="lycans-score-display">
                  <div className="lycans-score-number" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                    {comparisonData.headToHeadStats.player2WinsAsOpponent}
                  </div>
                  <div className="lycans-score-label">Victoires<br />en Opposition</div>
                </div>
                {comparisonData.headToHeadStats.opposingCampGames >= 3 && (
                  <div className="lycans-win-rate">
                    {((comparisonData.headToHeadStats.player2WinsAsOpponent / comparisonData.headToHeadStats.opposingCampGames) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>

            {/* Battle Summary */}
            {comparisonData.headToHeadStats.opposingCampGames > 0 && (
              <div className="lycans-battle-summary">
                <div className="lycans-battle-stat">
                  <span className="lycans-battle-label">🗡️ Affrontements:</span>
                  <span 
                    className="lycans-battle-value lycans-clickable" 
                    onClick={handleOpposingGamesClick}
                    title="Cliquer pour voir les détails des affrontements"
                  >
                    {comparisonData.headToHeadStats.opposingCampGames}
                  </span>
                </div>
                <div className="lycans-battle-stat">
                  <span className="lycans-battle-label">⏱️ Durée moyenne:</span>
                  <span className="lycans-battle-value">{comparisonData.headToHeadStats.averageOpposingGameDuration}</span>
                </div>
                {comparisonData.headToHeadStats.player1WinsAsOpponent > comparisonData.headToHeadStats.player2WinsAsOpponent ? (
                      <div className="lycans-winner-announcement">
                        🏆 Victoire: <span style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>{selectedPlayer1}</span> 
                  </div>
                ) : comparisonData.headToHeadStats.player2WinsAsOpponent > comparisonData.headToHeadStats.player1WinsAsOpponent ? (
                  <div className="lycans-winner-announcement">
                    🏆 Victoire: <span style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>{selectedPlayer2}</span>
                  </div>
                ) : (
                  <div className="lycans-winner-announcement">
                    ⚖️ Égalité parfaite dans les résultats !
                  </div>
                )}
              </div>
            )}

            {comparisonData.headToHeadStats.opposingCampGames === 0 && (
              <div className="lycans-no-battles">
                <div className="lycans-no-battles-icon">🤝</div>
                <div className="lycans-no-battles-text">
                  Aucune partie trouvée entre ces deux joueurs.<br />
                  Ils n'ont jamais été dans des camps opposés !
                </div>
              </div>
            )}

            {/* Metrics Explanation - Moved below radar */}
            <div className="lycans-radar-explanation">
              <p className="lycans-radar-info">
                <strong>Légende des métriques :</strong> Toutes les valeurs sont normalisées sur une échelle de 0 à 100 pour faciliter la comparaison
                <strong> (100 = meilleur joueur dans cette métrique, 0 = moins bon joueur dans cette métrique)</strong>
              </p>
              <div className="lycans-metrics-grid">
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🎯 Participation</span>
                  <span className="lycans-metric-desc">Nombre de parties jouées par rapport au joueur le plus actif</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🏆 Score de Victoire</span>
                  <span className="lycans-metric-desc">Score de victoires, comparé à la moyenne générale</span>
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
          </div>

          {/* Head-to-Head Statistics */}
          <div className="lycans-head-to-head-stats">
            <h3>📊 Statistiques Complètes</h3>
            
            {/* Overall Statistics */}
            <div className="lycans-h2h-section">
              <h4>📊 Toutes les parties communes</h4>
              <div className="lycans-h2h-summary">
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Parties communes:</span>
                  <span 
                    className="lycans-h2h-value lycans-clickable" 
                    onClick={handleCommonGamesClick}
                    title="Cliquer pour voir toutes les parties communes"
                  >
                    {comparisonData.headToHeadStats.commonGames}
                  </span>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Victoires {selectedPlayer1}:</span>
                  <span 
                    className="lycans-h2h-value lycans-clickable" 
                    style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}
                    onClick={() => handleCommonGameVictoryClick(selectedPlayer1)}
                    title={`Cliquer pour voir les victoires de ${selectedPlayer1} dans toutes les parties communes`}
                  >
                    {comparisonData.headToHeadStats.player1Wins}
                  </span>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Victoires {selectedPlayer2}:</span>
                  <span 
                    className="lycans-h2h-value lycans-clickable" 
                    style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}
                    onClick={() => handleCommonGameVictoryClick(selectedPlayer2)}
                    title={`Cliquer pour voir les victoires de ${selectedPlayer2} dans toutes les parties communes`}
                  >
                    {comparisonData.headToHeadStats.player2Wins}
                  </span>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">Durée moyenne:</span>
                  <span className="lycans-h2h-value">{comparisonData.headToHeadStats.averageGameDuration}</span>
                </div>
              </div>
            </div>

            {/* Same Camp Statistics */}
            {comparisonData.headToHeadStats.sameCampGames > 0 && (
              <div className="lycans-h2h-section">
                <h4>🤝 Parties en équipe (même camp)</h4>
                <div className="lycans-h2h-summary">
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Parties en équipe:</span>
                    <span 
                      className="lycans-h2h-value lycans-clickable"
                      onClick={handleSameCampGamesClick}
                      title="Cliquer pour voir toutes les parties où ils étaient dans le même camp"
                    >
                      {comparisonData.headToHeadStats.sameCampGames}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Victoires d'équipe:</span>
                    <span 
                      className="lycans-h2h-value lycans-clickable" 
                      style={{ color: 'var(--chart-color-success)' }}
                      onClick={handleSameCampWinsClick}
                      title="Cliquer pour voir les victoires quand ils étaient dans le même camp"
                    >
                      {comparisonData.headToHeadStats.sameCampWins}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Taux de réussite:</span>
                    <span className="lycans-h2h-value" style={{ color: 'var(--chart-color-success)' }}>
                      {((comparisonData.headToHeadStats.sameCampWins / comparisonData.headToHeadStats.sameCampGames) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Durée moyenne:</span>
                    <span className="lycans-h2h-value">{comparisonData.headToHeadStats.averageSameCampDuration}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loups Team Statistics */}
            {comparisonData.headToHeadStats.sameLoupsGames > 0 && (
              <div className="lycans-h2h-section">
                <h4>🐺 Parties en équipe (Loups)</h4>
                <div className="lycans-h2h-summary">
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Parties en équipe (Loups):</span>
                    <span 
                      className="lycans-h2h-value lycans-clickable"
                      onClick={handleSameLoupsGamesClick}
                      title="Cliquer pour voir toutes les parties où ils étaient ensemble dans l'équipe des Loups"
                    >
                      {comparisonData.headToHeadStats.sameLoupsGames}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Victoires d'équipe (Loups):</span>
                    <span 
                      className="lycans-h2h-value lycans-clickable" 
                      style={{ color: lycansColorScheme['Loups'] }}
                      onClick={handleSameLoupsWinsClick}
                      title="Cliquer pour voir les victoires quand ils étaient ensemble dans l'équipe des Loups"
                    >
                      {comparisonData.headToHeadStats.sameLoupsWins}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Taux de réussite (Loups):</span>
                    <span className="lycans-h2h-value" style={{ color: lycansColorScheme['Loups'] }}>
                      {((comparisonData.headToHeadStats.sameLoupsWins / comparisonData.headToHeadStats.sameLoupsGames) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Durée moyenne (Loups):</span>
                    <span className="lycans-h2h-value">{comparisonData.headToHeadStats.averageSameLoupsDuration}</span>
                  </div>
                </div>
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
                      <td>Score de Victoire (/100)</td>
                      <td>{comparisonData.player1.winRateScore}</td>
                      <td>{comparisonData.player2.winRateScore}</td>
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
                    <tr>
                      <td>Adaptabilité des rôles (/100)</td>
                      <td>{Math.round(comparisonData.player1.specialRoleAdaptability)}</td>
                      <td>{Math.round(comparisonData.player2.specialRoleAdaptability)}</td>
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
          <h3>🎮 Préparez le face-à-face !</h3>
          <p>Sélectionnez deux joueurs pour découvrir qui l'emporte le plus souvent !</p>
          <ul>
            <li><strong>🎯 Participation:</strong> Basé sur le nombre de parties jouées</li>
            <li><strong>🏆 Score de Victoire:</strong> Comparé à la moyenne générale</li>
            <li><strong>📊 Régularité:</strong> Stabilité des performances au fil du temps</li>
            <li><strong>🏘️ Maîtrise Villageois:</strong> Efficacité en tant que Villageois</li>
            <li><strong>🐺 Efficacité Loups:</strong> Réussite en tant que Loup</li>
            <li><strong>🎭 Adaptabilité Rôles:</strong> Performance avec les rôles solos</li>
          </ul>
        </div>
      )}

      {selectedPlayer1 && selectedPlayer2 && selectedPlayer1 === selectedPlayer2 && (
        <div className="lycans-comparison-error">
          <p>⚠️ Un joueur ne peut pas être sélectionné contre lui-même! Sélectionnez deux joueurs différents.</p>
        </div>
      )}
    </div>
  );
}
