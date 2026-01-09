import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';
import { InfoBubble } from '../../common/InfoBubble';

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
  campAvgPlayPercentage?: number;
}

interface PlayerCampPerformanceBarChartProps {
  viewMode: 'performance' | 'playPercentage';
  selectedCamp: string;
  minGames: number;
  chartData: ChartPlayerCampPerformance[];
  highlightedPlayer: string | null;
  lycansColorScheme: Record<string, string>;
  playersColor: Record<string, string>;
  onBarClick: (data: any) => void;
}

export function PlayerCampPerformanceBarChart({
  viewMode,
  selectedCamp,
  minGames,
  chartData,
  highlightedPlayer,
  lycansColorScheme,
  playersColor,
  onBarClick
}: PlayerCampPerformanceBarChartProps) {
  
  return (
    <div className="lycans-graphique-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>
          {viewMode === 'performance' 
            ? (selectedCamp === 'Tous les camps' 
                ? 'Meilleures performances - Tous les camps'
                : `Meilleurs joueurs en ${selectedCamp}`)
            : (selectedCamp === 'Tous les camps'
                ? 'Plus grand % de parties - Tous les camps'
                : `Plus grand % de parties en ${selectedCamp}`)
          }
        </h3>
        <InfoBubble 
          infoId={`bar-chart-${viewMode}-${selectedCamp}`}
          title="À propos de ce graphique"
        >
          {viewMode === 'performance' ? (
            <>
              <p>
                <strong>Filtres actuels :</strong>
              </p>
              <ul>
                <li><strong>Affichage :</strong> Meilleures Performances</li>
                <li><strong>Camp/Rôle :</strong> {selectedCamp}</li>
                <li><strong>Minimum de parties :</strong> {minGames}</li>
              </ul>
              {(selectedCamp === 'Tous les camps' || selectedCamp === 'Camp Villageois' || selectedCamp === 'Camp Loup' || selectedCamp === 'Rôles spéciaux') && (
                <p style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                  <strong>ℹ️ {selectedCamp} :</strong>{' '}
                  {selectedCamp === 'Tous les camps' && 'Affiche le meilleur rôle de chaque joueur (toutes catégories confondues).'}
                  {selectedCamp === 'Camp Villageois' && 'Inclut Villageois, Chasseur, Alchimiste, Protecteur et Disciple.'}
                  {selectedCamp === 'Camp Loup' && 'Inclut Loup, Traître et Louveteau.'}
                  {selectedCamp === 'Rôles spéciaux' && 'Inclut les rôles solo comme Amoureux, Idiot du Village, Agent, etc.'}
                </p>
              )}
              <p>
                <strong>Comment ça marche :</strong>
              </p>
              <ul>
                <li><strong>Taux personnel</strong> : Le pourcentage de victoires du joueur dans ce camp</li>
                <li><strong>Moyenne du camp</strong> : Le taux de victoire moyen de tous les joueurs dans ce camp</li>
                <li><strong>Performance</strong> : La différence entre le taux personnel et la moyenne du camp</li>
              </ul>
              <p>
                <strong>Interprétation :</strong>
              </p>
              <ul>
                <li><strong>Performance positive (+)</strong> : Le joueur performe mieux que la moyenne</li>
                <li><strong>Performance négative (-)</strong> : Le joueur performe moins bien que la moyenne</li>
              </ul>
              <p>
                <em>Exemple :</em> Si un joueur a 60% de victoires en Camp Villageois et que la moyenne est 45%, 
                sa performance est de <code>+15%</code>.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Filtres actuels :</strong>
              </p>
              <ul>
                <li><strong>Affichage :</strong> Pourcentage de Parties Jouées</li>
                <li><strong>Camp/Rôle :</strong> {selectedCamp}</li>
                <li><strong>Minimum de parties :</strong> {minGames}</li>
              </ul>
              {(selectedCamp === 'Tous les camps' || selectedCamp === 'Camp Villageois' || selectedCamp === 'Camp Loup' || selectedCamp === 'Rôles spéciaux') && (
                <p style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                  <strong>ℹ️ {selectedCamp} :</strong>{' '}
                  {selectedCamp === 'Tous les camps' && 'Affiche le rôle le plus joué par chaque joueur (toutes catégories confondues).'}
                  {selectedCamp === 'Camp Villageois' && 'Inclut Villageois, Chasseur, Alchimiste, Protecteur et Disciple.'}
                  {selectedCamp === 'Camp Loup' && 'Inclut Loup, Traître et Louveteau.'}
                  {selectedCamp === 'Rôles spéciaux' && 'Inclut les rôles solo comme Amoureux, Idiot du Village, Agent, etc.'}
                </p>
              )}
              <p>
                <strong>Comment ça marche :</strong>
              </p>
              <ul>
                <li><strong>Parties dans ce rôle</strong> : Nombre de parties jouées avec ce rôle/camp</li>
                <li><strong>Total parties</strong> : Nombre total de parties jouées par le joueur</li>
                <li><strong>Pourcentage</strong> : (Parties dans ce rôle / Total parties) × 100</li>
              </ul>
              <p>
                <strong>Interprétation :</strong>
              </p>
              <ul>
                <li>Un <strong>pourcentage élevé</strong> indique que le joueur a souvent eu ce rôle</li>
                <li>Permet d'identifier les <strong>rôles récurrents</strong> pour chaque joueur</li>
                <li>Utile pour comprendre l'<strong>expérience de jeu</strong> de chacun</li>
              </ul>
            </>
          )}
        </InfoBubble>
      </div>
      <FullscreenChart title={
        viewMode === 'performance'
          ? (selectedCamp === 'Tous les camps' 
              ? 'Meilleures Performances - Tous les camps'
              : `Meilleurs Joueurs - ${selectedCamp}`)
          : (selectedCamp === 'Tous les camps'
              ? 'Pourcentage de Parties Jouées - Tous les camps'
              : `Pourcentage de Parties Jouées - ${selectedCamp}`)
      }>
        <div style={{ height: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={selectedCamp === 'Tous les camps' ? 'uniqueKey' : 'player'}
                angle={-45}
                textAnchor="end"
                height={110}
                interval={0}
                fontSize={15}
                tick={({ x, y, payload, index }) => {
                  const dataPoint = chartData[index];
                  const displayText = dataPoint?.player || payload.value;
                  const isHighlighted = highlightedPlayer === (dataPoint?.player || payload.value);
                  
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={isHighlighted ? 14 : 13}
                      fontWeight={isHighlighted ? 'bold' : 'italic'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {displayText}
                    </text>
                  );
                }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                label={{ 
                  value: viewMode === 'performance' ? 'Performance vs moyenne (%)' : 'Pourcentage de parties jouées (%)', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }}                 
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
                            <div>Parties dans ce rôle: {dataPoint.games}</div>
                            <div>Total parties: {dataPoint.totalGames}</div>
                            <div>Pourcentage: {dataPoint.playPercentage?.toFixed(1)}%</div>
                            <div>Moyenne tous joueurs: {dataPoint.campAvgPlayPercentage?.toFixed(1)}%</div>
                            <div>Taux de victoire: {dataPoint.winRate}%</div>
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
              <Bar 
                dataKey={viewMode === 'performance' ? 'performanceNum' : 'playPercentage'}
                style={{ cursor: 'pointer' }}
                onClick={onBarClick}
              >
                {chartData.map((entry, index) => {
                  const isHighlightedFromSettings = highlightedPlayer === entry.player;
                  const isHighlightedAddition = entry.isHighlightedAddition;
                  
                  let fillColor: string;
                  if (selectedCamp === 'Tous les camps') {
                    fillColor = lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`;
                  } else {
                    fillColor = playersColor[entry.player] || 'var(--accent-primary)';
                  }
                  
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : 'transparent'}
                      strokeWidth={isHighlightedFromSettings ? 3 : 0}
                      strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                      opacity={isHighlightedAddition ? 0.8 : 1}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FullscreenChart>
    </div>
  );
}
