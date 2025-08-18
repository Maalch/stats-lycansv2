import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts';
import { usePlayerCampPerformance } from '../../hooks/usePlayerCampPerformance';
import { lycansColorScheme, playersColor } from '../../types/api';
import { minGamesOptions} from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

type ViewMode =  'player-performance' | 'top-performers';

export function PlayerCampPerformanceChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('player-performance');
  const [selectedCamp, setSelectedCamp] = useState<string>('Villageois');
  const [minGames, setMinGames] = useState<number>(20);
  
  const { playerCampPerformance, isLoading, error } = usePlayerCampPerformance();

  // Get available camps from camp averages
  const availableCamps = useMemo(() => {
    if (!playerCampPerformance?.campAverages) return [];
    return playerCampPerformance.campAverages
      .map(camp => camp.camp)
      .sort();
  }, [playerCampPerformance]);

  // Optimize data processing by combining operations and reducing redundant calculations
  const { campPlayerData, topPerformersData } = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance) {
      return { campPlayerData: [], topPerformersData: [] };
    }

    const { playerPerformance } = playerCampPerformance;
    
    // Single pass to process both camp-specific and top performers data
    const campPlayers = [];
    const allPerformances = [];
    
    for (const player of playerPerformance) {
      for (const cp of player.campPerformance) {
        if (cp.games >= minGames) {
          const performanceData = {
            player: player.player,
            camp: cp.camp,
            games: cp.games,
            wins: cp.wins,
            winRate: cp.winRate,
            performance: cp.performance,
            winRateNum: parseFloat(cp.winRate),
            performanceNum: parseFloat(cp.performance),
            campAvgWinRateNum: parseFloat(cp.campAvgWinRate)
          };
          
          // Add to all performances for top performers view
          allPerformances.push(performanceData);
          
          // Add to camp-specific data if it matches selected camp
          if (cp.camp === selectedCamp) {
            campPlayers.push({
              player: player.player,
              ...cp,
              winRateNum: parseFloat(cp.winRate),
              performanceNum: parseFloat(cp.performance),
              campAvgWinRateNum: parseFloat(cp.campAvgWinRate)
            });
          }
        }
      }
    }
    
    // Sort once for each dataset
    const sortedCampPlayers = campPlayers.sort((a, b) => b.performanceNum - a.performanceNum);
    const sortedTopPerformers = allPerformances
      .sort((a, b) => b.performanceNum - a.performanceNum)
      .slice(0, 20); // Top 20 performances
    
    return {
      campPlayerData: sortedCampPlayers,
      topPerformersData: sortedTopPerformers
    };
  }, [playerCampPerformance, selectedCamp, minGames]);

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
      <h2>Meilleurs Performances par Camp</h2>
      
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
            <option value="player-performance">Camp</option>
            <option value="top-performers">Hall of Fame</option>
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
            <label htmlFor="min-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Min. parties:
            </label>
            <select
              id="min-games-select"
              value={minGames}
              onChange={(e) => setMinGames(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                width: '90px'
              }}
            >
            {minGamesOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            </select>
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
        {/* Player Performance by Camp View */}
        {viewMode === 'player-performance' && (
          <>
            <div className="lycans-graphique-section">
              <h3>Performance des Joueurs - {selectedCamp}</h3>
              <FullscreenChart title={`Performance des Joueurs - ${selectedCamp}`}>
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
                              <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}</div>
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
              </FullscreenChart>
            </div>

            <div className="lycans-graphique-section">
              <h3>Relation Parties Jouées vs Performance - {selectedCamp}</h3>
              <FullscreenChart title={`Relation Parties Jouées vs Performance - ${selectedCamp}`}>
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
                              <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}</div>
                              </div>
                           );
                        }
                        return null;
                        }}
                     />
                    <Scatter
                      dataKey="performanceNum"
                      name="Performance"
                      shape={(props: { cx?: number; cy?: number; payload?: any }) => (
                        <g>
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={12} // Increased size to accommodate text
                            fill={playersColor[props.payload?.player] || 'var(--accent-primary)'}
                            stroke="#222"
                            strokeWidth={1}
                          />
                          <text
                            x={props.cx}
                            y={props.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#fff"
                            fontSize="10"
                            fontWeight="bold"
                            pointerEvents="none"
                          >
                            {props.payload?.player?.charAt(0).toUpperCase()}
                          </text>
                        </g>
                      )}
                    />
                  </ScatterChart>
                  </ResponsiveContainer>
              </div>
              </FullscreenChart>
            </div>
          </>
        )}

        {/* Top Performers View */}
        {viewMode === 'top-performers' && (
          <div className="lycans-graphique-section">
            <h3>{`Top 20 des Performances (Min. ${minGames} parties dans ce camp)`}</h3>
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
                            <div>Performance: +{dataPoint.performance}</div>
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