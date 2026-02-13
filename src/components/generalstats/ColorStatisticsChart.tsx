import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useColorStatsFromRaw } from '../../hooks/useColorStatsFromRaw';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedFrenchColorMapping } from '../../types/api';

export function ColorStatisticsChart() {
  const { data: colorStats, isLoading, error } = useColorStatsFromRaw();
  const { gameData } = useCombinedFilteredRawData();
  
  // Get theme-adjusted color mapping
  const frenchColorMapping = useThemeAdjustedFrenchColorMapping();
  
  // State for hover interaction
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  
  // Calculate total games count
  const totalGamesCount = useMemo(() => {
    return gameData?.length || 0;
  }, [gameData]);

  // Prepare chart data
  const { winRateChartData, usageChartData } = useMemo(() => {
    if (!colorStats || colorStats.length === 0) {
      return { winRateChartData: [], usageChartData: [] };
    }

    // Data for win rate chart (sorted by win rate descending)
    const winRateData = [...colorStats]
      .sort((a, b) => b.winRate - a.winRate)
      .map(stat => ({
        color: stat.color,
        winRate: parseFloat(stat.winRate.toFixed(2)),
        totalGames: stat.totalGames,
        totalWins: stat.totalWins,
        totalPlayers: stat.totalPlayers,
        displayColor: frenchColorMapping[stat.color] || '#888888'
      }));

    // Data for usage chart (sorted by average players per game descending)
    const usageData = [...colorStats]
      .sort((a, b) => b.avgPlayersPerGame - a.avgPlayersPerGame)
      .map(stat => ({
        color: stat.color,
        avgPlayersPerGame: parseFloat(stat.avgPlayersPerGame.toFixed(2)),
        totalGames: stat.totalGames,
        totalPlayers: stat.totalPlayers,
        displayColor: frenchColorMapping[stat.color] || '#888888'
      }));

    return { winRateChartData: winRateData, usageChartData: usageData };
  }, [colorStats, frenchColorMapping]);

  if (isLoading) {
    return <div className="statistiques-chargement">Chargement des statistiques de couleurs...</div>;
  }

  if (error) {
    return <div className="statistiques-erreur">Erreur lors du chargement : {error}</div>;
  }

  if (!colorStats || colorStats.length === 0) {
    return <div className="statistiques-vide">Aucune donnée de couleur disponible</div>;
  }

  return (
    <div className="color-statistics-container">
      <h2>Statistiques des Couleurs</h2>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Taux de Victoire par Couleur</h3>
          <FullscreenChart title="Taux de Victoire par Couleur">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={winRateChartData}
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
                  fill={hoveredColor === payload.value ? 'var(--text-primary)' : 'var(--text-secondary)'}
                  fontSize={hoveredColor === payload.value ? 14 : 12}
                  fontWeight={hoveredColor === payload.value ? 'bold' : 'normal'}
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
                  const data = payload[0].payload;
                  return (
                    <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                      <div><strong>{data.color}</strong></div>
                      <div>Taux de Victoire: <strong>{data.winRate.toFixed(2)}%</strong></div>
                      <div>Victoires: {data.totalWins} / {data.totalPlayers}</div>
                      <div>Parties: {data.totalGames}</div>
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
                const entry = payload as { color: string; displayColor: string };

                return (
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={entry.displayColor}
                    stroke={hoveredColor === entry.color ? 'var(--text-primary)' : 'none'}
                    strokeWidth={hoveredColor === entry.color ? 2 : 0}
                    onMouseEnter={() => setHoveredColor(entry.color)}
                    onMouseLeave={() => setHoveredColor(null)}
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
          <h3>Nombre Moyen de Joueurs par Couleur</h3>
      <FullscreenChart title="Nombre Moyen de Joueurs par Couleur">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={usageChartData}
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
                  fill={hoveredColor === payload.value ? 'var(--text-primary)' : 'var(--text-secondary)'}
                  fontSize={hoveredColor === payload.value ? 14 : 12}
                  fontWeight={hoveredColor === payload.value ? 'bold' : 'normal'}
                  transform={`rotate(-45 ${x} ${y})`}
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis 
              label={{ value: 'Joueurs par Partie', angle: 270, position: 'left', style: { fill: 'var(--text-secondary)', textAnchor: 'middle' } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                      <div><strong>{data.color}</strong></div>
                      <div>Moyenne: <strong>{data.avgPlayersPerGame.toFixed(2)} joueurs/partie</strong></div>
                      <div>Calcul: {data.totalPlayers} joueurs ÷ {totalGamesCount} parties totales</div>
                      <div>Parties avec cette couleur: {data.totalGames}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="avgPlayersPerGame"
              shape={(props) => {
                const { x, y, width, height, payload } = props;
                const entry = payload as { color: string; displayColor: string };

                return (
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={entry.displayColor}
                    stroke={hoveredColor === entry.color ? 'var(--text-primary)' : 'none'}
                    strokeWidth={hoveredColor === entry.color ? 2 : 0}
                    onMouseEnter={() => setHoveredColor(entry.color)}
                    onMouseLeave={() => setHoveredColor(null)}
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
    </div>
  );
}
