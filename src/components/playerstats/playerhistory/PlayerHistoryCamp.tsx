import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePlayerGameHistoryFromRaw } from '../../../hooks/usePlayerGameHistoryFromRaw';
import { useNavigation } from '../../../context/NavigationContext';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';

interface PlayerHistoryCampProps {
  selectedPlayerName: string;
}

export function PlayerHistoryCamp({ selectedPlayerName }: PlayerHistoryCampProps) {
  const { navigateToGameDetails } = useNavigation();
  const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName);
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  // Prepare camp distribution data for pie chart
  const campDistributionData = useMemo(() => {
    if (!data?.campStats) return [];
    
    return Object.entries(data.campStats).map(([camp, stats]) => ({
      name: camp,
      value: stats.appearances,
      winRate: stats.winRate,
      winRateDisplay: Math.max(parseFloat(stats.winRate), 1), // Ensure minimum 1% for visibility
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
        winRateDisplay: 1,
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
                label={(entry: any) => {
                  const pct = entry.percent !== undefined ? entry.percent : 0;
                  return entry.name === 'Autres' 
                    ? `Autres : ${entry.value} (${(pct * 100).toFixed(1)}%)`  
                    : `${entry.name}: ${entry.value} (${(pct * 100).toFixed(1)}%)`;
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
                            campFilterMode: 'all-assignments',
                            _smallCamps: smallCampNames
                          },
                          fromComponent: 'Distribution par Camps'
                        });
                      } else if (entry.name === 'Traître' || entry.name === 'Louveteau') {
                        // Special handling for wolf sub roles, add excludeWolfSubRoles flag
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          campFilter: {
                            selectedCamp: entry.name,
                            campFilterMode: 'all-assignments',
                            excludeWolfSubRoles: true
                          },
                          fromComponent: 'Distribution par Camps'
                        });
                      } else if (entry.name === 'Loup') {
                        // When clicking on Loups, exclude sub roles games to show only regular wolf games
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          campFilter: {
                            selectedCamp: 'Loup',
                            campFilterMode: 'all-assignments',
                            excludeWolfSubRoles: true
                          },
                          fromComponent: 'Distribution par Camps'
                        });
                      } else {
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          campFilter: {
                            selectedCamp: entry.name,
                            campFilterMode: 'all-assignments'
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
                        (a: any, b: any) => b.value - a.value
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
                        <div><strong>{dataPoint.name} - {dataPoint.value} parties ({dataPoint.percentage}%)</strong></div>
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
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  fontSize={14}
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
                <Bar dataKey="winRateDisplay">
                  {campDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        // Use a dimmed color for camps with 0 wins to indicate they have no victories
                        parseFloat(entry.winRate) === 0
                          ? `${lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}50`
                          : lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`
                      }
                      onClick={() => {
                        // Special handling for Wolf sub roles and Loups camps
                        if (entry.name === 'Traître' || entry.name === 'Louveteau') {
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'all-assignments',
                              excludeWolfSubRoles: true
                            },
                            fromComponent: 'Performance par Camp'
                          });
                        } else if (entry.name === 'Loup') {
                          // When clicking on Loups, exclude traitor games to show only regular wolf games
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'all-assignments',
                              excludeWolfSubRoles: true
                            },
                            fromComponent: 'Performance par Camp'
                          });
                        } else {
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'all-assignments',
                            },
                            fromComponent: 'Performance par Camp'
                          });
                        }
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
