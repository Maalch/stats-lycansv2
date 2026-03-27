import { useState, useMemo, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useColorStatsFromRaw, usePlayerColorMatrixFromRaw } from '../../hooks/useColorStatsFromRaw';
import type { PlayerColorCell } from '../../hooks/useColorStatsFromRaw';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedFrenchColorMapping } from '../../types/api';

export function ColorStatisticsChart() {
  const { data: colorStats, isLoading, error } = useColorStatsFromRaw();
  const { data: matrixData, isLoading: matrixLoading } = usePlayerColorMatrixFromRaw();
  const { gameData } = useCombinedFilteredRawData();
  
  // Get theme-adjusted color mapping
  const frenchColorMapping = useThemeAdjustedFrenchColorMapping();
  
  // State for hover interaction
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  
  // State for bubble matrix hover
  const [hoveredCell, setHoveredCell] = useState<PlayerColorCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const matrixContainerRef = useRef<HTMLDivElement>(null);

  // State for column sort in bubble matrix (null = sort by total games)
  const [sortByColor, setSortByColor] = useState<string | null>(null);

  // State for max players shown in bubble matrix
  const [maxMatrixPlayers, setMaxMatrixPlayers] = useState<number>(30);
  
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

  // Build a lookup map for bubble matrix cells
  const cellLookup = useMemo(() => {
    if (!matrixData) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const cell of matrixData.cells) {
      map.set(`${cell.playerName}__${cell.color}`, cell.count);
    }
    return map;
  }, [matrixData]);

  // Sorted player list for bubble matrix
  const sortedMatrixPlayers = useMemo(() => {
    if (!matrixData) return [];
    const sorted = !sortByColor
      ? matrixData.players
      : [...matrixData.players].sort((a, b) => {
          const countA = cellLookup.get(`${a.name}__${sortByColor}`) || 0;
          const countB = cellLookup.get(`${b.name}__${sortByColor}`) || 0;
          return countB - countA;
        });
    return sorted.slice(0, maxMatrixPlayers);
  }, [matrixData, sortByColor, cellLookup, maxMatrixPlayers]);

  const handleBubbleMouseEnter = useCallback((cell: PlayerColorCell, event: React.MouseEvent<SVGCircleElement>) => {
    setHoveredCell(cell);
    if (matrixContainerRef.current) {
      const rect = matrixContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  }, []);

  const handleBubbleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltipPos(null);
  }, []);

  if (isLoading || matrixLoading) {
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

        {matrixData && matrixData.players.length > 0 && (() => {
          const LABEL_WIDTH = 120;
          const HEADER_HEIGHT = 80;
          const ROW_HEIGHT = 32;
          const COL_WIDTH = 90;
          const MAX_RADIUS = 13;
          const SWATCH_RADIUS = 8;

          const numColors = matrixData.colors.length;
          const numPlayers = sortedMatrixPlayers.length;
          const svgWidth = LABEL_WIDTH + numColors * COL_WIDTH + 20;
          const svgHeight = HEADER_HEIGHT + numPlayers * ROW_HEIGHT + 10;

          return (
            <div className="lycans-graphique-section">
              <h3>Répartition des Couleurs par Joueur</h3>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Max. Joueurs
                  <select
                    value={maxMatrixPlayers}
                    onChange={(e) => setMaxMatrixPlayers(Number(e.target.value))}
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    {[15, 30, 50, 75, 100].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              <FullscreenChart title="Répartition des Couleurs par Joueur">
                <div
                  ref={matrixContainerRef}
                  style={{ position: 'relative', width: '100%', overflowX: 'auto' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', minWidth: svgWidth }}>
                  <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
                    {/* Color column headers */}
                    {matrixData.colors.map((color, ci) => {
                      const cx = LABEL_WIDTH + ci * COL_WIDTH + COL_WIDTH / 2;
                      const isHighlighted = hoveredCell?.color === color;
                      const isSorted = sortByColor === color;
                      return (
                        <g
                          key={color}
                          onClick={() => setSortByColor(isSorted ? null : color)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Clickable hit area */}
                          <rect
                            x={LABEL_WIDTH + ci * COL_WIDTH}
                            y={0}
                            width={COL_WIDTH}
                            height={HEADER_HEIGHT}
                            fill="transparent"
                          />
                          <circle
                            cx={cx}
                            cy={20}
                            r={SWATCH_RADIUS}
                            fill={frenchColorMapping[color] || '#888888'}
                            stroke={isSorted ? 'var(--text-primary)' : 'var(--border-primary)'}
                            strokeWidth={isSorted ? 2 : 1}
                          />
                          <text
                            x={cx}
                            y={38}
                            textAnchor="middle"
                            fontSize={isHighlighted || isSorted ? 12 : 11}
                            fontWeight={isHighlighted || isSorted ? 'bold' : 'normal'}
                            fill={isSorted ? 'var(--accent-primary)' : isHighlighted ? 'var(--text-primary)' : 'var(--text-secondary)'}
                          >
                            {color}
                          </text>
                          {/* Sort indicator arrow */}
                          {isSorted && (
                            <text
                              x={cx}
                              y={56}
                              textAnchor="middle"
                              fontSize={10}
                              fill="var(--accent-primary)"
                            >
                              ▼
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Player rows */}
                    {sortedMatrixPlayers.map((player, ri) => {
                      const rowY = HEADER_HEIGHT + ri * ROW_HEIGHT + ROW_HEIGHT / 2;
                      const isHighlighted = hoveredCell?.playerName === player.name;
                      return (
                        <g key={player.id}>
                          {/* Alternating row backgrounds */}
                          <rect
                            x={0}
                            y={HEADER_HEIGHT + ri * ROW_HEIGHT}
                            width={svgWidth}
                            height={ROW_HEIGHT}
                            fill={ri % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)'}
                            opacity={0.3}
                          />
                          {/* Player name */}
                          <text
                            x={LABEL_WIDTH - 8}
                            y={rowY + 4}
                            textAnchor="end"
                            fontSize={isHighlighted ? 13 : 12}
                            fontWeight={isHighlighted ? 'bold' : 'normal'}
                            fill={isHighlighted ? 'var(--text-primary)' : 'var(--text-secondary)'}
                          >
                            {player.name}
                          </text>
                          {/* Bubbles for each color */}
                          {matrixData.colors.map((color, ci) => {
                            const count = cellLookup.get(`${player.name}__${color}`) || 0;
                            if (count === 0) return null;
                            const cx = LABEL_WIDTH + ci * COL_WIDTH + COL_WIDTH / 2;
                            const radius = Math.max(3, Math.sqrt(count / matrixData.maxCount) * MAX_RADIUS);
                            const isCellHovered = hoveredCell?.playerName === player.name && hoveredCell?.color === color;
                            return (
                              <circle
                                key={color}
                                cx={cx}
                                cy={rowY}
                                r={radius}
                                fill={frenchColorMapping[color] || '#888888'}
                                stroke={isCellHovered ? 'var(--text-primary)' : 'var(--border-primary)'}
                                strokeWidth={isCellHovered ? 2 : 0.5}
                                opacity={hoveredCell && !isCellHovered ? 0.4 : 0.9}
                                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                                onMouseEnter={(e) => handleBubbleMouseEnter({ playerName: player.name, color, count }, e)}
                                onMouseLeave={handleBubbleMouseLeave}
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                  </svg>
                  </div>

                  {/* Tooltip */}
                  {hoveredCell && tooltipPos && (
                    <div
                      style={{
                        position: 'absolute',
                        left: tooltipPos.x + 16,
                        top: tooltipPos.y - 10,
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: 8,
                        borderRadius: 6,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div><strong>{hoveredCell.playerName}</strong></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: frenchColorMapping[hoveredCell.color] || '#888'
                          }}
                        />
                        {hoveredCell.color}
                      </div>
                      <div>Parties: <strong>{hoveredCell.count}</strong></div>
                    </div>
                  )}
                </div>
              </FullscreenChart>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
