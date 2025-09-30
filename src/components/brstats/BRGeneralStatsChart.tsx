import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFilteredRawBRData, useFilteredRawBRGlobalData } from '../../hooks/useRawBRData';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedPlayersColor, getRandomColor } from '../../types/api';
import { useSettings } from '../../context/SettingsContext';

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

export function BRGeneralStatsChart() {
  const { data: brData, isLoading: brLoading, error: brError } = useFilteredRawBRData();
  const { data: globalData, isLoading: globalLoading, error: globalError } = useFilteredRawBRGlobalData();
  const { settings } = useSettings();
  
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const playersColor = useThemeAdjustedPlayersColor();

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
    if (!brData || !globalData) return null;

    // Calcul des statistiques générales
    const totalGames = globalData.length;
    const totalParticipations = brData.length;
    const totalWins = brData.filter(p => p.Gagnant).length;
    
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

    // Top joueurs par participations
    const sortedByParticipations = Object.values(playerStats)
      .sort((a: any, b: any) => b.participations - a.participations);
    
    const top15Participations = sortedByParticipations.slice(0, 15);
    
    // Check if highlighted player is in top 15 participations
    const highlightedPlayerInTop15Participations = settings.highlightedPlayer && 
      top15Participations.some(p => p.name === settings.highlightedPlayer);
    
    // If highlighted player is not in top 15 but exists in all stats, add them
    let highlightedPlayerAddedToParticipations = false;
    let topPlayersByParticipations: ChartPlayerStat[] = [...top15Participations];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15Participations) {
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByParticipations.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToParticipations = true;
      }
    }

    // Top joueurs par victoires
    const eligibleForWinRate = Object.values(playerStats)
      .filter((p: any) => p.participations >= 3); // Minimum 3 participations
    
    const sortedByWinRate = eligibleForWinRate
      .sort((a: any, b: any) => b.winRate - a.winRate);
    
    const top15WinRate = sortedByWinRate.slice(0, 15);

    // Check if highlighted player is in top 15 win rate (among eligible players)
    const highlightedPlayerInTop15WinRate = settings.highlightedPlayer && 
      top15WinRate.some(p => p.name === settings.highlightedPlayer);

    // If highlighted player is not in top 15 but exists in all stats, add them
    let highlightedPlayerAddedToWinRate = false;
    let topPlayersByWins: ChartPlayerStat[] = [...top15WinRate];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15WinRate) {
      // Search in all player stats, not just eligible ones
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByWins.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToWinRate = true;
      }
    }

    // Top joueurs par score moyen
    const eligibleForAverageScore = Object.values(playerStats)
      .filter((p: any) => p.participations >= 3); // Minimum 3 participations
    
    const sortedByAverageScore = eligibleForAverageScore
      .sort((a: any, b: any) => b.averageScore - a.averageScore);
    
    const top15AverageScore = sortedByAverageScore.slice(0, 15);

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

    // Statistiques par nombre de participants
    const participantStats = globalData.reduce((acc, game) => {
      const count = game["Nombre de participants"];
      if (!acc[count]) {
        acc[count] = 0;
      }
      acc[count]++;
      return acc;
    }, {} as Record<number, number>);

    const participantData = Object.entries(participantStats)
      .map(([count, games]) => ({
        participants: parseInt(count),
        games: games,
        percentage: (((games as number) / totalGames) * 100).toFixed(1)
      }))
      .sort((a, b) => a.participants - b.participants);

    return {
      totalGames,
      totalParticipations,
      totalWins,
      winRate: (((totalWins as number) / totalParticipations) * 100).toFixed(1),
      averageParticipantsPerGame: ((totalParticipations as number) / totalGames).toFixed(1),
      topPlayersByParticipations,
      topPlayersByWins,
      topPlayersByAverageScore,
      scoreData,
      participantData,
      highlightedPlayerInParticipations: highlightedPlayerAddedToParticipations,
      highlightedPlayerInWinRate: highlightedPlayerAddedToWinRate,
      highlightedPlayerInAverageScore: highlightedPlayerAddedToAverageScore
    };
  }, [brData, globalData]);

  if (brLoading || globalLoading) {
    return <div className="statistiques-chargement">Chargement des données Battle Royale...</div>;
  }

  if (brError || globalError) {
    return <div className="statistiques-erreur">Erreur: {brError || globalError}</div>;
  }

  if (!stats) {
    return <div className="statistiques-vide">Aucune donnée Battle Royale disponible</div>;
  }

  return (
    <div className="lycans-chart-container">
      <div className="lycans-chart-header">
        <h2>Statistiques Battle Royale</h2>
      </div>

      {/* Statistiques générales */}
      <div className="lycans-stats-grid">
        <div className="lycans-stat-card">
          <h3>Parties totales</h3>
          <div className="lycans-stat-value">{stats.totalGames}</div>
        </div>
        <div className="lycans-stat-card">
          <h3>Participations</h3>
          <div className="lycans-stat-value">{stats.totalParticipations}</div>
        </div>
        <div className="lycans-stat-card">
          <h3>Moy. participants/partie</h3>
          <div className="lycans-stat-value">{stats.averageParticipantsPerGame}</div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Top joueurs par participations */}
        <div className="lycans-graphique-section">
          <h3>Top Joueurs - Participations</h3>
          {stats.highlightedPlayerInParticipations && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
              🎯 {settings.highlightedPlayer} affiché en plus du top 15
            </p>
          )}
          <FullscreenChart
            title="Top Joueurs par Participations - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={stats.topPlayersByParticipations}
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
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>Participations : {d.participations}</div>
                          <div>Victoires : {d.wins}</div>
                          {isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
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
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="participations" name="Participations">
                  {stats.topPlayersByParticipations.map((player: ChartPlayerStat, index: number) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === player.name;
                    const isHoveredPlayer = hoveredPlayer === player.name;
                    const isHighlightedAddition = player.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          getPlayerColor(player.name)
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
                      />
                    );
                  })}
                </Bar>
                <Bar dataKey="wins" fill="var(--chart-color-2)" name="Victoires">
                  {stats.topPlayersByParticipations.map((player: ChartPlayerStat, index: number) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === player.name;
                    const isHoveredPlayer = hoveredPlayer === player.name;
                    const isHighlightedAddition = player.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-wins-${index}`} 
                        fill={
                          getPlayerColor(player.name)
                        }
                        stroke={
                          isHighlightedFromSettings 
                            ? "var(--accent-secondary)" 
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
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Top joueurs par taux de victoire */}
        <div className="lycans-graphique-section">
          <h3>Top Joueurs - Taux de Victoire (min. 3 parties)</h3>
          {stats.highlightedPlayerInWinRate && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
              🎯 {settings.highlightedPlayer} affiché en plus du top 15
            </p>
          )}
          <FullscreenChart
            title="Top Joueurs par Taux de Victoire - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={stats.topPlayersByWins}
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
                      const meetsMinParticipations = d.participations >= 3;
                      
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>Taux de victoire : {d.winRate.toFixed(2)}%</div>
                          <div>Victoires : {d.wins} / {d.participations}</div>
                          {isHighlightedAddition && !meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection (&lt; 3 parties)
                            </div>
                          )}
                          {isHighlightedAddition && meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
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
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="winRate" name="Taux de victoire (%)">
                  {stats.topPlayersByWins.map((player: ChartPlayerStat, index: number) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === player.name;
                    const isHoveredPlayer = hoveredPlayer === player.name;
                    const isHighlightedAddition = player.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          getPlayerColor(player.name)
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
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>
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
                      const meetsMinParticipations = d.participations >= 3;
                      
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>Score moyen : {d.averageScore.toFixed(2)}</div>
                          <div>Score total : {d.totalScore} / {d.participations} parties</div>
                          {isHighlightedAddition && !meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection (&lt; 3 parties)
                            </div>
                          )}
                          {isHighlightedAddition && meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
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
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="averageScore" name="Score moyen par partie">
                  {stats.topPlayersByAverageScore.map((player: ChartPlayerStat, index: number) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === player.name;
                    const isHoveredPlayer = hoveredPlayer === player.name;
                    const isHighlightedAddition = player.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          getPlayerColor(player.name)
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
                  {stats.scoreData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, 'Participations']} />
              </PieChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>
      </div>

      {/* Répartition par nombre de participants - Full width */}
      <div className="lycans-chart-section">
        <h3>Répartition par Nombre de Participants</h3>
        <FullscreenChart
          title="Répartition par Nombre de Participants - Battle Royale"
          className="lycans-chart-wrapper"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.participantData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="participants" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  value,
                  name === 'games' ? 'Parties' : name
                ]}
              />
              <Legend />
              <Bar dataKey="games" fill="var(--chart-color-4)" name="Nombre de parties" />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>
    </div>
  );
}
