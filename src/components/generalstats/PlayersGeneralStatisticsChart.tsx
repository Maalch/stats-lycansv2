import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { getRandomColor, playersColor } from '../../types/api';
import { lycansColorScheme } from '../../types/api';

export function PlayersGeneralStatisticsChart() {
  const { playerStatsData, dataLoading, fetchError } = usePlayerStats();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [minGamesForWinRate, setMinGamesForWinRate] = useState<number>(10);
  const [winRateOrder, setWinRateOrder] = useState<'best' | 'worst'>('best'); 

  // Options pour le nombre minimum de parties
  const minGamesOptions = [5, 8, 10, 15, 20, 25, 30, 50, 100];

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des statistiques des joueurs...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!playerStatsData) {
    return <div className="donnees-manquantes">Aucune donnée de joueur disponible</div>;
  }

  // Count all eligible players (without slicing)
  const totalEligiblePlayers = playerStatsData.playerStats
    .filter(player => player.gamesPlayed >= minGamesForWinRate)
    .length;

  // Données pour le graphique de participation
  const participationData = playerStatsData.playerStats
    .filter(player => player.gamesPlayed > 2)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 20);

  // Données pour le graphique de taux de victoire (avec filtre dynamique et tri selon winRateOrder)
  const winRateData = playerStatsData.playerStats
    .filter(player => player.gamesPlayed >= minGamesForWinRate)
    .sort((a, b) =>
      winRateOrder === 'best'
        ? parseFloat(b.winPercent) - parseFloat(a.winPercent)
        : parseFloat(a.winPercent) - parseFloat(b.winPercent)
    )
    .slice(0, 20);

  // Calculate global average win rate (all players, no filter)
  const averageWinRate =
    playerStatsData.playerStats.length > 0
      ? (
          playerStatsData.playerStats.reduce(
            (sum, player) => sum + parseFloat(player.winPercent),
            0
          ) / playerStatsData.playerStats.length
        ).toFixed(1)
      : '0';

  // Préparation des données pour le graphique circulaire des camps
  const prepareCampDistributionData = (player: string) => {
    const playerData = playerStatsData.playerStats.find(p => p.player === player);
    if (!playerData) return [];
    return Object.entries(playerData.camps)
      .filter(([_, count]) => count > 0)
      .map(([camp, count]) => ({
        name: camp,
        value: count,
        percentage: ((count / playerData.gamesPlayed) * 100).toFixed(1)
      }));
  };

  const campDistributionData = selectedPlayer
    ? prepareCampDistributionData(selectedPlayer)
    : [];

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques des Joueurs</h2>
      <p className="lycans-stats-info">
        Total de {playerStatsData.totalGames} parties analysées avec {playerStatsData.playerStats.length} joueurs
      </p>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Top Participations</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={participationData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="player"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis label={{ value: 'Nombre de parties', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.player}</strong></div>
                          <div>Parties jouées : {d.gamesPlayed}</div>
                          <div>Pourcentage : {d.gamesPlayedPercent}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="gamesPlayed"
                  name="Parties jouées"
                  fill="#00C49F"
                >
                  {participationData.map((entry) => (
                    <Cell
                      key={`cell-participation-${entry.player}`}
                      fill={playersColor[entry.player] || "#00C49F"}
                      onClick={() => setSelectedPlayer(entry.player)} 
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lycans-graphique-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>
              {winRateOrder === 'best'
                ? 'Meilleurs Taux de Victoire'
                : 'Moins Bon Taux de Victoire'}
            </h3>
            <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="min-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. parties:
              </label>
              <select
                id="min-games-select"
                value={minGamesForWinRate}
                onChange={(e) => setMinGamesForWinRate(Number(e.target.value))}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {minGamesOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={winRateOrder}
                onChange={e => setWinRateOrder(e.target.value as 'best' | 'worst')}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                <option value="best">Meilleurs Taux de Victoire</option>
                <option value="worst">Moins Bon Taux de Victoire</option>
              </select>
            </div>
          </div>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={winRateData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="player"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis
                  label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.player}</strong></div>
                          <div>Taux de victoire : {d.winPercent}%</div>
                          <div>Victoires : {d.wins} / {d.gamesPlayed}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="winPercent"
                  name="Taux de Victoire"
                  fill="#8884d8"
                >
                  {winRateData.map((entry) => (
                    <Cell
                      key={`cell-winrate-${entry.player}`}
                      fill={playersColor[entry.player] || "#8884d8"}
                      onClick={() => setSelectedPlayer(entry.player)} 
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              {/* Add the average win rate reference line */}
              <ReferenceLine
                y={parseFloat(averageWinRate)}
                stroke="red"
                strokeDasharray="3 3"
                label={{
                  value: `Moyenne: ${averageWinRate}%`,
                  position: 'insideBottomRight',
                  fill: 'red',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {winRateData.length} des joueurs (sur {totalEligiblePlayers} ayant au moins {minGamesForWinRate} partie{minGamesForWinRate > 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {selectedPlayer && (
        <div className="lycans-graphique-section lycans-joueur-details">
          <h3>Distribution des Camps - {selectedPlayer}</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={campDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {campDistributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || getRandomColor(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.name}</strong></div>
                          <div>{d.value} parties ({d.percentage}%)</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}