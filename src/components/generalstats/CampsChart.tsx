import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCampWinStatsFromRaw } from '../../hooks/useCampWinStatsFromRaw';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { useNavigation } from '../../context/NavigationContext';

// Fallback color for camps not in the scheme
const lycansDefaultColor = '#607D8B';

export function CampsChart() {
  const { navigateToGameDetails } = useNavigation();
  const { campWinStats: victoriesDonnees, isLoading: chargementVictoires, errorInfo: erreurVictoires } = useCampWinStatsFromRaw();
  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  
  // Prepare camp averages data for visualization (now from campWinStats)
  const campAveragesData = useMemo(() => {
    if (!victoriesDonnees?.campAverages) return [];
    
    return victoriesDonnees.campAverages
      .map(camp => ({
        ...camp,
        winRateNum: parseFloat(camp.winRate)
      }))
      .sort((a, b) => b.winRateNum - a.winRateNum);
  }, [victoriesDonnees]);

  const campStatsForChart = useMemo(() => {
    return victoriesDonnees?.campStats?.map(camp => ({
      ...camp,
      winRateNum: typeof camp.winRate === 'string' ? parseFloat(camp.winRate) : camp.winRate
    })) || [];
  }, [victoriesDonnees]);

  // Group small slices for victory distribution pie chart
  const groupedVictoryData = useMemo(() => {
    if (!campStatsForChart.length) return [];
    
    const MIN_PERCENT = 5;
    let smallTotal = 0;
    const smallEntries: typeof campStatsForChart = [];
    const large: typeof campStatsForChart = [];
    
    campStatsForChart.forEach(entry => {
      if (entry.winRateNum < MIN_PERCENT) {
        smallTotal += entry.winRateNum;
        smallEntries.push(entry);
      } else {
        large.push(entry);
      }
    });
    
    if (smallTotal > 0) {
      large.push({
        camp: 'Autres',
        wins: smallEntries.reduce((sum, e) => sum + e.wins, 0),
        winRate: smallTotal.toFixed(1),
        winRateNum: smallTotal,
        // @ts-ignore
        _details: smallEntries // Attach details for tooltip
      });
    }
    
    return large;
  }, [campStatsForChart]);

  // Sort camp distribution data by total games (descending) for bar chart, excluding Villageois and Loups
  const campDistributionData = useMemo(() => {
    if (!campAveragesData.length) return [];
    
    return campAveragesData
      .slice() // Create a copy to avoid mutating the original
      .filter(camp => camp.camp !== 'Villageois' && camp.camp !== 'Loup') // Exclude basic camps
      .sort((a, b) => b.totalGames - a.totalGames);
  }, [campAveragesData]);

  const isLoading = chargementVictoires;
  const error = erreurVictoires;

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques des camps...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!victoriesDonnees) {
    return <div className="donnees-manquantes">Aucune donnée de camp disponible</div>;
  }

  return (
    <div className="lycans-camps-container">
      <h2>Statistiques des Camps</h2>

      {/* Summary Cards */}
      {victoriesDonnees && (
        <div className="lycans-resume-conteneur">
          <div className="lycans-stat-carte">
            <h3>Camps Analysés</h3>
            <div className="lycans-valeur-principale">{victoriesDonnees.campAverages?.length || 0}</div>
            <p>camps différents</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Joueurs Évalués</h3>
            <div className="lycans-valeur-principale">{victoriesDonnees.totalPlayersAnalyzed || 0}</div>
            <p>joueurs analysés</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Total Parties</h3>
            <div className="lycans-valeur-principale">{victoriesDonnees?.totalGames || 0}</div>
            <p>parties analysées</p>
          </div>
        </div>
      )}

      <div className="lycans-graphiques-groupe">
        {/* Victory Statistics Section */}
        {victoriesDonnees && groupedVictoryData.length > 0 && (
          <>
            <div className="lycans-graphique-section">
              <h3>Répartition des Victoires par Camp</h3>
              <p className="lycans-stats-info">
                Distribution des victoires sur {victoriesDonnees.totalGames} parties
              </p>
              <div style={{ height: 450 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={groupedVictoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="winRateNum"
                      nameKey="camp"
                      onClick={(data: any) => {
                        if (data && data.camp) {
                          if (data.camp === 'Autres' && (data as any)._details) {
                            // For "Autres", pass the small camps details
                            const smallCamps = (data as any)._details.map((detail: any) => detail.camp);
                            navigateToGameDetails({
                              campFilter: {
                                selectedCamp: 'Autres',
                                campFilterMode: 'wins-only',
                                _smallCamps: smallCamps
                              },
                              fromComponent: 'Répartition des Victoires par Camp'
                            });
                          } else {
                            // For regular camps
                            navigateToGameDetails({
                              campFilter: {
                                selectedCamp: data.camp,
                                campFilterMode: 'wins-only'
                              },
                              fromComponent: 'Répartition des Victoires par Camp'
                            });
                          }
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      label={({ payload }) => {
                        if (!payload) return '';
                        const { camp, winRate } = payload as { camp: string; winRate: string };
                        return camp === 'Autres' ? `Autres: ${winRate}%` : `${camp}: ${winRate}%`;
                      }}
                    >
                      {groupedVictoryData.map((entree, indice) => (
                        <Cell 
                          key={`cellule-camp-${indice}`} 
                          fill={
                            entree.camp === 'Autres'
                              ? lycansOtherCategoryColor
                              : lycansColorScheme[entree.camp as keyof typeof lycansColorScheme] || lycansDefaultColor
                          }
                          onClick={() => {
                            if (entree.camp === 'Autres' && (entree as any)._details) {
                              // For "Autres", pass the small camps details
                              const smallCamps = (entree as any)._details.map((detail: any) => detail.camp);
                              navigateToGameDetails({
                                campFilter: {
                                  selectedCamp: 'Autres',
                                  campFilterMode: 'wins-only',
                                  _smallCamps: smallCamps
                                },
                                fromComponent: 'Répartition des Victoires par Camp'
                              });
                            } else {
                              // For regular camps
                              navigateToGameDetails({
                                campFilter: {
                                  selectedCamp: entree.camp,
                                  campFilterMode: 'wins-only'
                                },
                                fromComponent: 'Répartition des Victoires par Camp'
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
                          const d = payload[0].payload;
                          if (d.camp === 'Autres' && d._details) {
                            // Sort the details by descending win rate
                            const sortedDetails = [...d._details].sort(
                              (a, b) => b.winRateNum - a.winRateNum
                            );
                            return (
                              <div style={{ 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                padding: 12, 
                                borderRadius: 8,
                                border: '1px solid var(--border-color)'
                              }}>
                                <div><strong>Autres</strong></div>
                                <div>
                                  {sortedDetails.map((entry: any, i: number) => (
                                    <div key={i}>
                                      {entry.camp}: {entry.wins} victoires ({entry.winRate}%)
                                    </div>
                                  ))}
                                </div>
                                <div style={{ marginTop: 4, fontWeight: 'bold' }}>
                                  Total: {d.wins} victoires ({d.winRate}%)
                                </div>
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
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                {d.camp}
                              </div>
                              <div>
                                Victoires: {d.wins}
                              </div>
                              <div>
                                Taux de victoire: {d.winRate}%
                              </div>
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
          </>
        )}

        {/* Performance and Presence Section */}
        {victoriesDonnees?.campAverages && campAveragesData.length > 0 && (
          <>
            <div className="lycans-graphique-section">
              <h3>Taux de Victoire Moyen par Camp</h3>
              <FullscreenChart title="Taux de Victoire Moyen par Camp">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={campAveragesData}
                      margin={{ top: 50, right: 30, left: 20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="camp"
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        interval={0}
                        fontSize={11}
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
                                <div><strong>{dataPoint.camp}</strong></div>
                                <div>Victoires : {dataPoint.wins} / {dataPoint.totalGames}</div>
                                <div>Taux de victoire: {dataPoint.winRate}%</div>
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
                        dataKey="winRateNum"
                        onClick={(data: any) => {
                          if (data && data.camp) {
                            navigateToGameDetails({
                              campFilter: {
                                selectedCamp: data.camp,
                                campFilterMode: 'all-assignments',
                                _smallCamps: [] as string[]
                              },
                              fromComponent: 'Taux de Victoire Moyen par Camp'
                            });
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {campAveragesData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                            onClick={() => {
                              navigateToGameDetails({
                                campFilter: {
                                  selectedCamp: entry.camp,
                                  campFilterMode: 'all-assignments',
                                  _smallCamps: [] as string[]
                                },
                                fromComponent: 'Taux de Victoire Moyen par Camp'
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

            <div className="lycans-graphique-section">
              <h3>Distribution des Parties par Camp (hors villageois et loups)</h3>
              <FullscreenChart title="Distribution des Parties par Camp (hors villageois et loups)">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={campDistributionData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="camp"
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        interval={0}
                        fontSize={11}
                      />
                      <YAxis 
                        label={{ value: 'Nombre de parties', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const dataPoint = payload[0].payload;
                            const totalGames = campDistributionData.reduce((sum, camp) => sum + camp.totalGames, 0);
                            const percentage = ((dataPoint.totalGames / totalGames) * 100).toFixed(1);
                            
                            return (
                              <div style={{ 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                padding: 12, 
                                borderRadius: 8,
                                border: '1px solid var(--border-color)'
                              }}>
                                <div><strong>{dataPoint.camp}</strong></div>
                                <div>Parties: {dataPoint.totalGames} ({percentage}%)</div>
                                <div>Taux victoire: {dataPoint.winRate}%</div>
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
                        dataKey="totalGames"
                        onClick={(data: any) => {
                          if (data && data.camp) {
                            navigateToGameDetails({
                              campFilter: {
                                selectedCamp: data.camp,
                                campFilterMode: 'all-assignments',
                                _smallCamps: [] as string[]
                              },
                              fromComponent: 'Distribution des Parties par Camp'
                            });
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {campDistributionData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                            onClick={() => {
                              navigateToGameDetails({
                                campFilter: {
                                  selectedCamp: entry.camp,
                                  campFilterMode: 'all-assignments',
                                  _smallCamps: [] as string[]
                                },
                                fromComponent: 'Distribution des Parties par Camp'
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
          </>
        )}
      </div>
      
      <div className="lycans-stats-note" style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        textAlign: 'center', 
        color: 'var(--text-secondary)', 
        fontSize: '0.9rem',
        fontStyle: 'italic'
      }}>
        Statistiques basées sur les rôles effectifs des joueurs à la fin des parties.
      </div>
    </div>
  );
}