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
  const [viewMode, setViewMode] = useState<'performance' | 'playPercentage'>(
    navigationState.campPerformanceState?.viewMode || 'performance'
  );
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
          viewMode: viewMode,
          selectedCampPerformanceCamp: selectedCamp,
          selectedCampPerformanceMinGames: minGames
        }
      });
    }
  }, [viewMode, selectedCamp, minGames, navigationState.campPerformanceState, updateNavigationState]);

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
    
    // Add original Villageois if available (for backward compatibility)
    if (availableCampNames.includes('Villageois')) {
      orderedCamps.push('Villageois');
    }
    
    // Add individual villager roles if available
    if (availableCampNames.includes('Chasseur')) {
      orderedCamps.push('Chasseur');
    }
    
    if (availableCampNames.includes('Alchimiste')) {
      orderedCamps.push('Alchimiste');
    }

    if (availableCampNames.includes('Protecteur')) {
      orderedCamps.push('Protecteur');
    }

    if (availableCampNames.includes('Disciple')) {
      orderedCamps.push('Disciple');
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
    const mainCamps = ['Camp Villageois', 'Villageois', 'Chasseur', 'Alchimiste', 'Protecteur', 'Disciple', 'Camp Loup', 'Loup', 'Traître', 'Louveteau']; 
    const excludedCamps = [...mainCamps, ...specialCamps];
    
    const otherCamps = availableCampNames
      .filter(camp => !excludedCamps.includes(camp))
      .sort(); // Sort other camps alphabetically
    
    return [...orderedCamps, ...otherCamps];
  }, [playerCampPerformance]);

  // Data processing for play percentage view
  const { campPlayPercentageData, topPlayPercentageData, totalPlayPercentagePlayers } = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance || viewMode !== 'playPercentage') {
      return { campPlayPercentageData: [], topPlayPercentageData: [], totalPlayPercentagePlayers: 0 };
    }

    const { playerPerformance } = playerCampPerformance;
    
    interface PlayPercentageEntry extends ChartPlayerCampPerformance {
      totalGames: number;
      playPercentage: number;
    }
    
    const campPlayers: PlayPercentageEntry[] = [];
    const allPercentages: PlayPercentageEntry[] = [];
    const playerBestPercentage = new Map<string, PlayPercentageEntry>();
    
    for (const player of playerPerformance) {
      // Calculate total games for this player
      const totalGames = player.campPerformance.reduce((sum, cp) => sum + cp.games, 0);
      
      for (const cp of player.campPerformance) {
        if (cp.games >= minGames) {
          const playPercentage = (cp.games / totalGames) * 100;
          const uniqueKey = `${player.player}-${cp.camp}`;
          const percentageData: PlayPercentageEntry = {
            player: player.player,
            camp: cp.camp,
            games: cp.games,
            wins: cp.wins,
            winRate: cp.winRate,
            performance: cp.performance,
            winRateNum: parseFloat(cp.winRate),
            performanceNum: parseFloat(cp.performance),
            campAvgWinRateNum: parseFloat(cp.campAvgWinRate),
            totalGames: totalGames,
            playPercentage: playPercentage,
            isHighlightedAddition: false,
            uniqueKey: uniqueKey,
            playerCamp: uniqueKey
          };
          
          // For Tous les Camps, track highest percentage per player
          const currentBest = playerBestPercentage.get(player.player);
          if (!currentBest || percentageData.playPercentage > currentBest.playPercentage) {
            playerBestPercentage.set(player.player, percentageData);
          }
          
          // Add to camp-specific data if it matches selected camp
          if (selectedCamp !== 'Tous les camps' && cp.camp === selectedCamp) {
            campPlayers.push(percentageData);
          }
        }
      }
    }
    
    allPercentages.push(...playerBestPercentage.values());

    // Helper function to add highlighted player
    const addHighlightedPlayer = (
      dataArray: PlayPercentageEntry[],
      campFilter?: string,
      isTousLesCamps: boolean = false
    ): PlayPercentageEntry[] => {
      if (!settings.highlightedPlayer) return dataArray;

      const highlightedPlayerExists = dataArray.some(
        item => item.player === settings.highlightedPlayer && 
                (!campFilter || item.camp === campFilter)
      );

      if (highlightedPlayerExists) {
        return dataArray;
      }

      const highlightedPlayerData = playerPerformance.find(
        player => player.player === settings.highlightedPlayer
      );

      if (!highlightedPlayerData) return dataArray;

      const totalGames = highlightedPlayerData.campPerformance.reduce((sum, cp) => sum + cp.games, 0);

      if (isTousLesCamps) {
        let bestPercentage: PlayPercentageEntry | null = null;
        
        for (const cp of highlightedPlayerData.campPerformance) {
          if (cp.games >= 1) {
            const playPercentage = (cp.games / totalGames) * 100;
            const uniqueKey = `${highlightedPlayerData.player}-${cp.camp}`;
            const percentageData: PlayPercentageEntry = {
              player: highlightedPlayerData.player,
              camp: cp.camp,
              games: cp.games,
              wins: cp.wins,
              winRate: cp.winRate,
              performance: cp.performance,
              winRateNum: parseFloat(cp.winRate),
              performanceNum: parseFloat(cp.performance),
              campAvgWinRateNum: parseFloat(cp.campAvgWinRate),
              totalGames: totalGames,
              playPercentage: playPercentage,
              isHighlightedAddition: true,
              uniqueKey: uniqueKey,
              playerCamp: uniqueKey
            };
            
            if (!bestPercentage || percentageData.playPercentage > bestPercentage.playPercentage) {
              bestPercentage = percentageData;
            }
          }
        }
        
        return bestPercentage ? [...dataArray, bestPercentage] : dataArray;
      }

      const highlightedAdditions: PlayPercentageEntry[] = [];
      
      for (const cp of highlightedPlayerData.campPerformance) {
        if ((!campFilter || cp.camp === campFilter) && cp.games >= 1) {
          const playPercentage = (cp.games / totalGames) * 100;
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
            totalGames: totalGames,
            playPercentage: playPercentage,
            isHighlightedAddition: true,
            uniqueKey: uniqueKey,
            playerCamp: uniqueKey
          });
        }
      }

      return [...dataArray, ...highlightedAdditions];
    };

    const campPlayersWithHighlighted = selectedCamp !== 'Tous les camps' 
      ? addHighlightedPlayer(campPlayers, selectedCamp, false)
      : [];
    
    const topPercentagesWithHighlighted = addHighlightedPlayer(allPercentages, undefined, true);    
    const sortedCampPlayers = campPlayersWithHighlighted.sort((a, b) => b.playPercentage - a.playPercentage);
    const sortedTopPercentages = topPercentagesWithHighlighted.sort((a, b) => b.playPercentage - a.playPercentage);
    
    const getTopPlayersWithHighlighted = (data: PlayPercentageEntry[], limit: number) => {
      const topPlayers = data.slice(0, limit);
      const highlightedPlayerInTop = topPlayers.some(p => p.player === settings.highlightedPlayer);
      
      if (highlightedPlayerInTop || !settings.highlightedPlayer) {
        return topPlayers;
      }
      
      const highlightedPlayerData = data.find(p => p.player === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        const highlightedAddition = { ...highlightedPlayerData, isHighlightedAddition: true };
        return [...topPlayers, highlightedAddition];
      }
      
      return topPlayers;
    };
    
    let totalPlayers = 0;
    if (selectedCamp === 'Tous les camps') {
      totalPlayers = playerBestPercentage.size;
    } else {
      totalPlayers = campPlayers.length;
    }
    
    const finalCampData = getTopPlayersWithHighlighted(sortedCampPlayers, 15);
    const finalTopData = getTopPlayersWithHighlighted(sortedTopPercentages, 15);
    
    console.log('PlayPercentage Final Data:', {
      selectedCamp,
      finalCampDataLength: finalCampData.length,
      finalTopDataLength: finalTopData.length,
      sampleCampData: finalCampData[0],
      sampleTopData: finalTopData[0]
    });
    
    return {
      campPlayPercentageData: finalCampData,
      topPlayPercentageData: finalTopData,
      totalPlayPercentagePlayers: totalPlayers
    };
  }, [playerCampPerformance, selectedCamp, minGames, settings.highlightedPlayer, viewMode]);

  // Optimize data processing by combining operations and reducing redundant calculations
  const { campPlayerData, topPerformersData, totalMatchingPlayers } = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance || viewMode !== 'performance') {
      return { campPlayerData: [], topPerformersData: [], totalMatchingPlayers: 0 };
    }

    const { playerPerformance } = playerCampPerformance;
    
    // Single pass to process both camp-specific and top performers data
    const campPlayers = [];
    const allPerformances = [];
    
    // For Tous les Camps (top performers), we need to track BEST performance per player
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
          
          // For Tous les Camps, track only the BEST performance per player (matching achievement logic)
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
    
    // Convert best performances map to array for Tous les Camps
    allPerformances.push(...playerBestPerformance.values());

    // Helper function to add highlighted player if not already included
    const addHighlightedPlayer = (
      dataArray: ChartPlayerCampPerformance[],
      campFilter?: string,
      isTousLesCamps: boolean = false
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

      // For Tous les Camps, add only the BEST performance (matching achievement logic)
      if (isTousLesCamps) {
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
    
    // Add highlighted player to top performers data (Tous les Camps mode - best performance only)
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
    
    // Calculate total number of players matching the criteria
    let totalPlayers = 0;
    if (selectedCamp === 'Tous les camps') {
      // For "Tous les camps", count unique players (not player-camp combinations)
      totalPlayers = playerBestPerformance.size;
    } else {
      // For specific camp, count players in that camp
      totalPlayers = campPlayers.length;
    }
    
    return {
      campPlayerData: getTopPlayersWithHighlighted(sortedCampPlayers, 15),
      topPerformersData: getTopPlayersWithHighlighted(sortedTopPerformers, 15),
      totalMatchingPlayers: totalPlayers
    };
  }, [playerCampPerformance, selectedCamp, minGames, settings.highlightedPlayer, viewMode]);

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
              excludeVillagers: selectedCamp === 'Chasseur' || selectedCamp === 'Alchimiste' || selectedCamp === 'Protecteur' || selectedCamp === 'Disciple' // Exclude elite villagers from Villagers filtering
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
              excludeVillagers: data.camp === 'Chasseur' || data.camp === 'Alchimiste' || data.camp === 'Protecteur' || data.camp === 'Disciple'
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
      <h2>{viewMode === 'performance' ? 'Meilleures Performances par Camp' : 'Pourcentage de Parties Jouées par Rôle'}</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="view-mode-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Affichage:
          </label>
          <select
            id="view-mode-select"
            value={viewMode}
            onChange={(e) => {
              const newViewMode = e.target.value as 'performance' | 'playPercentage';
              setViewMode(newViewMode);
              updateNavigationState({ 
                campPerformanceState: {
                  viewMode: newViewMode,
                  selectedCampPerformanceCamp: selectedCamp,
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
            <option value="performance">🏆 Meilleures performances</option>
            <option value="playPercentage">📊 % parties jouées</option>
          </select>
        </div>

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
                  viewMode: viewMode,
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
                optionText = '📊 Tous les camps';
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
              } else if (camp === 'Protecteur') {
                optionText = '     Protecteur';
                isIndented = true;
              } else if (camp === 'Disciple') {
                optionText = '     Disciple';
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
                  viewMode: viewMode,
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

      {/* Display total matching players count */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '1.5rem',
        padding: '0.75rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <span style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.95rem',
          fontWeight: '500'
        }}>
          {viewMode === 'performance' ? totalMatchingPlayers : totalPlayPercentagePlayers} joueur{(viewMode === 'performance' ? totalMatchingPlayers : totalPlayPercentagePlayers) !== 1 ? 's' : ''} {(viewMode === 'performance' ? totalMatchingPlayers : totalPlayPercentagePlayers) !== 1 ? 'correspondent' : 'correspond'} aux critères
        </span>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Unified Player Performance View */}
        <div className="lycans-graphique-section">
          <h3>
            {viewMode === 'performance' 
              ? (selectedCamp === 'Tous les camps' 
                  ? 'Meilleures performances - Tous les camps'
                  : `Meilleurs joueurs en ${selectedCamp}`)
              : (selectedCamp === 'Tous les camps'
                  ? 'Plus grand % de parties - Tous les camps'
                  : `Plus grand % de parties en ${selectedCamp}`)
            }
          </h3>
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
            {(() => {
              const chartData = viewMode === 'performance' 
                ? (selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData)
                : (selectedCamp === 'Tous les camps' ? topPlayPercentageData : campPlayPercentageData);
              
              console.log('BarChart Data Debug:', {
                viewMode,
                selectedCamp,
                dataLength: chartData.length,
                firstItem: chartData[0],
                lastItem: chartData[chartData.length - 1],
                allData: chartData
              });
              
              return (
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
                  domain={viewMode === 'playPercentage' ? [0, 100] : ['auto', 'auto']}
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
                              <div>Pourcentage: {dataPoint.playPercentage.toFixed(1)}%</div>
                              <div>Victoires: {dataPoint.wins}</div>
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
                   onClick={handleBarClick}
                 >
                 {chartData.map((entry, index) => {
                   const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                   const isHighlightedAddition = entry.isHighlightedAddition;
                   
                   // Determine fill color based on view mode and camp selection
                   let fillColor: string;
                   if (selectedCamp === 'Tous les camps') {
                     // Use camp colors for "Tous les camps" view
                     fillColor = lycansColorScheme[entry.camp as keyof typeof lycansColorScheme] || `var(--chart-color-${(index % 6) + 1})`;
                   } else {
                     // Use player colors for specific camp view
                     fillColor = playersColor[entry.player] || 'var(--accent-primary)';
                   }
                   
                   return (
                    <Cell
                       key={`cell-${index}`}
                       fill={fillColor}
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
              );
            })()}
          </div>
          </FullscreenChart>
        </div>

        {/* Scatter chart - show for all selections */}
        <div className="lycans-graphique-section">
          <h3>
            {viewMode === 'performance'
              ? (selectedCamp === 'Tous les camps' 
                  ? 'Performances sur nombre de parties jouées - Tous les camps'
                  : `Performances en ${selectedCamp} sur nombre de parties jouées`)
              : (selectedCamp === 'Tous les camps'
                  ? 'Pourcentage de parties jouées - Tous les camps'
                  : `Pourcentage de parties en ${selectedCamp}`)
            }
          </h3>
          <FullscreenChart title={
            viewMode === 'performance'
              ? (selectedCamp === 'Tous les camps' 
                  ? 'Performances vs Parties Jouées - Tous les camps'
                  : `Performances vs Parties Jouées - ${selectedCamp}`)
              : (selectedCamp === 'Tous les camps'
                  ? 'Pourcentage vs Total Parties - Tous les camps'
                  : `Pourcentage vs Total Parties - ${selectedCamp}`)
          }>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                 data={viewMode === 'performance'
                   ? (selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData)
                   : (selectedCamp === 'Tous les camps' ? topPlayPercentageData : campPlayPercentageData)
                 }
                 margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis 
                    dataKey={viewMode === 'performance' ? 'games' : 'totalGames'}
                    type="number"
                    label={{ 
                      value: viewMode === 'performance' ? 'Parties jouées dans ce rôle' : 'Total parties jouées', 
                      position: 'insideBottom', 
                      offset: -10 
                    }}
                 />
                 <YAxis 
                    dataKey={viewMode === 'performance' ? 'performanceNum' : 'playPercentage'}
                    type="number"
                    label={{ 
                      value: viewMode === 'performance' ? 'Performance (%)' : 'Pourcentage parties (%)', 
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
                          <div><strong>{dataPoint.player}</strong></div>
                          {selectedCamp === 'Tous les camps' && <div>Camp: {dataPoint.camp}</div>}
                          {viewMode === 'performance' ? (
                            <>
                              <div>Parties: {dataPoint.games}</div>
                              <div>Performance: {dataPoint.performance > 0 ? '+' : ''}{dataPoint.performance}</div>
                            </>
                          ) : (
                            <>
                              <div>Parties dans ce rôle: {dataPoint.games}</div>
                              <div>Total parties: {dataPoint.totalGames}</div>
                              <div>Pourcentage: {dataPoint.playPercentage.toFixed(1)}%</div>
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
                  dataKey={viewMode === 'performance' ? 'performanceNum' : 'playPercentage'}
                  name={viewMode === 'performance' ? 'Performance' : 'Pourcentage'}
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