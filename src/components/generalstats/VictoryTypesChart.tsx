import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useVictoryTypesFromRaw } from '../../hooks/useVictoryTypesFromRaw';
import { lycansColorScheme } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function VictoryTypesChart() {
  const { victoryTypesStats: victoriesDonnees, isLoading: chargementVictoires, errorInfo: erreurVictoires } = useVictoryTypesFromRaw();

  // Prepare victory types data for visualization
  const victoryTypesData = useMemo(() => {
    if (!victoriesDonnees?.victoryTypes) return [];
    
    return victoriesDonnees.victoryTypes.map(victory => ({
      ...victory,
      percentageNum: parseFloat(victory.percentage)
    }));
  }, [victoriesDonnees?.victoryTypes]);

  // Split victory types into main and rare categories for better visualization
  const { mainVictoryTypes, rareVictoryTypes } = useMemo(() => {
    if (!victoryTypesData.length) return { mainVictoryTypes: [], rareVictoryTypes: [] };
    
    // Define threshold for "main" victory types (e.g., top 3 or those with >5% of total games)
    const threshold = Math.max(5, Math.ceil(victoryTypesData[0].count * 0.1)); // At least 5 games or 10% of the most common
    
    const main = victoryTypesData.filter(v => v.count >= threshold);
    const rare = victoryTypesData.filter(v => v.count < threshold);
    
    return { mainVictoryTypes: main, rareVictoryTypes: rare };
  }, [victoryTypesData]);

  const isLoading = chargementVictoires;
  const error = erreurVictoires;

  if (isLoading) {
    return <div className="donnees-attente">Chargement des types de victoire...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!victoriesDonnees) {
    return <div className="donnees-manquantes">Aucune donnée de victoire disponible</div>;
  }

  return (
    <div className="lycans-victory-types-container">
      <h2>Types de Victoire</h2>

      {/* Summary Cards */}
      {victoriesDonnees && (
        <div className="lycans-resume-conteneur">
          <div className="lycans-stat-carte">
            <h3>Types Principaux</h3>
            <div className="lycans-valeur-principale">{mainVictoryTypes.length}</div>
            <p>types fréquents</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Types Spéciaux</h3>
            <div className="lycans-valeur-principale">{rareVictoryTypes.length}</div>
            <p>types rares</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Total Parties</h3>
            <div className="lycans-valeur-principale">{victoriesDonnees?.totalGames || 0}</div>
            <p>parties analysées</p>
          </div>
        </div>
      )}

      <div className="lycans-graphiques-groupe">
        {/* Main Victory Types Chart */}
        {mainVictoryTypes.length > 0 && (
          <div className="lycans-graphique-section">
            <h3>Types de Victoire Principaux par Camp</h3>
            <p className="lycans-stats-info">
              Types de victoire les plus fréquents ({mainVictoryTypes.reduce((sum, v) => sum + v.count, 0)} parties sur {victoriesDonnees?.totalGames})
            </p>
            <FullscreenChart title="Types de Victoire Principaux par Camp">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mainVictoryTypes}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="type"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      fontSize={11}
                    />
                    <YAxis 
                      label={{ value: 'Nombre de parties', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length > 0) {
                          const totalForType = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                          // Find the percentage of games for this victory type
                          let percentOfAll = '';
                          if (victoriesDonnees?.totalGames && totalForType > 0) {
                            percentOfAll = ((totalForType / victoriesDonnees.totalGames) * 100).toFixed(1);
                          }
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)',
                              maxWidth: 300
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{label}</div>
                              <div style={{ marginBottom: 4 }}>Total: {totalForType} parties{percentOfAll && ` (${percentOfAll}%)`}</div>
                              {payload
                                .filter(entry => entry.value && entry.value > 0)
                                .sort((a, b) => (b.value || 0) - (a.value || 0))
                                .map((entry, index) => {
                                  const percentage = totalForType > 0 ? ((entry.value || 0) / totalForType * 100).toFixed(1) : '0.0';
                                  return (
                                    <div key={index} style={{ marginBottom: 2 }}>
                                      <span style={{ 
                                        display: 'inline-block', 
                                        width: 12, 
                                        height: 12, 
                                        backgroundColor: entry.color, 
                                        marginRight: 8,
                                        borderRadius: 2
                                      }}></span>
                                      {entry.dataKey}: {entry.value} ({percentage}%)
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    {/* Create stacked bars for each winning camp */}
                    {victoriesDonnees?.winningCamps?.map((camp, index) => (
                      <Bar 
                        key={camp}
                        dataKey={camp}
                        stackId="victory"
                        fill={lycansColorScheme[camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                        name={camp}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Rare Victory Types Chart */}
        {rareVictoryTypes.length > 0 && (
          <div className="lycans-graphique-section">
            <h3>Types de Victoire Spéciaux par Camp</h3>
            <p className="lycans-stats-info">
              Types de victoire moins fréquents ({rareVictoryTypes.reduce((sum, v) => sum + v.count, 0)} parties sur {victoriesDonnees?.totalGames})
            </p>
            <FullscreenChart title="Types de Victoire Spéciaux par Camp">
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rareVictoryTypes}
                    margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="type"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      fontSize={10}
                    />
                    <YAxis 
                      label={{ value: 'Nombre de parties', angle: -90, position: 'insideLeft' }}
                      domain={[0, 'dataMax']}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length > 0) {
                          const totalForType = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                          let percentOfAll = '';
                          if (victoriesDonnees?.totalGames && totalForType > 0) {
                            percentOfAll = ((totalForType / victoriesDonnees.totalGames) * 100).toFixed(1);
                          }
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)',
                              maxWidth: 300
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{label}</div>
                              <div style={{ marginBottom: 4 }}>Total: {totalForType} parties{percentOfAll && ` (${percentOfAll}%)`}</div>
                              {payload
                                .filter(entry => entry.value && entry.value > 0)
                                .sort((a, b) => (b.value || 0) - (a.value || 0))
                                .map((entry, index) => {
                                  const percentage = totalForType > 0 ? ((entry.value || 0) / totalForType * 100).toFixed(1) : '0.0';
                                  return (
                                    <div key={index} style={{ marginBottom: 2 }}>
                                      <span style={{ 
                                        display: 'inline-block', 
                                        width: 12, 
                                        height: 12, 
                                        backgroundColor: entry.color, 
                                        marginRight: 8,
                                        borderRadius: 2
                                      }}></span>
                                      {entry.dataKey}: {entry.value} ({percentage}%)
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    {/* Create stacked bars for each winning camp */}
                    {victoriesDonnees?.winningCamps?.map((camp, index) => (
                      <Bar 
                        key={camp}
                        dataKey={camp}
                        stackId="victory"
                        fill={lycansColorScheme[camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}
                        name={camp}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}
      </div>
    </div>
  );
}
