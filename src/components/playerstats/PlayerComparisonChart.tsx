import { useMemo, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { usePlayerComparisonFromRaw } from '../../hooks/usePlayerComparisonFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { useJoueursData } from '../../hooks/useJoueursData';
import { findPlayerByName } from '../../utils/playersUtils';

export function PlayerComparisonChart() {
  const { availablePlayers, generateComparison, isLoading, error } = usePlayerComparisonFromRaw();
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  
  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Helper function to get player info including image
  const getPlayerInfo = (playerName: string) => {
    return joueursData?.Players ? findPlayerByName(joueursData.Players, playerName) : null;
  };

  // Use persistent navigation state instead of local state
  // If no player1 is selected, default to highlighted player if available and valid
  const defaultPlayer1 = useMemo(() => {
    const storedPlayer1 = navigationState.playerComparisonState?.selectedPlayer1;
    if (storedPlayer1) return storedPlayer1;
    
    // Use highlighted player as default if available and in the available players list (min 30 games)
    if (settings.highlightedPlayer && availablePlayers.includes(settings.highlightedPlayer)) {
      return settings.highlightedPlayer;
    }
    
    return '';
  }, [navigationState.playerComparisonState?.selectedPlayer1, settings.highlightedPlayer, availablePlayers]);

  const selectedPlayer1 = defaultPlayer1;
  const selectedPlayer2 = navigationState.playerComparisonState?.selectedPlayer2 || '';
  const showDetailedStats = navigationState.playerComparisonState?.showDetailedStats || false;

  // Sync highlighted player as default player1 to navigation state
  useEffect(() => {
    if (defaultPlayer1 && !navigationState.playerComparisonState?.selectedPlayer1) {
      updateNavigationState({ 
        playerComparisonState: { 
          selectedPlayer1: defaultPlayer1,
          selectedPlayer2: selectedPlayer2,
          showDetailedStats: showDetailedStats
        }
      });
    }
  }, [defaultPlayer1, navigationState.playerComparisonState?.selectedPlayer1, selectedPlayer2, showDetailedStats, updateNavigationState]);

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

  // Generate comparison data when both players are selected
  const comparisonData = useMemo(() => {    
    if (!selectedPlayer1 || !selectedPlayer2 || selectedPlayer1 === selectedPlayer2) {
      return null;
    }
    
    const result = generateComparison(selectedPlayer1, selectedPlayer2);
    return result;
  }, [selectedPlayer1, selectedPlayer2, generateComparison, availablePlayers.length]);

  // Metric descriptions for tooltip
  const metricDescriptions: Record<string, string> = {
    'Taux de Victoire': 'Pourcentage de victoires sur toutes les parties jouées',
    'Kills / Partie': 'Nombre moyen de kills réalisés par partie',
    'Taux de Survie': "Pourcentage de parties où le joueur survit jusqu'à la fin",
    'Agressivité (Votes)': 'Score d\'agressivité basé sur le comportement de vote (votes actifs vs abstentions/skip)',
    'Récolte / 60 min': 'Quantité de ressources collectées normalisée par heure de jeu',
    'Dissimulation': 'Cohérence du temps de parole entre les camps Villageois et Loup (plus c\'est proche, mieux c\'est)'
  };

  // Transform data for radar chart
  const radarData = useMemo(() => {
    if (!comparisonData) return [];

    return [
      {
        metric: 'Taux de Victoire',
        [selectedPlayer1]: Math.round(comparisonData.player1.winRateScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.winRateScore),
        fullMark: 100
      },
      {
        metric: 'Kills / Partie',
        [selectedPlayer1]: Math.round(comparisonData.player1.killsPerGameScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.killsPerGameScore),
        fullMark: 100
      },
      {
        metric: 'Taux de Survie',
        [selectedPlayer1]: Math.round(comparisonData.player1.survivalRateScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.survivalRateScore),
        fullMark: 100
      },
      {
        metric: 'Agressivité (Votes)',
        [selectedPlayer1]: Math.round(comparisonData.player1.aggressivenessScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.aggressivenessScore),
        fullMark: 100
      },
      {
        metric: 'Récolte / 60 min',
        [selectedPlayer1]: Math.round(comparisonData.player1.harvestRateScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.harvestRateScore),
        fullMark: 100
      },
      {
        metric: 'Dissimulation',
        [selectedPlayer1]: Math.round(comparisonData.player1.talkingPerformanceScore),
        [selectedPlayer2]: Math.round(comparisonData.player2.talkingPerformanceScore),
        fullMark: 100
      }
    ];
  }, [comparisonData, selectedPlayer1, selectedPlayer2]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const metricName = label as string;
      const description = metricDescriptions[metricName];
      
      return (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '12px',
          color: 'var(--text-primary)',
          maxWidth: '300px'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '14px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '6px'
          }}>
            {metricName}
          </p>
          {description && (
            <p style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              fontStyle: 'italic',
              lineHeight: '1.4'
            }}>
              {description}
            </p>
          )}
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '4px'
            }}>
              <span style={{ 
                color: entry.color,
                fontWeight: 'bold',
                marginRight: '12px'
              }}>
                {entry.name}:
              </span>
              <span style={{ fontWeight: 'bold' }}>
                {entry.value}/100
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
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
          selectedCamp: 'Loup',
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
          selectedCamp: 'Loup',
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

            {/* Versus Arena with Score Display */}
            <div className="lycans-versus-arena">
              {/* Player 1 Score Card */}
              <div 
                className="lycans-player-score-card lycans-player1-card lycans-clickable"
                onClick={() => handlePlayerScoreCardClick(selectedPlayer1)}
                title={`Cliquer pour voir les victoires de ${selectedPlayer1} contre ${selectedPlayer2}`}
              >
                <div className="lycans-player-avatar">
                  {getPlayerInfo(selectedPlayer1)?.Image ? (
                    <img 
                      src={getPlayerInfo(selectedPlayer1)!.Image!} 
                      alt={`Photo de profil de ${selectedPlayer1}`}
                      className="lycans-player-image"
                    />
                  ) : (
                    <div 
                      className="lycans-player-avatar-default"
                      style={{ 
                        '--player-color': playersColor[selectedPlayer1] || '#0076FF'
                      } as React.CSSProperties}
                    >
                      <div className="lycans-player-avatar-overlay"></div>
                    </div>
                  )}
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
                {comparisonData.headToHeadStats.player1KilledPlayer2Count > 0 && (
                  <div className="lycans-kill-stat" style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    💀 A tué {selectedPlayer2} {comparisonData.headToHeadStats.player1KilledPlayer2Count} fois
                  </div>
                )}
              </div>

              {/* Center Radar Chart */}
              <div className="lycans-radar-container">
                  <div style={{ height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                        <Legend 
                          verticalAlign="top"
                          wrapperStyle={{ 
                            paddingBottom: '20px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                          iconType="line"
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
                        <Tooltip content={<CustomTooltip />} />
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
                  {getPlayerInfo(selectedPlayer2)?.Image ? (
                    <img 
                      src={getPlayerInfo(selectedPlayer2)!.Image!} 
                      alt={`Photo de profil de ${selectedPlayer2}`}
                      className="lycans-player-image"
                    />
                  ) : (
                    <div 
                      className="lycans-player-avatar-default"
                      style={{ 
                        '--player-color': playersColor[selectedPlayer2] || '#FF0000'
                      } as React.CSSProperties}
                    >
                      <div className="lycans-player-avatar-overlay"></div>
                    </div>
                  )}
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
                {comparisonData.headToHeadStats.player2KilledPlayer1Count > 0 && (
                  <div className="lycans-kill-stat" style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    💀 A tué {selectedPlayer1} {comparisonData.headToHeadStats.player2KilledPlayer1Count} fois
                  </div>
                )}
              </div>

              {/* Winner Announcement - Inside Arena, Below Chart */}
              {comparisonData.headToHeadStats.opposingCampGames > 0 && (
                <>
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
                </>
              )}
            </div>

            {/* Metrics Explanation - Moved below radar */}
            <div className="lycans-radar-explanation">
              <p className="lycans-radar-info">
                <strong>Légende des métriques :</strong> Toutes les valeurs sont normalisées sur une échelle de 0 à 100 pour faciliter la comparaison
                <strong> (100 = meilleur joueur dans cette métrique, 0 = moins bon joueur dans cette métrique)</strong>
              </p>
              <div className="lycans-metrics-grid">
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">� Taux de Victoire</span>
                  <span className="lycans-metric-desc">Pourcentage de victoires sur toutes les parties jouées</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">💀 Kills / Partie</span>
                  <span className="lycans-metric-desc">Nombre moyen de kills réalisés par partie</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">❤️ Taux de Survie</span>
                  <span className="lycans-metric-desc">Pourcentage de parties où le joueur survit jusqu'à la fin</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">⚔️ Agressivité (Votes)</span>
                  <span className="lycans-metric-desc">Score d'agressivité basé sur le comportement de vote (votes actifs vs abstentions/skip)</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🌾 Récolte / 60 min</span>
                  <span className="lycans-metric-desc">Quantité de ressources collectées normalisée par heure de jeu</span>
                </div>
                <div className="lycans-metric-info">
                  <span className="lycans-metric-name">🗣️ Dissimulation</span>
                  <span className="lycans-metric-desc">Cohérence du temps de parole entre les camps Villageois et Loup (capacité à parler de manière similaire quel que soit le camp)</span>
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
                  <span className="lycans-h2h-label">Victoires:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span 
                      className="lycans-h2h-value lycans-clickable" 
                      style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}
                      onClick={() => handleCommonGameVictoryClick(selectedPlayer1)}
                      title={`Cliquer pour voir les victoires de ${selectedPlayer1} dans toutes les parties communes`}
                    >
                      {selectedPlayer1}: {comparisonData.headToHeadStats.player1Wins}
                    </span>
                    <span 
                      className="lycans-h2h-value lycans-clickable" 
                      style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}
                      onClick={() => handleCommonGameVictoryClick(selectedPlayer2)}
                      title={`Cliquer pour voir les victoires de ${selectedPlayer2} dans toutes les parties communes`}
                    >
                      {selectedPlayer2}: {comparisonData.headToHeadStats.player2Wins}
                    </span>
                  </div>
                </div>
                <div className="lycans-h2h-metric">
                  <span className="lycans-h2h-label">💀 Kills:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                      {selectedPlayer1} a tué {selectedPlayer2}: {comparisonData.headToHeadStats.player1KilledPlayer2Count} fois
                    </span>
                    <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                      {selectedPlayer2} a tué {selectedPlayer1}: {comparisonData.headToHeadStats.player2KilledPlayer1Count} fois
                    </span>
                  </div>
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
                    <span className="lycans-h2h-label">💀 Kills:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer1] || '#0076FF' }}>
                        {selectedPlayer1} a tué {selectedPlayer2}: {comparisonData.headToHeadStats.player1KilledPlayer2SameCamp} fois
                      </span>
                      <span className="lycans-h2h-value" style={{ color: playersColor[selectedPlayer2] || '#FF0000' }}>
                        {selectedPlayer2} a tué {selectedPlayer1}: {comparisonData.headToHeadStats.player2KilledPlayer1SameCamp} fois
                      </span>
                    </div>
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
                      style={{ color: lycansColorScheme['Loup'] }}
                      onClick={handleSameLoupsWinsClick}
                      title="Cliquer pour voir les victoires quand ils étaient ensemble dans l'équipe des Loups"
                    >
                      {comparisonData.headToHeadStats.sameLoupsWins}
                    </span>
                  </div>
                  <div className="lycans-h2h-metric">
                    <span className="lycans-h2h-label">Taux de réussite (Loups):</span>
                    <span className="lycans-h2h-value" style={{ color: lycansColorScheme['Loup'] }}>
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
        </div>
      )}

      {/* Instructions when no players selected */}
      {(!selectedPlayer1 || !selectedPlayer2) && (
        <div className="lycans-comparison-instructions">
          <h3>🎮 Préparez le face-à-face !</h3>
          <p>Sélectionnez deux joueurs pour découvrir qui l'emporte le plus souvent !</p>
          <ul>
            <li><strong>� Taux de Victoire:</strong> Pourcentage de victoires sur toutes les parties</li>
            <li><strong>💀 Kills / Partie:</strong> Nombre moyen de kills par partie</li>
            <li><strong>❤️ Taux de Survie:</strong> Fréquence de survie jusqu'à la fin de la partie</li>
            <li><strong>⚔️ Agressivité (Votes):</strong> Comportement de vote (actif vs passif)</li>
            <li><strong>🌾 Récolte / 60 min:</strong> Efficacité de collecte de ressources</li>
            <li><strong>🗣️ Dissimulation:</strong> Cohérence du temps de parole entre Villageois et Loup (mieux si similaire)</li>
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
