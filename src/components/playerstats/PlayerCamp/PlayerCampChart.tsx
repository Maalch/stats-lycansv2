import { useState, useMemo, useEffect } from 'react';
import { usePlayerCampPerformanceFromRaw } from '../../../hooks/usePlayerCampPerformanceFromRaw';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { minGamesOptions} from '../../../types/api';
import { useNavigation } from '../../../context/NavigationContext';
import { useSettings } from '../../../context/SettingsContext';
import { PlayerCampPerformanceBarChart } from './PlayerCampBarChart';

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
  totalGames?: number;
  playPercentage?: number;
  campAvgPlayPercentage?: number;
}

export function PlayerCampChart() {
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
    navigationState.campPerformanceState?.selectedCampPerformanceMinGames || 50
  );
  
  const { playerCampPerformance, isLoading, error } = usePlayerCampPerformanceFromRaw();

  // Save initial state to navigation context if not already saved
  useEffect(() => {
    if (!navigationState.campPerformanceState) {
      updateNavigationState({
        campPerformanceState: {
          viewMode: 'performance',
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

    // Add Villageois (non-elite) if available
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

    if (availableCampNames.includes('Inquisiteur')) {
      orderedCamps.push('Inquisiteur');
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
    const mainCamps = ['Camp Villageois', 'Villageois', 'Chasseur', 'Alchimiste', 'Protecteur', 'Disciple', 'Inquisiteur', 'Camp Loup', 'Loup', 'Traître', 'Louveteau']; 
    const excludedCamps = [...mainCamps, ...specialCamps];
    
    const otherCamps = availableCampNames
      .filter(camp => !excludedCamps.includes(camp))
      .sort(); // Sort other camps alphabetically
    
    return [...orderedCamps, ...otherCamps];
  }, [playerCampPerformance]);

  // Data processing for play percentage view
  const { campPlayPercentageData, topPlayPercentageData } = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance) {
      return { campPlayPercentageData: [], topPlayPercentageData: [], totalPlayPercentagePlayers: 0 };
    }

    const { playerPerformance } = playerCampPerformance;
    
    interface PlayPercentageEntry extends ChartPlayerCampPerformance {
      totalGames: number;
      playPercentage: number;
      campAvgPlayPercentage: number;
    }
    
    // First pass: calculate total games per player and accumulate camp statistics
    const campGamesMap = new Map<string, { totalGames: number; totalPlayersWithCamp: number }>();
    const playerTotalGames = new Map<string, number>();
    
    for (const player of playerPerformance) {
      const totalGames = player.campPerformance.reduce((sum, cp) => sum + cp.games, 0);
      playerTotalGames.set(player.player, totalGames);
      
      for (const cp of player.campPerformance) {
        if (cp.games >= minGames) {
          const existing = campGamesMap.get(cp.camp) || { totalGames: 0, totalPlayersWithCamp: 0 };
          existing.totalGames += cp.games;
          existing.totalPlayersWithCamp += 1;
          campGamesMap.set(cp.camp, existing);
        }
      }
    }
    
    // Calculate average play percentage for each camp
    const campAvgPlayPercentages = new Map<string, number>();
    for (const [camp, stats] of campGamesMap.entries()) {
      // Average play percentage = average number of games in this camp / average total games
      const avgGamesInCamp = stats.totalGames / stats.totalPlayersWithCamp;
      const totalPlayerCount = stats.totalPlayersWithCamp;
      
      // Get average total games for players who played this camp
      let sumTotalGames = 0;
      for (const player of playerPerformance) {
        const campData = player.campPerformance.find(cp => cp.camp === camp && cp.games >= minGames);
        if (campData) {
          sumTotalGames += playerTotalGames.get(player.player) || 0;
        }
      }
      const avgTotalGames = sumTotalGames / totalPlayerCount;
      const avgPlayPercentage = (avgGamesInCamp / avgTotalGames) * 100;
      campAvgPlayPercentages.set(camp, avgPlayPercentage);
    }
    
    const campPlayers: PlayPercentageEntry[] = [];
    const allPercentages: PlayPercentageEntry[] = [];
    const playerBestPercentage = new Map<string, PlayPercentageEntry>();
    
    // Second pass: create entries with average play percentages
    for (const player of playerPerformance) {
      const totalGames = playerTotalGames.get(player.player) || 0;
      
      for (const cp of player.campPerformance) {
        if (cp.games >= minGames) {
          const campAvgPlayPercentage = campAvgPlayPercentages.get(cp.camp) || 0;
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
            campAvgPlayPercentage: campAvgPlayPercentage,
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

      const totalGames = playerTotalGames.get(settings.highlightedPlayer) || 
                         highlightedPlayerData.campPerformance.reduce((sum, cp) => sum + cp.games, 0);

      if (isTousLesCamps) {
        let bestPercentage: PlayPercentageEntry | null = null;
        
        for (const cp of highlightedPlayerData.campPerformance) {
          if (cp.games >= 1) {
            const playPercentage = (cp.games / totalGames) * 100;
            const campAvgPlayPercentage = campAvgPlayPercentages.get(cp.camp) || 0;
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
              campAvgPlayPercentage: campAvgPlayPercentage,
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
          const campAvgPlayPercentage = campAvgPlayPercentages.get(cp.camp) || 0;
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
            campAvgPlayPercentage: campAvgPlayPercentage,
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
    
    const finalCampData = getTopPlayersWithHighlighted(sortedCampPlayers, 15);
    const finalTopData = getTopPlayersWithHighlighted(sortedTopPercentages, 15);
    
    return {
      campPlayPercentageData: finalCampData,
      topPlayPercentageData: finalTopData
    };
  }, [playerCampPerformance, selectedCamp, minGames, settings.highlightedPlayer]);

  // Optimize data processing by combining operations and reducing redundant calculations
  const { campPlayerData, topPerformersData, totalMatchingPlayers } = useMemo(() => {
    if (!playerCampPerformance?.playerPerformance) {
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
              excludeVillagers: selectedCamp === 'Chasseur' || selectedCamp === 'Alchimiste' || selectedCamp === 'Protecteur' || selectedCamp === 'Disciple' || selectedCamp === 'Inquisiteur'  // Exclude Chasseur, Alchimiste, Protecteur, Disciple, and Inquisiteur from Villagers filtering
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
              excludeVillagers: data.camp === 'Chasseur' || data.camp === 'Alchimiste' || data.camp === 'Protecteur' || data.camp === 'Disciple' || data.camp === 'Inquisiteur'
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
      <h2>Comparaison des Camps</h2>
      
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
                  viewMode: 'performance',
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
              }
              else if (camp === 'Disciple') {
                optionText = '     Disciple';
                isIndented = true;
              } 
              else if (camp === 'Inquisiteur') {
                optionText = '     Inquisiteur';
                isIndented = true;
              } 
              else if (camp === 'Camp Loup') {
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
                  viewMode: 'performance',
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
          {totalMatchingPlayers} joueur{totalMatchingPlayers !== 1 ? 's' : ''} {totalMatchingPlayers !== 1 ? 'correspondent' : 'correspond'} aux critères
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Meilleures Performances par Camp</h3>
          <PlayerCampPerformanceBarChart
            viewMode="performance"
            selectedCamp={selectedCamp}
            minGames={minGames}
            chartData={selectedCamp === 'Tous les camps' ? topPerformersData : campPlayerData}
            highlightedPlayer={settings.highlightedPlayer}
            lycansColorScheme={lycansColorScheme}
            playersColor={playersColor}
            onBarClick={handleBarClick}
          />
        </div>
        
        <div>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Pourcentage de Parties Jouées par Rôle</h3>
          <PlayerCampPerformanceBarChart
            viewMode="playPercentage"
            selectedCamp={selectedCamp}
            minGames={minGames}
            chartData={selectedCamp === 'Tous les camps' ? topPlayPercentageData : campPlayPercentageData}
            highlightedPlayer={settings.highlightedPlayer}
            lycansColorScheme={lycansColorScheme}
            playersColor={playersColor}
            onBarClick={handleBarClick}
          />
        </div>
      </div>
    </div>
  );
}
