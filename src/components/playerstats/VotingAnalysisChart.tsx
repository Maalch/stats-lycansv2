import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, ScatterChart, Scatter
} from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useVotingStatisticsFromRaw } from '../../hooks/useVotingStatisticsFromRaw';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { calculateGameVotingAnalysis } from '../../utils/votingStatsUtils';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';

export function VotingAnalysisChart() {
  const { settings } = useSettings();
  const { navigateToGameDetails } = useNavigation();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  // const lycansColorScheme = useThemeAdjustedLycansColorScheme(); // Reserved for future use

  const [selectedView, setSelectedView] = useState<'meetingTrends' | 'playerConsistency' | 'gameDetails' | 'votingPatterns'>('meetingTrends');
  const [selectedGameId, setSelectedGameId] = useState<string>('');

  const { data: votingStats, isLoading, error } = useVotingStatisticsFromRaw();
  const { gameData } = useCombinedFilteredRawData();

  // Calculate detailed analysis for each game
  const gameAnalyses = useMemo(() => {
    if (!gameData || gameData.length === 0) return [];
    
    const gamesWithVotingData = gameData.filter(game => 
      game.PlayerStats.some(player => player.Votes && player.Votes.length > 0)
    );

    return gamesWithVotingData.map(calculateGameVotingAnalysis);
  }, [gameData]);

  // Prepare meeting trends data
  const meetingTrendsData = useMemo(() => {
    if (!gameAnalyses.length) return [];
    
    const meetingMap = new Map<number, {
      totalGames: number;
      totalParticipants: number;
      totalVotes: number;
      totalSkips: number;
      totalAbstentions: number;
      totalEliminations: number;
    }>();

    gameAnalyses.forEach(analysis => {
      analysis.meetingAnalytics.forEach(meeting => {
        const existing = meetingMap.get(meeting.meetingNumber) || {
          totalGames: 0,
          totalParticipants: 0,
          totalVotes: 0,
          totalSkips: 0,
          totalAbstentions: 0,
          totalEliminations: 0
        };

        meetingMap.set(meeting.meetingNumber, {
          totalGames: existing.totalGames + 1,
          totalParticipants: existing.totalParticipants + meeting.totalParticipants,
          totalVotes: existing.totalVotes + meeting.totalVotes,
          totalSkips: existing.totalSkips + meeting.totalSkips,
          totalAbstentions: existing.totalAbstentions + meeting.totalAbstentions,
          totalEliminations: existing.totalEliminations + (meeting.eliminatedPlayer ? 1 : 0)
        });
      });
    });

    return Array.from(meetingMap.entries()).map(([meetingNumber, data]) => ({
      meetingNumber,
      averageParticipation: data.totalGames > 0 ? data.totalParticipants / data.totalGames : 0,
      averageVotes: data.totalGames > 0 ? data.totalVotes / data.totalGames : 0,
      averageSkips: data.totalGames > 0 ? data.totalSkips / data.totalGames : 0,
      averageAbstentions: data.totalGames > 0 ? data.totalAbstentions / data.totalGames : 0,
      eliminationRate: data.totalGames > 0 ? (data.totalEliminations / data.totalGames) * 100 : 0,
      totalGames: data.totalGames
    })).sort((a, b) => a.meetingNumber - b.meetingNumber);
  }, [gameAnalyses]);

  // Prepare player consistency data (variance in voting behavior)
  const playerConsistencyData = useMemo(() => {
    if (!votingStats) return [];

    return votingStats.playerBehaviorStats
      .filter(player => player.totalMeetings >= 5)
      .map(player => {
        // Calculate variance metrics for player consistency
        const votingVariance = Math.abs(player.votingRate - 70); // Deviation from ideal 70% voting rate
        const behaviorScore = 100 - (player.abstentionRate * 1.5 + player.skippingRate * 0.8 + votingVariance * 0.5);
        
        return {
          playerName: player.playerName,
          votingRate: player.votingRate,
          skippingRate: player.skippingRate,
          abstentionRate: player.abstentionRate,
          aggressivenessScore: player.aggressivenessScore,
          consistencyScore: Math.max(0, Math.min(100, behaviorScore)),
          totalMeetings: player.totalMeetings,
          isHighlightedAddition: settings.highlightedPlayer === player.playerName &&
            !votingStats.playerBehaviorStats.slice(0, 15).some(p => p.playerName === player.playerName)
        };
      })
      .sort((a, b) => b.consistencyScore - a.consistencyScore)
      .slice(0, settings.highlightedPlayer ? 16 : 15);
  }, [votingStats, settings.highlightedPlayer]);

  // Handle player click for navigation
  const handlePlayerClick = (data: any) => {
    if (data && data.playerName) {
      navigateToGameDetails({
        selectedPlayer: data.playerName,
        fromComponent: 'Analyse des Votes Détaillée'
      });
    }
  };

  if (isLoading) {
    return <div className="donnees-attente">Chargement de l'analyse des votes...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!votingStats || !gameAnalyses.length) {
    return <div className="donnees-manquantes">Aucune donnée de vote disponible pour l'analyse</div>;
  }

  const availableGames = gameAnalyses.slice(0, 20); // Show first 20 games for detailed analysis

  return (
    <div className="lycans-voting-analysis">
      <h2>🔍 Analyse Détaillée des Votes</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="analysis-view-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Vue:
          </label>
          <select
            id="analysis-view-select"
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '200px'
            }}
          >
            <option value="meetingTrends">📈 Tendances par Réunion</option>
            <option value="playerConsistency">🎯 Consistance des Joueurs</option>
            <option value="votingPatterns">🗳️ Patterns de Vote</option>
            <option value="gameDetails">🎮 Détails par Partie</option>
          </select>
        </div>

        {selectedView === 'gameDetails' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="game-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Partie:
            </label>
            <select
              id="game-select"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                minWidth: '200px'
              }}
            >
              <option value="">Sélectionner une partie...</option>
              {availableGames.map((game) => (
                <option key={game.gameId} value={game.gameId}>
                  Partie {game.gameId.split('-')[0]} - {game.totalMeetings} réunions
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Meeting Trends */}
        {selectedView === 'meetingTrends' && (
          <>
            <div className="lycans-graphique-section">
              <h3>📈 Évolution de la Participation par Réunion</h3>
              <FullscreenChart title="Évolution de la Participation par Réunion">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={meetingTrendsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="meetingNumber"
                        label={{ value: 'Numéro de Réunion', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        label={{ value: 'Joueurs Moyens', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div style={{ 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                padding: 12, 
                                borderRadius: 8,
                                border: '1px solid var(--border-color)'
                              }}>
                                <div><strong>Réunion {label}</strong></div>
                                <div>Participation moy: {data.averageParticipation.toFixed(1)}</div>
                                <div>Votes moy: {data.averageVotes.toFixed(1)}</div>
                                <div>Passés moy: {data.averageSkips.toFixed(1)}</div>
                                <div>Abstentions moy: {data.averageAbstentions.toFixed(1)}</div>
                                <div>Taux d'élimination: {data.eliminationRate.toFixed(1)}%</div>
                                <div>Basé sur {data.totalGames} parties</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageParticipation" 
                        stroke="var(--accent-primary)" 
                        strokeWidth={3}
                        name="Participation"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageVotes" 
                        stroke="var(--accent-tertiary)" 
                        strokeWidth={2}
                        name="Votes"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageSkips" 
                        stroke="var(--accent-secondary)" 
                        strokeWidth={2}
                        name="Passés"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>

            <div className="lycans-graphique-section">
              <h3>💀 Taux d'Élimination par Réunion</h3>
              <FullscreenChart title="Taux d'Élimination par Réunion">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={meetingTrendsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="meetingNumber"
                        label={{ value: 'Numéro de Réunion', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        label={{ value: 'Taux d\'Élimination (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taux d\'Élimination']}
                      />
                      <Bar dataKey="eliminationRate" fill="var(--accent-danger)" />
                      <ReferenceLine y={50} stroke="var(--text-secondary)" strokeDasharray="5,5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          </>
        )}

        {/* Player Consistency */}
        {selectedView === 'playerConsistency' && (
          <div className="lycans-graphique-section">
            <h3>🎯 Consistance des Joueurs dans les Votes</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              textAlign: 'center', 
              marginBottom: '1rem' 
            }}>
              Score basé sur la régularité du comportement de vote (évite les extrêmes d'abstention/agressivité).
            </p>
            <FullscreenChart title="Consistance des Joueurs dans les Votes">
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    data={playerConsistencyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="votingRate"
                      type="number"
                      domain={[0, 100]}
                      label={{ value: 'Taux de Vote (%)', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      dataKey="consistencyScore"
                      type="number"
                      domain={[0, 100]}
                      label={{ value: 'Score de Consistance', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const dataPoint = payload[0].payload;
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div><strong>{dataPoint.playerName}</strong></div>
                              <div>Consistance: {dataPoint.consistencyScore.toFixed(1)}/100</div>
                              <div>Taux de vote: {dataPoint.votingRate.toFixed(1)}%</div>
                              <div>Taux "passé": {dataPoint.skippingRate.toFixed(1)}%</div>
                              <div>Abstentions: {dataPoint.abstentionRate.toFixed(1)}%</div>
                              <div>Agressivité: {dataPoint.aggressivenessScore.toFixed(1)}</div>
                              <div>Réunions: {dataPoint.totalMeetings}</div>
                              <div style={{ 
                                fontSize: '0.8rem', 
                                color: 'var(--accent-primary)', 
                                marginTop: '0.5rem',
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}>
                                🖱️ Cliquez pour voir les parties
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      dataKey="consistencyScore"
                      onClick={handlePlayerClick}
                      shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                        const isHighlighted = settings.highlightedPlayer === props.payload?.playerName;
                        const isHighlightedAddition = props.payload?.isHighlightedAddition;
                        
                        return (
                        <g style={{ cursor: 'pointer' }}>
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={isHighlighted ? 15 : 12}
                            fill={
                              playersColor[props.payload?.playerName] || 'var(--accent-primary)'
                            }
                            stroke={
                              isHighlighted
                                ? 'var(--accent-primary)'
                                : '#222'
                            }
                            strokeWidth={isHighlighted ? 3 : 1}
                            strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                          />
                          <text
                            x={props.cx}
                            y={props.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#fff"
                            fontSize={isHighlighted ? "12" : "10"}
                            fontWeight="bold"
                            pointerEvents="none"
                          >
                            {props.payload?.playerName?.substring(0, 3)}
                          </text>
                        </g>
                      )}}
                    />
                    <ReferenceLine x={70} stroke="var(--text-secondary)" strokeDasharray="5,5" />
                    <ReferenceLine y={70} stroke="var(--text-secondary)" strokeDasharray="5,5" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Voting Patterns */}
        {selectedView === 'votingPatterns' && votingStats && (
          <>
            <div className="lycans-graphique-section">
              <h3>🗳️ Relation Agressivité vs Précision</h3>
              <FullscreenChart title="Relation Agressivité vs Précision">
                <div style={{ height: 500 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      data={votingStats.playerBehaviorStats
                        .map(behavior => {
                          const accuracy = votingStats.playerAccuracyStats.find(
                            acc => acc.playerName === behavior.playerName
                          );
                          return {
                            playerName: behavior.playerName,
                            aggressivenessScore: behavior.aggressivenessScore,
                            accuracyRate: accuracy?.accuracyRate || 0,
                            totalMeetings: behavior.totalMeetings,
                            totalVotes: accuracy?.totalVotes || 0
                          };
                        })
                        .filter(player => player.totalMeetings >= 5 && player.totalVotes >= 3)
                      }
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="aggressivenessScore"
                        type="number"
                        label={{ value: 'Score d\'Agressivité', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        dataKey="accuracyRate"
                        type="number"
                        domain={[0, 100]}
                        label={{ value: 'Taux de Précision (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const dataPoint = payload[0].payload;
                            return (
                              <div style={{ 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                padding: 12, 
                                borderRadius: 8,
                                border: '1px solid var(--border-color)'
                              }}>
                                <div><strong>{dataPoint.playerName}</strong></div>
                                <div>Agressivité: {dataPoint.aggressivenessScore.toFixed(1)}</div>
                                <div>Précision: {dataPoint.accuracyRate.toFixed(1)}%</div>
                                <div>Réunions: {dataPoint.totalMeetings}</div>
                                <div>Total votes: {dataPoint.totalVotes}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter
                        dataKey="accuracyRate"
                        onClick={handlePlayerClick}
                        shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                          const isHighlighted = settings.highlightedPlayer === props.payload?.playerName;
                          
                          return (
                          <g style={{ cursor: 'pointer' }}>
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={isHighlighted ? 15 : 10}
                              fill={
                                playersColor[props.payload?.playerName] || 'var(--accent-primary)'
                              }
                              stroke={
                                isHighlighted ? 'var(--accent-primary)' : '#222'
                              }
                              strokeWidth={isHighlighted ? 3 : 1}
                            />
                            <text
                              x={props.cx}
                              y={props.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#fff"
                              fontSize={isHighlighted ? "11" : "9"}
                              fontWeight="bold"
                              pointerEvents="none"
                            >
                              {props.payload?.playerName?.substring(0, 2)}
                            </text>
                          </g>
                        )}}
                      />
                      <ReferenceLine x={0} stroke="var(--text-secondary)" strokeDasharray="5,5" />
                      <ReferenceLine y={50} stroke="var(--text-secondary)" strokeDasharray="5,5" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          </>
        )}

        {/* Game Details */}
        {selectedView === 'gameDetails' && selectedGameId && (
          (() => {
            const selectedGame = gameAnalyses.find(g => g.gameId === selectedGameId);
            if (!selectedGame) return null;

            return (
              <div className="lycans-graphique-section">
                <h3>🎮 Détails de la Partie {selectedGameId.split('-')[0]}</h3>
                
                {/* Summary Cards */}
                <div className="lycans-resume-conteneur">
                  <div className="lycans-stat-carte">
                    <h4>Total Réunions</h4>
                    <div className="lycans-valeur-principale">{selectedGame.totalMeetings}</div>
                    <p>réunions tenues</p>
                  </div>
                  <div className="lycans-stat-carte">
                    <h4>Total Votes</h4>
                    <div className="lycans-valeur-principale">
                      {selectedGame.meetingAnalytics.reduce((sum, m) => sum + m.totalVotes, 0)}
                    </div>
                    <p>votes exprimés</p>
                  </div>
                  <div className="lycans-stat-carte">
                    <h4>Joueurs Éliminés</h4>
                    <div className="lycans-valeur-principale">
                      {selectedGame.meetingAnalytics.filter(m => m.eliminatedPlayer).length}
                    </div>
                    <p>par vote</p>
                  </div>
                </div>

                {/* Meeting Timeline */}
                <FullscreenChart title={`Timeline des Réunions - Partie ${selectedGameId.split('-')[0]}`}>
                  <div style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={selectedGame.meetingAnalytics}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="meetingNumber"
                          label={{ value: 'Réunion', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length > 0) {
                              const meeting = payload[0].payload;
                              return (
                                <div style={{ 
                                  background: 'var(--bg-secondary)', 
                                  color: 'var(--text-primary)', 
                                  padding: 12, 
                                  borderRadius: 8,
                                  border: '1px solid var(--border-color)'
                                }}>
                                  <div><strong>Réunion {label}</strong></div>
                                  <div>Participants: {meeting.totalParticipants}</div>
                                  <div>Votes: {meeting.totalVotes}</div>
                                  <div>Passés: {meeting.totalSkips}</div>
                                  <div>Absents: {meeting.totalAbstentions}</div>
                                  <div>Participation: {meeting.participationRate.toFixed(1)}%</div>
                                  {meeting.mostTargetedPlayer && (
                                    <div>Plus ciblé: {meeting.mostTargetedPlayer} ({meeting.mostTargetedCount} votes)</div>
                                  )}
                                  {meeting.eliminatedPlayer && (
                                    <div style={{ color: 'var(--accent-danger)' }}>
                                      💀 Éliminé: {meeting.eliminatedPlayer}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="totalVotes" stackId="a" fill="var(--accent-tertiary)" name="Votes" />
                        <Bar dataKey="totalSkips" stackId="a" fill="var(--accent-secondary)" name="Passés" />
                        <Bar dataKey="totalAbstentions" stackId="a" fill="var(--accent-danger)" name="Abstentions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </FullscreenChart>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}