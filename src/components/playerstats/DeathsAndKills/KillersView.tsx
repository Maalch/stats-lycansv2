import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getKillDescription } from '../../../hooks/utils/deathStatisticsUtils';
import { type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { minGamesOptions } from '../../../types/api';

// Extended type for chart data with highlighting info and death type breakdown
type ChartKillerData = {
  name: string;
  value: number;
  victims: number;
  percentage: number;
  gamesPlayed: number;
  averageKillsPerGame: number;
  isHighlightedAddition?: boolean;
} & {
  // Death type breakdown for stacked bars
  [K in DeathTypeCodeType]?: number;
};

interface KillersViewProps {
  deathStats: any;
  selectedCamp: string;
  victimCampFilter: string;
  minGamesForAverage: number;
  onMinGamesChange: (value: number) => void;
  availableDeathTypes: DeathTypeCodeType[];
  deathTypeColors: Record<DeathTypeCodeType, string>;
  totalEligibleForAverage: number;
}

export function KillersView({
  deathStats,
  selectedCamp,
  victimCampFilter,
  minGamesForAverage,
  onMinGamesChange,
  availableDeathTypes,
  deathTypeColors,
  totalEligibleForAverage
}: KillersViewProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();

  // Helper function to generate chart titles based on filters
  const getChartTitle = (chartType: 'total' | 'average') => {
    let title = 'Top Tueurs';
    
    // Add killer camp filter
    if (selectedCamp !== 'Tous les camps') {
      title += ` en ${selectedCamp}`;
    }
    
    // Add victim camp filter
    if (victimCampFilter !== 'Tous les camps') {
      if (victimCampFilter === 'Roles solo') {
        title += ` (victimes: Roles solo)`;
      } else {
        title += ` (victimes: ${victimCampFilter})`;
      }
    }
    
    // Add chart type
    if (chartType === 'total') {
      title += ' (Total)';
    } else {
      title += ' (Moyenne par Partie)';
    }
    
    return title;
  };

  // Process killer data for both total and average charts
  const { totalKillsData, averageKillsData, highlightedPlayerAddedToTotal, highlightedPlayerAddedToAverage } = useMemo(() => {
    if (!deathStats) return { 
      totalKillsData: [], 
      averageKillsData: [], 
      highlightedPlayerAddedToTotal: false, 
      highlightedPlayerAddedToAverage: false
    };
    
    // Process total kills data
    const sortedByTotal = deathStats.killerStats
      .sort((a: any, b: any) => b.kills - a.kills)
      .slice(0, 15);
    
    const highlightedPlayerInTotalTop15 = settings.highlightedPlayer && 
      sortedByTotal.some((k: any) => k.killerName === settings.highlightedPlayer);
    
    const totalBaseData: ChartKillerData[] = sortedByTotal.map((killer: any) => {
      const chartData: ChartKillerData = {
        name: killer.killerName,
        value: killer.kills,
        victims: killer.victims.length,
        percentage: killer.percentage,
        gamesPlayed: killer.gamesPlayed,
        averageKillsPerGame: killer.averageKillsPerGame,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars
      availableDeathTypes.forEach(deathTypeCode => {
        chartData[deathTypeCode] = killer.killsByDeathType[deathTypeCode] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedTotal = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInTotalTop15) {
      const highlightedKiller = deathStats.killerStats.find((k: any) => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        const highlightedData: ChartKillerData = {
          name: highlightedKiller.killerName,
          value: highlightedKiller.kills,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          gamesPlayed: highlightedKiller.gamesPlayed,
          averageKillsPerGame: highlightedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars
        availableDeathTypes.forEach(deathTypeCode => {
          highlightedData[deathTypeCode] = highlightedKiller.killsByDeathType[deathTypeCode] || 0;
        });
        
        totalBaseData.push(highlightedData);
        highlightedPlayerAddedTotal = true;
      }
    }
    
    // Process average kills data (with minimum games filter)
    const eligibleForAverage = deathStats.killerStats.filter((killer: any) => killer.gamesPlayed >= minGamesForAverage);
    const sortedByAverage = eligibleForAverage
      .sort((a: any, b: any) => b.averageKillsPerGame - a.averageKillsPerGame)
      .slice(0, 15);

    const highlightedPlayerInAverageTop15 = settings.highlightedPlayer && 
      sortedByAverage.some((k: any) => k.killerName === settings.highlightedPlayer);
    
    const averageBaseData: ChartKillerData[] = sortedByAverage.map((killer: any) => {
      const chartData: ChartKillerData = {
        name: killer.killerName,
        value: killer.averageKillsPerGame,
        victims: killer.victims.length,
        percentage: killer.percentage,
        gamesPlayed: killer.gamesPlayed,
        averageKillsPerGame: killer.averageKillsPerGame,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars (scaled for averages)
      availableDeathTypes.forEach(deathTypeCode => {
        const totalKills = killer.killsByDeathType[deathTypeCode] || 0;
        chartData[deathTypeCode] = killer.gamesPlayed > 0 ? totalKills / killer.gamesPlayed : 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedAverage = false;

    if (settings.highlightedPlayer && !highlightedPlayerInAverageTop15) {
      // Search for highlighted player in all stats (not just eligible)
      const highlightedKiller = deathStats.killerStats.find((k: any) => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        const highlightedData: ChartKillerData = {
          name: highlightedKiller.killerName,
          value: highlightedKiller.averageKillsPerGame,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          gamesPlayed: highlightedKiller.gamesPlayed,
          averageKillsPerGame: highlightedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars (scaled for averages)
        availableDeathTypes.forEach(deathTypeCode => {
          const totalKills = highlightedKiller.killsByDeathType[deathTypeCode] || 0;
          highlightedData[deathTypeCode] = highlightedKiller.gamesPlayed > 0 ? totalKills / highlightedKiller.gamesPlayed : 0;
        });
        
        averageBaseData.push(highlightedData);
        highlightedPlayerAddedAverage = true;
      }
    }
    
    return { 
      totalKillsData: totalBaseData,
      averageKillsData: averageBaseData,
      highlightedPlayerAddedToTotal: highlightedPlayerAddedTotal,
      highlightedPlayerAddedToAverage: highlightedPlayerAddedAverage
    };
  }, [deathStats, settings.highlightedPlayer, minGamesForAverage, availableDeathTypes]);

  const TotalKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      // Calculate total kills from all death types
      const totalKills = availableDeathTypes.reduce((sum, deathTypeCode) => sum + (data[deathTypeCode] || 0), 0);
      
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
            <strong>Victimes totales:</strong> {totalKills}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de kill:
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
                  <strong>{getKillDescription(deathType)}:</strong> {count}
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

  const AverageKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const meetsMinGames = data.gamesPlayed >= minGamesForAverage;
      
      // Find the original killer stats for total kill counts
      const originalKiller = deathStats?.killerStats.find((k: any) => k.killerName === data.name);
      
      // Calculate total average kills from all death types
      const totalAverageKills = availableDeathTypes.reduce((sum, deathTypeCode) => sum + (data[deathTypeCode] || 0), 0);
      const totalKills = originalKiller ? originalKiller.kills : Math.round(totalAverageKills * data.gamesPlayed);
      
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
            <strong>Moyenne par partie:</strong> {totalAverageKills.toFixed(2)} ({totalKills} kills /{data.gamesPlayed} games)
          </p>
           <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>         
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de kill (moyenne):
            </p>
            {availableDeathTypes.map(deathType => {
              const avgCount = data[deathType] || 0;
              if (avgCount === 0) return null;
              
              // Get total kills for this death type
              const totalKillsForDeathType = originalKiller ? 
                (originalKiller.killsByDeathType[deathType] || 0) : 
                Math.round(avgCount * data.gamesPlayed);
              
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{getKillDescription(deathType)}:</strong> {avgCount.toFixed(2)} ({totalKillsForDeathType} kills /{data.gamesPlayed} games)
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
          <h3>{getChartTitle('total')}</h3>
          {highlightedPlayerAddedToTotal && settings.highlightedPlayer && (
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
        <FullscreenChart title={getChartTitle('total')}>
          <div style={{ height: 440 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={totalKillsData}
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
                  value: 'Nombre total de victimes', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={<TotalKillsTooltip />} />
                {availableDeathTypes.map((deathType) => (
                  <Bar
                    key={deathType}
                    dataKey={deathType}
                    name={deathType}
                    stackId="kills"
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
          Top {Math.min(15, totalKillsData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus actifs (total)
        </p>
      </div>

      <div className="lycans-graphique-section">
        <div>
          <h3>{getChartTitle('average')}</h3>
          {highlightedPlayerAddedToAverage && settings.highlightedPlayer && (
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
          <label htmlFor="min-games-average-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Min. parties:
          </label>
          <select
            id="min-games-average-select"
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
        <FullscreenChart title={getChartTitle('average')}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={averageKillsData}
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
                  value: 'Moyenne de victimes par partie', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={<AverageKillsTooltip />} />
                {availableDeathTypes.map((deathType) => (
                  <Bar
                    key={deathType}
                    dataKey={deathType}
                    name={deathType}
                    stackId="averageKills"
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
          Top {Math.min(15, averageKillsData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus efficaces (sur {totalEligibleForAverage} ayant au moins {minGamesForAverage} partie{minGamesForAverage > 1 ? 's' : ''})
        </p>
      </div>
    </div>
  );
}