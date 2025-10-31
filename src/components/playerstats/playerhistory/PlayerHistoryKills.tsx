import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, useThemeAdjustedLycansColorScheme } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { getDeathTypeLabel, type DeathType } from '../../../types/deathTypes';

interface PlayerHistoryKillsProps {
  selectedPlayerName: string;
}

export function PlayerHistoryKills({ selectedPlayerName }: PlayerHistoryKillsProps) {
  const { gameData: filteredGameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const lycansColors = useThemeAdjustedLycansColorScheme();

  // Calculate kill statistics for the selected player from raw game data
  const killStatistics = useMemo(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return { playersKilled: [], killedBy: [], deathTypes: [], availableDeathTypes: [] };
    }

    // Maps to track kills
    const playersKilledMap: Record<string, number> = {};
    const killedByMap: Record<string, number> = {};
    const deathTypesMap: Record<string, { count: number; byDeathType: Partial<Record<DeathType, number>> }> = {};
    const deathTypesSet = new Set<DeathType>();

    // Process each game
    filteredGameData.forEach(game => {
      const selectedPlayerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!selectedPlayerStat) return; // Player not in this game

      // Track players killed BY the selected player
      game.PlayerStats.forEach(victim => {
        if (victim.KillerName?.toLowerCase() === selectedPlayerName.toLowerCase()) {
          playersKilledMap[victim.Username] = (playersKilledMap[victim.Username] || 0) + 1;
        }
      });

      // Track players who killed the selected player
      if (selectedPlayerStat.KillerName) {
        killedByMap[selectedPlayerStat.KillerName] = (killedByMap[selectedPlayerStat.KillerName] || 0) + 1;
      }

      // Track death types of the selected player
      if (selectedPlayerStat.DeathType) {
        const deathType = selectedPlayerStat.DeathType;
        const deathTypeLabel = getDeathTypeLabel(deathType);
        
        if (!deathTypesMap[deathTypeLabel]) {
          deathTypesMap[deathTypeLabel] = { count: 0, byDeathType: {} };
        }
        
        deathTypesMap[deathTypeLabel].count += 1;
        deathTypesMap[deathTypeLabel].byDeathType[deathType] = 
          (deathTypesMap[deathTypeLabel].byDeathType[deathType] || 0) + 1;
        
        deathTypesSet.add(deathType);
      }
    });

    // Convert to arrays and sort by count
    const playersKilled = Object.entries(playersKilledMap)
      .map(([player, count]) => ({ player, kills: count }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10); // Top 10

    const killedBy = Object.entries(killedByMap)
      .map(([player, count]) => ({ player, kills: count }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10); // Top 10

    const deathTypes = Object.entries(deathTypesMap)
      .map(([deathTypeLabel, data]) => {
        const chartData: any = { 
          deathType: deathTypeLabel, 
          count: data.count 
        };
        
        // Use the label as the key for the stacked bar instead of individual death type codes
        // This merges death types that share the same label (e.g., BY_WOLF and SURVIVALIST_NOT_SAVED)
        chartData[deathTypeLabel] = data.count;
        
        return chartData;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // Use labels as available types for the chart (one bar segment per label)
    const availableDeathTypes = Object.keys(deathTypesMap);

    return { playersKilled, killedBy, deathTypes, availableDeathTypes };
  }, [filteredGameData, selectedPlayerName]);

  // Define colors for different death types (mapped by label instead of code)
  const deathTypeColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    
    killStatistics.availableDeathTypes.forEach(deathTypeLabel => {
      // Map labels to colors based on what they represent
      if (deathTypeLabel === 'Tué par Loup') {
        colorMap[deathTypeLabel] = lycansColors['Loup'];
      } else if (deathTypeLabel === 'Mort aux votes') {
        colorMap[deathTypeLabel] = 'var(--chart-color-1)';
      } else if (deathTypeLabel.includes('Chasseur')) {
        // Specific colors for refined hunter kills
        if (deathTypeLabel === 'Tué par Chasseur (loup non-transformé)') {
          colorMap[deathTypeLabel] = '#FF6B35'; // Orange-red for wolf kills
        } else {
          colorMap[deathTypeLabel] = lycansColors['Chasseur'];
        }
      } else if (deathTypeLabel === 'Tué par Zombie') {
        colorMap[deathTypeLabel] = lycansColors['Vaudou'];
      } else if (deathTypeLabel === 'Tué par potion assassin') {
        colorMap[deathTypeLabel] = lycansColors['Alchimiste'];
      } else if (deathTypeLabel === 'Tué par Vengeur') {
        colorMap[deathTypeLabel] = 'var(--chart-color-2)';
      } else if (deathTypeLabel === 'Amoureux mort') {
        colorMap[deathTypeLabel] = lycansColors['Amoureux'];
      } else if (deathTypeLabel === 'Tué par La Bête') {
        colorMap[deathTypeLabel] = 'var(--chart-color-3)';
      } else if (deathTypeLabel === 'Tué par Shérif') {
        colorMap[deathTypeLabel] = 'var(--chart-color-4)';
      }
    });
    
    // Assign colors to any death types that don't have specific colors yet
    const additionalColors = [
      'var(--accent-primary)',
      'var(--accent-secondary)',
      'var(--accent-tertiary)',
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c49f', '#ffbb28'
    ];
    
    let colorIndex = 0;
    killStatistics.availableDeathTypes.forEach(deathTypeLabel => {
      if (!colorMap[deathTypeLabel]) {
        colorMap[deathTypeLabel] = additionalColors[colorIndex % additionalColors.length];
        colorIndex++;
      }
    });
    
    return colorMap;
  }, [killStatistics.availableDeathTypes, lycansColors]);

  return (
    <div className="lycans-graphiques-groupe">
      {/* Players Most Killed */}
      {killStatistics.playersKilled.length > 0 ? (
        <div className="lycans-graphique-section">
          <h3>Les Victimes</h3>
          <FullscreenChart title="Les Victimes">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={killStatistics.playersKilled}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="player"
                    angle={-45}
                    textAnchor="end"
                    height={90}
                    interval={0}
                    fontSize={14}
                  />
                  <YAxis 
                    label={{ value: 'Nombre de kills', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div><strong>{dataPoint.player}</strong></div>
                            <div>Tué {dataPoint.kills} fois par {selectedPlayerName}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="kills">
                    {killStatistics.playersKilled.map((entry, index) => (
                      <Cell 
                        key={`cell-killed-${index}`} 
                        fill={playersColor[entry.player] || "var(--chart-color-3)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      ) : (
        <div className="lycans-empty-section">
          <h3>Aucun kill enregistré</h3>
          <p>{selectedPlayerName} n'a tué aucun joueur dans les parties enregistrées.</p>
        </div>
      )}

      {/* Players Killed By Most */}
      {killStatistics.killedBy.length > 0 ? (
        <div className="lycans-graphique-section">
          <h3>Les Tueurs</h3>
          <FullscreenChart title="Les Tueurs">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={killStatistics.killedBy}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="player"
                    angle={-45}
                    textAnchor="end"
                    height={90}
                    interval={0}
                    fontSize={14}
                  />
                  <YAxis 
                    label={{ value: 'Nombre de kills', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div><strong>{dataPoint.player}</strong></div>
                            <div>A tué {selectedPlayerName} {dataPoint.kills} fois</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="kills">
                    {killStatistics.killedBy.map((entry, index) => (
                      <Cell 
                        key={`cell-killer-${index}`} 
                        fill={playersColor[entry.player] || "var(--chart-color-4)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      ) : (
        <div className="lycans-empty-section">
          <h3>Aucune mort par kill</h3>
          <p>{selectedPlayerName} n'a jamais été tué par un autre joueur dans les parties enregistrées.</p>
        </div>
      )}

      {/* Most Common Death Types */}
      {killStatistics.deathTypes.length > 0 ? (
        <div className="lycans-graphique-section">
          <h3>Types de Mort les Plus Fréquents</h3>
          <FullscreenChart title="Types de Mort les Plus Fréquents">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={killStatistics.deathTypes}
                  margin={{ top: 20, right: 30, left: 20, bottom: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="deathType"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis 
                    label={{ value: 'Nombre de morts', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div><strong>{dataPoint.deathType}</strong></div>
                            <div>{selectedPlayerName} est mort {dataPoint.count} fois ainsi</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {killStatistics.availableDeathTypes.map((deathType) => (
                    <Bar
                      key={deathType}
                      dataKey={deathType}
                      name={deathType}
                      stackId="deaths"
                      fill={deathTypeColors[deathType] || 'var(--chart-color-5)'}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      ) : (
        <div className="lycans-empty-section">
          <h3>Aucune donnée de mort</h3>
          <p>Aucune information de mort disponible pour {selectedPlayerName}.</p>
        </div>
      )}
    </div>
  );
}
