import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDeathStatisticsFromRaw, useAvailableCampsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';
import { getAllDeathTypes } from '../../hooks/utils/deathStatisticsUtils';
import { useGameLogData } from '../../hooks/useCombinedRawData';
import { FullscreenChart } from '../common/FullscreenChart';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { minGamesOptions, useThemeAdjustedLycansColorScheme } from '../../types/api';

// Extended type for chart data with highlighting info and death type breakdown
type ChartKillerData = {
  name: string;
  value: number;
  victims: number;
  percentage: number;
  gamesPlayed: number;
  averageKillsPerGame: number;
  isHighlightedAddition?: boolean;
  // Death type breakdown for stacked bars
  [deathType: string]: number | string | boolean | undefined;
};

export function DeathStatisticsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.deathStatsSelectedCamp || 'Tous les camps'
  );
  const [minGamesForAverage, setMinGamesForAverage] = useState<number>(5);
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw(selectedCamp);
  const { data: gameLogData } = useGameLogData();
  const { settings } = useSettings();
  const lycansColors = useThemeAdjustedLycansColorScheme();

  // Get all unique death types for chart configuration
  const availableDeathTypes = useMemo(() => {
    return gameLogData ? getAllDeathTypes(gameLogData.GameStats) : [];
  }, [gameLogData]);

  // Define colors for different death types
  const deathTypeColors = useMemo(() => {
    const colorMap: Record<string, string> = {
      'Kill en Loup': lycansColors['Loup'],
      'Mort aux votes': 'var(--chart-color-1)',
      'Tir de Chasseur': lycansColors['Chasseur'],
      'Kill en Zombie': lycansColors['Vaudou'],
      'Kill avec Potion': lycansColors['Alchimiste'],
      'Kill en Vengeur': 'var(--chart-color-2)',
      'Déconnexion': 'var(--chart-color-3)',
      'Survivant': 'var(--chart-color-4)'
    };
    
    // Assign colors to any additional death types
    const additionalColors = [
      'var(--accent-primary)',
      'var(--accent-secondary)',
      'var(--accent-tertiary)',
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c49f', '#ffbb28'
    ];
    
    let colorIndex = 0;
    availableDeathTypes.forEach(deathType => {
      if (!colorMap[deathType]) {
        colorMap[deathType] = additionalColors[colorIndex % additionalColors.length];
        colorIndex++;
      }
    });
    
    return colorMap;
  }, [availableDeathTypes, lycansColors]);

  // Function to handle camp selection change with persistence
  const handleCampChange = (newCamp: string) => {
    setSelectedCamp(newCamp);
    updateNavigationState({ deathStatsSelectedCamp: newCamp });
  };

  // Process killer data for both total and average charts
  const { totalKillsData, averageKillsData, highlightedPlayerAddedToTotal, highlightedPlayerAddedToAverage, gamesWithKillers, totalEligibleForAverage } = useMemo(() => {
    if (!deathStats) return { 
      totalKillsData: [], 
      averageKillsData: [], 
      highlightedPlayerAddedToTotal: false, 
      highlightedPlayerAddedToAverage: false, 
      gamesWithKillers: 0,
      totalEligibleForAverage: 0
    };
    
    // Process total kills data
    const sortedByTotal = deathStats.killerStats
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 15);
    
    const highlightedPlayerInTotalTop15 = settings.highlightedPlayer && 
      sortedByTotal.some(k => k.killerName === settings.highlightedPlayer);
    
    const totalBaseData: ChartKillerData[] = sortedByTotal.map(killer => {
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
      availableDeathTypes.forEach(deathType => {
        chartData[deathType] = killer.killsByDeathType[deathType] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedTotal = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInTotalTop15) {
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
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
        availableDeathTypes.forEach(deathType => {
          highlightedData[deathType] = highlightedKiller.killsByDeathType[deathType] || 0;
        });
        
        totalBaseData.push(highlightedData);
        highlightedPlayerAddedTotal = true;
      }
    }
    
    // Process average kills data (with minimum games filter)
    const eligibleForAverage = deathStats.killerStats.filter(killer => killer.gamesPlayed >= minGamesForAverage);
    const sortedByAverage = eligibleForAverage
      .sort((a, b) => b.averageKillsPerGame - a.averageKillsPerGame)
      .slice(0, 15);

    const highlightedPlayerInAverageTop15 = settings.highlightedPlayer && 
      sortedByAverage.some(k => k.killerName === settings.highlightedPlayer);
    
    const averageBaseData: ChartKillerData[] = sortedByAverage.map(killer => {
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
      availableDeathTypes.forEach(deathType => {
        const totalKills = killer.killsByDeathType[deathType] || 0;
        chartData[deathType] = killer.gamesPlayed > 0 ? totalKills / killer.gamesPlayed : 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedAverage = false;

    if (settings.highlightedPlayer && !highlightedPlayerInAverageTop15) {
      // Search for highlighted player in all stats (not just eligible)
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
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
        availableDeathTypes.forEach(deathType => {
          const totalKills = highlightedKiller.killsByDeathType[deathType] || 0;
          highlightedData[deathType] = highlightedKiller.gamesPlayed > 0 ? totalKills / highlightedKiller.gamesPlayed : 0;
        });
        
        averageBaseData.push(highlightedData);
        highlightedPlayerAddedAverage = true;
      }
    }
    
    return { 
      totalKillsData: totalBaseData,
      averageKillsData: averageBaseData,
      highlightedPlayerAddedToTotal: highlightedPlayerAddedTotal,
      highlightedPlayerAddedToAverage: highlightedPlayerAddedAverage,
      gamesWithKillers: deathStats.totalGames,
      totalEligibleForAverage: eligibleForAverage.length
    };
  }, [deathStats, settings.highlightedPlayer, minGamesForAverage, availableDeathTypes]);

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de mort...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!deathStats) return <div className="donnees-manquantes">Aucune donnée de mort disponible</div>;

  const TotalKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      // Calculate total kills from all death types
      const totalKills = availableDeathTypes.reduce((sum, deathType) => sum + (data[deathType] || 0), 0);
      
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
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: deathTypeColors[deathType],
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }}></span>
                  <strong>{deathType}:</strong> {count}
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
      const originalKiller = deathStats?.killerStats.find(k => k.killerName === data.name);
      
      // Calculate total average kills from all death types
      const totalAverageKills = availableDeathTypes.reduce((sum, deathType) => sum + (data[deathType] || 0), 0);
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
              Répartition par type de mort (moyenne):
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
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: deathTypeColors[deathType],
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }}></span>
                  <strong>{deathType}:</strong> {avgCount.toFixed(2)} ({totalKillsForDeathType} kills /{data.gamesPlayed} games)
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
    <div className="lycans-players-stats">
      <h2>Statistiques de Tueurs</h2>

      {/* Camp Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="camp-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Camp du tueur :
        </label>
        <select
          id="camp-select"
          value={selectedCamp}
          onChange={(e) => handleCampChange(e.target.value)}
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '0.5rem',
            fontSize: '0.9rem',
            minWidth: '150px'
          }}
        >
          <option value="Tous les camps">Tous les camps</option>
          {availableCamps?.map(camp => (
            <option key={camp} value={camp}>
              {camp}
            </option>
          ))}
        </select>
      </div>

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
          <h3>Nombre de parties enregistrées</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary)' }}>
            {gamesWithKillers}
          </div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>Top Tueurs (Total)</h3>
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
          <FullscreenChart title="Top Tueurs (Total)">
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
            <h3>Top Tueurs (Moyenne par Partie)</h3>
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
              onChange={(e) => setMinGamesForAverage(Number(e.target.value))}
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
          <FullscreenChart title="Top Tueurs (Moyenne par Partie)">
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

      {/* Insights section using lycans styling */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>Note : </strong> 
          {`Les morts lors de votes aux conseils ne sont pas comptabilisées ici. `}
          {`Données en cours de récupération (données partielles).`}
        </p>
      </div>
    </div>
  );
}