import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, useThemeAdjustedLycansColorScheme } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { getDeathTypeLabel, type DeathType } from '../../../types/deathTypes';
import { CHART_LIMITS } from '../../../config/chartConstants';

type KillViewMode = 'total' | 'differential' | 'perGame';

interface PlayerHistoryKillsProps {
  selectedPlayerName: string;
}

export function PlayerHistoryKills({ selectedPlayerName }: PlayerHistoryKillsProps) {
  const { gameData: filteredGameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const lycansColors = useThemeAdjustedLycansColorScheme();
  const [killViewMode, setKillViewMode] = useState<KillViewMode>('total');
  const [deathViewMode, setDeathViewMode] = useState<KillViewMode>('total');

  // Calculate kill statistics for the selected player from raw game data
  const killStatistics = useMemo(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return { playersKilledMap: {}, killedByMap: {}, gamesWithPlayerMap: {}, deathTypes: [], availableDeathTypes: [] };
    }

    // Maps to track kills and games played together
    const playersKilledMap: Record<string, number> = {};
    const killedByMap: Record<string, number> = {};
    const gamesWithPlayerMap: Record<string, number> = {};
    const deathTypesMap: Record<string, { count: number; byDeathType: Partial<Record<DeathType, number>> }> = {};
    const deathTypesSet = new Set<DeathType>();

    // Process each game
    filteredGameData.forEach(game => {
      const selectedPlayerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!selectedPlayerStat) return; // Player not in this game

      // Track games played together with each other player
      game.PlayerStats.forEach(p => {
        if (p.Username.toLowerCase() !== selectedPlayerName.toLowerCase()) {
          gamesWithPlayerMap[p.Username] = (gamesWithPlayerMap[p.Username] || 0) + 1;
        }
      });

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
      .slice(0, CHART_LIMITS.TOP_10); // Top 10

    // Use labels as available types for the chart (one bar segment per label)
    const availableDeathTypes = Object.keys(deathTypesMap);

    return { playersKilledMap, killedByMap, gamesWithPlayerMap, deathTypes, availableDeathTypes };
  }, [filteredGameData, selectedPlayerName]);

  // Derive chart data for "Les Victimes" based on view mode
  const victimesChartData = useMemo(() => {
    const { playersKilledMap, killedByMap, gamesWithPlayerMap } = killStatistics;

    if (killViewMode === 'total') {
      return Object.entries(playersKilledMap)
        .map(([player, count]) => ({ player, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, CHART_LIMITS.TOP_10);
    } else if (killViewMode === 'differential') {
      // All players the selected player has interacted with (killed or been killed by)
      const allPlayers = new Set([...Object.keys(playersKilledMap), ...Object.keys(killedByMap)]);
      return Array.from(allPlayers)
        .map(player => ({
          player,
          value: (playersKilledMap[player] || 0) - (killedByMap[player] || 0)
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, CHART_LIMITS.TOP_10);
    } else {
      // perGame
      return Object.entries(playersKilledMap)
        .map(([player, kills]) => ({
          player,
          value: Math.round((kills / (gamesWithPlayerMap[player] || 1)) * 100) / 100
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, CHART_LIMITS.TOP_10);
    }
  }, [killStatistics, killViewMode]);

  // Derive chart data for "Les Tueurs" based on view mode
  const tueursChartData = useMemo(() => {
    const { playersKilledMap, killedByMap, gamesWithPlayerMap } = killStatistics;

    if (deathViewMode === 'total') {
      return Object.entries(killedByMap)
        .map(([player, count]) => ({ player, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, CHART_LIMITS.TOP_10);
    } else if (deathViewMode === 'differential') {
      // All players the selected player has interacted with (killed or been killed by)
      const allPlayers = new Set([...Object.keys(playersKilledMap), ...Object.keys(killedByMap)]);
      return Array.from(allPlayers)
        .map(player => ({
          player,
          value: (killedByMap[player] || 0) - (playersKilledMap[player] || 0)
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, CHART_LIMITS.TOP_10);
    } else {
      // perGame
      return Object.entries(killedByMap)
        .map(([player, deaths]) => ({
          player,
          value: Math.round((deaths / (gamesWithPlayerMap[player] || 1)) * 100) / 100
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, CHART_LIMITS.TOP_10);
    }
  }, [killStatistics, deathViewMode]);

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
        colorMap[deathTypeLabel] = lycansColors['Chasseur'];
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

  const viewModeToggle = (currentMode: KillViewMode, setMode: (mode: KillViewMode) => void, labels: { total: string; differential: string; perGame: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
      <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
        Afficher :
      </label>
      <div style={{ 
        display: 'flex', 
        backgroundColor: 'var(--bg-tertiary)', 
        borderRadius: '4px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {(['total', 'differential', 'perGame'] as KillViewMode[]).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            style={{
              background: currentMode === mode ? 'var(--accent-primary)' : 'transparent',
              color: currentMode === mode ? 'white' : 'var(--text-primary)',
              border: 'none',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: currentMode === mode ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {labels[mode]}
          </button>
        ))}
      </div>
    </div>
  );

  const getKillYAxisLabel = () => {
    if (killViewMode === 'total') return 'Nombre de kills';
    if (killViewMode === 'differential') return 'Différentiel (kills - morts)';
    return 'Kills par partie';
  };

  const getDeathYAxisLabel = () => {
    if (deathViewMode === 'total') return 'Nombre de morts';
    if (deathViewMode === 'differential') return 'Différentiel (morts - kills)';
    return 'Morts par partie';
  };

  const getKillTooltipText = (dataPoint: { player: string; value: number }) => {
    if (killViewMode === 'total') return `Tué ${dataPoint.value} fois par ${selectedPlayerName}`;
    if (killViewMode === 'differential') return `Différentiel : ${dataPoint.value > 0 ? '+' : ''}${dataPoint.value} (kills - morts)`;
    return `${dataPoint.value} kills par partie ensemble`;
  };

  const getDeathTooltipText = (dataPoint: { player: string; value: number }) => {
    if (deathViewMode === 'total') return `A tué ${selectedPlayerName} ${dataPoint.value} fois`;
    if (deathViewMode === 'differential') return `Différentiel : ${dataPoint.value > 0 ? '+' : ''}${dataPoint.value} (morts - kills)`;
    return `${dataPoint.value} morts par partie ensemble`;
  };

  return (
    <div className="lycans-graphiques-groupe">
      {/* Players Most Killed */}
      {victimesChartData.length > 0 ? (
        <div className="lycans-graphique-section">
          <h3>Les Victimes</h3>
          {viewModeToggle(killViewMode, setKillViewMode, { total: 'Total', differential: 'Différentiel', perGame: 'Par partie' })}
          <FullscreenChart title="Les Victimes">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={victimesChartData}
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
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill="var(--text-secondary)"
                        fontSize={14}
                        fontStyle="italic"
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis 
                    label={{ value: getKillYAxisLabel(), angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                    allowDecimals={killViewMode === 'perGame'}
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
                            <div>{getKillTooltipText(dataPoint)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as { player: string };
                      const fillColor = playersColor[entry.player] || 'var(--chart-color-3)';

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fillColor}
                        />
                      );
                    }}
                  />
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
      {tueursChartData.length > 0 ? (
        <div className="lycans-graphique-section">
          <h3>Les Tueurs</h3>
          {viewModeToggle(deathViewMode, setDeathViewMode, { total: 'Total', differential: 'Différentiel', perGame: 'Par partie' })}
          <FullscreenChart title="Les Tueurs">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tueursChartData}
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
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill="var(--text-secondary)"
                        fontSize={14}
                        fontStyle="italic"
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis 
                    label={{ value: getDeathYAxisLabel(), angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                    allowDecimals={deathViewMode === 'perGame'}
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
                            <div>{getDeathTooltipText(dataPoint)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as { player: string };
                      const fillColor = playersColor[entry.player] || 'var(--chart-color-4)';

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fillColor}
                        />
                      );
                    }}
                  />
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
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill="var(--text-secondary)"
                        fontSize={12}
                        fontStyle="italic"
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
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
