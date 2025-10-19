import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts';
import { usePlayerCampPerformanceFromRaw } from '../../hooks/usePlayerCampPerformanceFromRaw';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { minGamesOptions} from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';



// Extended interface for chart display with highlighting support
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
}

export function PlayerCampPerformanceChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  
  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  
  // Use navigationState to restore state, with fallbacks
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.campPerformanceState?.selectedCampPerformanceCamp || 'Camp Villageois'
  );
  const [minGames, setMinGames] = useState<number>(
    navigationState.campPerformanceState?.selectedCampPerformanceMinGames || 3
  );
  
  const { playerCampPerformance, isLoading, error } = usePlayerCampPerformanceFromRaw();

  // Save initial state to navigation context if not already saved
  useEffect(() => {
    if (!navigationState.campPerformanceState) {
      updateNavigationState({
        campPerformanceState: {
          selectedCampPerformanceCamp: selectedCamp,
          selectedCampPerformanceMinGames: minGames
        }
      });
    }
  }, [selectedCamp, minGames, navigationState.campPerformanceState, updateNavigationState]);

  // Get available camps from camp averages, ordered by mainCampOrder
  const availableCamps = useMemo(() => {
    if (!playerCampPerformance?.campAverages) return ['Tous les camps'];
    
    const availableCampNames = playerCampPerformance.campAverages.map(camp => camp.camp);
    
    // Define the specific order we want with separators
    const orderedCamps = ['Tous les camps'];
    
    // Add Camp Villageois if available
    if (availableCampNames.includes('Camp Villageois')) {
      orderedCamps.push('Camp Villageois');
    }
    
    // Add individual villager roles if available
    if (availableCampNames.includes('Chasseur')) {
      orderedCamps.push('Chasseur');
    }
    
    if (availableCampNames.includes('Alchimiste')) {
      orderedCamps.push('Alchimiste');
    }
    
    // Add original Villageois if available (for backward compatibility)
    if (availableCampNames.includes('Villageois')) {
      orderedCamps.push('Villageois');
    }
    
    // Add Loups (Loup, Traître, Louveteau...) if available
    if (availableCampNames.includes('Camp Loup')) {
      orderedCamps.push('Camp Loup');
    }
    
    // Add Loup if available
    if (availableCampNames.includes('Loup')) {
      orderedCamps.push('Loup');
    }
    
    // Add Traître if available
    if (availableCampNames.includes('Traître')) {
      orderedCamps.push('Traître');
    }

      // Add Louveteau if available
    if (availableCampNames.includes('Louveteau')) {
      orderedCamps.push('Louveteau');
    }
    
    // Add Rôles spéciaux if available
    if (availableCampNames.includes('Rôles spéciaux')) {
      orderedCamps.push('Rôles spéciaux');
    }
    
    // Add remaining camps (solo/special roles) alphabetically
    const specialCamps = ['Camp Villageois', 'Camp Loup', 'Rôles spéciaux'];
    const mainCamps = ['Camp Villageois', 'Villageois', 'Chasseur', 'Alchimiste', 'Camp Loup', 'Loup', 'Traître', 'Louveteau']; 
    const excludedCamps = [...mainCamps, ...specialCamps];
    
    const otherCamps = availableCampNames
      .filter(camp => !excludedCamps.includes(camp))
      .sort(); // Sort other camps alphabetically
    
    return [...orderedCamps, ...otherCamps];
  }, [playerCampPerformance]);

  // Optimize data processing by combining operations and reducing redundant calculations
  const { campPlayerData, topPerformersData } = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance) {
      return { campPlayerData: [], topPerformersData: [] };
    }

    const { playerPerformance } = playerCampPerformance;
    
    // Single pass to process both camp-specific and top performers data
    const campPlayers = [];
    const allPerformances = [];
    
    // For Hall of Fame (top performers), we need to track BEST performance per player
    const playerBestPerformance = new Map<string, ChartPlayerCampPerformance>();
    
    for (const player of playerPerformance) {
      for (const cp of player.campPerformance) {
        if (cp.games >= minGames) {
          const uniqueKey = `${player.player}-${cp.camp}`;
          const performanceData: ChartPlayerCampPerformance = {
            player: player.player,
            camp: cp.camp,
            games: cp.games,
            wins: cp.wins,
            winRate: cp.winRate,
            performance: cp.performance,
            winRateNum: parseFloat(cp.winRate),
            performanceNum: parseFloat(cp.performance),
            campAvgWinRateNum: parseFloat(cp.campAvgWinRate),
            isHighlightedAddition: false,
            uniqueKey: uniqueKey,
            playerCamp: uniqueKey // Keep this for unique identification when needed
          };
          
          // For Hall of Fame, track only the BEST performance per player (matching achievement logic)
          const currentBest = playerBestPerformance.get(player.player);
          if (!currentBest || performanceData.performanceNum > currentBest.performanceNum) {
            playerBestPerformance.set(player.player, performanceData);
          }
          
          // Add to camp-specific data if it matches selected camp (skip for 'Tous les camps')
          if (selectedCamp !== 'Tous les camps' && cp.camp === selectedCamp) {
            campPlayers.push({
              player: player.player,
              ...cp,
              winRateNum: parseFloat(cp.winRate),
              performanceNum: parseFloat(cp.performance),
              campAvgWinRateNum: parseFloat(cp.campAvgWinRate),
              isHighlightedAddition: false,
              uniqueKey: uniqueKey,
              playerCamp: uniqueKey
            });
          }
        }
      }
    }
    
    // Convert best performances map to array for Hall of Fame
    allPerformances.push(...playerBestPerformance.values());

    // Helper function to add highlighted player if not already included
    const addHighlightedPlayer = (
      dataArray: ChartPlayerCampPerformance[],
      campFilter?: string,
      isHallOfFame: boolean = false
    ): ChartPlayerCampPerformance[] => {
      if (!settings.highlightedPlayer) return dataArray;

      // Check if highlighted player is already in the results
      const highlightedPlayerExists = dataArray.some(
        item => item.player === settings.highlightedPlayer && 
                (!campFilter || item.camp === campFilter)
      );

      if (highlightedPlayerExists) {
        return dataArray;
      }

      // Find highlighted player's data
      const highlightedPlayerData = playerPerformance.find(
        player => player.player === settings.highlightedPlayer
      );

      if (!highlightedPlayerData) return dataArray;

      // For Hall of Fame, add only the BEST performance (matching achievement logic)
      if (isHallOfFame) {
        let bestPerformance: ChartPlayerCampPerformance | null = null;
        
        for (const cp of highlightedPlayerData.campPerformance) {
          if (cp.games >= 1) { // Lower minimum for highlighted player
            const uniqueKey = `${highlightedPlayerData.player}-${cp.camp}`;
            const performanceData: ChartPlayerCampPerformance = {
              player: highlightedPlayerData.player,
              camp: cp.camp,
              games: cp.games,
              wins: cp.wins,
              winRate: cp.winRate,
              performance: cp.performance,
              winRateNum: parseFloat(cp.winRate),
              performanceNum: parseFloat(cp.performance),
              campAvgWinRateNum: parseFloat(cp.campAvgWinRate),
              isHighlightedAddition: true,
              uniqueKey: uniqueKey,
              playerCamp: uniqueKey
            };
            
            if (!bestPerformance || performanceData.performanceNum > bestPerformance.performanceNum) {
              bestPerformance = performanceData;
            }
          }
        }
        
        return bestPerformance ? [...dataArray, bestPerformance] : dataArray;
      }

      // For camp-specific view, add all matching performances
      const highlightedAdditions: ChartPlayerCampPerformance[] = [];
      
      for (const cp of highlightedPlayerData.campPerformance) {
        // For camp-specific view, only add if it matches the selected camp
        if ((!campFilter || cp.camp === campFilter) && cp.games >= 1) { // Lower minimum for highlighted player
          const uniqueKey = `${highlightedPlayerData.player}-${cp.camp}`;
          highlightedAdditions.push({
            player: highlightedPlayerData.player,
            camp: cp.camp,
            games: cp.games,
            wins: cp.wins,
            winRate: cp.winRate,
            performance: cp.performance,
            winRateNum: parseFloat(cp.winRate),
            performanceNum: parseFloat(cp.performance),
            campAvgWinRateNum: parseFloat(cp.campAvgWinRate),
            isHighlightedAddition: true,
            uniqueKey: uniqueKey,
            playerCamp: uniqueKey
          });
        }
      }

      return [...dataArray, ...highlightedAdditions];
    };

    // Add highlighted player to camp-specific data (only if not 'Tous les camps')
    const campPlayersWithHighlighted = selectedCamp !== 'Tous les camps' 
      ? addHighlightedPlayer(campPlayers, selectedCamp, false)
      : [];
    
    // Add highlighted player to top performers data (Hall of Fame mode - best performance only)
    const topPerformersWithHighlighted = addHighlightedPlayer(allPerformances, undefined, true);
    
    // Sort once for each dataset
    const sortedCampPlayers = campPlayersWithHighlighted.sort((a, b) => b.performanceNum - a.performanceNum);
    const sortedTopPerformers = topPerformersWithHighlighted
      .sort((a, b) => b.performanceNum - a.performanceNum);
    
    // Limit data smartly: top N + highlighted additions (only if not already in top N)
    const getTopPlayersWithHighlighted = (data: ChartPlayerCampPerformance[], limit: number) => {
      // Get top N players first
      const topPlayers = data.slice(0, limit);
      
      // Check if highlighted player is already in top N
      const highlightedPlayerInTop = topPlayers.some(p => p.player === settings.highlightedPlayer);
      
      // If highlighted player is already in top N, don't add as addition
      if (highlightedPlayerInTop || !settings.highlightedPlayer) {
        return topPlayers;
      }
      
      // Otherwise, add highlighted player as addition (with special flag)
      const highlightedPlayerData = data.find(p => p.player === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        const highlightedAddition = { ...highlightedPlayerData, isHighlightedAddition: true };
        return [...topPlayers, highlightedAddition];
      }
      
      return topPlayers;
    };
    
    return {
      campPlayerData: getTopPlayersWithHighlighted(sortedCampPlayers, 15),
      topPerformersData: getTopPlayersWithHighlighted(sortedTopPerformers, 15)
    };
  }, [playerCampPerformance, selectedCamp, minGames, settings.highlightedPlayer]);

  // Handler for bar chart clicks - navigate to game details
  const handleBarClick = (data: any) => {
    if (data && data.player) {
      // For specific camp view, use the selected camp
      if (selectedCamp !== 'Tous les camps') {
        // Handle special case for "Camp Loup"
        if (selectedCamp === 'Camp Loup') {
          navigateToGameDetails({
            selectedPlayer: data.player,
            campFilter: {
              selectedCamp: 'Camp Loup',
              campFilterMode: 'wins-only',
              excludeWolfSubRoles: false // Include all wolf roles
            },
            fromComponent: `Performance des Joueurs - ${selectedCamp}`
          });
        } else if (selectedCamp === 'Camp Villageois') {
          navigateToGameDetails({
            selectedPlayer: data.player,
            campFilter: {
              selectedCamp: 'Villageois',
              campFilterMode: 'wins-only',
              excludeVillagers: false // Include all villager roles
            },
            fromComponent: `Performance des Joueurs - ${selectedCamp}`
          });
        } else if (selectedCamp === 'Rôles spéciaux') {
          // For special roles, don't use camp filter - just show all games for the player
          navigateToGameDetails({
            selectedPlayer: data.player,
            fromComponent: `Performance des Joueurs - ${selectedCamp}`
          });
        } else {
          navigateToGameDetails({
            selectedPlayer: data.player,
            campFilter: {
              selectedCamp: selectedCamp,
              campFilterMode: 'wins-only',
              excludeWolfSubRoles: selectedCamp === 'Traître' || selectedCamp === 'Louveteau', // Exclude traitor and Louveteau from Loups filtering
              excludeVillagers: selectedCamp === 'Chasseur' || selectedCamp === 'Alchimiste' // Exclude Chasseur and Alchimiste from Villagers filtering
            },
            fromComponent: `Performance des Joueurs - ${selectedCamp}`
          });
        }
      } else {
        // For 'Tous les camps' view, use the camp from the data point
        if (data.camp === 'Camp Loup') {
          navigateToGameDetails({
            selectedPlayer: data.player,
            campFilter: {
              selectedCamp: 'Loup',
              campFilterMode: 'wins-only',
              excludeWolfSubRoles: false
            },
            fromComponent: `Performance des Joueurs - Tous les camps`
          });
        } else if (data.camp === 'Camp Villageois') {
          navigateToGameDetails({
            selectedPlayer: data.player,
            campFilter: {
              selectedCamp: 'Villageois',
              campFilterMode: 'wins-only',
              excludeWolfSubRoles: true
            },
            fromComponent: `Performance des Joueurs - Tous les camps`
          });
        } else if (data.camp === 'Rôles spéciaux') {
          // For special roles, don't use camp filter
          navigateToGameDetails({
            selectedPlayer: data.player,
            fromComponent: `Performance des Joueurs - Tous les camps`
          });
        } else {
          navigateToGameDetails({
            selectedPlayer: data.player,
            campFilter: {
              selectedCamp: data.camp,
              campFilterMode: 'wins-only',
              excludeWolfSubRoles: data.camp === 'Traître' || data.camp === 'Louveteau',
              excludeVillagers: data.camp === 'Chasseur' || data.camp === 'Alchimiste' 
            },
            fromComponent: `Performance des Joueurs - Tous les camps`
          });
        }
      }
    }
  };

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de performance par camp...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!playerCampPerformance) {
    return <div className="donnees-manquantes">Aucune donnée de performance par camp disponible</div>;
  }

  return (
    <div className="lycans-player-camp-performance">
      <h2>Meilleurs Performances par Camp</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="camp-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Camp:
          </label>
          <select
            id="camp-select"
            value={selectedCamp}
            onChange={(e) => {
              const newCamp = e.target.value;
              setSelectedCamp(newCamp);
              updateNavigationState({ 
                campPerformanceState: {
                  selectedCampPerformanceCamp: newCamp,
                  selectedCampPerformanceMinGames: minGames
                }
              });
            }}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '200px'
            }}
          >
            {availableCamps.map((camp) => {
              // Determine visual styling based on camp type
              let optionText = camp;
              let isIndented = false;
              let isSubGroup = false;
              let isMainText = false;
              
              if (camp === 'Tous les camps') {
                optionText = '📊 Hall of Fame';
                isMainText = true;
              } else if (camp === 'Camp Villageois') {
                optionText = '   🏘️ Camp Villageois';
                isIndented = true;
                isSubGroup = true;              
              } else if (camp === 'Villageois') {
                optionText = '   Villageois';
                isIndented = true;
              } else if (camp === 'Chasseur') {
                optionText = '     Chasseur';
                isIndented = true;
              } else if (camp === 'Alchimiste') {
                optionText = '     Alchimiste';
                isIndented = true;
              } else if (camp === 'Camp Loup') {
                optionText = '   🐺 Camp Loup';
                isIndented = true;
                isSubGroup = true;
              } else if (camp === 'Loup') {
                optionText = '     Loup';
                isIndented = true;
              } else if (camp === 'Traître') {
                optionText = '     Traître';
                isIndented = true;
              } else if (camp === 'Louveteau') {
                optionText = '     Louveteau';
                isIndented = true;
              } else if (camp === 'Rôles spéciaux') {
                optionText = '   ⭐ Rôles spéciaux';
                isIndented = true;
                isSubGroup = true;
              } else {
                // Individual special roles
                optionText = `     ${camp}`;
                isIndented = true;
              }
              
              return (
                <option 
                  key={camp} 
                  value={camp}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: isIndented ? '0.85rem' : '0.9rem',
                    fontWeight: isSubGroup ? 'bold' : 'normal',
                    color: isSubGroup ? 'var(--accent-primary)' : isMainText ? 'var(--accent-secondary)' : 'inherit'
                  }}
                >
                  {optionText}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="min-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Min. parties:
          </label>
          <select
            id="min-games-select"
            value={minGames}
            onChange={(e) => {
              const newMinGames = Number(e.target.value);
              setMinGames(newMinGames);
              updateNavigationState({ 
                campPerformanceState: {
                  selectedCampPerformanceCamp: selectedCamp,
                  selectedCampPerformanceMinGames: newMinGames
                }
              });
            }}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              width: '90px'
            }}
          >
          {minGamesOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          </select>
        </div>
      </div>

      {/* Visual explanation of grouping */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '1rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        fontStyle: 'italic'
      }}>
        <span>
          📊 = Tous les camps • 🏘️ = Villageois groupés • 🐺 = Loups groupés • ⭐ = Rôles spéciaux groupés
        </span>
      </div>

      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Camps Analysés</h3>
          <div className="lycans-valeur-principale">{playerCampPerformance.campAverages.length}</div>
          <p>camps différents</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Joueurs Évalués</h3>
          <div className="lycans-valeur-principale">{playerCampPerformance.playerPerformance.length}</div>
          <p>joueurs analysés</p>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Unified Player Performance View */}
        <div className="lycans-graphique-section">
          <h3>
            {selectedCamp === 'Tous les camps' 
              ? 'Meilleurs performances - Tous les camps'
              : `Meilleurs joueurs en ${selectedCamp}`
            }
          </h3>
          <FullscreenChart title={
            selectedCamp === 'Tous les camps' 
              ? 'Meilleurs Performances - Tous les camps'
              : `Meilleurs Joueurs - ${selectedCamp}`
          }>
          <div style={{ height: selectedCamp === 'Tous les camps' ? 600 : 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData} 
                margin={{ top: 20, right: 30, left: 20, bottom: selectedCamp === 'Tous les camps' ? 20 : 0 }}
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
                    const dataArray = selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData;
                    const dataPoint = dataArray[index];
                    const displayText = dataPoint?.player || payload.value;
                    const isHighlighted = settings.highlightedPlayer === (dataPoint?.player || payload.value);
                    
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
                  label={{ value: 'Performance vs moyenne (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}                 
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
                          <div>Parties: {dataPoint.games}</div>
                          <div>Victoires: {dataPoint.wins}</div>
                          <div>Taux personnel: {dataPoint.winRate}%</div>
                          {selectedCamp !== 'Tous les camps' && <div>Moyenne camp: {dataPoint.campAvgWinRate}%</div>}
                          <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}</div>
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
                   dataKey="performanceNum" 
                   style={{ cursor: 'pointer' }}
                   onClick={handleBarClick}
                 >
                 {(selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData).map((entry, index) => {
                   const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                   const isHighlightedAddition = entry.isHighlightedAddition;
                   
                   return (
                    <Cell
                       key={`cell-${index}`}
                       fill={
                         selectedCamp === 'Tous les camps'
                           ? lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`
                           : playersColor[entry.player] || (entry.performanceNum >= 0 ? 'var(--accent-tertiary)' : 'var(--accent-danger)')
                       }
                       stroke={
                         isHighlightedFromSettings 
                           ? 'var(--accent-primary)' 
                           : 'transparent'
                       }
                       strokeWidth={
                         isHighlightedFromSettings 
                           ? 3 
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
        </div>

        {/* Scatter chart - show for all selections */}
        <div className="lycans-graphique-section">
          <h3>
            {selectedCamp === 'Tous les camps' 
              ? 'Performances sur nombre de parties jouées - Tous les camps'
              : `Performances en ${selectedCamp} sur nombre de parties jouées`
            }
          </h3>
          <FullscreenChart title={
            selectedCamp === 'Tous les camps' 
              ? 'Performances vs Parties Jouées - Tous les camps'
              : `Performances vs Parties Jouées - ${selectedCamp}`
          }>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                 data={selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData}
                 margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis 
                    dataKey="games"
                    type="number"
                    label={{ value: 'Parties jouées', position: 'insideBottom', offset: -10 }}
                 />
                 <YAxis 
                    dataKey="performanceNum"
                    type="number"
                    label={{ value: 'Performance (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                          {selectedCamp === 'Tous les camps' && <div>Camp: {dataPoint.camp}</div>}
                          <div>Parties: {dataPoint.games}</div>
                          <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}</div>
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
                  dataKey="performanceNum"
                  name="Performance"
                  onClick={(data: any) => {
                    if (data && data.player) {
                      // For "Tous les camps", use the camp from the data point
                      // For specific camp, use the selected camp
                      if (selectedCamp === 'Tous les camps') {
                        if (data.camp === 'Camp Loup') {
                          navigateToGameDetails({
                            selectedPlayer: data.player,
                            campFilter: {
                              selectedCamp: 'Loup',
                              campFilterMode: 'wins-only',
                              excludeWolfSubRoles: false
                            },
                            fromComponent: 'Relation Parties Jouées vs Performance - Tous les camps'
                          });
                        } else if (data.camp === 'Rôles spéciaux') {
                          navigateToGameDetails({
                            selectedPlayer: data.player,
                            fromComponent: 'Relation Parties Jouées vs Performance - Tous les camps'
                          });
                        } else {
                          navigateToGameDetails({
                            selectedPlayer: data.player,
                            campFilter: {
                              selectedCamp: data.camp,
                              campFilterMode: 'wins-only',
                              excludeWolfSubRoles: data.camp === 'Traître' || data.camp === 'Louveteau', // Exclude traitor and Louveteau from Loups filtering
                            },
                            fromComponent: 'Relation Parties Jouées vs Performance - Tous les camps'
                          });
                        }
                      } else {
                        if (selectedCamp === 'Camp Loup') {
                          navigateToGameDetails({
                            selectedPlayer: data.player,
                            campFilter: {
                              selectedCamp: 'Loup',
                              campFilterMode: 'wins-only',
                              excludeWolfSubRoles: false
                            },
                            fromComponent: `Relation Parties Jouées vs Performance - ${selectedCamp}`
                          });
                        } else if (selectedCamp === 'Rôles spéciaux') {
                          navigateToGameDetails({
                            selectedPlayer: data.player,
                            fromComponent: `Relation Parties Jouées vs Performance - ${selectedCamp}`
                          });
                        } else {
                          navigateToGameDetails({
                            selectedPlayer: data.player,
                            campFilter: {
                              selectedCamp: selectedCamp,
                              campFilterMode: 'wins-only',
                              excludeWolfSubRoles: selectedCamp === 'Traître' || selectedCamp === 'Louveteau' // Exclude traitor and Louveteau from Loups filtering
                            },
                            fromComponent: `Relation Parties Jouées vs Performance - ${selectedCamp}`
                          });
                        }
                      }
                    }
                  }}
                  shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                    const isHighlighted = settings.highlightedPlayer === props.payload?.player;
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
                  )}}
                />
              </ScatterChart>
              </ResponsiveContainer>
          </div>
          </FullscreenChart>
        </div>

      </div>
    </div>
  );
}