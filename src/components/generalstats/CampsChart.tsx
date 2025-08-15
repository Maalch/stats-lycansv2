import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useCampWinStats } from '../../hooks/useCampWinStats';
import { usePlayerCampPerformance } from '../../hooks/usePlayerCampPerformance';
import { lycansColorScheme } from '../../types/api';

// Fallback color for camps not in the scheme
const lycansDefaultColor = '#607D8B';

export function CampsChart() {
  const { campWinStats: victoriesDonnees, isLoading: chargementVictoires, errorInfo: erreurVictoires } = useCampWinStats();
  const { playerCampPerformance, isLoading: chargementPerformance, error: erreurPerformance } = usePlayerCampPerformance();

  // Prepare camp averages data for visualization
  const campAveragesData = useMemo(() => {
    if (!playerCampPerformance?.campAverages) return [];
    
    return playerCampPerformance.campAverages
      .map(camp => ({
        ...camp,
        winRateNum: parseFloat(camp.winRate)
      }))
      .sort((a, b) => b.winRateNum - a.winRateNum);
  }, [playerCampPerformance]);

  const campStatsForChart = useMemo(() => {
    return victoriesDonnees?.campStats?.map(camp => ({
      ...camp,
      winRateNum: typeof camp.winRate === 'string' ? parseFloat(camp.winRate) : camp.winRate
    })) || [];
  }, [victoriesDonnees]);

  const isLoading = chargementVictoires || chargementPerformance;
  const error = erreurVictoires || erreurPerformance;

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques des camps...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!victoriesDonnees && !playerCampPerformance) {
    return <div className="donnees-manquantes">Aucune donnée de camp disponible</div>;
  }

  return (
    <div className="lycans-camps-container">
      <h2>Statistiques des Camps</h2>

      {/* Summary Cards */}
      {playerCampPerformance && (
        <div className="lycans-resume-conteneur">
          <div className="lycans-stat-carte">
            <h3>Camps Analysés</h3>
            <div className="lycans-valeur-principale">{playerCampPerformance.campAverages.length}</div>
            <p>camps différents</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Joueurs Évalués</h3>
            <div className="lycans-valeur-principale">{playerCampPerformance.playerPerformance.length}</div>
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
        {victoriesDonnees && campStatsForChart.length > 0 && (
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
                      data={campStatsForChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="winRateNum"
                      nameKey="camp"
                      label={({ camp, winRate }) => `${camp}: ${winRate}%`}
                    >
                      {campStatsForChart.map((entree, indice) => (
                        <Cell 
                          key={`cellule-camp-${indice}`} 
                          fill={lycansColorScheme[entree.camp as keyof typeof lycansColorScheme] || lycansDefaultColor} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const d = payload[0].payload;
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
          </>
        )}

        {/* Performance and Presence Section */}
        {playerCampPerformance && campAveragesData.length > 0 && (
          <>
            <div className="lycans-graphique-section">
              <h3>Taux de Victoire Moyen par Camp</h3>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={campAveragesData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                              <div><strong>{dataPoint.camp}</strong></div>
                              <div>Parties totales: {dataPoint.totalGames}</div>
                              <div>Taux de victoire: {dataPoint.winRate}%</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="winRateNum">
                      {campAveragesData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lycans-graphique-section">
              <h3>Distribution des Parties par Camp</h3>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={campAveragesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="totalGames"
                      label={({ camp, totalGames, percent }) => {
                        const pct = percent !== undefined ? percent : 0;
                        return `${camp}: ${totalGames} (${(pct * 100).toFixed(1)}%)`;
                      }}
                    >
                      {campAveragesData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                        />
                      ))}
                    </Pie>
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
                              <div>Parties: {dataPoint.totalGames}</div>
                              <div>Taux victoire: {dataPoint.winRate}%</div>
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
      </div>
    </div>
  );
}
