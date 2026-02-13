import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { getKillDescription } from '../../../hooks/utils/deathStatisticsUtils';
import { type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { DEATH_TYPES } from '../../../types/deathTypes';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { minGamesOptions, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useKillerStatisticsFromRaw } from '../../../hooks/useKillerStatisticsFromRaw';
import { processDeathTypesForDisplay, mergeHunterKills } from '../../../hooks/utils/killerStatisticsUtils';

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
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  
  // Get killer statistics from hook with camp filters applied
  const { data: killerStats } = useKillerStatisticsFromRaw(selectedCamp, victimCampFilter);

  // Get processed death types for display
  const displayDeathTypes = useMemo(() => {
    return processDeathTypesForDisplay(availableDeathTypes, victimCampFilter);
  }, [availableDeathTypes, victimCampFilter]);

  // Get processed color map to ensure BULLET has the same color as BULLET_HUMAN/BULLET_WOLF
  const displayDeathTypeColors = useMemo(() => {
    const processedColors = { ...deathTypeColors };
    
    // When merging hunter kills, ensure BULLET has the hunter color
    if (victimCampFilter === 'Tous les camps') {
      // Get the hunter color from BULLET_HUMAN or BULLET_WOLF if BULLET doesn't have one
      if (!processedColors[DEATH_TYPES.BULLET]) {
        const hunterColor = deathTypeColors[DEATH_TYPES.BULLET_HUMAN] || 
                           deathTypeColors[DEATH_TYPES.BULLET_WOLF];
        if (hunterColor) {
          processedColors[DEATH_TYPES.BULLET] = hunterColor;
        }
      }
    }
    
    return processedColors;
  }, [deathTypeColors, victimCampFilter]);



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

  // Helper function to generate titles for max kills charts
  const getMaxKillsChartTitle = (chartType: 'game' | 'phase') => {
    let title = chartType === 'game' ? 'Record de Kills en une Partie' : 'Record de Kills en une Phase';
    
    // Add killer camp filter
    if (selectedCamp !== 'Tous les camps') {
      title += ` (${selectedCamp})`;
    }
    
    // Add victim camp filter if not all camps
    if (victimCampFilter !== 'Tous les camps') {
      if (victimCampFilter === 'Roles solo') {
        title += selectedCamp !== 'Tous les camps' ? ' - victimes: Roles solo' : ' (victimes: Roles solo)';
      } else {
        title += selectedCamp !== 'Tous les camps' ? ` - victimes: ${victimCampFilter}` : ` (victimes: ${victimCampFilter})`;
      }
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
      // Merge hunter kills if needed
      const processedKiller = mergeHunterKills(killer, victimCampFilter);
      
      const chartData: ChartKillerData = {
        name: processedKiller.killerName,
        value: processedKiller.kills,
        victims: processedKiller.victims.length,
        percentage: processedKiller.percentage,
        gamesPlayed: processedKiller.gamesPlayed,
        averageKillsPerGame: processedKiller.averageKillsPerGame,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars using display death types
      displayDeathTypes.forEach(deathTypeCode => {
        chartData[deathTypeCode] = processedKiller.killsByDeathType[deathTypeCode] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedTotal = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInTotalTop15) {
      const highlightedKiller = deathStats.killerStats.find((k: any) => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        // Merge hunter kills if needed
        const processedKiller = mergeHunterKills(highlightedKiller, victimCampFilter);
        
        const highlightedData: ChartKillerData = {
          name: processedKiller.killerName,
          value: processedKiller.kills,
          victims: processedKiller.victims.length,
          percentage: processedKiller.percentage,
          gamesPlayed: processedKiller.gamesPlayed,
          averageKillsPerGame: processedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars using display death types
        displayDeathTypes.forEach(deathTypeCode => {
          highlightedData[deathTypeCode] = processedKiller.killsByDeathType[deathTypeCode] || 0;
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
      // Merge hunter kills if needed
      const processedKiller = mergeHunterKills(killer, victimCampFilter);
      
      const chartData: ChartKillerData = {
        name: processedKiller.killerName,
        value: processedKiller.averageKillsPerGame,
        victims: processedKiller.victims.length,
        percentage: processedKiller.percentage,
        gamesPlayed: processedKiller.gamesPlayed,
        averageKillsPerGame: processedKiller.averageKillsPerGame,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars (scaled for averages) using display death types
      displayDeathTypes.forEach(deathTypeCode => {
        const totalKills = processedKiller.killsByDeathType[deathTypeCode] || 0;
        chartData[deathTypeCode] = processedKiller.gamesPlayed > 0 ? totalKills / processedKiller.gamesPlayed : 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedAverage = false;

    if (settings.highlightedPlayer && !highlightedPlayerInAverageTop15) {
      // Search for highlighted player in all stats (not just eligible)
      const highlightedKiller = deathStats.killerStats.find((k: any) => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        // Merge hunter kills if needed
        const processedKiller = mergeHunterKills(highlightedKiller, victimCampFilter);
        
        const highlightedData: ChartKillerData = {
          name: processedKiller.killerName,
          value: processedKiller.averageKillsPerGame,
          victims: processedKiller.victims.length,
          percentage: processedKiller.percentage,
          gamesPlayed: processedKiller.gamesPlayed,
          averageKillsPerGame: processedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars (scaled for averages) using display death types
        displayDeathTypes.forEach(deathTypeCode => {
          const totalKills = processedKiller.killsByDeathType[deathTypeCode] || 0;
          highlightedData[deathTypeCode] = processedKiller.gamesPlayed > 0 ? totalKills / processedKiller.gamesPlayed : 0;
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
  }, [deathStats, settings.highlightedPlayer, minGamesForAverage, displayDeathTypes, victimCampFilter]);

  const TotalKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      // Calculate total kills from all death types (using display death types)
      const totalKills = displayDeathTypes.reduce((sum, deathTypeCode) => sum + (data[deathTypeCode] || 0), 0);
      
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
            {displayDeathTypes
              .map(deathType => ({
                deathType,
                count: data[deathType] || 0
              }))
              .filter(item => item.count > 0)
              .sort((a, b) => b.count - a.count)
              .map(({ deathType, count }) => (
                <p key={deathType} style={{ 
                  color: displayDeathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{getKillDescription(deathType)}:</strong> {count}
                </p>
              ))}
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
      const processedOriginal = originalKiller ? mergeHunterKills(originalKiller, victimCampFilter) : null;
      
      // Calculate total average kills from all death types (using display death types)
      const totalAverageKills = displayDeathTypes.reduce((sum, deathTypeCode) => sum + (data[deathTypeCode] || 0), 0);
      const totalKills = processedOriginal ? processedOriginal.kills : Math.round(totalAverageKills * data.gamesPlayed);
      
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
            {displayDeathTypes
              .map(deathType => ({
                deathType,
                avgCount: data[deathType] || 0,
                totalKillsForDeathType: processedOriginal ? 
                  (processedOriginal.killsByDeathType[deathType] || 0) : 
                  Math.round((data[deathType] || 0) * data.gamesPlayed)
              }))
              .filter(item => item.avgCount > 0)
              .sort((a, b) => b.avgCount - a.avgCount)
              .map(({ deathType, avgCount, totalKillsForDeathType }) => (
                <p key={deathType} style={{ 
                  color: displayDeathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{getKillDescription(deathType)}:</strong> {avgCount.toFixed(2)} ({totalKillsForDeathType} kills /{data.gamesPlayed} games)
                </p>
              ))}
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

  // Get max kills per game statistics from hook
  const maxKillsPerGameData = useMemo(() => {
    if (!killerStats) return [];

    const sorted = killerStats.maxKillsPerGame.slice(0, 15);

    // Check if highlighted player is in top 15
    const highlightedInTop15 = settings.highlightedPlayer && 
      sorted.some(p => p.playerName === settings.highlightedPlayer);

    // Add highlighted player if not in top 15
    if (settings.highlightedPlayer && !highlightedInTop15) {
      const highlightedData = killerStats.maxKillsPerGame
        .find(p => p.playerName === settings.highlightedPlayer);
      if (highlightedData) {
        sorted.push({ ...highlightedData });
      }
    }

    return sorted.map((p, index) => ({
      name: p.playerName,
      value: p.maxKills,
      timesAchieved: p.timesAchieved,
      gameIds: p.gameIds,
      isHighlightedAddition: index >= 15
    }));
  }, [killerStats, settings.highlightedPlayer]);

  // Get max kills per phase statistics from hook
  const maxKillsPerPhaseData = useMemo(() => {
    if (!killerStats) return [];

    const sorted = killerStats.maxKillsPerPhase.slice(0, 15);

    // Check if highlighted player is in top 15
    const highlightedInTop15 = settings.highlightedPlayer && 
      sorted.some(p => p.playerName === settings.highlightedPlayer);

    // Add highlighted player if not in top 15
    if (settings.highlightedPlayer && !highlightedInTop15) {
      const highlightedData = killerStats.maxKillsPerPhase
        .find(p => p.playerName === settings.highlightedPlayer);
      if (highlightedData) {
        sorted.push({ ...highlightedData });
      }
    }

    return sorted.map((p, index) => ({
      name: p.playerName,
      value: p.maxKills,
      timesAchieved: p.timesAchieved,
      gameIds: p.gameIds,
      isHighlightedAddition: index >= 15
    }));
  }, [killerStats, settings.highlightedPlayer]);

  const MaxKillsTooltip = ({ active, payload, label, chartType }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const isHighlightedAddition = data.isHighlightedAddition;

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
            <strong>{chartType === 'game' ? 'Max kills en une partie' : 'Max kills en une phase'}:</strong> {data.value}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Nombre de fois:</strong> {data.timesAchieved}
          </p>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0', fontSize: '0.8rem' }}>
            {data.gameIds.length} partie{data.gameIds.length > 1 ? 's' : ''} concernée{data.gameIds.length > 1 ? 's' : ''}
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
    <div className="lycans-graphiques-groupe">
      <div className="lycans-graphique-section">
        <div>
          <h3>{getChartTitle('total')}</h3>
          {highlightedPlayerAddedToTotal && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
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
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
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
                {displayDeathTypes.map((deathType) => (
                  <Bar
                    key={deathType}
                    dataKey={deathType}
                    name={deathType}
                    stackId="kills"
                    fill={displayDeathTypeColors[deathType]}
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
              color: 'var(--accent-primary-text)', 
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
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
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
                {displayDeathTypes.map((deathType) => (
                  <Bar
                    key={deathType}
                    dataKey={deathType}
                    name={deathType}
                    stackId="averageKills"
                    fill={displayDeathTypeColors[deathType]}
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

      <div className="lycans-graphique-section">
        <div>
          <h3>{getMaxKillsChartTitle('game')}</h3>
          {maxKillsPerGameData.some(p => p.isHighlightedAddition) && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <FullscreenChart title={getMaxKillsChartTitle('game')}>
          <div style={{ height: 440 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={maxKillsPerGameData}
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
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
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
                  value: 'Nombre max de kills en une partie', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={(props) => <MaxKillsTooltip {...props} chartType="game" />} />
                <Bar
                  dataKey="value"
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as any;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    const fillColor = playersColor[entry.name] || (
                      isHighlightedFromSettings ? 'var(--accent-primary)' :
                      isHighlightedAddition ? 'var(--accent-secondary)' :
                      'var(--chart-primary)'
                    );

                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fillColor}
                        stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : 'none'}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onClick={() => {
                          if (entry?.gameIds && entry.gameIds.length > 0) {
                            const navigationFilters: any = {
                              fromComponent: 'Statistiques de Mort - Max Kills par Partie'
                            };

                            if (entry.gameIds.length === 1) {
                              navigationFilters.selectedGame = entry.gameIds[0];
                            } else {
                              navigationFilters.selectedGameIds = entry.gameIds;
                            }

                            if (selectedCamp !== 'Tous les camps') {
                              navigationFilters.campFilter = {
                                selectedCamp: selectedCamp,
                                campFilterMode: 'all-assignments'
                              };
                            }

                            navigateToGameDetails(navigationFilters);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          {selectedCamp !== 'Tous les camps' || victimCampFilter !== 'Tous les camps' 
            ? 'Nombre maximum de kills réalisés en une seule partie (avec filtres appliqués)'
            : 'Nombre maximum de kills réalisés en une seule partie'
          }
        </p>
      </div>

      <div className="lycans-graphique-section">
        <div>
          <h3>{getMaxKillsChartTitle('phase')}</h3>
          {maxKillsPerPhaseData.some(p => p.isHighlightedAddition) && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <FullscreenChart title={getMaxKillsChartTitle('phase')}>
          <div style={{ height: 440 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={maxKillsPerPhaseData}
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
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
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
                  value: 'Nombre max de kills en une phase', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={(props) => <MaxKillsTooltip {...props} chartType="phase" />} />
                <Bar
                  dataKey="value"
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as any;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    const fillColor = playersColor[entry.name] || (
                      isHighlightedFromSettings ? 'var(--accent-primary)' :
                      isHighlightedAddition ? 'var(--accent-secondary)' :
                      'var(--chart-secondary)'
                    );

                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fillColor}
                        stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : 'none'}
                        strokeWidth={isHighlightedFromSettings ? 3 : 0}
                        strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onClick={() => {
                          if (entry?.gameIds && entry.gameIds.length > 0) {
                            const navigationFilters: any = {
                              fromComponent: 'Statistiques de Mort - Max Kills par Phase'
                            };

                            if (entry.gameIds.length === 1) {
                              navigationFilters.selectedGame = entry.gameIds[0];
                            } else {
                              navigationFilters.selectedGameIds = entry.gameIds;
                            }

                            if (selectedCamp !== 'Tous les camps') {
                              navigationFilters.campFilter = {
                                selectedCamp: selectedCamp,
                                campFilterMode: 'all-assignments'
                              };
                            }

                            navigateToGameDetails(navigationFilters);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          {selectedCamp !== 'Tous les camps' || victimCampFilter !== 'Tous les camps'
            ? 'Nombre maximum de kills réalisés en une seule phase avec filtres appliqués'
            : 'Nombre maximum de kills réalisés en une seule phase'
          }
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '0.25rem', fontStyle: 'italic' }}>
          Une phase est une séquence de jeu : Jour (J1), Nuit (N1), Meeting (M1), etc.
        </p>
      </div>
    </div>
  );
}