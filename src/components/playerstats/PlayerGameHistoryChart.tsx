import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { usePlayerGameHistory } from '../../hooks/usePlayerGameHistory';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { lycansColorScheme } from '../../types/api';

type GroupByMethod = 'session' | 'month';

export function PlayerGameHistoryChart() {
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('Ponce');
  const [groupingMethod, setGroupingMethod] = useState<GroupByMethod>('session');
  
  // Get available players from the player stats hook
  const { playerStatsData } = usePlayerStats();
  const { data, isLoading, error } = usePlayerGameHistory(selectedPlayerName);

  // Create list of available players for the dropdown
  const availablePlayers = useMemo(() => {
    if (!playerStatsData?.playerStats) return ['Ponce'];
    return playerStatsData.playerStats
      .filter(player => player.gamesPlayed > 0)
      .map(player => player.player)
      .sort();
  }, [playerStatsData]);

  // Group games by the selected method
  const groupedData = useMemo(() => {
    if (!data?.games) return [];

    const grouped: Record<string, { games: any[], wins: number, total: number }> = {};

    data.games.forEach(game => {
      let groupKey: string;
      
      if (groupingMethod === 'month') {
        // Extract month/year from DD/MM/YYYY format
        const dateParts = game.date.split('/');
        if (dateParts.length === 3) {
          groupKey = `${dateParts[1]}/${dateParts[2]}`; // MM/YYYY
        } else {
          groupKey = game.date;
        }
      } else {
        // Group by session (by date)
        groupKey = game.date;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { games: [], wins: 0, total: 0 };
      }

      grouped[groupKey].games.push(game);
      grouped[groupKey].total++;
      if (game.won) {
        grouped[groupKey].wins++;
      }
    });

    // Convert to array and calculate percentages
    return Object.entries(grouped)
      .map(([period, stats]) => ({
        period,
        totalGames: stats.total,
        victories: stats.wins,
        winRate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : '0.0',
        winRateNum: stats.total > 0 ? (stats.wins / stats.total * 100) : 0
      }))
      .sort((a, b) => {
        // Sort by date
        if (groupingMethod === 'month') {
          const [monthA, yearA] = a.period.split('/');
          const [monthB, yearB] = b.period.split('/');
          const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, 1);
          const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, 1);
          return dateA.getTime() - dateB.getTime();
        } else {
          const parseDate = (dateStr: string) => {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            return new Date(dateStr);
          };
          return parseDate(a.period).getTime() - parseDate(b.period).getTime();
        }
      });
  }, [data, groupingMethod]);

  // Prepare camp distribution data for pie chart
  const campDistributionData = useMemo(() => {
    if (!data?.campStats) return [];
    
    return Object.entries(data.campStats).map(([camp, stats]) => ({
      name: camp,
      value: stats.appearances,
      winRate: stats.winRate,
      wins: stats.wins,
      percentage: ((stats.appearances / data.totalGames) * 100).toFixed(1)
    }));
  }, [data]);

  // Group small slices into "Autres" for pie chart
  const groupedCampDistributionData = useMemo(() => {
    if (!campDistributionData.length) return [];
    
    const MIN_PERCENT = 5;
    let smallTotal = 0;
    const smallEntries: typeof campDistributionData = [];
    const large: typeof campDistributionData = [];
    
    campDistributionData.forEach(entry => {
      if (parseFloat(entry.percentage) < MIN_PERCENT) {
        smallTotal += Number(entry.value);
        smallEntries.push(entry);
      } else {
        large.push(entry);
      }
    });
    
    if (smallTotal > 0) {
      const totalGames = campDistributionData.reduce((sum, e) => sum + Number(e.value), 0);
      large.push({
        name: 'Autres',
        value: smallTotal,
        winRate: '0.0', // Will be calculated from details if needed
        wins: smallEntries.reduce((sum, e) => sum + e.wins, 0),
        percentage: ((smallTotal / totalGames) * 100).toFixed(1),
        // @ts-ignore
        _details: smallEntries // Attach details for tooltip
      });
    }
    
    return large;
  }, [campDistributionData]);

  if (isLoading) {
    return <div className="donnees-attente">Chargement de l'historique du joueur...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée d'historique disponible</div>;
  }

  return (
    <div className="lycans-player-history">
      <h2>Historique Détaillé d'un Joueur</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="player-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Joueur:
          </label>
          <select
            id="player-select"
            value={selectedPlayerName}
            onChange={(e) => setSelectedPlayerName(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '120px'
            }}
          >
            {availablePlayers.map(player => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="grouping-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Groupement:
          </label>
          <select
            id="grouping-select"
            value={groupingMethod}
            onChange={(e) => setGroupingMethod(e.target.value as GroupByMethod)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '120px'
            }}
          >
            <option value="session">Par session</option>
            <option value="month">Par mois</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Total Parties</h3>
          <div className="lycans-valeur-principale">{data.totalGames}</div>
          <p>parties jouées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Victoires</h3>
          <div className="lycans-valeur-principale">{data.totalWins}</div>
          <p>parties gagnées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Taux de Victoire</h3>
          <div className="lycans-valeur-principale">{data.winRate}%</div>
          <p>pourcentage global</p>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Performance over time */}
        <div className="lycans-graphique-section">
          <h3>Évolution des Performances {groupingMethod === 'month' ? 'par Mois' : 'par Session'}</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={11}
                />
                <YAxis 
                  label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
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
                          <div><strong>{dataPoint.period}</strong></div>
                          <div>Parties: {dataPoint.totalGames}</div>
                          <div>Victoires: {dataPoint.victories}</div>
                          <div>Taux: {dataPoint.winRate}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="winRateNum" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Games per period */}
        <div className="lycans-graphique-section">
          <h3>Nombre de Parties {groupingMethod === 'month' ? 'par Mois' : 'par Session'}</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={11}
                />
                <YAxis 
                  label={{ value: 'Nombre de parties', angle: -90, position: 'insideLeft' }}
                  allowDecimals={false}
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
                          <div><strong>{dataPoint.period}</strong></div>
                          <div>Total parties: {dataPoint.totalGames}</div>
                          <div>Victoires: {dataPoint.victories}</div>
                          <div>Taux: {dataPoint.winRate}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalGames" fill="var(--chart-color-2)" />
                <Bar dataKey="victories" fill="var(--accent-tertiary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Camp Distribution */}
      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Distribution par Camps</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={groupedCampDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => {
                    const pct = percent !== undefined ? percent : 0;
                    return name === 'Autres' 
                      ? `Autres : ${value} (${(pct * 100).toFixed(1)}%)`  
                      : `${name}: ${value} (${(pct * 100).toFixed(1)}%)`;
                  }}
                >
                  {groupedCampDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'Autres'
                          ? '#cccccc'
                          : lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const dataPoint = payload[0].payload;
                      if (dataPoint.name === 'Autres' && dataPoint._details) {
                        // Sort the details by descending appearances
                        const sortedDetails = [...dataPoint._details].sort(
                          (a, b) => b.value - a.value
                        );
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>Autres - {dataPoint.value} parties ({dataPoint.percentage}%)</strong></div>
                            <div>
                              {sortedDetails.map((entry: any, i: number) => (
                                <div key={i}>
                                  {entry.name}: {entry.value} parties ({entry.percentage}%)
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)'
                        }}>
                          <div><strong>{dataPoint.name} ({dataPoint.percentage}%)</strong></div>
                          <div>Apparitions: {dataPoint.value}</div>
                          <div>Victoires: {dataPoint.wins} ({dataPoint.winRate}%)</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Camp Performance */}
        <div className="lycans-graphique-section">
          <h3>Performance par Camp</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campDistributionData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  fontSize={11}
                />
                <YAxis 
                  label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
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
                          <div><strong>{dataPoint.name}</strong></div>
                          <div>Victoires: {dataPoint.wins} / {dataPoint.value}</div>
                          <div>Taux: {dataPoint.winRate}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="winRate">
                  {campDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}