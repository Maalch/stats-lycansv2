import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useFilteredVotingStatistics } from '../../../hooks/useVotingStatisticsFromRaw';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';

// Extended type for chart data with highlighting info
type ChartPlayerStat = {
  playerName: string;
  isHighlightedAddition?: boolean;
  [key: string]: any;
};

interface VotingOverviewChartsProps {
  minMeetings: number;
}

export function VotingOverviewCharts({ minMeetings }: VotingOverviewChartsProps) {
  const { settings } = useSettings();
  const { navigateToGameDetails } = useNavigation();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  
  const { data: filteredVotingStats } = useFilteredVotingStatistics(minMeetings);

  // Handle chart clicks to navigate to game details
  const handlePlayerClick = (data: any) => {
    if (data && data.playerName) {
      navigateToGameDetails({
        selectedPlayer: data.playerName,
        fromComponent: 'Statistiques de Votes'
      });
    }
  };

  // Prepare data for behavior chart with proper highlighted player handling
  const { behaviorChartData, highlightedPlayerInBehavior } = useMemo(() => {
    if (!filteredVotingStats) return { behaviorChartData: [], highlightedPlayerInBehavior: false };
    
    const sortedData = [...filteredVotingStats.playerBehaviorStats]
      .sort((a, b) => b.aggressivenessScore - a.aggressivenessScore)
      .slice(0, 15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = filteredVotingStats.playerBehaviorStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (highlightedPlayerData) {
        finalData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedAdded = true;
      }
    }
    
    return { behaviorChartData: finalData, highlightedPlayerInBehavior: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for accuracy chart
  const { accuracyChartData, highlightedPlayerInAccuracy } = useMemo(() => {
    if (!filteredVotingStats) return { accuracyChartData: [], highlightedPlayerInAccuracy: false };
    
    const sortedData = [...filteredVotingStats.playerAccuracyStats]
      .sort((a, b) => {
        if (b.accuracyRate !== a.accuracyRate) {
          return b.accuracyRate - a.accuracyRate;
        }
        return b.totalVotes - a.totalVotes;
      })
      .slice(0, 15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = filteredVotingStats.playerAccuracyStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (highlightedPlayerData) {
        finalData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedAdded = true;
      }
    }
    
    return { accuracyChartData: finalData, highlightedPlayerInAccuracy: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for target chart
  const { targetChartData, highlightedPlayerInTargets } = useMemo(() => {
    if (!filteredVotingStats) return { targetChartData: [], highlightedPlayerInTargets: false };
    
    const sortedData = [...filteredVotingStats.playerTargetStats]
      .sort((a, b) => b.survivalRate - a.survivalRate)
      .slice(0, 15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = filteredVotingStats.playerTargetStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (highlightedPlayerData) {
        finalData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedAdded = true;
      }
    }
    
    return { targetChartData: finalData, highlightedPlayerInTargets: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  if (!filteredVotingStats) {
    return <div className="donnees-manquantes">Aucune donnée de vote disponible</div>;
  }

  return (
    <>
      {/* Voting Behavior Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🗳️ Score d'Agressivité</h3>
          {highlightedPlayerInBehavior && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          marginBottom: '1rem' 
        }}>
          Score basé sur le taux de vote, les abstentions et les "passés". Plus c'est haut, plus le joueur vote activement.
        </p>
        <FullscreenChart title="Score d'Agressivité">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={behaviorChartData}
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
                    value: 'Score d\'Agressivité (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const dataPoint = payload[0].payload;
                      const isHighlightedAddition = (dataPoint as ChartPlayerStat).isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === dataPoint.playerName;
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)'
                        }}>
                          <div><strong>{dataPoint.playerName}</strong></div>
                          <div>Meetings: {dataPoint.totalMeetings}</div>
                          <div>Votes: {dataPoint.totalVotes} ({dataPoint.votingRate.toFixed(1)}%)</div>
                          <div>Passés: {dataPoint.totalSkips} ({dataPoint.skippingRate.toFixed(1)}%)</div>
                          <div>Absents: {dataPoint.totalAbstentions} ({dataPoint.abstentionRate.toFixed(1)}%)</div>
                          <div><strong>Score: {dataPoint.aggressivenessScore.toFixed(1)}%</strong></div>
                          {isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection personnelle
                            </div>
                          )}
                          {isHighlightedFromSettings && !isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Joueur sélectionné
                            </div>
                          )}
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
                  dataKey="aggressivenessScore" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {behaviorChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHoveredPlayer = highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-behavior-${index}`}
                        fill={
                          playersColor[entry.playerName] || 
                          (entry.aggressivenessScore >= 0 ? 'var(--accent-tertiary)' : 'var(--accent-danger)')
                        }
                        stroke={
                          isHighlightedFromSettings 
                            ? 'var(--accent-primary)' 
                            : isHoveredPlayer 
                              ? 'var(--text-primary)' 
                              : 'transparent'
                        }
                        strokeWidth={
                          isHighlightedFromSettings 
                            ? 3 
                            : isHoveredPlayer 
                              ? 2 
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* Voting Accuracy Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🎯 Précision des Votes - Taux de Votes Justes</h3>
          {highlightedPlayerInAccuracy && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          marginBottom: '1rem' 
        }}>
          Pourcentage de votes dirigés contre le camp adverse (et non contre son propre camp).
        </p>
        <FullscreenChart title="Précision des Votes - Taux de Votes Justes">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={accuracyChartData}
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
                    value: 'Taux de Précision (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const dataPoint = payload[0].payload;
                      const isHighlightedAddition = (dataPoint as ChartPlayerStat).isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === dataPoint.playerName;
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)'
                        }}>
                          <div><strong>{dataPoint.playerName}</strong></div>
                          <div>Total meetings: {dataPoint.totalMeetings}</div>
                          <div>Votes justes: {dataPoint.votesForEnemyCamp}</div>
                          <div>Votes incorrects: {dataPoint.votesForOwnCamp}</div>
                          <div><strong>Précision: {dataPoint.accuracyRate.toFixed(1)}%</strong></div>
                          {isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection personnelle
                            </div>
                          )}
                          {isHighlightedFromSettings && !isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Joueur sélectionné
                            </div>
                          )}
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
                  dataKey="accuracyRate" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {accuracyChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHoveredPlayer = highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-accuracy-${index}`}
                        fill={
                          playersColor[entry.playerName] || 'var(--chart-primary)'
                        }
                        stroke={
                          isHighlightedFromSettings 
                            ? 'var(--accent-primary)' 
                            : isHoveredPlayer 
                              ? 'var(--text-primary)' 
                              : 'transparent'
                        }
                        strokeWidth={
                          isHighlightedFromSettings 
                            ? 3 
                            : isHoveredPlayer 
                              ? 2 
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* Target Survival Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🔻 Joueurs Ciblés - Taux de Survie aux Votes</h3>
          {highlightedPlayerInTargets && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          marginBottom: '1rem' 
        }}>
          Pourcentage de fois où le joueur a survécu après avoir été ciblé par au moins un vote.
        </p>
        <FullscreenChart title="Joueurs Ciblés - Taux de Survie aux Votes">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={targetChartData}
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
                    value: 'Taux de Survie (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const dataPoint = payload[0].payload;
                      const isHighlightedAddition = (dataPoint as ChartPlayerStat).isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === dataPoint.playerName;
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)'
                        }}>
                          <div><strong>{dataPoint.playerName}</strong></div>
                          <div>Total meetings: {dataPoint.totalMeetings}</div>
                          <div>Fois ciblé: {dataPoint.totalTimesTargeted}</div>
                          <div>Ciblé par camp adverse: {dataPoint.timesTargetedByEnemyCamp}</div>
                          <div>Ciblé par son camp: {dataPoint.timesTargetedByOwnCamp}</div>
                          <div>Éliminations par vote: {dataPoint.eliminationsByVote}</div>
                          <div><strong>Taux de survie: {dataPoint.survivalRate.toFixed(1)}%</strong></div>
                          {isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection personnelle
                            </div>
                          )}
                          {isHighlightedFromSettings && !isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Joueur sélectionné
                            </div>
                          )}
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
                  dataKey="survivalRate" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {targetChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHoveredPlayer = highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-target-${index}`}
                        fill={
                          playersColor[entry.playerName] || 'var(--chart-secondary)'
                        }
                        stroke={
                          isHighlightedFromSettings 
                            ? 'var(--accent-primary)' 
                            : isHoveredPlayer 
                              ? 'var(--text-primary)' 
                              : 'transparent'
                        }
                        strokeWidth={
                          isHighlightedFromSettings 
                            ? 3 
                            : isHoveredPlayer 
                              ? 2 
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>
    </>
  );
}
