import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { minGamesOptions, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { getDeathTypeLabel } from '../../../types/deathTypes';

// Type for player death statistics charts
type ChartPlayerDeathData = {
  name: string;
  value: number;
  totalDeaths: number;
  gamesPlayed: number;
  deathRate: number;
  survivalRate: number;
  isHighlightedAddition?: boolean;
} & {
  // Death type breakdown for stacked bars
  [K in DeathTypeCodeType]?: number;
};

interface DeathsViewProps {
  deathStats: any;
  selectedCamp: string;
  minGamesForAverage: number;
  onMinGamesChange: (value: number) => void;
  availableDeathTypes: DeathTypeCodeType[];
  deathTypeColors: Record<DeathTypeCodeType, string>;
}

export function DeathsView({
  deathStats,
  selectedCamp,
  minGamesForAverage,
  onMinGamesChange,
  availableDeathTypes,
  deathTypeColors
}: DeathsViewProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  // Process player death data for both total deaths and survival rate charts
  const { totalDeathsData, survivalRateData, highlightedPlayerAddedToDeaths, highlightedPlayerAddedToSurvival } = useMemo(() => {
    if (!deathStats) return { 
      totalDeathsData: [], 
      survivalRateData: [], 
      highlightedPlayerAddedToDeaths: false, 
      highlightedPlayerAddedToSurvival: false 
    };

    // Process total deaths data
    const sortedByTotalDeaths = deathStats.playerDeathStats
      .sort((a: any, b: any) => b.totalDeaths - a.totalDeaths)
      .slice(0, 15);
    
    const highlightedPlayerInDeathsTop15 = settings.highlightedPlayer && 
      sortedByTotalDeaths.some((p: any) => p.playerName === settings.highlightedPlayer);
    
    const totalDeathsBaseData: ChartPlayerDeathData[] = sortedByTotalDeaths.map((player: any) => {
      const gamesPlayed = player.gamesPlayed;
      const survivalRate = gamesPlayed > 0 ? ((gamesPlayed - player.totalDeaths) / gamesPlayed) * 100 : 0;
      
      const chartData: ChartPlayerDeathData = {
        name: player.playerName,
        value: player.totalDeaths,
        totalDeaths: player.totalDeaths,
        gamesPlayed: gamesPlayed,
        deathRate: player.deathRate,
        survivalRate: survivalRate,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars
      availableDeathTypes.forEach(deathType => {
        chartData[deathType] = player.deathsByType[deathType] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedDeaths = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInDeathsTop15) {
      const highlightedPlayer = deathStats.playerDeathStats.find((p: any) => p.playerName === settings.highlightedPlayer);
      if (highlightedPlayer) {
        const gamesPlayed = highlightedPlayer.gamesPlayed;
        const survivalRate = gamesPlayed > 0 ? ((gamesPlayed - highlightedPlayer.totalDeaths) / gamesPlayed) * 100 : 0;
        
        const highlightedData: ChartPlayerDeathData = {
          name: highlightedPlayer.playerName,
          value: highlightedPlayer.totalDeaths,
          totalDeaths: highlightedPlayer.totalDeaths,
          gamesPlayed: gamesPlayed,
          deathRate: highlightedPlayer.deathRate,
          survivalRate: survivalRate,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars
        availableDeathTypes.forEach(deathType => {
          highlightedData[deathType] = highlightedPlayer.deathsByType[deathType] || 0;
        });
        
        totalDeathsBaseData.push(highlightedData);
        highlightedPlayerAddedDeaths = true;
      }
    }

    // Process survival rate data using the already computed deathStats
    // Filter players who meet the minimum games requirement and calculate survival rates
    const playersWithMinGames = deathStats.playerDeathStats
      .filter((player: any) => player.gamesPlayed >= minGamesForAverage)
      .map((player: any) => ({
        ...player,
        survivalRate: player.gamesPlayed > 0 ? ((player.gamesPlayed - player.totalDeaths) / player.gamesPlayed) * 100 : 0
      }));
    
    const sortedBySurvivalRate = playersWithMinGames
      .sort((a: any, b: any) => b.survivalRate - a.survivalRate)
      .slice(0, 15);

    const highlightedPlayerInSurvivalTop15 = settings.highlightedPlayer && 
      sortedBySurvivalRate.some((p: any) => p.playerName === settings.highlightedPlayer);
    
    const survivalRateBaseData: ChartPlayerDeathData[] = sortedBySurvivalRate.map((player: any) => {
      const chartData: ChartPlayerDeathData = {
        name: player.playerName,
        value: player.survivalRate,
        totalDeaths: player.totalDeaths,
        gamesPlayed: player.gamesPlayed,
        deathRate: player.deathRate,
        survivalRate: player.survivalRate,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for tooltip
      availableDeathTypes.forEach(deathType => {
        chartData[deathType] = player.deathsByType[deathType] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedSurvival = false;

    if (settings.highlightedPlayer && !highlightedPlayerInSurvivalTop15) {
      // Find the highlighted player in the full deathStats (not filtered by min games)
      const highlightedPlayerStats = deathStats.playerDeathStats.find((p: any) => p.playerName === settings.highlightedPlayer);
      
      if (highlightedPlayerStats) {
        const survivalRate = highlightedPlayerStats.gamesPlayed > 0 ? 
          ((highlightedPlayerStats.gamesPlayed - highlightedPlayerStats.totalDeaths) / highlightedPlayerStats.gamesPlayed) * 100 : 0;
        
        const highlightedData: ChartPlayerDeathData = {
          name: highlightedPlayerStats.playerName,
          value: survivalRate,
          totalDeaths: highlightedPlayerStats.totalDeaths,
          gamesPlayed: highlightedPlayerStats.gamesPlayed,
          deathRate: highlightedPlayerStats.deathRate,
          survivalRate: survivalRate,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for tooltip
        availableDeathTypes.forEach(deathType => {
          highlightedData[deathType] = highlightedPlayerStats.deathsByType[deathType] || 0;
        });
        
        survivalRateBaseData.push(highlightedData);
        highlightedPlayerAddedSurvival = true;
      }
    }
    
    return { 
      totalDeathsData: totalDeathsBaseData,
      survivalRateData: survivalRateBaseData,
      highlightedPlayerAddedToDeaths: highlightedPlayerAddedDeaths,
      highlightedPlayerAddedToSurvival: highlightedPlayerAddedSurvival
    };
  }, [deathStats, settings.highlightedPlayer, minGamesForAverage, availableDeathTypes]);

  const TotalDeathsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      // Calculate total deaths from all death types
      const totalDeaths = availableDeathTypes.reduce((sum, deathType) => sum + (data[deathType] || 0), 0);
      
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
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Morts totales:</strong> {totalDeaths}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Taux de survie:</strong> {data.survivalRate.toFixed(1)}%
          </p>
          
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de mort:
            </p>
            {availableDeathTypes.map(deathType => {
              const count = data[deathType] || 0;
              if (count === 0) return null;
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{getDeathTypeLabel(deathType)}:</strong> {count}
                </p>
              );
            })}
          </div>

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

  const SurvivalRateTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const meetsMinGames = data.gamesPlayed >= minGamesForAverage;
      
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
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Taux de survie:</strong> {data.survivalRate.toFixed(1)}% ({data.gamesPlayed - data.totalDeaths} survies / {data.gamesPlayed} parties)
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Morts totales:</strong> {data.totalDeaths}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de mort:
            </p>
            {availableDeathTypes.map(deathType => {
              const count = data[deathType] || 0;
              if (count === 0) return null;
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{getDeathTypeLabel(deathType)}:</strong> {count}
                </p>
              );
            })}
          </div>

          {isHighlightedAddition && !meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (&lt; {minGamesForAverage} parties)
            </div>
          )}
          {isHighlightedAddition && meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (hors top 15)
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
    <div className="lycans-graphiques-groupe">
      <div className="lycans-graphique-section">
        <div>
          <h3>{selectedCamp === 'Tous les camps' ? 'Morts (Total)' : `Morts en ${selectedCamp} (Total)`}</h3>
          {highlightedPlayerAddedToDeaths && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <FullscreenChart title={selectedCamp === 'Tous les camps' ? 'Morts (Total)' : `Morts en ${selectedCamp} (Total)`}>
          <div style={{ height: 440 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={totalDeathsData}
                margin={{ top: 60, right: 30, left: 20, bottom: 10 }}
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
                      dy={10}
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      textAnchor="end"
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis label={{ 
                  value: 'Nombre total de morts', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={<TotalDeathsTooltip />} />
                {availableDeathTypes.map((deathType) => (
                  <Bar
                    key={deathType}
                    dataKey={deathType}
                    name={deathType}
                    stackId="deaths"
                    fill={deathTypeColors[deathType]}
                    onClick={(data) => {
                      const navigationFilters: any = {
                        selectedPlayer: data?.name,
                        fromComponent: 'Statistiques de Mort'
                      };
                      
                      // If a specific camp is selected, add camp filter
                      if (selectedCamp !== 'Tous les camps') {
                        navigationFilters.campFilter = {
                          selectedCamp: selectedCamp,
                          campFilterMode: 'all-assignments'
                        };
                      }
                      
                      navigateToGameDetails(navigationFilters);
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Top {Math.min(15, totalDeathsData.filter(d => !d.isHighlightedAddition).length)} des joueurs les plus souvent morts
        </p>
      </div>

      <div className="lycans-graphique-section">
        <div>
          <h3>Meilleurs Survivants {selectedCamp === 'Tous les camps' ? '(Total)' : ` en ${selectedCamp}`}</h3>
          {highlightedPlayerAddedToSurvival && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <label htmlFor="min-games-survival-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Min. parties:
          </label>
          <select
            id="min-games-survival-select"
            value={minGamesForAverage}
            onChange={(e) => onMinGamesChange(Number(e.target.value))}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.9rem'
            }}
          >
            {minGamesOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <FullscreenChart title="Meilleurs Survivants">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={survivalRateData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
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
                      dy={10}
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      textAnchor="end"
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis label={{ 
                  value: 'Taux de survie (%)', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={<SurvivalRateTooltip />} />
                <Bar
                  dataKey="value"
                  onClick={(data) => {
                    const navigationFilters: any = {
                      selectedPlayer: data?.name,
                      fromComponent: 'Statistiques de Mort'
                    };
                    
                    // If a specific camp is selected, add camp filter
                    if (selectedCamp !== 'Tous les camps') {
                      navigationFilters.campFilter = {
                        selectedCamp: selectedCamp,
                        campFilterMode: 'all-assignments'
                      };
                    }
                    
                    navigateToGameDetails(navigationFilters);
                  }}
                  onMouseEnter={(data: any) => setHoveredPlayer(data?.name || null)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {survivalRateData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={playersColor[entry.name] || 'var(--chart-primary)'}
                        stroke={
                          isHighlightedFromSettings 
                            ? "var(--accent-primary)" 
                            : hoveredPlayer === entry.name 
                              ? "var(--text-primary)" 
                              : "none"
                        }
                        strokeWidth={
                          isHighlightedFromSettings 
                            ? 3 
                            : hoveredPlayer === entry.name 
                              ? 2 
                              : 0
                        }
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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Top {Math.min(15, survivalRateData.filter(d => !d.isHighlightedAddition).length)} des joueurs avec le plus haut taux de survie (ayant au moins {minGamesForAverage} partie{minGamesForAverage > 1 ? 's' : ''})
        </p>
      </div>
    </div>
  );
}