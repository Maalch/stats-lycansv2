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
        acc[scoreRange] = 0;
      }
      acc[scoreRange]++;
      return acc;
    }, {} as Record<string, number>);

    const scoreData = Object.entries(scoreDistribution).map(([range, count]) => ({
      range,
      count,
      percentage: ((count / totalParticipations) * 100).toFixed(1)
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
        {/* Top joueurs par score moyen */}
        <div className="lycans-graphique-section">
          <h3>Top Joueurs - Score Moyen par Partie (min. 3 parties)</h3>
          {stats.highlightedPlayerInAverageScore && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
              🎯 {settings.highlightedPlayer} affiché en plus du top 15
            </p>
          )}
          <FullscreenChart
            title="Top Joueurs par Score Moyen - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={stats.topPlayersByAverageScore}
                onMouseEnter={(data) => setHoveredPlayer(data?.activeLabel || null)}
                onMouseLeave={() => setHoveredPlayer(null)}
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
                      
                      return (
                        <div className="custom-tooltip">
                          <p className="label">
                            <strong>{d.name}</strong>
                            {isHighlightedFromSettings && ' 🎯'}
                            {isHighlightedAddition && !isHighlightedFromSettings && ' (hors top 15)'}
                          </p>
                          <p className="desc">Participations: {d.participations}</p>
                          <p className="desc">Score total: {d.totalScore}</p>
                          <p className="desc">Score moyen: {d.averageScore.toFixed(2)}</p>
                          <p className="desc">Taux de victoire: {d.winRate.toFixed(1)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="averageScore" name="Score moyen par partie">
                  {stats.topPlayersByAverageScore.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          isHighlightedFromSettings ? 'var(--accent-primary)' :
                          isHighlightedAddition ? 'var(--accent-secondary)' :
                          hoveredPlayer === entry.name ? 'var(--accent-hover)' : 
                          getPlayerColor(entry.name)
                        }
                        stroke={isHighlightedFromSettings ? "var(--accent-primary)" : "none"}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Distribution des scores */}
        <div className="lycans-graphique-section">
          <h3>Distribution des Scores</h3>
          <FullscreenChart
            title="Distribution des Scores - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.scoreData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                  outerRadius={140}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.scoreData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, 'Participations']} />
              </PieChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );
}
