import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useVotingStatisticsFromRaw } from '../../hooks/useVotingStatisticsFromRaw';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, useThemeAdjustedLycansColorScheme } from '../../types/api';
import { calculateGameVotingAnalysis } from '../../utils/votingStatsUtils';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';

export function VotingInsightsChart() {
  const { settings } = useSettings();
  const { navigateToGameDetails } = useNavigation();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  const [selectedInsight, setSelectedInsight] = useState<'idiotSuccess' | 'friendlyFire' | 'votingTiming' | 'campAccuracy'>('idiotSuccess');

  const { data: votingStats, isLoading, error } = useVotingStatisticsFromRaw();
  const { gameData } = useCombinedFilteredRawData();

  // Calculate special voting insights
  const votingInsights = useMemo(() => {
    if (!gameData || gameData.length === 0) return null;
    
    const gamesWithVotingData = gameData.filter(game => 
      game.PlayerStats.some(player => player.Votes && player.Votes.length > 0)
    );

    // Idiot du Village analysis
    const idiotGames = gamesWithVotingData.filter(game =>
      game.PlayerStats.some(player => 
        getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []) === 'Idiot du Village'
      )
    );

    const idiotSuccessData = idiotGames.map(game => {
      const idiot = game.PlayerStats.find(player => 
        getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []) === 'Idiot du Village'
      );
      
      if (!idiot) return null;
      
      const wasVotedOut = idiot.DeathType === 'VOTED';
      const wonGame = idiot.Victorious;
      
      return {
        gameId: game.Id,
        idiotName: idiot.Username,
        wasVotedOut,
        wonGame,
        correctPlay: wasVotedOut === wonGame, // Idiot should get voted out to win
        totalVotesAgainstIdiot: calculateGameVotingAnalysis(game).playerTargetStats
          .find(p => p.playerName === idiot.Username)?.totalTimesTargeted || 0,
        meetingsParticipated: calculateGameVotingAnalysis(game).playerBehaviors
          .find(p => p.playerName === idiot.Username)?.totalMeetings || 0
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Friendly fire analysis by camp
    const friendlyFireStats = new Map<string, {
      totalVotes: number;
      friendlyFireCount: number;
      players: Set<string>;
    }>();

    gamesWithVotingData.forEach(game => {
      const analysis = calculateGameVotingAnalysis(game);
      
      analysis.playerAccuracies.forEach(accuracy => {
        const player = game.PlayerStats.find(p => p.Username === accuracy.playerName);
        if (!player) return;
        
        const playerCamp = getPlayerCampFromRole(
          getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])
        );
        
        const existing = friendlyFireStats.get(playerCamp) || {
          totalVotes: 0,
          friendlyFireCount: 0,
          players: new Set()
        };
        
        existing.totalVotes += accuracy.totalVotes;
        existing.friendlyFireCount += accuracy.votesForOwnCamp;
        existing.players.add(accuracy.playerName);
        
        friendlyFireStats.set(playerCamp, existing);
      });
    });

    // Voting timing patterns (early vs late meetings)
    const timingPatterns = new Map<string, {
      earlyMeetingVotes: number;
      lateMeetingVotes: number;
      earlyMeetingSkips: number;
      lateMeetingSkips: number;
    }>();

    gamesWithVotingData.forEach(game => {
      const analysis = calculateGameVotingAnalysis(game);
      const maxMeeting = Math.max(...analysis.meetingAnalytics.map(m => m.meetingNumber));
      
      game.PlayerStats.forEach(player => {
        if (player.Votes.length === 0) return;
        
        const existing = timingPatterns.get(player.Username) || {
          earlyMeetingVotes: 0,
          lateMeetingVotes: 0,
          earlyMeetingSkips: 0,
          lateMeetingSkips: 0
        };
        
        player.Votes.forEach(vote => {
          const isEarlyMeeting = vote.MeetingNr <= Math.ceil(maxMeeting / 2);
          
          if (vote.Target === 'Passé') {
            if (isEarlyMeeting) {
              existing.earlyMeetingSkips++;
            } else {
              existing.lateMeetingSkips++;
            }
          } else {
            if (isEarlyMeeting) {
              existing.earlyMeetingVotes++;
            } else {
              existing.lateMeetingVotes++;
            }
          }
        });
        
        timingPatterns.set(player.Username, existing);
      });
    });

    return {
      idiotSuccessData,
      friendlyFireStats: Array.from(friendlyFireStats.entries()).map(([camp, stats]) => ({
        camp,
        totalVotes: stats.totalVotes,
        friendlyFireCount: stats.friendlyFireCount,
        friendlyFireRate: stats.totalVotes > 0 ? (stats.friendlyFireCount / stats.totalVotes) * 100 : 0,
        uniquePlayers: stats.players.size
      })),
      timingPatterns: Array.from(timingPatterns.entries())
        .map(([playerName, patterns]) => {
          const totalEarly = patterns.earlyMeetingVotes + patterns.earlyMeetingSkips;
          const totalLate = patterns.lateMeetingVotes + patterns.lateMeetingSkips;
          
          return {
            playerName,
            earlyVotingRate: totalEarly > 0 ? (patterns.earlyMeetingVotes / totalEarly) * 100 : 0,
            lateVotingRate: totalLate > 0 ? (patterns.lateMeetingVotes / totalLate) * 100 : 0,
            totalEarlyActions: totalEarly,
            totalLateActions: totalLate,
            votingConsistency: totalEarly > 0 && totalLate > 0 
              ? 100 - Math.abs((patterns.earlyMeetingVotes / totalEarly) - (patterns.lateMeetingVotes / totalLate)) * 100
              : 0
          };
        })
        .filter(p => p.totalEarlyActions + p.totalLateActions >= 5)
        .sort((a, b) => b.votingConsistency - a.votingConsistency)
        .slice(0, 15)
    };
  }, [gameData]);

  if (isLoading) {
    return <div className="donnees-attente">Chargement des insights de vote...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!votingStats || !votingInsights) {
    return <div className="donnees-manquantes">Aucune donnée d'insight de vote disponible</div>;
  }

  const handlePlayerClick = (data: any) => {
    if (data && data.playerName) {
      navigateToGameDetails({
        selectedPlayer: data.playerName,
        fromComponent: 'Insights des Votes'
      });
    }
  };

  return (
    <div className="lycans-voting-insights">
      <h2>💡 Insights des Votes</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="insight-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Insight:
          </label>
          <select
            id="insight-select"
            value={selectedInsight}
            onChange={(e) => setSelectedInsight(e.target.value as any)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '240px'
            }}
          >
            <option value="idiotSuccess">🎭 Succès Idiot du Village</option>
            <option value="friendlyFire">🔥 Feu Ami par Camp</option>
            <option value="votingTiming">⏰ Patterns de Timing</option>
            <option value="campAccuracy">🎯 Précision par Camp</option>
          </select>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Idiot du Village Success Analysis */}
        {selectedInsight === 'idiotSuccess' && (
          <>
            <div className="lycans-resume-conteneur">
              <div className="lycans-stat-carte">
                <h3>Parties avec Idiot</h3>
                <div className="lycans-valeur-principale">{votingInsights.idiotSuccessData.length}</div>
                <p>parties analysées</p>
              </div>
              <div className="lycans-stat-carte">
                <h3>Taux de Succès</h3>
                <div className="lycans-valeur-principale">
                  {votingInsights.idiotSuccessData.length > 0 
                    ? (votingInsights.idiotSuccessData.filter(d => d.correctPlay).length / votingInsights.idiotSuccessData.length * 100).toFixed(1)
                    : 0}%
                </div>
                <p>parties gagnées correctement</p>
              </div>
              <div className="lycans-stat-carte">
                <h3>Votes Reçus (Moy.)</h3>
                <div className="lycans-valeur-principale">
                  {votingInsights.idiotSuccessData.length > 0 
                    ? (votingInsights.idiotSuccessData.reduce((sum, d) => sum + d.totalVotesAgainstIdiot, 0) / votingInsights.idiotSuccessData.length).toFixed(1)
                    : 0}
                </div>
                <p>votes ciblant l'idiot</p>
              </div>
            </div>

            <div className="lycans-graphique-section">
              <h3>🎭 Analyse des Stratégies Idiot du Village</h3>
              <FullscreenChart title="Analyse des Stratégies Idiot du Village">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={[
                          { 
                            name: 'Succès (voté + gagné)', 
                            value: votingInsights.idiotSuccessData.filter(d => d.wasVotedOut && d.wonGame).length,
                            fill: lycansColorScheme['Idiot du Village'] 
                          },
                          { 
                            name: 'Échec (pas voté)', 
                            value: votingInsights.idiotSuccessData.filter(d => !d.wasVotedOut && !d.wonGame).length,
                            fill: 'var(--accent-danger)' 
                          },
                          { 
                            name: 'Survécu (pas voté + perdu)', 
                            value: votingInsights.idiotSuccessData.filter(d => !d.wasVotedOut && !d.wonGame).length,
                            fill: 'var(--accent-secondary)' 
                          },
                          { 
                            name: 'Anomalie (voté + perdu)', 
                            value: votingInsights.idiotSuccessData.filter(d => d.wasVotedOut && !d.wonGame).length,
                            fill: 'var(--text-secondary)' 
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(1)}%)`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value, 'Parties']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          </>
        )}

        {/* Friendly Fire Analysis */}
        {selectedInsight === 'friendlyFire' && (
          <div className="lycans-graphique-section">
            <h3>🔥 Taux de Feu Ami par Camp</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              textAlign: 'center', 
              marginBottom: '1rem' 
            }}>
              Pourcentage de votes dirigés contre son propre camp par erreur.
            </p>
            <FullscreenChart title="Taux de Feu Ami par Camp">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={votingInsights.friendlyFireStats}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="camp"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Taux de Feu Ami (%)', 
                        angle: 270, 
                        position: 'left', 
                        style: { textAnchor: 'middle' } 
                      }}
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
                              <div><strong>Camp {dataPoint.camp}</strong></div>
                              <div>Feu ami: {dataPoint.friendlyFireCount} votes</div>
                              <div>Total votes: {dataPoint.totalVotes}</div>
                              <div>Taux: {dataPoint.friendlyFireRate.toFixed(1)}%</div>
                              <div>Joueurs uniques: {dataPoint.uniquePlayers}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="friendlyFireRate">
                      {votingInsights.friendlyFireStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={lycansColorScheme[entry.camp] || 'var(--accent-primary)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Voting Timing Patterns */}
        {selectedInsight === 'votingTiming' && (
          <div className="lycans-graphique-section">
            <h3>⏰ Consistance du Timing de Vote</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              textAlign: 'center', 
              marginBottom: '1rem' 
            }}>
              Joueurs qui maintiennent le même comportement de vote en début et fin de partie.
            </p>
            <FullscreenChart title="Consistance du Timing de Vote">
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={votingInsights.timingPatterns}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="playerName"
                      angle={-45}
                      textAnchor="end"
                      height={110}
                      interval={0}
                      fontSize={13}
                      tick={({ x, y, payload }) => {
                        const isHighlighted = settings.highlightedPlayer === payload.value;
                        
                        return (
                          <text
                            x={x}
                            y={y}
                            dy={16}
                            textAnchor="end"
                            fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                            fontSize={isHighlighted ? 14 : 13}
                            fontWeight={isHighlighted ? 'bold' : 'italic'}
                            transform={`rotate(-45 ${x} ${y})`}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Score de Consistance (%)', 
                        angle: 270, 
                        position: 'left', 
                        style: { textAnchor: 'middle' } 
                      }}
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
                              <div>Consistance: {dataPoint.votingConsistency.toFixed(1)}%</div>
                              <div>Vote début partie: {dataPoint.earlyVotingRate.toFixed(1)}%</div>
                              <div>Vote fin partie: {dataPoint.lateVotingRate.toFixed(1)}%</div>
                              <div>Actions début: {dataPoint.totalEarlyActions}</div>
                              <div>Actions fin: {dataPoint.totalLateActions}</div>
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
                    <Bar 
                      dataKey="votingConsistency" 
                      style={{ cursor: 'pointer' }}
                      onClick={handlePlayerClick}
                    >
                      {votingInsights.timingPatterns.map((entry, index) => {
                        const isHighlighted = settings.highlightedPlayer === entry.playerName;
                        
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              playersColor[entry.playerName] || 
                              'var(--accent-tertiary)'
                            }
                            stroke={isHighlighted ? 'var(--accent-primary)' : 'transparent'}
                            strokeWidth={isHighlighted ? 3 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Camp Accuracy Overview */}
        {selectedInsight === 'campAccuracy' && votingStats && (
          <div className="lycans-graphique-section">
            <h3>🎯 Précision Moyenne par Camp d'Origine</h3>
            <FullscreenChart title="Précision Moyenne par Camp d'Origine">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(() => {
                      const campAccuracy = new Map<string, { totalAccuracy: number; count: number; playerNames: string[] }>();
                      
                      // We need to group players by their most common camp
                      votingStats.playerAccuracyStats.forEach(accuracy => {
                        // For simplicity, we'll assign players to Villageois or Loup based on their accuracy
                        // In a real implementation, you'd track their actual camp history
                        const camp = accuracy.accuracyRate > 60 ? 'Villageois' : 'Loup';
                        
                        const existing = campAccuracy.get(camp) || { totalAccuracy: 0, count: 0, playerNames: [] };
                        existing.totalAccuracy += accuracy.accuracyRate;
                        existing.count += 1;
                        existing.playerNames.push(accuracy.playerName);
                        campAccuracy.set(camp, existing);
                      });
                      
                      return Array.from(campAccuracy.entries()).map(([camp, stats]) => ({
                        camp,
                        averageAccuracy: stats.count > 0 ? stats.totalAccuracy / stats.count : 0,
                        playerCount: stats.count,
                        playerNames: stats.playerNames.slice(0, 5).join(', ')
                      }));
                    })()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="camp"
                      fontSize={12}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Précision Moyenne (%)', 
                        angle: 270, 
                        position: 'left', 
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Précision Moyenne']}
                    />
                    <Bar dataKey="averageAccuracy">
                      {[{ camp: 'Villageois' }, { camp: 'Loup' }].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={lycansColorScheme[entry.camp] || 'var(--accent-primary)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}
      </div>
    </div>
  );
}