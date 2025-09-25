import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDeathStatisticsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { useThemeAdjustedPlayersColor } from '../../types/api';

// Extended type for chart data with highlighting info
type ChartKillerData = {
  name: string;
  value: number;
  victims: number;
  percentage: number;
  isHighlightedAddition?: boolean;
};

export function DeathStatisticsChart() {
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw();
  const { settings } = useSettings();
  const { navigateToGameDetails } = useNavigation();
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const playersColor = useThemeAdjustedPlayersColor();

  // Process killer data with highlighting support
  const { killerChartData, highlightedPlayerAddedToKillers } = useMemo(() => {
    if (!deathStats) return { killerChartData: [], highlightedPlayerAddedToKillers: false };
    
    const sortedKillers = deathStats.killerStats
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 20);
    
    // Check if highlighted player is in top 20
    const highlightedPlayerInTop20 = settings.highlightedPlayer && 
      sortedKillers.some(k => k.killerName === settings.highlightedPlayer);
    
    const baseData: ChartKillerData[] = sortedKillers.map(killer => ({
      name: killer.killerName,
      value: killer.kills,
      victims: killer.victims.length,
      percentage: killer.percentage,
      isHighlightedAddition: false
    }));
    
    let highlightedPlayerAdded = false;
    
    // If highlighted player is not in top 20 but exists in all killers, add them
    if (settings.highlightedPlayer && !highlightedPlayerInTop20) {
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        baseData.push({
          name: highlightedKiller.killerName,
          value: highlightedKiller.kills,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          isHighlightedAddition: true
        });
        highlightedPlayerAdded = true;
      }
    }
    
    return { 
      killerChartData: baseData, 
      highlightedPlayerAddedToKillers: highlightedPlayerAdded 
    };
  }, [deathStats, settings.highlightedPlayer]);

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de mort...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!deathStats) return <div className="donnees-manquantes">Aucune donnée de mort disponible</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--accent-secondary)', margin: '4px 0' }}>
            <strong>Victimes:</strong> {data.value}
          </p>
          <p style={{ color: 'var(--accent-tertiary)', margin: '4px 0' }}>
            <strong>Pourcentage:</strong> {data.percentage.toFixed(1)}%
          </p>
          <p style={{ color: 'var(--chart-color-5)', margin: '4px 0' }}>
            <strong>Victimes uniques:</strong> {data.victims}
          </p>
          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection personnelle
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Joueur sélectionné
            </div>
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
  };

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques de Mort</h2>
      <p className="lycans-stats-info">
        Analyse de {deathStats.totalDeaths} morts avec {deathStats.killerStats.length} tueurs identifiés
      </p>

      {/* Summary statistics using lycans styling */}
      <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
        <div className="lycans-stat-carte">
          <h3>Total des morts</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)' }}>
            {deathStats.totalDeaths}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Tueurs identifiés</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-1)' }}>
            {deathStats.killerStats.length}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Tueur le plus actif</h3>
          <div className="lycans-valeur-principale" style={{ 
            color: 'var(--accent-primary)',
            fontSize: deathStats.mostDeadlyKiller && deathStats.mostDeadlyKiller.length > 10 ? '1.5rem' : '2rem'
          }}>
            {deathStats.mostDeadlyKiller || 'N/A'}
          </div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>Joueurs les Plus Meurtriers</h3>
            {highlightedPlayerAddedToKillers && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
              </p>
            )}
          </div>
          <FullscreenChart title="Joueurs les Plus Meurtriers">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={killerChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  onMouseEnter={() => {}}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ value: 'Nombre de victimes', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Victimes"
                    onMouseEnter={(data) => setHoveredPlayer(data?.name || null)}
                  >
                    {killerChartData.map((entry) => {
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                      const isHoveredPlayer = hoveredPlayer === entry.name;
                      const isHighlightedAddition = entry.isHighlightedAddition;
                      
                      return (
                        <Cell
                          key={`cell-killer-${entry.name}`}
                          fill={playersColor[entry.name] || "#e53e3e"}
                          stroke={
                            isHighlightedFromSettings 
                              ? "var(--accent-primary)" 
                              : isHoveredPlayer 
                                ? "var(--text-primary)" 
                                : "none"
                          }
                          strokeWidth={
                            isHighlightedFromSettings 
                              ? 3 
                              : isHoveredPlayer 
                                ? 2 
                                : 0
                          }
                          strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                          opacity={isHighlightedAddition ? 0.8 : 1}
                          onClick={() => {
                            navigateToGameDetails({
                              selectedPlayer: entry.name,
                              fromComponent: 'Statistiques de Mort'
                            });
                          }} 
                          onMouseEnter={() => setHoveredPlayer(entry.name)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {Math.min(20, killerChartData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus actifs
          </p>
        </div>
      </div>

      {/* Insights section using lycans styling */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>Insights:</strong> {deathStats.mostDeadlyKiller && `${deathStats.mostDeadlyKiller} est le joueur le plus meurtrier.`} 
          {killerChartData.length > 0 && ` Le top tueur a éliminé ${killerChartData[0]?.value || 0} victimes.`}
          {` Au total, ${deathStats.killerStats.length} joueurs différents ont causé des morts dans les parties analysées.`}
        </p>
      </div>
    </div>
  );
}