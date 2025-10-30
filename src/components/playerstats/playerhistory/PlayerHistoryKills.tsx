import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';

interface PlayerHistoryKillsProps {
  selectedPlayerName: string;
}

export function PlayerHistoryKills({ selectedPlayerName }: PlayerHistoryKillsProps) {
  const { gameData: filteredGameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Calculate kill statistics for the selected player from raw game data
  const killStatistics = useMemo(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return { playersKilled: [], killedBy: [] };
    }

    // Maps to track kills
    const playersKilledMap: Record<string, number> = {};
    const killedByMap: Record<string, number> = {};

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

    return { playersKilled, killedBy };
  }, [filteredGameData, selectedPlayerName]);

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
    </div>
  );
}
