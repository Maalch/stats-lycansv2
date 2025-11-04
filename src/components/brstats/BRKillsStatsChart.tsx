import { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useFilteredRawBRData } from '../../hooks/useRawBRData';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, getRandomColor } from '../../types/api';

// Extended type for chart data with highlighting info
interface ChartPlayerStat {
  name: string;
  participations: number;
  wins: number;
  totalScore: number;
  averageScore: number;
  winRate: number;
  isHighlightedAddition?: boolean;
}

export function BRKillsStatsChart() {
  const { data: brData, isLoading: brLoading, error: brError } = useFilteredRawBRData();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Chart colors using CSS custom properties
  const chartColors = [
    'var(--chart-color-1)',
    'var(--chart-color-2)', 
    'var(--chart-color-3)',
    'var(--chart-color-4)',
    'var(--chart-color-5)',
    'var(--chart-color-6)'
  ];

  // Helper function to get player color
  const getPlayerColor = (playerName: string) => {
    return playersColor[playerName] || getRandomColor(playerName);
  };

  const stats = useMemo(() => {
    if (!brData) return null;

    const totalParticipations = brData.length;
    
    // Statistiques par joueur
    const playerStats = brData.reduce((acc, participation) => {
      const player = participation.Participants;
      if (!acc[player]) {
        acc[player] = {
          name: player,
          participations: 0,
          wins: 0,
          totalScore: 0,
          averageScore: 0,
          winRate: 0
        };
      }
      
      acc[player].participations++;
      acc[player].totalScore += participation.Score;
      if (participation.Gagnant) {
        acc[player].wins++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calcul des moyennes et taux de victoire
    Object.values(playerStats).forEach((player: any) => {
      player.averageScore = player.totalScore / player.participations;
      player.winRate = (player.wins / player.participations) * 100;
    });

    // Top joueurs par score moyen
    const eligibleForAverageScore = Object.values(playerStats)
      .filter((p: any) => p.participations >= 3); // Minimum 3 participations
    
    const sortedByAverageScore = eligibleForAverageScore
      .sort((a: any, b: any) => b.averageScore - a.averageScore);
    
    const top15AverageScore = sortedByAverageScore.slice(0, 15);

    const sortedByParticipations = Object.values(playerStats)
      .sort((a: any, b: any) => b.participations - a.participations);

    // Check if highlighted player is in top 15 average score (among eligible players)
    const highlightedPlayerInTop15AverageScore = settings.highlightedPlayer &&
      top15AverageScore.some(p => p.name === settings.highlightedPlayer);

    // If highlighted player is not in top 15 but exists in all stats, add them
    let highlightedPlayerAddedToAverageScore = false;
    let topPlayersByAverageScore: ChartPlayerStat[] = [...top15AverageScore];
    
    if (settings.highlightedPlayer && !highlightedPlayerInTop15AverageScore) {
      // Search in all player stats, not just eligible ones
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByAverageScore.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToAverageScore = true;
      }
    }

    // Distribution des scores
    const scoreDistribution = brData.reduce((acc, participation) => {
      const score = participation.Score;
      const scoreRange = score === 0 ? '0' : 
                        score === 1 ? '1' :
                        score === 2 ? '2' :
                        score === 3 ? '3' :
                        score === 4 ? '4' :
                        score <= 6 ? '5-6' : '7+';
      
      if (!acc[scoreRange]) {
        acc[scoreRange] = { count: 0, wins: 0 };
      }
      acc[scoreRange].count++;
      if (participation.Gagnant) {
        acc[scoreRange].wins++;
      }
      return acc;
    }, {} as Record<string, { count: number; wins: number }>);

    const scoreData = Object.entries(scoreDistribution).map(([range, data]) => ({
      range,
      count: data.count,
      wins: data.wins,
      percentage: ((data.count / totalParticipations) * 100).toFixed(1),
      winRate: data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : '0.0'
    }));

    return {
      topPlayersByAverageScore,
      scoreData,
      highlightedPlayerInAverageScore: highlightedPlayerAddedToAverageScore
    };
  }, [brData, settings.highlightedPlayer]);

  if (brLoading) {
    return <div className="statistiques-chargement">Chargement des données Battle Royale...</div>;
  }

  if (brError) {
    return <div className="statistiques-erreur">Erreur: {brError}</div>;
  }

  if (!stats) {
    return <div className="statistiques-vide">Aucune donnée Battle Royale disponible</div>;
  }

  return (
    <div className="lycans-chart-container">
      <div className="lycans-chart-header">
        <h2>Statistiques Kills - Battle Royale</h2>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Top joueurs par kill moyen */}
        <div className="lycans-graphique-section">
          <h3>Kill Moyen par Partie (min. 3 parties)</h3>
          {stats.highlightedPlayerInAverageScore && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
              🎯 {settings.highlightedPlayer} affiché en plus du top 15
            </p>
          )}
          <FullscreenChart
            title="Kill Moyen par Partie - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={stats.topPlayersByAverageScore}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload as ChartPlayerStat;
                      const isHighlightedAddition = d.isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === d.name;
                      const meetsMinParticipations = d.participations >= 3;
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem' }}>
                            {d.name}
                            {isHighlightedFromSettings && ' 🎯'}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <div>Participations: <strong>{d.participations}</strong></div>
                            <div>Kill total: <strong>{d.totalScore}</strong></div>
                            <div>Kill moyen: <strong>{d.averageScore.toFixed(2)}</strong></div>
                            <div>Taux de victoire: <strong>{d.winRate.toFixed(1)}%</strong></div>
                          </div>
                          {isHighlightedAddition && !meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (&lt; 3 parties)
                            </div>
                          )}
                          {isHighlightedAddition && meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="averageScore" name="Kill moyen par partie">
                  {stats.topPlayersByAverageScore.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = hoveredPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          isHighlightedFromSettings ? 'var(--accent-primary)' :
                          isHighlightedAddition ? 'var(--accent-secondary)' :
                          getPlayerColor(entry.name)
                        }
                        stroke={
                          isHighlightedFromSettings 
                            ? "var(--accent-primary)" 
                            : isHoveredPlayer 
                              ? "var(--text-primary)" 
                              : "none"
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
                        onMouseEnter={() => setHoveredPlayer(entry.name)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Distribution des kills */}
        <div className="lycans-graphique-section">
          <h3>Distribution des Kills</h3>
          <FullscreenChart
            title="Distribution des Kills"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.scoreData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const { cx, cy, midAngle, outerRadius, range, percentage, fill } = props;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 30;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    
                    // Offset the 7+ label upward to avoid overlap with 5-6
                    const yOffset = range === '7+' ? -12 : 0;
                    
                    return (
                      <text
                        x={x}
                        y={y + yOffset}
                        fill={fill}
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                      >
                        {`${range}: ${percentage}%`}
                      </text>
                    );
                  }}
                  outerRadius={140}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.scoreData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem' }}>
                            {data.range} {data.range === '1' ? 'kill' : 'kills'}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <div>Nombre de parties: <strong>{data.count}</strong></div>
                            <div>Pourcentage: <strong>{data.percentage}%</strong></div>
                            <div>Taux de victoire: <strong>{data.winRate}%</strong></div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              ({data.wins} victoire{data.wins !== 1 ? 's' : ''})
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );
}
