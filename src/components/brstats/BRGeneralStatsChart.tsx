import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFilteredRawBRData, useFilteredRawBRGlobalData } from '../../hooks/useRawBRData';
import { FullscreenChart } from '../common/FullscreenChart';
import { playersColor, getRandomColor } from '../../types/api';

export function BRGeneralStatsChart() {
  const { data: brData, isLoading: brLoading, error: brError } = useFilteredRawBRData();
  const { data: globalData, isLoading: globalLoading, error: globalError } = useFilteredRawBRGlobalData();

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
    const topPlayersByParticipations = Object.values(playerStats)
      .sort((a: any, b: any) => b.participations - a.participations)
      .slice(0, 10);

    // Top joueurs par victoires
    const topPlayersByWins = Object.values(playerStats)
      .filter((p: any) => p.participations >= 3) // Minimum 3 participations
      .sort((a: any, b: any) => b.winRate - a.winRate)
      .slice(0, 10);

    // Top joueurs par score moyen
    const topPlayersByAverageScore = Object.values(playerStats)
      .filter((p: any) => p.participations >= 3) // Minimum 3 participations
      .sort((a: any, b: any) => b.averageScore - a.averageScore)
      .slice(0, 10);

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
      participantData
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
          <FullscreenChart
            title="Top Joueurs par Participations - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.topPlayersByParticipations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>Participations : {d.participations}</div>
                          <div>Victoires : {d.wins}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="participations" name="Participations">
                  {stats.topPlayersByParticipations.map((player: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getPlayerColor(player.name)} />
                  ))}
                </Bar>
                <Bar dataKey="wins" fill="var(--chart-color-2)" name="Victoires" />
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Top joueurs par taux de victoire */}
        <div className="lycans-graphique-section">
          <h3>Top Joueurs - Taux de Victoire (min. 3 parties)</h3>
          <FullscreenChart
            title="Top Joueurs par Taux de Victoire - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.topPlayersByWins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>Taux de victoire : {d.winRate.toFixed(2)}%</div>
                          <div>Victoires : {d.wins} / {d.participations}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="winRate" name="Taux de victoire (%)">
                  {stats.topPlayersByWins.map((player: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getPlayerColor(player.name)} />
                  ))}
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
          <FullscreenChart
            title="Top Joueurs par Score Moyen - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.topPlayersByAverageScore}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>Score moyen : {d.averageScore.toFixed(2)}</div>
                          <div>Score total : {d.totalScore} / {d.participations} parties</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="averageScore" name="Score moyen par partie">
                  {stats.topPlayersByAverageScore.map((player: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getPlayerColor(player.name)} />
                  ))}
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
