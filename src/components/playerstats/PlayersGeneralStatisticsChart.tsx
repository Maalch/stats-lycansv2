import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { usePlayerStatsFromRaw } from '../../hooks/usePlayerStatsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { playersColor } from '../../types/api';
import { minGamesOptions } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function PlayersGeneralStatisticsChart() {
  const { data: playerStatsData, isLoading: dataLoading, error: fetchError } = usePlayerStatsFromRaw();
  const { navigateToGameDetails } = useNavigation();
  const [minGamesForWinRate, setMinGamesForWinRate] = useState<number>(50);
  const [winRateOrder, setWinRateOrder] = useState<'best' | 'worst'>('best');
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  // Optimized data processing - combine multiple operations to reduce iterations
  const { participationData, winRateData, averageWinRate, totalEligiblePlayers } = useMemo(() => {
    if (!playerStatsData?.playerStats) {
      return {
        participationData: [],
        winRateData: [],
        averageWinRate: '0',
        totalEligiblePlayers: 0
      };
    }

    const stats = playerStatsData.playerStats;
    
    // Single pass to filter and calculate what we need
    const eligibleForWinRate = [];
    const eligibleForParticipation = [];
    let totalWinPercentSum = 0;
    
    for (const player of stats) {
      totalWinPercentSum += parseFloat(player.winPercent);
      
      if (player.gamesPlayed >= minGamesForWinRate) {
        eligibleForWinRate.push(player);
      }
      
      if (player.gamesPlayed > 2) {
        eligibleForParticipation.push(player);
      }
    }

    // Calculate average win rate
    const avgWinRate = stats.length > 0 ? (totalWinPercentSum / stats.length).toFixed(1) : '0';
    
    // Sort and slice for participation data
    const sortedParticipation = eligibleForParticipation
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 20);
    
    // Sort and slice for win rate data
    const sortedWinRate = eligibleForWinRate
      .sort((a, b) =>
        winRateOrder === 'best'
          ? parseFloat(b.winPercent) - parseFloat(a.winPercent)
          : parseFloat(a.winPercent) - parseFloat(b.winPercent)
      )
      .slice(0, 20);

    return {
      participationData: sortedParticipation,
      winRateData: sortedWinRate,
      averageWinRate: avgWinRate,
      totalEligiblePlayers: eligibleForWinRate.length
    };
  }, [playerStatsData, minGamesForWinRate, winRateOrder]);

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des statistiques des joueurs...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!playerStatsData) {
    return <div className="donnees-manquantes">Aucune donnée de joueur disponible</div>;
  }

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques des Joueurs</h2>
      <p className="lycans-stats-info">
        Total de {playerStatsData.totalGames} parties analysées avec {playerStatsData.playerStats.length} joueurs
      </p>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Top Participations</h3>
          <FullscreenChart title="Top Participations">
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
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--accent-primary)', 
                            marginTop: '0.5rem',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            animation: 'pulse 1.5s infinite'
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
                  dataKey="gamesPlayed"
                  name="Parties jouées"
                  fill="#00C49F"
                >
                  {participationData.map((entry) => (
                    <Cell
                      key={`cell-participation-${entry.player}`}
                      fill={playersColor[entry.player] || "#00C49F"}
                      stroke={highlightedPlayer === entry.player ? "var(--text-primary)" : "none"}
                      strokeWidth={highlightedPlayer === entry.player ? 2 : 0}
                      onClick={() => {
                        navigateToGameDetails({
                          selectedPlayer: entry.player,
                          fromComponent: 'Statistiques Joueurs'
                        });
                      }} 
                      onMouseEnter={() => setHighlightedPlayer(entry.player)}
                      onMouseLeave={() => setHighlightedPlayer(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </FullscreenChart>
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
          <FullscreenChart title={winRateOrder === 'best'
                ? 'Meilleurs Taux de Victoire'
                : 'Moins Bon Taux de Victoire'}>
          
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
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--accent-primary)', 
                            marginTop: '0.5rem',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            animation: 'pulse 1.5s infinite'
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
                  dataKey="winPercent"
                  name="Taux de Victoire"
                  fill="#8884d8"
                >
                  {winRateData.map((entry) => (
                    <Cell
                      key={`cell-winrate-${entry.player}`}
                      fill={playersColor[entry.player] || "#8884d8"}
                      stroke={highlightedPlayer === entry.player ? "var(--text-primary)" : "none"}
                      strokeWidth={highlightedPlayer === entry.player ? 2 : 0}
                      onClick={() => {
                        navigateToGameDetails({
                          selectedPlayer: entry.player,
                          fromComponent: 'Taux de Victoire'
                        });
                      }} 
                      onMouseEnter={() => setHighlightedPlayer(entry.player)}
                      onMouseLeave={() => setHighlightedPlayer(null)}
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
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {winRateData.length} des joueurs (sur {totalEligiblePlayers} ayant au moins {minGamesForWinRate} partie{minGamesForWinRate > 1 ? 's' : ''})
          </p>
        </div>
      </div>
    </div>
  );
}