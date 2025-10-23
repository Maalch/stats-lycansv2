import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerGameHistoryFromRaw } from '../../../hooks/usePlayerGameHistoryFromRaw';
import { useNavigation } from '../../../context/NavigationContext';
import { FullscreenChart } from '../../common/FullscreenChart';
import type { GroupByMethod } from './types';

interface PlayerHistoryEvolutionProps {
  selectedPlayerName: string;
  groupingMethod: GroupByMethod;
}

export function PlayerHistoryEvolution({ selectedPlayerName, groupingMethod }: PlayerHistoryEvolutionProps) {
  const { navigateToGameDetails } = useNavigation();
  const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName);

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
        defeats: stats.total - stats.wins,
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

  // Helper functions when there are too much data
  const getResponsiveXAxisSettings = (dataLength: number) => {
    if (dataLength <= 15) return { fontSize: 12, angle: -45, height: 80, interval: 0 };
    if (dataLength <= 30) return { fontSize: 12, angle: -45, height: 85, interval: 1 };
    if (dataLength <= 50) return { fontSize: 12, angle: -60, height: 95, interval: 2 };
    return { fontSize: 12, angle: -75, height: 105, interval: Math.floor(dataLength / 12) };
  };

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
    <div className="lycans-graphiques-groupe">
      {/* Performance over time */}
      <div className="lycans-graphique-section">
        <h3>Évolution des Performances {groupingMethod === 'month' ? 'par Mois' : 'par Session'}</h3>
        <FullscreenChart title={`Évolution des Performances ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
  );
}
