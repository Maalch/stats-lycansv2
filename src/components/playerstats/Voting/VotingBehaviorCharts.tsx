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

interface VotingBehaviorChartsProps {
  minMeetings: number;
}

export function VotingBehaviorCharts({ minMeetings }: VotingBehaviorChartsProps) {
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

  // Prepare data for vote rate chart
  const { voteRateChartData, highlightedPlayerInVoteRate } = useMemo(() => {
    if (!filteredVotingStats) return { voteRateChartData: [], highlightedPlayerInVoteRate: false };
    
    const sortedData = [...filteredVotingStats.playerBehaviorStats]
      .sort((a, b) => b.votingRate - a.votingRate)
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
    
    return { voteRateChartData: finalData, highlightedPlayerInVoteRate: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for skip rate chart
  const { skipRateChartData, highlightedPlayerInSkipRate } = useMemo(() => {
    if (!filteredVotingStats) return { skipRateChartData: [], highlightedPlayerInSkipRate: false };
    
    const sortedData = [...filteredVotingStats.playerBehaviorStats]
      .sort((a, b) => b.skippingRate - a.skippingRate)
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
    
    return { skipRateChartData: finalData, highlightedPlayerInSkipRate: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for abstention rate chart
  const { abstentionRateChartData, highlightedPlayerInAbstentionRate } = useMemo(() => {
    if (!filteredVotingStats) return { abstentionRateChartData: [], highlightedPlayerInAbstentionRate: false };
    
    const sortedData = [...filteredVotingStats.playerBehaviorStats]
      .sort((a, b) => b.abstentionRate - a.abstentionRate)
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
    
    return { abstentionRateChartData: finalData, highlightedPlayerInAbstentionRate: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  if (!filteredVotingStats) {
    return <div className="donnees-manquantes">Aucune donnée de vote disponible</div>;
  }

  return (
    <>
      {/* Vote Rate Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>📊 Taux de Vote - Top 15</h3>
          {highlightedPlayerInVoteRate && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
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
          Pourcentage de meetings où le joueur a voté activement (hors non-votes).
        </p>
        <FullscreenChart title="Taux de Vote - Top 15">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={voteRateChartData}
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
                    value: 'Taux de Vote (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }}
                  domain={[0, 100]}
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
                          <div>Votes: {dataPoint.totalVotes}</div>
                          <div><strong>Taux de vote: {dataPoint.votingRate.toFixed(1)}%</strong></div>
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
                  dataKey="votingRate" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {voteRateChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHoveredPlayer = highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-voterate-${index}`}
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

      {/* Skip Rate Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>⏭️ Taux de "Passé" - Top 15</h3>
          {highlightedPlayerInSkipRate && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
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
          Pourcentage de meetings où le joueur a voté "Passé".
        </p>
        <FullscreenChart title='Taux de "Passé" - Top 15'>
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={skipRateChartData}
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
                    value: 'Taux de "Passé" (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }}
                  domain={[0, 100]}
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
                          <div>Votes "Passé": {dataPoint.totalSkips}</div>
                          <div><strong>Taux de "Passé": {dataPoint.skippingRate.toFixed(1)}%</strong></div>
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
                  dataKey="skippingRate" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {skipRateChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHoveredPlayer = highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-skiprate-${index}`}
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

      {/* Abstention Rate Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🚫 Taux de Non-Vote - Top 15</h3>
          {highlightedPlayerInAbstentionRate && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
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
          Pourcentage de meetings où le joueur n'a pas voté du tout.
        </p>
        <FullscreenChart title="Taux de Non-Vote - Top 15">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={abstentionRateChartData}
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
                    value: 'Taux de Non-Vote (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }}
                  domain={[0, 100]}
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
                          <div>Non-votes: {dataPoint.totalAbstentions}</div>
                          <div><strong>Taux de non-vote: {dataPoint.abstentionRate.toFixed(1)}%</strong></div>
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
                  dataKey="abstentionRate" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {abstentionRateChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHoveredPlayer = highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-abstention-${index}`}
                        fill={
                          playersColor[entry.playerName] || 'var(--chart-tertiary)'
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
