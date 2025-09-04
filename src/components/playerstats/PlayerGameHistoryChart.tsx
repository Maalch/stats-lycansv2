import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { usePlayerGameHistoryFromRaw } from '../../hooks/usePlayerGameHistoryFromRaw';
import { usePlayerStatsFromRaw } from '../../hooks/usePlayerStatsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { lycansColorScheme, lycansOtherCategoryColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

type GroupByMethod = 'session' | 'month';

export function PlayerGameHistoryChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  
  // Use navigationState for persistence, with fallbacks to default values
  const selectedPlayerName = navigationState.selectedPlayerName || 'Ponce';
  const groupingMethod = navigationState.groupingMethod || 'session';
  
  // Update functions that also update the navigation state
  const setSelectedPlayerName = (playerName: string) => {
    updateNavigationState({ selectedPlayerName: playerName });
  };
  
  const setGroupingMethod = (method: GroupByMethod) => {
    updateNavigationState({ groupingMethod: method });
  };
  
  // Get available players from the player stats hook
  const { data: playerStatsData } = usePlayerStatsFromRaw();
  const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName);

  // Create list of available players for the dropdown
  const availablePlayers = useMemo(() => {
    if (!playerStatsData?.playerStats) return ['Ponce'];
    return playerStatsData.playerStats
      .filter(player => player.gamesPlayed > 0)
      .map(player => player.player)
      .sort();
  }, [playerStatsData]);

  // Optimized date parsing - cache parsed dates to avoid repeated parsing
  const parsedDataCache = useMemo(() => {
    if (!data?.games) return new Map();
    
    const cache = new Map();
    data.games.forEach(game => {
      if (!cache.has(game.date)) {
        const parts = game.date.split('/');
        if (parts.length === 3) {
          cache.set(game.date, new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime());
        } else {
          cache.set(game.date, new Date(game.date).getTime());
        }
      }
    });
    return cache;
  }, [data?.games]);

  // Group games by the selected method with optimized sorting
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
        defeats: stats.total - stats.wins, // Add defeats
        winRate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : '0.0',
        winRateNum: stats.total > 0 ? (stats.wins / stats.total * 100) : 0
      }))
      .sort((a, b) => {
        // Optimized sorting using cached date parsing
        if (groupingMethod === 'month') {
          const [monthA, yearA] = a.period.split('/');
          const [monthB, yearB] = b.period.split('/');
          const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, 1);
          const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, 1);
          return dateA.getTime() - dateB.getTime();
        } else {
          // Use cached parsed dates for session sorting
          const timeA = parsedDataCache.get(a.period) || 0;
          const timeB = parsedDataCache.get(b.period) || 0;
          return timeA - timeB;
        }
      });
  }, [data, groupingMethod, parsedDataCache]);

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

  // Helper functions when there are too much data
  const getResponsiveXAxisSettings = (dataLength: number) => {
    if (dataLength <= 15) return { fontSize: 11, angle: -45, height: 80, interval: 0 };
    if (dataLength <= 30) return { fontSize: 10, angle: -45, height: 85, interval: 1 };
    if (dataLength <= 50) return { fontSize: 9, angle: -60, height: 95, interval: 2 };
    return { fontSize: 8, angle: -75, height: 105, interval: Math.floor(dataLength / 12) };
  };

  // Apply to both LineChart and BarChart XAxis
  const xAxisSettings = getResponsiveXAxisSettings(groupedData.length);


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
          <div 
            className="lycans-valeur-principale lycans-clickable" 
            onClick={() => {
              navigateToGameDetails({
                selectedPlayer: selectedPlayerName,
                fromComponent: 'Historique Joueur - Total Parties'
              });
            }}
            title={`Cliquer pour voir toutes les parties de ${selectedPlayerName}`}
          >
            {data.totalGames}
          </div>
          <p>parties jouées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Victoires</h3>
          <div 
            className="lycans-valeur-principale lycans-clickable" 
            onClick={() => {
              navigateToGameDetails({
                selectedPlayer: selectedPlayerName,
                selectedPlayerWinMode: 'wins-only',
                fromComponent: 'Historique Joueur - Victoires'
              });
            }}
            title={`Cliquer pour voir toutes les victoires de ${selectedPlayerName}`}
          >
            {data.totalWins}
          </div>
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
          <FullscreenChart title={`Évolution des Performances ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    // Find the data point by matching the period
                    const dataPoint = groupedData.find(item => item.period === data.activeLabel);
                    if (dataPoint) {
                      navigateToGameDetails({
                        selectedPlayer: selectedPlayerName,
                        selectedDate: dataPoint.period,
                        fromComponent: `Évolution des Performances ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`
                      });
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  angle={xAxisSettings.angle}
                  textAnchor="end"
                  height={xAxisSettings.height}
                  interval={xAxisSettings.interval}
                  fontSize={xAxisSettings.fontSize}
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
          </FullscreenChart>
        </div>

        {/* Games per period */}
        <div className="lycans-graphique-section">
          <h3>Répartition Victoires/Défaites {groupingMethod === 'month' ? 'par Mois' : 'par Session'}</h3>
          <FullscreenChart title={`Répartition Victoires/Défaites ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  angle={xAxisSettings.angle}
                  textAnchor="end"
                  height={xAxisSettings.height}
                  interval={xAxisSettings.interval}
                  fontSize={xAxisSettings.fontSize}
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
                          <div>Total: {dataPoint.totalGames} parties</div>
                          <div>Victoires: {dataPoint.victories}</div>
                          <div>Défaites: {dataPoint.defeats}</div>
                          <div>Taux: {dataPoint.winRate}%</div>
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
                <Bar dataKey="victories" stackId="games" fill="var(--accent-tertiary)" name="Victoires">
                  {groupedData.map((entry, index) => (
                    <Cell
                      key={`cell-victories-${index}`}
                      fill="var(--accent-tertiary)"
                      onClick={() => {
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          selectedDate: entry.period,
                          fromComponent: `Historique Joueur - Victoires ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
                <Bar dataKey="defeats" stackId="games" fill="var(--chart-color-4)" name="Défaites">
                  {groupedData.map((entry, index) => (
                    <Cell
                      key={`cell-defeats-${index}`}
                      fill="var(--chart-color-4)"
                      onClick={() => {
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          selectedDate: entry.period,
                          fromComponent: `Historique Joueur - Défaites ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </FullscreenChart>
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
                          ? lycansOtherCategoryColor
                          : lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`
                      }
                      onClick={() => {
                        if (entry.name === 'Autres') {
                          // For "Autres", we'll navigate to show all games from the small camps
                          // Pass the list of small camps in the navigation
                          const smallCampNames = (entry as any)._details?.map((detail: any) => detail.name) || [];
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: 'Autres',
                              campFilterMode: 'wins-only',
                              _smallCamps: smallCampNames
                            },
                            fromComponent: 'Distribution par Camps'
                          });
                        } else {
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'wins-only'
                            },
                            fromComponent: 'Distribution par Camps'
                          });
                        }
                      }}
                      style={{ cursor: 'pointer' }}
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
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--chart-color-1)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              Cliquez pour voir toutes les parties de ces camps
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
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Camp Performance */}
        <div className="lycans-graphique-section">
          <h3>Performance par Camp</h3>
          <FullscreenChart title="Performance par Camp">
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
                  <Bar dataKey="winRate">
                    {campDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                        onClick={() => {
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'wins-only'
                            },
                            fromComponent: 'Performance par Camp'
                          });
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );
}