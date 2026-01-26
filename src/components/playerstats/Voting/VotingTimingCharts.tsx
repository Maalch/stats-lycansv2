import { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useFilteredVotingStatistics } from '../../../hooks/useVotingStatisticsFromRaw';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { CHART_LIMITS } from '../../../config/chartConstants';

// Extended type for chart data with highlighting info
type ChartPlayerStat = {
  playerName: string;
  isHighlightedAddition?: boolean;
  [key: string]: any;
};

interface VotingTimingChartsProps {
  minMeetings: number;
}

export function VotingTimingCharts({ minMeetings }: VotingTimingChartsProps) {
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

  // Prepare data for early voters chart (lowest percentile = earliest voters)
  const { earlyVotersChartData, highlightedPlayerInEarlyVoters } = useMemo(() => {
    if (!filteredVotingStats) return { earlyVotersChartData: [], highlightedPlayerInEarlyVoters: false };
    
    const sortedData = [...filteredVotingStats.playerTimingStats]
      .sort((a, b) => a.averageVotePositionPercentile - b.averageVotePositionPercentile)
      .slice(0, CHART_LIMITS.TOP_15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = filteredVotingStats.playerTimingStats.find(
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
    
    return { earlyVotersChartData: finalData, highlightedPlayerInEarlyVoters: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for late voters chart (highest percentile = latest voters)
  const { lateVotersChartData, highlightedPlayerInLateVoters } = useMemo(() => {
    if (!filteredVotingStats) return { lateVotersChartData: [], highlightedPlayerInLateVoters: false };
    
    const sortedData = [...filteredVotingStats.playerTimingStats]
      .sort((a, b) => b.averageVotePositionPercentile - a.averageVotePositionPercentile)
      .slice(0, CHART_LIMITS.TOP_15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = filteredVotingStats.playerTimingStats.find(
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
    
    return { lateVotersChartData: finalData, highlightedPlayerInLateVoters: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for first voter frequency chart
  const { firstVoterChartData, highlightedPlayerInFirstVoter } = useMemo(() => {
    if (!filteredVotingStats) return { firstVoterChartData: [], highlightedPlayerInFirstVoter: false };
    
    // Add calculated percentage field to each player
    const dataWithPercentage = filteredVotingStats.playerTimingStats.map(p => ({
      ...p,
      firstVoterPercentage: p.totalTimedVotes > 0 ? (p.timesFirstVoter / p.totalTimedVotes) * 100 : 0
    }));
    
    const sortedData = dataWithPercentage
      .filter(p => p.timesFirstVoter > 0) // Only players who've been first at least once
      .sort((a, b) => b.firstVoterPercentage - a.firstVoterPercentage) // Sort by percentage descending
      .slice(0, CHART_LIMITS.TOP_15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = dataWithPercentage.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (highlightedPlayerData && highlightedPlayerData.timesFirstVoter > 0) {
        finalData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedAdded = true;
      }
    }
    
    return { firstVoterChartData: finalData, highlightedPlayerInFirstVoter: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  // Prepare data for average delay chart (shortest delay = fastest voters)
  const { fastVotersChartData, highlightedPlayerInFastVoters } = useMemo(() => {
    if (!filteredVotingStats) return { fastVotersChartData: [], highlightedPlayerInFastVoters: false };
    
    const sortedData = [...filteredVotingStats.playerTimingStats]
      .sort((a, b) => a.averageVoteDelaySeconds - b.averageVoteDelaySeconds)
      .slice(0, CHART_LIMITS.TOP_15);
    
    const highlightedInTop = settings.highlightedPlayer && 
      sortedData.some(p => p.playerName === settings.highlightedPlayer);
    
    let finalData: ChartPlayerStat[] = [...sortedData];
    let highlightedAdded = false;
    
    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = filteredVotingStats.playerTimingStats.find(
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
    
    return { fastVotersChartData: finalData, highlightedPlayerInFastVoters: highlightedAdded };
  }, [filteredVotingStats, settings.highlightedPlayer]);

  if (!filteredVotingStats || !filteredVotingStats.playerTimingStats || filteredVotingStats.playerTimingStats.length === 0) {
    return (
      <div className="donnees-manquantes">
        <p>Aucune donnée de timing de vote disponible</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Les statistiques de timing nécessitent des parties en version 0.201+ avec le mode modé activé.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Early Voters Chart - Average Position Percentile */}
      <div className="lycans-graphique-section">
        <div>
          <h3>⏰ Voteurs Précoces - Top 15</h3>
          {highlightedPlayerInEarlyVoters && settings.highlightedPlayer && (
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
          Position moyenne de vote (0 = premier voteur, 100 = dernier voteur). Classement des joueurs qui votent le plus tôt.
        </p>
        <FullscreenChart title="Voteurs Précoces - Top 15">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={earlyVotersChartData}
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
                    value: 'Position Moyenne (%)', 
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
                          border: isHighlightedFromSettings 
                            ? '2px solid var(--accent-primary)' 
                            : isHighlightedAddition 
                              ? '2px dashed var(--accent-secondary)' 
                              : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                        }}>
                          <p style={{ 
                            margin: 0, 
                            fontWeight: 'bold', 
                            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)',
                            marginBottom: '8px'
                          }}>
                            {dataPoint.playerName}
                            {isHighlightedFromSettings && ' 🎯'}
                            {isHighlightedAddition && !isHighlightedFromSettings && ' ⭐'}
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Position moyenne: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.averageVotePositionPercentile.toFixed(1)}%</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Votes analysés: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.totalTimedVotes}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Premier voteur: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.timesFirstVoter} fois</strong>
                          </p>
                          {isHighlightedAddition && !isHighlightedFromSettings && (
                            <p style={{ 
                              margin: '8px 0 0 0', 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-secondary)',
                              fontStyle: 'italic'
                            }}>
                              ⭐ Joueur ajouté (hors top 15)
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="averageVotePositionPercentile" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {earlyVotersChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = (entry as ChartPlayerStat).isHighlightedAddition;
                    const isHovered = highlightedPlayer === entry.playerName;
                    
                    let fillColor: string;
                    if (isHighlightedFromSettings) {
                      fillColor = 'var(--accent-primary)';
                    } else if (isHighlightedAddition) {
                      fillColor = 'var(--accent-secondary)';
                    } else if (isHovered) {
                      fillColor = 'var(--accent-hover)';
                    } else {
                      fillColor = playersColor[entry.playerName] || 'var(--chart-primary)';
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={fillColor}
                        stroke={isHighlightedFromSettings ? "var(--accent-primary)" : "none"}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* Late Voters Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🐌 Voteurs Tardifs - Top 15</h3>
          {highlightedPlayerInLateVoters && settings.highlightedPlayer && (
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
          Position moyenne de vote. Classement des joueurs qui votent le plus tard (proche de 100% = dernier voteur).
        </p>
        <FullscreenChart title="Voteurs Tardifs - Top 15">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lateVotersChartData}
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
                    value: 'Position Moyenne (%)', 
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
                          border: isHighlightedFromSettings 
                            ? '2px solid var(--accent-primary)' 
                            : isHighlightedAddition 
                              ? '2px dashed var(--accent-secondary)' 
                              : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                        }}>
                          <p style={{ 
                            margin: 0, 
                            fontWeight: 'bold', 
                            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)',
                            marginBottom: '8px'
                          }}>
                            {dataPoint.playerName}
                            {isHighlightedFromSettings && ' 🎯'}
                            {isHighlightedAddition && !isHighlightedFromSettings && ' ⭐'}
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Position moyenne: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.averageVotePositionPercentile.toFixed(1)}%</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Votes analysés: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.totalTimedVotes}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Dernier voteur: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.timesLastVoter} fois</strong>
                          </p>
                          {isHighlightedAddition && !isHighlightedFromSettings && (
                            <p style={{ 
                              margin: '8px 0 0 0', 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-secondary)',
                              fontStyle: 'italic'
                            }}>
                              ⭐ Joueur ajouté (hors top 15)
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="averageVotePositionPercentile" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {lateVotersChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = (entry as ChartPlayerStat).isHighlightedAddition;
                    const isHovered = highlightedPlayer === entry.playerName;
                    
                    let fillColor: string;
                    if (isHighlightedFromSettings) {
                      fillColor = 'var(--accent-primary)';
                    } else if (isHighlightedAddition) {
                      fillColor = 'var(--accent-secondary)';
                    } else if (isHovered) {
                      fillColor = 'var(--accent-hover)';
                    } else {
                      fillColor = playersColor[entry.playerName] || 'var(--chart-primary)';
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={fillColor}
                        stroke={isHighlightedFromSettings ? "var(--accent-primary)" : "none"}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* First Voter Frequency Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🥇 Champions du Premier Vote - Top 15</h3>
          {highlightedPlayerInFirstVoter && settings.highlightedPlayer && (
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
          Pourcentage de fois où le joueur a été le premier à voter dans un meeting (votes actifs uniquement).
        </p>
        <FullscreenChart title="Champions du Premier Vote - Top 15">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={firstVoterChartData}
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
                    value: 'Taux (%)', 
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
                      const firstVoterRate = dataPoint.totalTimedVotes > 0 
                        ? (dataPoint.timesFirstVoter / dataPoint.totalTimedVotes * 100).toFixed(1) 
                        : '0';
                      
                      return (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          border: isHighlightedFromSettings 
                            ? '2px solid var(--accent-primary)' 
                            : isHighlightedAddition 
                              ? '2px dashed var(--accent-secondary)' 
                              : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                        }}>
                          <p style={{ 
                            margin: 0, 
                            fontWeight: 'bold', 
                            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)',
                            marginBottom: '8px'
                          }}>
                            {dataPoint.playerName}
                            {isHighlightedFromSettings && ' 🎯'}
                            {isHighlightedAddition && !isHighlightedFromSettings && ' ⭐'}
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Premier voteur: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.timesFirstVoter} fois</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Taux: <strong style={{ color: 'var(--text-primary)' }}>{firstVoterRate}%</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Votes analysés: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.totalTimedVotes}</strong>
                          </p>
                          {isHighlightedAddition && !isHighlightedFromSettings && (
                            <p style={{ 
                              margin: '8px 0 0 0', 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-secondary)',
                              fontStyle: 'italic'
                            }}>
                              ⭐ Joueur ajouté (hors top 15)
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="firstVoterPercentage" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {firstVoterChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = (entry as ChartPlayerStat).isHighlightedAddition;
                    const isHovered = highlightedPlayer === entry.playerName;
                    
                    let fillColor: string;
                    if (isHighlightedFromSettings) {
                      fillColor = 'var(--accent-primary)';
                    } else if (isHighlightedAddition) {
                      fillColor = 'var(--accent-secondary)';
                    } else if (isHovered) {
                      fillColor = 'var(--accent-hover)';
                    } else {
                      fillColor = playersColor[entry.playerName] || 'var(--chart-primary)';
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={fillColor}
                        stroke={isHighlightedFromSettings ? "var(--accent-primary)" : "none"}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* Average Vote Delay Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>⚡ Voteurs les Plus Rapides - Top 15</h3>
          {highlightedPlayerInFastVoters && settings.highlightedPlayer && (
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
          Délai moyen en secondes entre le premier vote et le vote du joueur. Plus c'est bas, plus le joueur vote rapidement.
        </p>
        <FullscreenChart title="Voteurs les Plus Rapides - Top 15">
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fastVotersChartData}
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
                    value: 'Délai Moyen (secondes)', 
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
                      
                      // Format delay into minutes:seconds
                      const totalSeconds = Math.round(dataPoint.averageVoteDelaySeconds);
                      const minutes = Math.floor(totalSeconds / 60);
                      const seconds = totalSeconds % 60;
                      const formattedDelay = `${minutes}m ${seconds}s`;
                      
                      return (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          border: isHighlightedFromSettings 
                            ? '2px solid var(--accent-primary)' 
                            : isHighlightedAddition 
                              ? '2px dashed var(--accent-secondary)' 
                              : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                        }}>
                          <p style={{ 
                            margin: 0, 
                            fontWeight: 'bold', 
                            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)',
                            marginBottom: '8px'
                          }}>
                            {dataPoint.playerName}
                            {isHighlightedFromSettings && ' 🎯'}
                            {isHighlightedAddition && !isHighlightedFromSettings && ' ⭐'}
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Délai moyen: <strong style={{ color: 'var(--text-primary)' }}>{formattedDelay}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Votes analysés: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.totalTimedVotes}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Position moyenne: <strong style={{ color: 'var(--text-primary)' }}>{dataPoint.averageVotePositionPercentile.toFixed(1)}%</strong>
                          </p>
                          {isHighlightedAddition && !isHighlightedFromSettings && (
                            <p style={{ 
                              margin: '8px 0 0 0', 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-secondary)',
                              fontStyle: 'italic'
                            }}>
                              ⭐ Joueur ajouté (hors top 15)
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="averageVoteDelaySeconds" 
                  style={{ cursor: 'pointer' }}
                  onClick={handlePlayerClick}
                >
                  {fastVotersChartData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.playerName;
                    const isHighlightedAddition = (entry as ChartPlayerStat).isHighlightedAddition;
                    const isHovered = highlightedPlayer === entry.playerName;
                    
                    let fillColor: string;
                    if (isHighlightedFromSettings) {
                      fillColor = 'var(--accent-primary)';
                    } else if (isHighlightedAddition) {
                      fillColor = 'var(--accent-secondary)';
                    } else if (isHovered) {
                      fillColor = 'var(--accent-hover)';
                    } else {
                      fillColor = playersColor[entry.playerName] || 'var(--chart-primary)';
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={fillColor}
                        stroke={isHighlightedFromSettings ? "var(--accent-primary)" : "none"}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onMouseEnter={() => setHighlightedPlayer(entry.playerName)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* Information Banner */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '0rem',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          ℹ️ <strong>Note importante :</strong> Ces statistiques analysent uniquement les <strong>votes actifs</strong> (hors votes "Passé").
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Données disponibles : {filteredVotingStats.playerTimingStats.length} joueur{filteredVotingStats.playerTimingStats.length > 1 ? 's' : ''} avec au moins {minMeetings} meeting{minMeetings > 1 ? 's' : ''} • Parties en version 0.201+
        </p>
      </div>
    </>
  );
}
