import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { usePlayerGameHistoryFromRaw } from '../../../hooks/usePlayerGameHistoryFromRaw';
import { useAvailableCampsFromRaw } from '../../../hooks/useDeathStatisticsFromRaw';
import { useNavigation } from '../../../context/NavigationContext';
import { lycansOtherCategoryColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { getGroupedMapStats } from '../../../hooks/utils/playerGameHistoryUtils';

interface PlayerHistoryMapTypesProps {
  selectedPlayerName: string;
}

export function PlayerHistoryMapTypes({ selectedPlayerName }: PlayerHistoryMapTypesProps) {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.playerHistoryMapState?.selectedCamp || 'Tous les camps'
  );
  
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName, selectedCamp);

  // Save state to navigation context when it changes
  useEffect(() => {
    if (!navigationState.playerHistoryMapState || 
        navigationState.playerHistoryMapState.selectedCamp !== selectedCamp) {
      updateNavigationState({
        playerHistoryMapState: {
          selectedCamp
        }
      });
    }
  }, [selectedCamp, navigationState.playerHistoryMapState, updateNavigationState]);

  // Function to handle camp selection change with persistence
  const handleCampChange = (newCamp: string) => {
    setSelectedCamp(newCamp);
    updateNavigationState({
      playerHistoryMapState: {
        selectedCamp: newCamp
      }
    });
  };

  // Prepare map performance data
  const mapPerformanceData = useMemo(() => {
    if (!data?.mapStats) return [];
    
    // Group maps using the utility function
    const groupedMapStats = getGroupedMapStats(data.mapStats);
    
    return Object.entries(groupedMapStats).map(([mapName, stats]) => ({
      name: mapName,
      value: stats.appearances,
      winRate: stats.winRate,
      winRateDisplay: Math.max(parseFloat(stats.winRate), 0.1), // Ensure minimum for visibility
      wins: stats.wins,
      percentage: ((stats.appearances / data.totalGames) * 100).toFixed(1)
    }));
  }, [data]);

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
        <h3>Performance par Carte{selectedCamp !== 'Tous les camps' ? ` (${selectedCamp})` : ''}</h3>
        
        {/* Camp Filter - Always visible */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="camp-select-map" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Camp :
          </label>
          <select
            id="camp-select-map"
            value={selectedCamp}
            onChange={(e) => handleCampChange(e.target.value)}
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
            <option value="Tous les camps">Tous les camps</option>
            {availableCamps?.map(camp => (
              <option key={camp} value={camp}>
                {camp}
              </option>
            ))}
          </select>
        </div>

        {/* Show empty state if no data for selected camp */}
        {mapPerformanceData.length === 0 ? (
          <div className="lycans-empty-section">
            <h3>Aucune donnée de carte disponible</h3>
            <p>Aucune statistique de carte n'est disponible pour ce joueur avec le camp sélectionné.</p>
          </div>
        ) : (
        
        <FullscreenChart title="Performance par Carte">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mapPerformanceData}
                margin={{ top: 20, right: 140, left: 20, bottom: 20 }}
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
                {/* Add reference lines for average and 50% */}
                <ReferenceLine 
                  y={50} 
                  stroke="var(--text-secondary)" 
                  strokeDasharray="5 5" 
                  strokeOpacity={0.5}
                />
                {(() => {
                  // Calculate overall average win rate for reference
                  if (mapPerformanceData.length > 0) {
                    const totalGames = mapPerformanceData.reduce((sum, map) => sum + map.value, 0);
                    const totalWins = mapPerformanceData.reduce((sum, map) => sum + map.wins, 0);
                    const avgWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
                    
                    if (avgWinRate !== 50) {
                      return (
                        <ReferenceLine 
                          y={avgWinRate} 
                          stroke="var(--accent-primary)" 
                          strokeDasharray="3 3" 
                          strokeOpacity={0.7}
                          label={{ 
                            value: `Moyenne: ${avgWinRate.toFixed(1)}%`, 
                            position: "right", 
                            offset: 5,
                            style: { fill: 'var(--accent-primary)' }
                          }}
                        />
                      );
                    }
                  }
                  return null;
                })()}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const dataPoint = payload[0].payload;
                      
                      // Calculate comparison with other maps
                      const comparisons: { map: string; diff: number; better: boolean }[] = [];
                      mapPerformanceData.forEach(otherMap => {
                        if (otherMap.name !== dataPoint.name && otherMap.value >= 5) { // Only compare with maps that have enough games
                          const diff = parseFloat(dataPoint.winRate) - parseFloat(otherMap.winRate);
                          if (Math.abs(diff) >= 2) { // Only show significant differences
                            comparisons.push({
                              map: otherMap.name,
                              diff: diff,
                              better: diff > 0
                            });
                          }
                        }
                      });
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)',
                          maxWidth: '250px'
                        }}>
                          <div><strong>{dataPoint.name}</strong></div>
                          <div>Parties: {dataPoint.value}</div>
                          <div>Victoires: {dataPoint.wins}</div>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Taux: {dataPoint.winRate}%</strong>
                          </div>
                          
                          {comparisons.length > 0 && (
                            <div style={{ 
                              borderTop: '1px solid var(--border-color)',
                              paddingTop: '0.5rem',
                              marginTop: '0.5rem'
                            }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                Comparaisons:
                              </div>
                              {comparisons.map((comp, idx) => (
                                <div key={idx} style={{ 
                                  fontSize: '0.75rem',
                                  color: comp.better ? 'var(--accent-tertiary)' : 'var(--chart-color-4)'
                                }}>
                                  {comp.better ? '↗' : '↘'} {Math.abs(comp.diff).toFixed(1)}% vs {comp.map}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div style={{ 
                            fontSize: '0.7rem', 
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
                  dataKey="winRateDisplay"
                  label={(props: any) => {
                    // Add percentage labels on top of bars
                    const { x, y, width, payload } = props;
                    if (x === undefined || y === undefined || width === undefined || !payload) return null;
                    const percentage = payload.winRate || '0';
                    return (
                      <text 
                        x={(x as number) + (width as number) / 2} 
                        y={(y as number) - 5} 
                        fill="var(--text-primary)" 
                        textAnchor="middle" 
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {percentage}%
                      </text>
                    );
                  }}
                  onClick={(data) => {
                    // Handle click on the entire bar - get the map name from the clicked data
                    if (data && data.name) {
                      const navigationFilters: any = {
                        selectedPlayer: selectedPlayerName,
                        selectedMapName: data.name,
                        fromComponent: 'Performance par Carte'
                      };
                      
                      // If a specific camp is selected, add camp filter
                      if (selectedCamp !== 'Tous les camps') {
                        navigationFilters.campFilter = {
                          selectedCamp: selectedCamp,
                          campFilterMode: 'all-assignments'
                        };
                      }
                      
                      navigateToGameDetails(navigationFilters);
                    }
                  }}
                >
                  {mapPerformanceData.map((entry, index) => {
                    // Define colors for specific maps with enhanced contrast
                    let fillColor;
                    
                    if (entry.name === 'Village') {
                      fillColor = 'var(--accent-tertiary)';
                    } else if (entry.name === 'Château') {
                      fillColor = 'var(--accent-secondary)';
                    } else if (entry.name === 'Autres') {
                      fillColor = lycansOtherCategoryColor;
                    } else {
                      fillColor = `var(--chart-color-${(index % 6) + 1})`;
                    }

                    // Highlight the best performing map
                    const bestWinRate = Math.max(...mapPerformanceData.map(m => parseFloat(m.winRate)));
                    const isHighest = parseFloat(entry.winRate) === bestWinRate && bestWinRate > 0;

                    return (
                      <Cell 
                        key={`cell-map-${index}`} 
                        fill={
                          parseFloat(entry.winRate) === 0
                            ? `${fillColor}30`  // More dimmed for 0% win rate
                            : fillColor
                        }
                        stroke='transparent'
                        strokeWidth={isHighest ? 3 : 1}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
        )}
      </div>
    </div>
  );
}
