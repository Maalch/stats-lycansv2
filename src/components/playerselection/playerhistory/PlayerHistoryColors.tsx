import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useThemeAdjustedFrenchColorMapping } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { getPlayerId } from '../../../utils/playerIdentification';

interface PlayerHistoryColorsProps {
  selectedPlayerName: string;
}

interface PlayerColorStat {
  color: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  displayColor: string;
}

export function PlayerHistoryColors({ selectedPlayerName }: PlayerHistoryColorsProps) {
  const { gameData } = useCombinedFilteredRawData();
  const frenchColorMapping = useThemeAdjustedFrenchColorMapping();

  const colorStats = useMemo((): PlayerColorStat[] => {
    if (!gameData || !selectedPlayerName) return [];

    const colorMap = new Map<string, { games: number; wins: number }>();

    gameData.forEach(game => {
      game.PlayerStats.forEach(player => {
        if (player.Username !== selectedPlayerName && getPlayerId(player) !== selectedPlayerName) return;
        const color = player.Color;
        if (!color) return;

        if (!colorMap.has(color)) {
          colorMap.set(color, { games: 0, wins: 0 });
        }
        const stats = colorMap.get(color)!;
        stats.games++;
        if (player.Victorious) {
          stats.wins++;
        }
      });
    });

    return Array.from(colorMap.entries())
      .map(([color, stats]) => ({
        color,
        gamesPlayed: stats.games,
        wins: stats.wins,
        winRate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
        displayColor: frenchColorMapping[color] || '#888888',
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  }, [gameData, selectedPlayerName, frenchColorMapping]);

  if (!gameData) {
    return <div className="statistiques-chargement">Chargement...</div>;
  }

  if (colorStats.length === 0) {
    return <div className="lycans-empty-section">Aucune donnée de couleur disponible pour ce joueur.</div>;
  }

  const totalGames = colorStats.reduce((sum, s) => sum + s.gamesPlayed, 0);

  return (
    <div className="lycans-graphiques-groupe">
      <div className="lycans-graphique-section">
        <h3>Nombre de Parties par Couleur</h3>
        <FullscreenChart title="Nombre de Parties par Couleur">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={colorStats}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="color"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    dy={16}
                    textAnchor="end"
                    fill="var(--text-secondary)"
                    fontSize={12}
                    transform={`rotate(-45 ${x} ${y})`}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <YAxis
                label={{ value: 'Parties', angle: 270, position: 'left', style: { fill: 'var(--text-secondary)', textAnchor: 'middle' } }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PlayerColorStat;
                    return (
                      <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                        <div><strong>{data.color}</strong></div>
                        <div>Parties: <strong>{data.gamesPlayed}</strong> ({((data.gamesPlayed / totalGames) * 100).toFixed(1)}%)</div>
                        <div>Victoires: {data.wins}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="gamesPlayed"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as PlayerColorStat;
                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={entry.displayColor}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>

      <div className="lycans-graphique-section">
        <h3>Taux de Victoire par Couleur</h3>
        <FullscreenChart title="Taux de Victoire par Couleur">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={[...colorStats].sort((a, b) => b.winRate - a.winRate)}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="color"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    dy={16}
                    textAnchor="end"
                    fill="var(--text-secondary)"
                    fontSize={12}
                    transform={`rotate(-45 ${x} ${y})`}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <YAxis
                label={{ value: 'Taux de Victoire (%)', angle: 270, position: 'left', style: { fill: 'var(--text-secondary)', textAnchor: 'middle' } }}
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as PlayerColorStat;
                    return (
                      <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                        <div><strong>{data.color}</strong></div>
                        <div>Taux de Victoire: <strong>{data.winRate.toFixed(1)}%</strong></div>
                        <div>Victoires: {data.wins} / {data.gamesPlayed} parties</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="winRate"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as PlayerColorStat;
                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={entry.displayColor}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>
    </div>
  );
}
