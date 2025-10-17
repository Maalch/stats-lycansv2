import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { usePlayerGameHistoryFromRaw } from '../../hooks/usePlayerGameHistoryFromRaw';
import { usePlayerStatsFromRaw } from '../../hooks/usePlayerStatsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor, lycansOtherCategoryColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { getGroupedMapStats } from '../../hooks/utils/playerGameHistoryUtils';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';

type GroupByMethod = 'session' | 'month';
type ViewType = 'performance' | 'camp' | 'map' | 'kills';

export function PlayerGameHistoryChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  
// Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Get available players from the player stats hook
  const { data: playerStatsData } = usePlayerStatsFromRaw();

  // Create list of available players for the dropdown
  const availablePlayers = useMemo(() => {
    if (!playerStatsData?.playerStats) return ['Ponce'];
    const players = playerStatsData.playerStats
      .filter(player => player.gamesPlayed > 0)
      .map(player => player.player)
      .sort();
    
    // Ensure highlighted player is in the list if it exists and has games
    if (settings.highlightedPlayer && 
        !players.includes(settings.highlightedPlayer) && 
        playerStatsData.playerStats.some(p => p.player === settings.highlightedPlayer && p.gamesPlayed > 0)) {
      players.push(settings.highlightedPlayer);
      players.sort();
    }
    
    return players;
  }, [playerStatsData, settings.highlightedPlayer]);

  // Use navigationState for persistence, with smart fallback logic
  const getDefaultSelectedPlayer = () => {
    // First priority: existing navigation state
    if (navigationState.selectedPlayerName && availablePlayers.includes(navigationState.selectedPlayerName)) {
      return navigationState.selectedPlayerName;
    }

    // Second priority: highlighted player from settings (if available)
    if (settings.highlightedPlayer && availablePlayers.includes(settings.highlightedPlayer)) {
      return settings.highlightedPlayer;
    }

    // Third priority: select 'Ponce' if present, else first available player
    if (availablePlayers.includes('Ponce')) {
      return 'Ponce';
    }
    return availablePlayers[0] || '';
  };

  const selectedPlayerName = getDefaultSelectedPlayer();
  const groupingMethod = navigationState.groupingMethod || 'session';
  const selectedViewType = navigationState.selectedViewType || 'performance';
  
  // Update functions that also update the navigation state
  const setSelectedPlayerName = (playerName: string) => {
    updateNavigationState({ selectedPlayerName: playerName });
  };
  
  const setGroupingMethod = (method: GroupByMethod) => {
    updateNavigationState({ groupingMethod: method });
  };

  const setSelectedViewType = (viewType: ViewType) => {
    updateNavigationState({ selectedViewType: viewType });
  };

  const { data, isLoading, error } = usePlayerGameHistoryFromRaw(selectedPlayerName);

  // Optimized date parsing - cache parsed dates to avoid repeated parsing
  const parsedDataCache = useMemo(() => {
    if (!data?.games) return new Map();
    
    const cache = new Map();
    data.games.forEach(game => {
      if (!cache.has(game.date)) {
        const parts = game.date.split('/');
        if (parts.length === 3) {
          cache.set(game.date, new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime());
        } else {
          cache.set(game.date, new Date(game.date).getTime());
        }
      }
    });
    return cache;
  }, [data?.games]);

  // Group games by the selected method with optimized sorting
  const groupedData = useMemo(() => {
    if (!data?.games) return [];

    const grouped: Record<string, { games: any[], wins: number, total: number }> = {};

    data.games.forEach(game => {
      let groupKey: string;
      
      if (groupingMethod === 'month') {
        // Extract month/year from DD/MM/YYYY format
        const dateParts = game.date.split('/');
        if (dateParts.length === 3) {
          groupKey = `${dateParts[1]}/${dateParts[2]}`; // MM/YYYY
        } else {
          groupKey = game.date;
        }
      } else {
        // Group by session (by date)
        groupKey = game.date;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { games: [], wins: 0, total: 0 };
      }

      grouped[groupKey].games.push(game);
      grouped[groupKey].total++;
      if (game.won) {
        grouped[groupKey].wins++;
      }
    });

    // Convert to array and calculate percentages
    return Object.entries(grouped)
      .map(([period, stats]) => ({
        period,
        totalGames: stats.total,
        victories: stats.wins,
        defeats: stats.total - stats.wins, // Add defeats
        winRate: stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : '0.0',
        winRateNum: stats.total > 0 ? (stats.wins / stats.total * 100) : 0
      }))
      .sort((a, b) => {
        // Optimized sorting using cached date parsing
        if (groupingMethod === 'month') {
          const [monthA, yearA] = a.period.split('/');
          const [monthB, yearB] = b.period.split('/');
          const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, 1);
          const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, 1);
          return dateA.getTime() - dateB.getTime();
        } else {
          // Use cached parsed dates for session sorting
          const timeA = parsedDataCache.get(a.period) || 0;
          const timeB = parsedDataCache.get(b.period) || 0;
          return timeA - timeB;
        }
      });
  }, [data, groupingMethod, parsedDataCache]);

  // Prepare camp distribution data for pie chart
  const campDistributionData = useMemo(() => {
    if (!data?.campStats) return [];
    
    return Object.entries(data.campStats).map(([camp, stats]) => ({
      name: camp,
      value: stats.appearances,
      winRate: stats.winRate,
      winRateDisplay: Math.max(parseFloat(stats.winRate), 1), // Ensure minimum 1% for visibility
      wins: stats.wins,
      percentage: ((stats.appearances / data.totalGames) * 100).toFixed(1)
    }));
  }, [data]);

  // Group small slices into "Autres" for pie chart
  const groupedCampDistributionData = useMemo(() => {
    if (!campDistributionData.length) return [];
    
    const MIN_PERCENT = 5;
    let smallTotal = 0;
    const smallEntries: typeof campDistributionData = [];
    const large: typeof campDistributionData = [];
    
    campDistributionData.forEach(entry => {
      if (parseFloat(entry.percentage) < MIN_PERCENT) {
        smallTotal += Number(entry.value);
        smallEntries.push(entry);
      } else {
        large.push(entry);
      }
    });
    
    if (smallTotal > 0) {
      const totalGames = campDistributionData.reduce((sum, e) => sum + Number(e.value), 0);
      large.push({
        name: 'Autres',
        value: smallTotal,
        winRate: '0.0', // Will be calculated from details if needed
        wins: smallEntries.reduce((sum, e) => sum + e.wins, 0),
        percentage: ((smallTotal / totalGames) * 100).toFixed(1),
        // @ts-ignore
        _details: smallEntries // Attach details for tooltip
      });
    }
    
    return large;
  }, [campDistributionData]);

  // Prepare map performance data
  const mapPerformanceData = useMemo(() => {
    if (!data?.mapStats) return [];
    
    // Group maps using the utility function
    const groupedMapStats = getGroupedMapStats(data.mapStats);
    
    return Object.entries(groupedMapStats).map(([mapName, stats]) => ({
      name: mapName,
      value: stats.appearances,
      winRate: stats.winRate,
      winRateDisplay: Math.max(parseFloat(stats.winRate), 0.1), // Ensure minimum for visibility
      wins: stats.wins,
      percentage: ((stats.appearances / data.totalGames) * 100).toFixed(1)
    }));
  }, [data]);

  // Get filtered game data to calculate kill statistics
  const { gameData: filteredGameData } = useCombinedFilteredRawData();

  // Calculate kill statistics for the selected player from raw game data
  const killStatistics = useMemo(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return { playersKilled: [], killedBy: [] };
    }

    // Maps to track kills
    const playersKilledMap: Record<string, number> = {};
    const killedByMap: Record<string, number> = {};

    // Process each game
    filteredGameData.forEach(game => {
      const selectedPlayerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!selectedPlayerStat) return; // Player not in this game

      // Track players killed BY the selected player
      game.PlayerStats.forEach(victim => {
        if (victim.KillerName?.toLowerCase() === selectedPlayerName.toLowerCase()) {
          playersKilledMap[victim.Username] = (playersKilledMap[victim.Username] || 0) + 1;
        }
      });

      // Track players who killed the selected player
      if (selectedPlayerStat.KillerName) {
        killedByMap[selectedPlayerStat.KillerName] = (killedByMap[selectedPlayerStat.KillerName] || 0) + 1;
      }
    });

    // Convert to arrays and sort by count
    const playersKilled = Object.entries(playersKilledMap)
      .map(([player, count]) => ({ player, kills: count }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10); // Top 10

    const killedBy = Object.entries(killedByMap)
      .map(([player, count]) => ({ player, kills: count }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10); // Top 10

    return { playersKilled, killedBy };
  }, [filteredGameData, selectedPlayerName]);

  // Helper functions when there are too much data
  const getResponsiveXAxisSettings = (dataLength: number) => {
    if (dataLength <= 15) return { fontSize: 12, angle: -45, height: 80, interval: 0 };
    if (dataLength <= 30) return { fontSize: 12, angle: -45, height: 85, interval: 1 };
    if (dataLength <= 50) return { fontSize: 12, angle: -60, height: 95, interval: 2 };
    return { fontSize: 12, angle: -75, height: 105, interval: Math.floor(dataLength / 12) };
  };

  // Apply to both LineChart and BarChart XAxis
  const xAxisSettings = getResponsiveXAxisSettings(groupedData.length);


  if (isLoading) {
    return <div className="donnees-attente">Chargement de l'historique du joueur...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée d'historique disponible</div>;
  }

  return (
    <div className="lycans-player-history">
      <h2>Historique Détaillé d'un Joueur</h2>
      
      {/* Player Selection Control */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="player-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Joueur:
          </label>
          <select
            id="player-select"
            value={selectedPlayerName}
            onChange={(e) => setSelectedPlayerName(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '120px'
            }}
          >
            {availablePlayers.map(player => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Type Selection */}
      <div className="lycans-categories-selection">
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'performance' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('performance')}
        >
          Évolution
        </button>
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'camp' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('camp')}
        >
          Camp
        </button>
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'map' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('map')}
        >
          Map
        </button>
        <button
          className={`lycans-categorie-btn ${selectedViewType === 'kills' ? 'active' : ''}`}
          onClick={() => setSelectedViewType('kills')}
        >
          Kills
        </button>
      </div>

      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Total Parties</h3>
          <div 
            className="lycans-valeur-principale lycans-clickable" 
            onClick={() => {
              navigateToGameDetails({
                selectedPlayer: selectedPlayerName,
                fromComponent: 'Historique Joueur - Total Parties'
              });
            }}
            title={`Cliquer pour voir toutes les parties de ${selectedPlayerName}`}
          >
            {data.totalGames}
          </div>
          <p>parties jouées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Victoires</h3>
          <div 
            className="lycans-valeur-principale lycans-clickable" 
            onClick={() => {
              navigateToGameDetails({
                selectedPlayer: selectedPlayerName,
                selectedPlayerWinMode: 'wins-only',
                fromComponent: 'Historique Joueur - Victoires'
              });
            }}
            title={`Cliquer pour voir toutes les victoires de ${selectedPlayerName}`}
          >
            {data.totalWins}
          </div>
          <p>parties gagnées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Taux de Victoire</h3>
          <div className="lycans-valeur-principale">{data.winRate}%</div>
          <p>pourcentage global</p>
        </div>
      </div>

      {/* Performance View */}
      {selectedViewType === 'performance' && (
        <>
          {/* Grouping Control - Only for Performance View */}
          <div className="lycans-controls-section" style={{ 
            display: 'flex', 
            gap: '2rem', 
            marginBottom: '2rem', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="grouping-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Groupement:
              </label>
              <select
                id="grouping-select"
                value={groupingMethod}
                onChange={(e) => setGroupingMethod(e.target.value as GroupByMethod)}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  fontSize: '0.9rem',
                  minWidth: '120px'
                }}
              >
                <option value="session">Par session</option>
                <option value="month">Par mois</option>
              </select>
            </div>
          </div>

          <div className="lycans-graphiques-groupe">
            {/* Performance over time */}
            <div className="lycans-graphique-section">
            <h3>Évolution des Performances {groupingMethod === 'month' ? 'par Mois' : 'par Session'}</h3>
          <FullscreenChart title={`Évolution des Performances ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    // Find the data point by matching the period
                    const dataPoint = groupedData.find(item => item.period === data.activeLabel);
                    if (dataPoint) {
                      navigateToGameDetails({
                        selectedPlayer: selectedPlayerName,
                        selectedDate: dataPoint.period,
                        fromComponent: `Évolution des Performances ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`
                      });
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  angle={xAxisSettings.angle}
                  textAnchor="end"
                  height={xAxisSettings.height}
                  interval={xAxisSettings.interval}
                  fontSize={xAxisSettings.fontSize}
                />
                <YAxis 
                  label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                  domain={[0, 100]}
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
                          <div><strong>{dataPoint.period}</strong></div>
                          <div>Parties: {dataPoint.totalGames}</div>
                          <div>Victoires: {dataPoint.victories}</div>
                          <div>Taux: {dataPoint.winRate}%</div>
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
                <Line 
                  type="monotone" 
                  dataKey="winRateNum" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </FullscreenChart>
        </div>

        {/* Games per period */}
        <div className="lycans-graphique-section">
          <h3>Répartition Victoires/Défaites {groupingMethod === 'month' ? 'par Mois' : 'par Session'}</h3>
          <FullscreenChart title={`Répartition Victoires/Défaites ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  angle={xAxisSettings.angle}
                  textAnchor="end"
                  height={xAxisSettings.height}
                  interval={xAxisSettings.interval}
                  fontSize={xAxisSettings.fontSize}
                />
                <YAxis 
                  label={{ value: 'Nombre de parties', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                  allowDecimals={false}
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
                          <div><strong>{dataPoint.period}</strong></div>
                          <div>Total: {dataPoint.totalGames} parties</div>
                          <div>Victoires: {dataPoint.victories}</div>
                          <div>Défaites: {dataPoint.defeats}</div>
                          <div>Taux: {dataPoint.winRate}%</div>
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
                <Bar dataKey="victories" stackId="games" fill="var(--accent-tertiary)" name="Victoires">
                  {groupedData.map((entry, index) => (
                    <Cell
                      key={`cell-victories-${index}`}
                      fill="var(--accent-tertiary)"
                      onClick={() => {
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          selectedDate: entry.period,
                          fromComponent: `Historique Joueur - Victoires ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
                <Bar dataKey="defeats" stackId="games" fill="var(--chart-color-4)" name="Défaites">
                  {groupedData.map((entry, index) => (
                    <Cell
                      key={`cell-defeats-${index}`}
                      fill="var(--chart-color-4)"
                      onClick={() => {
                        navigateToGameDetails({
                          selectedPlayer: selectedPlayerName,
                          selectedDate: entry.period,
                          fromComponent: `Historique Joueur - Défaites ${groupingMethod === 'month' ? 'par Mois' : 'par Session'}`
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </FullscreenChart>
        </div>
          </div>
        </>
      )}

      {/* Camp View */}
      {selectedViewType === 'camp' && (
        <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Distribution par Camps</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={groupedCampDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry: any) => {
                    const pct = entry.percent !== undefined ? entry.percent : 0;
                    return entry.name === 'Autres' 
                      ? `Autres : ${entry.value} (${(pct * 100).toFixed(1)}%)`  
                      : `${entry.name}: ${entry.value} (${(pct * 100).toFixed(1)}%)`;
                  }}
                >
                  {groupedCampDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'Autres'
                          ? lycansOtherCategoryColor
                          : lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`
                      }
                      onClick={() => {
                        if (entry.name === 'Autres') {
                          // For "Autres", we'll navigate to show all games from the small camps
                          // Pass the list of small camps in the navigation
                          const smallCampNames = (entry as any)._details?.map((detail: any) => detail.name) || [];
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: 'Autres',
                              campFilterMode: 'all-assignments',
                              _smallCamps: smallCampNames
                            },
                            fromComponent: 'Distribution par Camps'
                          });
                        } else if (entry.name === 'Traître' || entry.name === 'Louveteau') {
                          // Special handling for wolf sub roles, add excludeWolfSubRoles flag
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'all-assignments',
                              excludeWolfSubRoles: true
                            },
                            fromComponent: 'Distribution par Camps'
                          });
                        } else if (entry.name === 'Loup') {
                          // When clicking on Loups, exclude sub roles games to show only regular wolf games
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: 'Loup',
                              campFilterMode: 'all-assignments',
                              excludeWolfSubRoles: true
                            },
                            fromComponent: 'Distribution par Camps'
                          });
                        } else {
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            campFilter: {
                              selectedCamp: entry.name,
                              campFilterMode: 'all-assignments'
                            },
                            fromComponent: 'Distribution par Camps'
                          });
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const dataPoint = payload[0].payload;
                      if (dataPoint.name === 'Autres' && dataPoint._details) {
                        // Sort the details by descending appearances
                        const sortedDetails = [...dataPoint._details].sort(
                          (a, b) => b.value - a.value
                        );
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>Autres - {dataPoint.value} parties ({dataPoint.percentage}%)</strong></div>
                            <div>
                              {sortedDetails.map((entry: any, i: number) => (
                                <div key={i}>
                                  {entry.name}: {entry.value} parties ({entry.percentage}%)
                                </div>
                              ))}
                            </div>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--chart-color-1)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              Cliquez pour voir toutes les parties de ces camps
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)'
                        }}>
                          <div><strong>{dataPoint.name} ({dataPoint.percentage}%)</strong></div>
                          <div>Apparitions: {dataPoint.value}</div>
                          <div>Victoires: {dataPoint.wins} ({dataPoint.winRate}%)</div>
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
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Camp Performance */}
        <div className="lycans-graphique-section">
          <h3>Performance par Camp</h3>
          <FullscreenChart title="Performance par Camp">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={campDistributionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={90}
                    interval={0}
                    fontSize={14}
                  />
                  <YAxis 
                    label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                    domain={[0, 100]}
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
                            <div><strong>{dataPoint.name}</strong></div>
                            <div>Victoires: {dataPoint.wins} / {dataPoint.value}</div>
                            <div>Taux: {dataPoint.winRate}%</div>
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
                  <Bar dataKey="winRateDisplay">
                    {campDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          // Use a dimmed color for camps with 0 wins to indicate they have no victories
                          parseFloat(entry.winRate) === 0
                            ? `${lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`}50`
                            : lycansColorScheme[entry.name as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`
                        }
                        onClick={() => {
                          // Special handling for Wolf sub roles and Loups camps
                          if (entry.name === 'Traître' || entry.name === 'Louveteau') {
                            navigateToGameDetails({
                              selectedPlayer: selectedPlayerName,
                              campFilter: {
                                selectedCamp: entry.name,
                                campFilterMode: 'all-assignments',
                                excludeWolfSubRoles: true
                              },
                              fromComponent: 'Performance par Camp'
                            });
                          } else if (entry.name === 'Loup') {
                            // When clicking on Loups, exclude traitor games to show only regular wolf games
                            navigateToGameDetails({
                              selectedPlayer: selectedPlayerName,
                              campFilter: {
                                selectedCamp: entry.name,
                                campFilterMode: 'all-assignments',
                                excludeWolfSubRoles: true
                              },
                              fromComponent: 'Performance par Camp'
                            });
                          } else {
                            navigateToGameDetails({
                              selectedPlayer: selectedPlayerName,
                              campFilter: {
                                selectedCamp: entry.name,
                                campFilterMode: 'all-assignments',
                              },
                              fromComponent: 'Performance par Camp'
                            });
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
        </div>
      )}

      {/* Kills View */}
      {selectedViewType === 'kills' && (
        <div className="lycans-graphiques-groupe">
          {/* Players Most Killed */}
          {killStatistics.playersKilled.length > 0 ? (
            <div className="lycans-graphique-section">
              <h3>Joueurs les plus souvent tués</h3>
              <FullscreenChart title="Joueurs les plus souvent tués">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={killStatistics.playersKilled}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="player"
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        interval={0}
                        fontSize={14}
                      />
                      <YAxis 
                        label={{ value: 'Nombre de kills', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                        allowDecimals={false}
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
                                <div><strong>{dataPoint.player}</strong></div>
                                <div>Tué {dataPoint.kills} fois par {selectedPlayerName}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="kills">
                        {killStatistics.playersKilled.map((entry, index) => (
                          <Cell 
                            key={`cell-killed-${index}`} 
                            fill={playersColor[entry.player] || "var(--chart-color-3)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <h3>Aucun kill enregistré</h3>
              <p>{selectedPlayerName} n'a tué aucun joueur dans les parties enregistrées.</p>
            </div>
          )}

          {/* Players Killed By Most */}
          {killStatistics.killedBy.length > 0 ? (
            <div className="lycans-graphique-section">
              <h3>Le plus souvent tué par</h3>
              <FullscreenChart title="Le plus souvent tué par">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={killStatistics.killedBy}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="player"
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        interval={0}
                        fontSize={14}
                      />
                      <YAxis 
                        label={{ value: 'Nombre de kills', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                        allowDecimals={false}
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
                                <div><strong>{dataPoint.player}</strong></div>
                                <div>A tué {selectedPlayerName} {dataPoint.kills} fois</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="kills">
                        {killStatistics.killedBy.map((entry, index) => (
                          <Cell 
                            key={`cell-killer-${index}`} 
                            fill={playersColor[entry.player] || "var(--chart-color-4)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <h3>Aucune mort par kill</h3>
              <p>{selectedPlayerName} n'a jamais été tué par un autre joueur dans les parties enregistrées.</p>
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {selectedViewType === 'map' && mapPerformanceData.length > 0 && (
        <div className="lycans-graphiques-groupe">
          <div className="lycans-graphique-section">
            <h3>Performance par Carte</h3>
                     
            <FullscreenChart title="Performance par Carte">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mapPerformanceData}
                    margin={{ top: 20, right: 140, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={90}
                      interval={0}
                      fontSize={14}
                    />
                    <YAxis 
                      label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                      domain={[0, 100]}
                    />
                    {/* Add reference lines for average and 50% */}
                    <ReferenceLine 
                      y={50} 
                      stroke="var(--text-secondary)" 
                      strokeDasharray="5 5" 
                      strokeOpacity={0.5}
                    />
                    {(() => {
                      // Calculate overall average win rate for reference
                      if (mapPerformanceData.length > 0) {
                        const totalGames = mapPerformanceData.reduce((sum, map) => sum + map.value, 0);
                        const totalWins = mapPerformanceData.reduce((sum, map) => sum + map.wins, 0);
                        const avgWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
                        
                        if (avgWinRate !== 50) {
                          return (
                            <ReferenceLine 
                              y={avgWinRate} 
                              stroke="var(--accent-primary)" 
                              strokeDasharray="3 3" 
                              strokeOpacity={0.7}
                              label={{ 
                                value: `Moyenne: ${avgWinRate.toFixed(1)}%`, 
                                position: "right", 
                                offset: 5,
                                style: { fill: 'var(--accent-primary)' }
                              }}
                            />
                          );
                        }
                      }
                      return null;
                    })()}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const dataPoint = payload[0].payload;
                          
                          // Calculate comparison with other maps
                          const comparisons: { map: string; diff: number; better: boolean }[] = [];
                          mapPerformanceData.forEach(otherMap => {
                            if (otherMap.name !== dataPoint.name && otherMap.value >= 5) { // Only compare with maps that have enough games
                              const diff = parseFloat(dataPoint.winRate) - parseFloat(otherMap.winRate);
                              if (Math.abs(diff) >= 2) { // Only show significant differences
                                comparisons.push({
                                  map: otherMap.name,
                                  diff: diff,
                                  better: diff > 0
                                });
                              }
                            }
                          });
                          
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)',
                              maxWidth: '250px'
                            }}>
                              <div><strong>{dataPoint.name}</strong></div>
                              <div>Parties: {dataPoint.value}</div>
                              <div>Victoires: {dataPoint.wins}</div>
                              <div style={{ marginBottom: '0.5rem' }}>
                                <strong>Taux: {dataPoint.winRate}%</strong>
                              </div>
                              
                              {comparisons.length > 0 && (
                                <div style={{ 
                                  borderTop: '1px solid var(--border-color)',
                                  paddingTop: '0.5rem',
                                  marginTop: '0.5rem'
                                }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    Comparaisons:
                                  </div>
                                  {comparisons.map((comp, idx) => (
                                    <div key={idx} style={{ 
                                      fontSize: '0.75rem',
                                      color: comp.better ? 'var(--accent-tertiary)' : 'var(--chart-color-4)'
                                    }}>
                                      {comp.better ? '↗' : '↘'} {Math.abs(comp.diff).toFixed(1)}% vs {comp.map}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div style={{ 
                                fontSize: '0.7rem', 
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
                      dataKey="winRateDisplay"
                      label={(props: any) => {
                        // Add percentage labels on top of bars
                        const { name, x, y, width } = props;
                        if (x === undefined || y === undefined || width === undefined) return null;
                        const percentage = mapPerformanceData.find(d => d.name === name)?.winRate || '0';
                        return (
                          <text 
                            x={(x as number) + (width as number) / 2} 
                            y={(y as number) - 5} 
                            fill="var(--text-primary)" 
                            textAnchor="middle" 
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {percentage}%
                          </text>
                        );
                      }}
                      onClick={(data) => {
                        // Handle click on the entire bar - get the map name from the clicked data
                        if (data && data.name) {
                          navigateToGameDetails({
                            selectedPlayer: selectedPlayerName,
                            selectedMapName: data.name,
                            fromComponent: 'Performance par Carte'
                          });
                        }
                      }}
                    >
                      {mapPerformanceData.map((entry, index) => {
                        // Define colors for specific maps with enhanced contrast
                        let fillColor;
                        
                        if (entry.name === 'Village') {
                          fillColor = 'var(--accent-secondary)';
                        } else if (entry.name === 'Château') {
                          fillColor = 'var(--accent-tertiary)';
                        } else if (entry.name === 'Autres') {
                          fillColor = lycansOtherCategoryColor;
                        } else {
                          fillColor = `var(--chart-color-${(index % 6) + 1})`;
                        }

                        // Highlight the best performing map
                        const bestWinRate = Math.max(...mapPerformanceData.map(m => parseFloat(m.winRate)));
                        const isHighest = parseFloat(entry.winRate) === bestWinRate && bestWinRate > 0;

                        return (
                          <Cell 
                            key={`cell-map-${index}`} 
                            fill={
                              parseFloat(entry.winRate) === 0
                                ? `${fillColor}30`  // More dimmed for 0% win rate
                                : fillColor
                            }
                            stroke='transparent'
                            strokeWidth={isHighest ? 3 : 1}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        </div>
      )}

      {selectedViewType === 'map' && mapPerformanceData.length === 0 && (
        <div className="lycans-empty-section">
          <h3>Aucune donnée de carte disponible</h3>
          <p>Aucune statistique de carte n'est disponible pour ce joueur.</p>
        </div>
      )}
    </div>
  );
}