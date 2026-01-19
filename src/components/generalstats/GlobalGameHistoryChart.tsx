import { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, AreaChart, Area } from 'recharts';
import { useGlobalGameHistoryFromRaw } from '../../hooks/useGlobalGameHistoryFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';

type GroupByMethod = 'session' | 'month' | 'quarter' | 'year';

// Get the color for a camp
function getCampColor(camp: string, colorScheme: Record<string, string>): string {
  // Normalize camp name for lookup
  const normalizedCamp = camp === 'Loup' ? 'Loup' : camp;
  return colorScheme[normalizedCamp] || '#808080';
}

// Classify a winning camp as Villageois, Loup, or Solo
function classifyWinnerCamp(winnerCamp: string): 'Villageois' | 'Loup' | 'Solo' {
  if (winnerCamp === 'Villageois' || winnerCamp === 'Chasseur' || winnerCamp === 'Alchimiste' || 
      winnerCamp === 'Villageois Élite' || winnerCamp === 'Protecteur' || winnerCamp === 'Disciple') {
    return 'Villageois';
  }
  if (winnerCamp === 'Loup' || winnerCamp === 'Louveteau' || winnerCamp === 'Traître') {
    return 'Loup';
  }
  return 'Solo';
}

export function GlobalGameHistoryChart() {
  const { navigateToGameDetails } = useNavigation();
  const { data, isLoading, error } = useGlobalGameHistoryFromRaw();
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  
  // Local state for grouping method
  const [groupingMethod, setGroupingMethod] = useState<GroupByMethod>('month');

  // Helper to localize the grouping label for titles
  const groupingLabel = useMemo(() => {
    switch (groupingMethod) {
      case 'month':
        return 'par Mois';
      case 'quarter':
        return 'par Trimestre';
      case 'year':
        return 'par Année';
      default:
        return 'par Session';
    }
  }, [groupingMethod]);

  // Optimized date parsing - cache parsed dates
  const parsedDataCache = useMemo(() => {
    if (!data?.games) return new Map<string, number>();
    
    const cache = new Map<string, number>();
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

  // Group games by the selected method
  const groupedData = useMemo(() => {
    if (!data?.games) return [];

    const grouped: Record<string, { 
      games: typeof data.games,
      totalPlayers: number,
      totalDuration: number,
      campWins: Record<string, number>
    }> = {};

    data.games.forEach(game => {
      let groupKey: string;
      const dateParts = game.date.split('/');

      if (groupingMethod === 'month') {
        if (dateParts.length === 3) {
          const mm = dateParts[1].padStart(2, '0');
          groupKey = `${mm}/${dateParts[2]}`;
        } else {
          const d = new Date(game.date);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          groupKey = `${mm}/${d.getFullYear()}`;
        }
      } else if (groupingMethod === 'quarter') {
        if (dateParts.length === 3) {
          const monthNum = parseInt(dateParts[1], 10);
          const quarter = Math.floor((monthNum - 1) / 3) + 1;
          groupKey = `T${quarter}/${dateParts[2]}`;
        } else {
          const d = new Date(game.date);
          const quarter = Math.floor(d.getMonth() / 3) + 1;
          groupKey = `T${quarter}/${d.getFullYear()}`;
        }
      } else if (groupingMethod === 'year') {
        if (dateParts.length === 3) {
          groupKey = `${dateParts[2]}`;
        } else {
          const d = new Date(game.date);
          groupKey = `${d.getFullYear()}`;
        }
      } else {
        groupKey = game.date;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { 
          games: [], 
          totalPlayers: 0, 
          totalDuration: 0,
          campWins: { Villageois: 0, Loup: 0, Solo: 0 }
        };
      }

      grouped[groupKey].games.push(game);
      grouped[groupKey].totalPlayers += game.playerCount;
      grouped[groupKey].totalDuration += game.duration;
      
      // Track camp wins
      const campClass = classifyWinnerCamp(game.winnerCamp);
      grouped[groupKey].campWins[campClass]++;
    });

    // Convert to array and calculate stats
    return Object.entries(grouped)
      .map(([period, stats]) => {
        const totalGames = stats.games.length;
        const villageoisWins = stats.campWins.Villageois;
        const loupWins = stats.campWins.Loup;
        const soloWins = stats.campWins.Solo;

        return {
          period,
          totalGames,
          averagePlayers: totalGames > 0 ? Math.round(stats.totalPlayers / totalGames * 10) / 10 : 0,
          averageDuration: totalGames > 0 ? Math.round(stats.totalDuration / totalGames / 60 * 10) / 10 : 0,
          villageoisWins,
          loupWins,
          soloWins,
          villageoisWinRate: totalGames > 0 ? Math.round(villageoisWins / totalGames * 1000) / 10 : 0,
          loupWinRate: totalGames > 0 ? Math.round(loupWins / totalGames * 1000) / 10 : 0,
          soloWinRate: totalGames > 0 ? Math.round(soloWins / totalGames * 1000) / 10 : 0
        };
      })
      .sort((a, b) => {
        if (groupingMethod === 'month') {
          const [monthA, yearA] = a.period.split('/');
          const [monthB, yearB] = b.period.split('/');
          const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, 1);
          const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, 1);
          return dateA.getTime() - dateB.getTime();
        } else if (groupingMethod === 'quarter') {
          const [qa, ya] = a.period.split('/');
          const [qb, yb] = b.period.split('/');
          const qaNum = parseInt(qa.replace(/\D/g, ''), 10) || 1;
          const qbNum = parseInt(qb.replace(/\D/g, ''), 10) || 1;
          const dateA = new Date(parseInt(ya, 10), (qaNum - 1) * 3, 1);
          const dateB = new Date(parseInt(yb, 10), (qbNum - 1) * 3, 1);
          return dateA.getTime() - dateB.getTime();
        } else if (groupingMethod === 'year') {
          const ya = parseInt(a.period, 10);
          const yb = parseInt(b.period, 10);
          return ya - yb;
        } else {
          const timeA = parsedDataCache.get(a.period) || 0;
          const timeB = parsedDataCache.get(b.period) || 0;
          return timeA - timeB;
        }
      });
  }, [data, groupingMethod, parsedDataCache]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!data?.games || data.games.length === 0) return null;

    const totalGames = data.games.length;
    const totalPlayers = data.games.reduce((sum, g) => sum + g.playerCount, 0);
    const totalDuration = data.games.reduce((sum, g) => sum + g.duration, 0);
    
    let villageoisWins = 0;
    let loupWins = 0;
    let soloWins = 0;

    data.games.forEach(game => {
      const campClass = classifyWinnerCamp(game.winnerCamp);
      if (campClass === 'Villageois') villageoisWins++;
      else if (campClass === 'Loup') loupWins++;
      else soloWins++;
    });

    return {
      totalGames,
      averagePlayers: Math.round(totalPlayers / totalGames * 10) / 10,
      averageDuration: Math.round(totalDuration / totalGames / 60),
      villageoisWinRate: Math.round(villageoisWins / totalGames * 1000) / 10,
      loupWinRate: Math.round(loupWins / totalGames * 1000) / 10,
      soloWinRate: Math.round(soloWins / totalGames * 1000) / 10
    };
  }, [data]);

  // Helper for responsive X-axis
  const getResponsiveXAxisSettings = (dataLength: number) => {
    if (dataLength <= 15) return { fontSize: 12, angle: -45, height: 80, interval: 0 };
    if (dataLength <= 30) return { fontSize: 12, angle: -45, height: 85, interval: 1 };
    if (dataLength <= 50) return { fontSize: 12, angle: -60, height: 95, interval: 2 };
    return { fontSize: 12, angle: -75, height: 105, interval: Math.floor(dataLength / 12) };
  };

  const xAxisSettings = getResponsiveXAxisSettings(groupedData.length);

  if (isLoading) {
    return <div className="donnees-attente">Chargement de l'historique des parties...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée d'historique disponible</div>;
  }

  return (
    <div className="lycans-camps-container">
      <h2>Évolution des Parties</h2>
      
      {/* Summary Cards */}
      {summaryStats && (
        <div className="lycans-resume-conteneur">
          <div className="lycans-stat-carte">
            <h3>Total Parties</h3>
            <p className="lycans-stat-valeur">{summaryStats.totalGames}</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Joueurs / Partie</h3>
            <p className="lycans-stat-valeur">{summaryStats.averagePlayers}</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Durée Moyenne</h3>
            <p className="lycans-stat-valeur">{summaryStats.averageDuration} min</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Victoires Villageois</h3>
            <p className="lycans-stat-valeur" style={{ color: getCampColor('Villageois', lycansColorScheme) }}>
              {summaryStats.villageoisWinRate}%
            </p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Victoires Loups</h3>
            <p className="lycans-stat-valeur" style={{ color: getCampColor('Loup', lycansColorScheme) }}>
              {summaryStats.loupWinRate}%
            </p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Victoires Solo</h3>
            <p className="lycans-stat-valeur" style={{ color: '#808080' }}>
              {summaryStats.soloWinRate}%
            </p>
          </div>
        </div>
      )}

      {/* Grouping Controls */}
      <div className="lycans-filtres-conteneur" style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Grouper :</label>
        <select 
          value={groupingMethod} 
          onChange={(e) => setGroupingMethod(e.target.value as GroupByMethod)}
          className="lycans-select"
        >
          <option value="session">Par Session</option>
          <option value="month">Par Mois</option>
          <option value="quarter">Par Trimestre</option>
          <option value="year">Par Année</option>
        </select>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Number of games per period */}
        <div className="lycans-graphique-section">
          <h3>Nombre de Parties {groupingLabel}</h3>
          <FullscreenChart title={`Nombre de Parties ${groupingLabel}`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                    label={{ value: 'Nombre de parties', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div>Parties: {dataPoint.totalGames}</div>
                            <div>Joueurs moyens: {dataPoint.averagePlayers}</div>
                            <div>Durée moyenne: {dataPoint.averageDuration} min</div>
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
                    dataKey="totalGames" 
                    fill="var(--accent-primary)" 
                    name="Parties"
                  >
                    {groupedData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="var(--accent-primary)"
                        onClick={() => {
                          navigateToGameDetails({
                            selectedDate: entry.period,
                            fromComponent: `Évolution des Parties ${groupingLabel}`
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

        {/* Camp Win Rates Evolution */}
        <div className="lycans-graphique-section">
          <h3>Évolution des Victoires par Camp {groupingLabel}</h3>
          <FullscreenChart title={`Évolution des Victoires par Camp ${groupingLabel}`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={groupedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                    label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
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
                            <div style={{ color: getCampColor('Villageois', lycansColorScheme) }}>
                              Villageois: {dataPoint.villageoisWinRate}% ({dataPoint.villageoisWins})
                            </div>
                            <div style={{ color: getCampColor('Loup', lycansColorScheme) }}>
                              Loups: {dataPoint.loupWinRate}% ({dataPoint.loupWins})
                            </div>
                            <div style={{ color: '#808080' }}>
                              Solo: {dataPoint.soloWinRate}% ({dataPoint.soloWins})
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="villageoisWinRate" 
                    stroke={getCampColor('Villageois', lycansColorScheme)}
                    strokeWidth={2}
                    dot={{ fill: getCampColor('Villageois', lycansColorScheme), strokeWidth: 2, r: 4 }}
                    name="Villageois (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="loupWinRate" 
                    stroke={getCampColor('Loup', lycansColorScheme)}
                    strokeWidth={2}
                    dot={{ fill: getCampColor('Loup', lycansColorScheme), strokeWidth: 2, r: 4 }}
                    name="Loups (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="soloWinRate" 
                    stroke="#808080"
                    strokeWidth={2}
                    dot={{ fill: '#808080', strokeWidth: 2, r: 4 }}
                    name="Solo (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>

        {/* Stacked Bar Chart: Wins by Camp */}
        <div className="lycans-graphique-section">
          <h3>Répartition des Victoires {groupingLabel}</h3>
          <FullscreenChart title={`Répartition des Victoires ${groupingLabel}`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                    label={{ value: 'Nombre de victoires', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div style={{ color: getCampColor('Villageois', lycansColorScheme) }}>
                              Villageois: {dataPoint.villageoisWins}
                            </div>
                            <div style={{ color: getCampColor('Loup', lycansColorScheme) }}>
                              Loups: {dataPoint.loupWins}
                            </div>
                            <div style={{ color: '#808080' }}>
                              Solo: {dataPoint.soloWins}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="villageoisWins" stackId="wins" fill={getCampColor('Villageois', lycansColorScheme)} name="Villageois" />
                  <Bar dataKey="loupWins" stackId="wins" fill={getCampColor('Loup', lycansColorScheme)} name="Loups" />
                  <Bar dataKey="soloWins" stackId="wins" fill="#808080" name="Solo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>

        {/* Average Players Over Time */}
        <div className="lycans-graphique-section">
          <h3>Évolution du Nombre de Joueurs {groupingLabel}</h3>
          <FullscreenChart title={`Évolution du Nombre de Joueurs ${groupingLabel}`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={groupedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                    label={{ value: 'Joueurs moyens', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
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
                            <div>Joueurs moyens: {dataPoint.averagePlayers}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="averagePlayers" 
                    stroke="var(--accent-secondary)" 
                    fill="var(--accent-secondary)"
                    fillOpacity={0.3}
                    name="Joueurs moyens"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>

        {/* Average Duration Over Time */}
        <div className="lycans-graphique-section">
          <h3>Évolution de la Durée des Parties {groupingLabel}</h3>
          <FullscreenChart title={`Évolution de la Durée des Parties ${groupingLabel}`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={groupedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                    label={{ value: 'Durée moyenne (min)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
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
                            <div>Durée moyenne: {dataPoint.averageDuration} min</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="averageDuration" 
                    stroke="var(--chart-color-3)" 
                    fill="var(--chart-color-3)"
                    fillOpacity={0.3}
                    name="Durée moyenne (min)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );
}
