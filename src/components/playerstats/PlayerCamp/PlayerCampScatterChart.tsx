import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';

interface ChartPlayerCampPerformance {
  player: string;
  camp: string;
  games: number;
  wins: number;
  winRate: string;
  performance: string;
  winRateNum: number;
  performanceNum: number;
  campAvgWinRateNum: number;
  isHighlightedAddition?: boolean;
  uniqueKey?: string;
  playerCamp?: string;
  totalGames?: number;
  playPercentage?: number;
}

interface PlayerCampPerformanceScatterChartProps {
  viewMode: 'performance' | 'playPercentage';
  selectedCamp: string;
  chartData: ChartPlayerCampPerformance[];
  highlightedPlayer: string | null;
  lycansColorScheme: Record<string, string>;
  playersColor: Record<string, string>;
  onScatterClick: (data: any) => void;
}

export function PlayerCampPerformanceScatterChart({
  viewMode,
  selectedCamp,
  chartData,
  highlightedPlayer,
  lycansColorScheme,
  playersColor,
  onScatterClick
}: PlayerCampPerformanceScatterChartProps) {
  return (
    <div className="lycans-graphique-section">
      <h3>
        {viewMode === 'performance'
          ? (selectedCamp === 'Tous les camps'
              ? 'Vue Partie/Performance - Tous les camps'
              : `Vue Partie/Performance - ${selectedCamp}`)
          : (selectedCamp === 'Tous les camps'
              ? 'Vue Pourcentage/Taux de victoire - Tous les camps'
              : `Vue Pourcentage/Taux de victoire - ${selectedCamp}`)
        }
      </h3>
      <FullscreenChart title={
        viewMode === 'performance'
          ? (selectedCamp === 'Tous les camps'
              ? 'Vue Partie/Performance - Tous les camps'
              : `Vue Partie/Performance - ${selectedCamp}`)
          : (selectedCamp === 'Tous les camps'
              ? 'Vue Pourcentage/Taux de victoire - Tous les camps'
              : `Vue Pourcentage/Taux de victoire - ${selectedCamp}`)
      }>
        <div style={{ height: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="games"
                name="Parties"
                label={{ value: 'Nombre de parties', position: 'bottom' }}
              />
              <YAxis
                type="number"
                dataKey={viewMode === 'performance' ? 'performanceNum' : (selectedCamp === 'Tous les camps' ? 'playPercentage' : 'winRateNum')}
                name={viewMode === 'performance' ? 'Performance' : (selectedCamp === 'Tous les camps' ? 'Pourcentage' : 'Taux de victoire')}
                domain={viewMode === 'performance' ? ['auto', 'auto'] : [0, 100]}
                label={{ 
                  value: viewMode === 'performance' 
                    ? 'Performance vs moyenne (%)' 
                    : (selectedCamp === 'Tous les camps' ? 'Pourcentage de parties jouées (%)' : 'Taux de victoire (%)'),
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
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
                        <div>
                          <strong>
                            {selectedCamp === 'Tous les camps' 
                              ? `${dataPoint.player} - ${dataPoint.camp}`
                              : dataPoint.player
                            }
                          </strong>
                        </div>
                        {viewMode === 'performance' ? (
                          <>
                            <div>Parties: {dataPoint.games}</div>
                            <div>Victoires: {dataPoint.wins}</div>
                            <div>Taux personnel: {dataPoint.winRate}%</div>
                            {selectedCamp !== 'Tous les camps' && <div>Moyenne camp: {dataPoint.campAvgWinRate}%</div>}
                            <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}</div>
                          </>
                        ) : (
                          <>
                            {selectedCamp === 'Tous les camps' ? (
                              <>
                                <div>Parties dans ce rôle: {dataPoint.games}</div>
                                <div>Total parties: {dataPoint.totalGames}</div>
                                <div>Pourcentage: {dataPoint.playPercentage?.toFixed(1)}%</div>
                                <div>Victoires: {dataPoint.wins}</div>
                                <div>Taux de victoire: {dataPoint.winRate}%</div>
                              </>
                            ) : (
                              <>
                                <div>Parties: {dataPoint.games}</div>
                                <div>Victoires: {dataPoint.wins}</div>
                                <div>Taux de victoire: {dataPoint.winRate}%</div>
                              </>
                            )}
                          </>
                        )}
                        <div style={{ 
                          fontSize: '0.8rem', 
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
              <Scatter 
                data={chartData}
                onClick={onScatterClick}
                shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                  const isHighlighted = highlightedPlayer === props.payload?.player;
                  const isHighlightedAddition = props.payload?.isHighlightedAddition;
                  
                  return (
                    <g style={{ cursor: 'pointer' }}>
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={isHighlighted ? 15 : 12}
                        fill={
                          selectedCamp === 'Tous les camps'
                            ? lycansColorScheme[props.payload?.camp as keyof typeof lycansColorScheme] || 'var(--accent-primary)'
                            : playersColor[props.payload?.player] || 'var(--accent-primary)'
                        }
                        stroke={
                          isHighlighted
                            ? 'var(--accent-primary)'
                            : '#222'
                        }
                        strokeWidth={isHighlighted ? 3 : 1}
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                      />
                      <text
                        x={props.cx}
                        y={props.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#fff"
                        fontSize={isHighlighted ? "12" : "10"}
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {props.payload?.player?.charAt(0).toUpperCase()}
                      </text>
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </FullscreenChart>
    </div>
  );
}
