import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { usePlayerCampPerformance } from '../../hooks/usePlayerCampPerformance';
import { lycansColorScheme, playersColor } from '../../types/api';

type ViewMode = 'camp-averages' | 'player-performance' | 'top-performers';

export function PlayerCampPerformanceChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('camp-averages');
  const [selectedCamp, setSelectedCamp] = useState<string>('Villageois');
  const [minGames, setMinGames] = useState<number>(5);
  
  const { playerCampPerformance, isLoading, error } = usePlayerCampPerformance();

  // Get available camps from camp averages
  const availableCamps = useMemo(() => {
    if (!playerCampPerformance?.campAverages) return [];
    return playerCampPerformance.campAverages
      .map(camp => camp.camp)
      .sort();
  }, [playerCampPerformance]);

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

  // Prepare player performance data for selected camp
  const campPlayerData = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance) return [];
    
    const playersInCamp = playerCampPerformance.playerPerformance
      .map(player => {
        const campData = player.campPerformance.find(cp => cp.camp === selectedCamp);
        if (!campData || campData.games < minGames) return null;
        
        return {
          player: player.player,
          ...campData,
          winRateNum: parseFloat(campData.winRate),
          performanceNum: parseFloat(campData.performance),
          campAvgWinRateNum: parseFloat(campData.campAvgWinRate)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.performanceNum - a!.performanceNum);
    
    return playersInCamp as NonNullable<typeof playersInCamp[0]>[];
  }, [playerCampPerformance, selectedCamp, minGames]);

  // Top performers across all camps
  const topPerformersData = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance) return [];
    
    const allPerformances = playerCampPerformance.playerPerformance
      .flatMap(player => 
        player.campPerformance
          .filter(cp => cp.games >= minGames)
          .map(cp => ({
            player: player.player,
            camp: cp.camp,
            games: cp.games,
            wins: cp.wins,
            winRate: cp.winRate,
            performance: cp.performance,
            winRateNum: parseFloat(cp.winRate),
            performanceNum: parseFloat(cp.performance),
            campAvgWinRateNum: parseFloat(cp.campAvgWinRate)
          }))
      )
      .sort((a, b) => b.performanceNum - a.performanceNum)
      .slice(0, 20); // Top 20 performances
    
    return allPerformances;
  }, [playerCampPerformance, minGames]);

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de performance par camp...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!playerCampPerformance) {
    return <div className="donnees-manquantes">Aucune donnée de performance par camp disponible</div>;
  }

  return (
    <div className="lycans-player-camp-performance">
      <h2>Performance des Joueurs par Camp</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="view-mode-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Vue:
          </label>
          <select
            id="view-mode-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="camp-averages">Moyennes par Camp</option>
            <option value="player-performance">Performance par Camp</option>
            <option value="top-performers">Top Performers</option>
          </select>
        </div>

        {viewMode === 'player-performance' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="camp-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Camp:
            </label>
            <select
              id="camp-select"
              value={selectedCamp}
              onChange={(e) => setSelectedCamp(e.target.value)}
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
              {availableCamps.map(camp => (
                <option key={camp} value={camp}>
                  {camp}
                </option>
              ))}
            </select>
          </div>
        )}

        {(viewMode === 'player-performance' || viewMode === 'top-performers') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="min-games-input" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Min. parties:
            </label>
            <input
              id="min-games-input"
              type="number"
              min="1"
              max="50"
              value={minGames}
              onChange={(e) => setMinGames(parseInt(e.target.value) || 3)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                width: '70px'
              }}
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
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
          <h3>Seuil Minimum</h3>
          <div className="lycans-valeur-principale">{playerCampPerformance.minGamesRequired}</div>
          <p>parties requises</p>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Camp Averages View */}
        {viewMode === 'camp-averages' && (
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

        {/* Player Performance by Camp View */}
        {viewMode === 'player-performance' && (
          <>
            <div className="lycans-graphique-section">
              <h3>Performance des Joueurs - {selectedCamp}</h3>
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={campPlayerData.slice(0, 15)} // Top 15 players
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="player"
                      angle={-45}
                      textAnchor="end"
                      height={110}
                      interval={0}
                      fontSize={10}
                    />
                    <YAxis 
                      label={{ value: 'Performance vs moyenne (%)', angle: -90, position: 'insideLeft' }}
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
                              <div><strong>{dataPoint.player}</strong></div>
                              <div>Parties: {dataPoint.games}</div>
                              <div>Victoires: {dataPoint.wins}</div>
                              <div>Taux personnel: {dataPoint.winRate}%</div>
                              <div>Moyenne camp: {dataPoint.campAvgWinRate}%</div>
                              <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}%</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                     <Bar dataKey="performanceNum">
                     {campPlayerData.slice(0, 15).map((entry, index) => (
                        <Cell
                           key={`cell-${index}`}
                           fill={
                           playersColor[entry.player] ||
                           (entry.performanceNum >= 0 ? 'var(--accent-tertiary)' : 'var(--accent-danger)')
                           }
                        />
                     ))}
                     </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lycans-graphique-section">
              <h3>Relation Parties Jouées vs Performance - {selectedCamp}</h3>
              <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                     data={campPlayerData}
                     margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis 
                        dataKey="games"
                        type="number"
                        label={{ value: 'Parties jouées', position: 'insideBottom', offset: -10 }}
                     />
                     <YAxis 
                        dataKey="performanceNum"
                        type="number"
                        label={{ value: 'Performance (%)', angle: -90, position: 'insideLeft' }}
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
                              <div><strong>{dataPoint.player}</strong></div>
                              <div>Parties: {dataPoint.games}</div>
                              <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}%</div>
                              </div>
                           );
                        }
                        return null;
                        }}
                     />
                     <Scatter dataKey="performanceNum" name="Performance">
                        {campPlayerData.map((entry, index) => (
                        <Cell
                           key={`cell-${index}`}
                           fill={playersColor[entry.player] || 'var(--accent-primary)'}
                        />
                        ))}
                     </Scatter>
                  </ScatterChart>
                  </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Top Performers View */}
        {viewMode === 'top-performers' && (
          <div className="lycans-graphique-section">
            <h3>Top 20 Performances Toutes Camps Confondues</h3>
            <div style={{ height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPerformersData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="player"
                    angle={-45}
                    textAnchor="end"
                    height={110}
                    interval={0}
                    fontSize={10}
                  />
                  <YAxis 
                    label={{ value: 'Performance vs moyenne (%)', angle: -90, position: 'insideLeft' }}
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
                            <div><strong>{dataPoint.player}</strong></div>
                            <div>Camp: {dataPoint.camp}</div>
                            <div>Parties: {dataPoint.games}</div>
                            <div>Taux personnel: {dataPoint.winRate}%</div>
                            <div>Performance: +{dataPoint.performance}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="performanceNum">
                    {topPerformersData.map((entry, index) => (
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
        )}
      </div>
    </div>
  );
}