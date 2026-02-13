import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useThemeAdjustedDynamicPlayersColor, getRandomColor } from '../../types/api';
import { useJoueursData } from '../../hooks/useJoueursData';
import type { Ranking } from '../../types/rankings';
import './RankingsDisplay.css';

interface RankingsDisplayProps {
  rankings: Ranking[];
  title: string;
  emptyMessage?: string;
  rankingType?: 'all' | 'modded'; // Track which type of rankings are displayed
}

export function RankingsDisplay({ rankings, title, emptyMessage, rankingType = 'all' }: RankingsDisplayProps) {
  const { navigateToTab, updateNavigationState, clearNavigation } = useNavigation();
  const { settings, updateSettings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  const handleRankingClick = (ranking: Ranking, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements (like the player card)
    event.stopPropagation();
    
    if (!ranking.redirectTo) return;

    // Clear any existing navigation context and settings filters
    clearNavigation();
    
    // Reset all settings to defaults while preserving the highlighted player
    const currentHighlightedPlayer = settings.highlightedPlayer;
    
    if (rankingType === 'modded') {
      // Set modded games filter if we're viewing modded Rankings
      updateSettings({
        // Reset legacy fields
        gameFilter: 'modded',
        dateRange: { start: null, end: null },
        mapNameFilter: 'all',
        playerFilter: { mode: 'none', players: [] },
        highlightedPlayer: currentHighlightedPlayer,
        // Use independent filters system with modded games enabled
        useIndependentFilters: true,
        independentFilters: {
          gameTypeEnabled: true,
          gameFilter: 'modded',
          dateRangeEnabled: false,
          dateRange: { start: null, end: null },
          mapNameEnabled: false,
          mapNameFilter: 'all',
          playerFilter: { mode: 'none', players: [] },
        }
      });
    } else {
      // For 'all' Rankings, reset everything to defaults but preserve highlighted player
      updateSettings({
        // Reset legacy fields
        gameFilter: 'all',
        dateRange: { start: null, end: null },
        mapNameFilter: 'all',
        playerFilter: { mode: 'none', players: [] },
        highlightedPlayer: currentHighlightedPlayer,
        // Use independent filters system with everything disabled
        useIndependentFilters: true,
        independentFilters: {
          gameTypeEnabled: false,
          gameFilter: 'all',
          dateRangeEnabled: false,
          dateRange: { start: null, end: null },
          mapNameEnabled: false,
          mapNameFilter: 'all',
          playerFilter: { mode: 'none', players: [] },
        }
      });
    }

    // Handle special navigation cases based on Ranking category and chart section
    if (ranking.category === 'comparison' && ranking.redirectTo.subTab === 'comparison') {
      // Extract the other player name from the Ranking description
      const currentPlayer = settings.highlightedPlayer || '';
      const otherPlayer = extractOtherPlayerName(ranking.description, currentPlayer);
      
      if (otherPlayer) {
        // Set up the comparison chart with both players
        updateNavigationState({
          playerComparisonState: {
            selectedPlayer1: currentPlayer,
            selectedPlayer2: otherPlayer,
            showDetailedStats: true
          }
        });
      }
    }
    
    // Handle pairing Rankings that should go to specific pairing tabs
    if (ranking.category === 'comparison' && ranking.redirectTo.subTab === 'pairing') {
      // For wolf/lover pairing Rankings, navigate to the appropriate tab
      const isWolfPairing = ranking.description.toLowerCase().includes('loup');
      updateNavigationState({
        selectedPairingTab: isWolfPairing ? 'wolves' : 'lovers'
      });
    }
    
    // Handle death statistics Rankings
    if (ranking.category === 'kills' && ranking.redirectTo.subTab === 'deathStats') {
      // Extract camp information if present in the description
      const campMatch = ranking.description.match(/(Villageois|Loups|Autres)/i);
      if (campMatch) {
        updateNavigationState({
          deathStatsSelectedCamp: campMatch[1]
        });
      }
      
      // Extract minimum games from Ranking description (e.g., "min. 25 parties")
      let minGames = 10; // default
      const minGamesMatch = ranking.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1], 10);
      }
      
      // Determine focus chart and view based on chartSection
      let focusChart: 'totalKills' | 'averageKills' | 'totalDeaths' | 'survivalRate' = 'totalKills'; // default
      let selectedView: 'killers' | 'deaths' | 'hunter' | 'survival' = 'killers'; // default
      const chartSection = (ranking.redirectTo as any).chartSection;
      
      if (chartSection) {
        if (chartSection === 'killers-total') {
          focusChart = 'totalKills';
          selectedView = 'killers';
        } else if (chartSection === 'killers-average') {
          focusChart = 'averageKills';
          selectedView = 'killers';
        } else if (chartSection === 'deaths-total') {
          focusChart = 'totalDeaths';
          selectedView = 'deaths';
        } else if (chartSection === 'survivors-average') {
          focusChart = 'survivalRate';
          selectedView = 'deaths';
        } else if (chartSection === 'hunters-good' || chartSection === 'hunters-bad') {
          // Both good and bad hunter Rankings should navigate to hunter view
          selectedView = 'hunter';
          focusChart = 'averageKills'; // Hunter stats use average kills
        }
      }
      
      // Set the death statistics chart state
      updateNavigationState({
        deathStatisticsState: {
          selectedCamp: campMatch?.[1] || 'Tous les camps',
          minGamesForAverage: minGames,
          selectedView: selectedView,
          focusChart: focusChart
        }
      });
    }
    
    // Handle map Rankings (Village 🏘️ and Château 🏰)
    if (ranking.category === 'map' && ranking.redirectTo.subTab === 'playersGeneral') {
      // Extract map filter from server-side Ranking
      const mapFilter = (ranking.redirectTo as any).mapFilter || 'all';
      
      // Extract minimum games from Ranking description (e.g., "min. 10 parties")
      let minGames = 10; // default for map Rankings
      const minGamesMatch = ranking.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1]);
      }
      
      // Set up map filter in settings
      if (rankingType === 'modded') {
        updateSettings({
          gameFilter: 'modded',
          dateRange: { start: null, end: null },
          mapNameFilter: mapFilter,
          playerFilter: { mode: 'none', players: [] },
          highlightedPlayer: currentHighlightedPlayer,
          useIndependentFilters: true,
          independentFilters: {
            gameTypeEnabled: true,
            gameFilter: 'modded',
            dateRangeEnabled: false,
            dateRange: { start: null, end: null },
            mapNameEnabled: true,
            mapNameFilter: mapFilter,
            playerFilter: { mode: 'none', players: [] },
          }
        });
      } else {
        updateSettings({
          gameFilter: 'all',
          dateRange: { start: null, end: null },
          mapNameFilter: mapFilter,
          playerFilter: { mode: 'none', players: [] },
          highlightedPlayer: currentHighlightedPlayer,
          useIndependentFilters: true,
          independentFilters: {
            gameTypeEnabled: false,
            gameFilter: 'all',
            dateRangeEnabled: false,
            dateRange: { start: null, end: null },
            mapNameEnabled: true,
            mapNameFilter: mapFilter,
            playerFilter: { mode: 'none', players: [] },
          }
        });
      }
      
      // Set up navigation to general statistics with appropriate state
      updateNavigationState({
        playersGeneralState: {
          minGamesForWinRate: minGames,
          winRateOrder: 'best', // Map Rankings are always about good performance
          focusChart: 'winRate' // Focus on win rate chart for map Rankings
        }
      });
      
      // Navigate to general statistics
      navigateToTab('players', 'playersGeneral');
      return; // Early return to skip the default navigation
    }

    // Handle player history Rankings that should highlight specific maps
    if (ranking.category === 'history' && ranking.redirectTo.subTab === 'history') {
      // Set the player name for the history chart
      updateNavigationState({
        selectedPlayerName: settings.highlightedPlayer || '',
        groupingMethod: 'session' // Default to session view for Ranking navigation
      });
    }

    // Handle series Rankings with specific series types
    if (ranking.category === 'series' && ranking.redirectTo.subTab === 'series') {
      // Determine which series type based on Ranking title/description
      let seriesType: 'villageois' | 'loup' | 'wins' | 'losses' = 'wins'; // default
      
      const titleLower = ranking.title.toLowerCase();
      const descriptionLower = ranking.description.toLowerCase();
      
      if (titleLower.includes('défaite') || descriptionLower.includes('défaite')) {
        seriesType = 'losses';
      } else if (titleLower.includes('loup') || descriptionLower.includes('loup')) {
        seriesType = 'loup';
      } else if (titleLower.includes('villageois') || descriptionLower.includes('villageois')) {
        seriesType = 'villageois';
      } else if (titleLower.includes('victoire') || descriptionLower.includes('victoire')) {
        seriesType = 'wins';
      }

      // Set the series type for the chart
      updateNavigationState({
        selectedSeriesType: seriesType
      });
    }

    // Handle general Rankings with specific minGames and focus
    if (ranking.category === 'general' && ranking.redirectTo.subTab === 'playersGeneral') {
      // Extract minimum games from Ranking description (e.g., "min. 50 parties")
      let minGames = 10; // default
      const minGamesMatch = ranking.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1], 10);
      }
      
      // Determine focus chart and win rate order based on Ranking title/description
      let focusChart: 'participation' | 'winRate' = 'winRate'; // default for most Rankings
      let winRateOrder: 'best' | 'worst' = 'best'; // default
      
      const titleLower = ranking.title.toLowerCase();
      const descriptionLower = ranking.description.toLowerCase();
      
      if (titleLower.includes('participation') || descriptionLower.includes('participation')) {
        focusChart = 'participation';
      } else if (titleLower.includes('taux de victoire') || descriptionLower.includes('taux de victoire')) {
        focusChart = 'winRate';
        // Determine if it's a "worst" Ranking or "best" Ranking
        if (titleLower.includes('moins bon') || titleLower.includes('mauvais') || 
            descriptionLower.includes('moins bon') || descriptionLower.includes('mauvais')) {
          winRateOrder = 'worst';
        }
      }
      
      // Set the players general chart state
      updateNavigationState({
        playersGeneralState: {
          minGamesForWinRate: minGames,
          winRateOrder: winRateOrder,
          focusChart: focusChart
        }
      });
    }

    // Handle performance Rankings with specific camp and minGames filters
    if (ranking.category === 'performance' && ranking.redirectTo.subTab === 'campStats') {
      // Extract camp from chartSection (e.g., 'camp-loup' → 'Loup')
      const chartSection = (ranking.redirectTo as any).chartSection;
      let selectedCamp = 'Villageois'; // default
      let minGames = 1; // default
      
      if (chartSection) {
        if (chartSection === 'camp-loup') {
          selectedCamp = 'Loup';
        } else if (chartSection === 'camp-villageois') {
          selectedCamp = 'Villageois';
        } else if (chartSection === 'camp-idiot') {
          selectedCamp = 'Idiot du Village';
        } else if (chartSection === 'camp-amoureux') {
          selectedCamp = 'Amoureux';
        } else if (chartSection === 'solo-roles') {
          // For solo roles, we'll show all data in top performers view
          selectedCamp = 'Villageois'; // will be overridden by view mode
        } else if (chartSection === 'hall-of-fame') {
          selectedCamp = 'Villageois'; // will be overridden by view mode
        }
      }
      
      // Extract minimum games from Ranking description (e.g., "min. 10")
      const minGamesMatch = ranking.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1], 10);
      }
      
      // For solo-roles, use "Rôles spéciaux" instead of specific camp
      if (chartSection === 'solo-roles') {
        selectedCamp = 'Rôles spéciaux';
      } else if (chartSection === 'hall-of-fame') {
        selectedCamp = 'Tous les camps';
      }
      
      // Set the camp performance chart state
      updateNavigationState({
        campPerformanceState: {
          selectedCampPerformanceCamp: selectedCamp,
          selectedCampPerformanceMinGames: minGames,
          viewMode: 'performance'
        }
      });
    }

    // Handle voting Rankings with specific category and view
    if (ranking.category === 'voting' && ranking.redirectTo.subTab === 'votingStats') {
      const titleLower = ranking.title.toLowerCase();
      let selectedCategory: 'overview' | 'behavior' = 'overview';
      let selectedView: 'behavior' | 'accuracy' | 'targets' | 'voteRate' | 'skipRate' | 'abstentionRate' = 'behavior';
      
      // Determine category and view based on Ranking title
      if (titleLower.includes('agressivité')) {
        selectedCategory = 'overview';
        selectedView = 'behavior';
      } else if (titleLower.includes('taux de vote')) {
        selectedCategory = 'behavior';
        selectedView = 'voteRate';
      } else if (titleLower.includes('précision')) {
        selectedCategory = 'overview';
        selectedView = 'accuracy';
      }

      // Set the voting stats chart state
      updateNavigationState({
        votingStatsState: {
          selectedCategory,
          selectedView
        }
      });
    }

    // Handle loot Rankings navigation
    if (ranking.category === 'loot' && ranking.redirectTo.subTab === 'lootStats') {
      const redirectData = ranking.redirectTo as any;
      const minGames = redirectData.minGames || 5;
      const view = redirectData.view || 'normalized';
      
      // Set the loot stats chart state
      updateNavigationState({
        lootStatsState: {
          minGames,
          campFilter: 'all',
          view
        }
      });
    }

    // Navigate to the specified tab and subTab
    navigateToTab(ranking.redirectTo.tab, ranking.redirectTo.subTab);
  };

  // Helper function to extract the other player name from comparison descriptions
  const extractOtherPlayerName = (description: string, currentPlayer: string): string | null => {
    // Match patterns like "avec PlayerName:" or "contre PlayerName:"
    const patterns = [
      /avec ([^:]+?):/,
      /contre ([^:]+?):/,
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const playerName = match[1].trim();
        // Make sure we don't return the current player's name
        if (playerName !== currentPlayer) {
          return playerName;
        }
      }
    }
    
    return null;
  };

  // Helper function to generate appropriate tooltip text based on Ranking type
  const getRankingTooltip = (Ranking: Ranking): string => {
    if (!Ranking.redirectTo) {
      return "Aucune navigation disponible";
    }

    switch (Ranking.category) {
      case 'general':
        if (Ranking.redirectTo.subTab === 'playersGeneral') {
          // Extract minimum games for a more specific tooltip
          const minGamesMatch = Ranking.description.match(/min\.\s*(\d+)/);
          const minGames = minGamesMatch ? parseInt(minGamesMatch[1], 10) : 10;
          
          const titleLower = Ranking.title.toLowerCase();
          const filterInfo = rankingType === 'modded' 
            ? " (Filtre parties moddées activé)" 
            : " (Filtres réinitialisés)";
            
          if (titleLower.includes('taux de victoire')) {
            return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir les taux de victoire (min. ${minGames} parties)${filterInfo}`;
          } else if (titleLower.includes('participation')) {
            return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir les participations${filterInfo}`;
          }
          return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir le classement général des joueurs${filterInfo}`;
        }
        break;
      case 'map':
        if (Ranking.redirectTo.subTab === 'playersGeneral') {
          const mapFilter = (Ranking.redirectTo as any).mapFilter;
          const mapName = mapFilter === 'village' ? 'Village' : mapFilter === 'chateau' ? 'Château' : 'map';
          const filterInfo = rankingType === 'modded' 
            ? " (Filtres parties moddées + map activés)" 
            : " (Filtre map activé)";
          return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir les statistiques générales filtrées sur ${mapName}${filterInfo}`;
        }
        break;
      case 'history':
        if (Ranking.redirectTo.subTab === 'history') {
          return "Cliquez pour voir l'historique détaillé du joueur par map";
        }
        break;
      case 'comparison':
        if (Ranking.redirectTo.subTab === 'comparison') {
          const otherPlayer = extractOtherPlayerName(Ranking.description, settings.highlightedPlayer || '');
          return `Cliquez pour comparer avec ${otherPlayer || 'ce joueur'}`;
        }
        if (Ranking.redirectTo.subTab === 'pairing') {
          return "Cliquez pour voir les statistiques de paires";
        }
        break;
      case 'kills':
        if (Ranking.redirectTo.subTab === 'deathStats') {
          // Extract camp and minimum games for a more specific tooltip
          const campMatch = Ranking.description.match(/(Villageois|Loups|Autres)/i);
          const minGamesMatch = Ranking.description.match(/min\.\s*(\d+)/);
          const minGames = minGamesMatch ? parseInt(minGamesMatch[1], 10) : 10;
          const camp = campMatch?.[1] || 'Tous les camps';
          
          const chartSection = (Ranking.redirectTo as any).chartSection;
          let chartType = 'kills et morts';
          
          if (chartSection === 'killers-total') {
            chartType = 'total des kills';
          } else if (chartSection === 'killers-average') {
            chartType = `moyenne des kills (min. ${minGames} parties)`;
          } else if (chartSection === 'deaths-total') {
            chartType = 'total des morts';
          } else if (chartSection === 'survivors-average') {
            chartType = `taux de survie (min. ${minGames} parties)`;
          }
          
          return `Cliquez pour voir les statistiques de ${chartType} ${camp !== 'Tous les camps' ? `en ${camp}` : ''}`;
        }
        break;
      case 'series':
        if (Ranking.redirectTo.subTab === 'series') {
          // Determine which series type for better tooltip
          const titleLower = Ranking.title.toLowerCase();
          const descriptionLower = Ranking.description.toLowerCase();
          
          if (titleLower.includes('défaite') || descriptionLower.includes('défaite')) {
            return "Cliquez pour voir les séries de défaites";
          } else if (titleLower.includes('loup') || descriptionLower.includes('loup')) {
            return "Cliquez pour voir les séries Loups";
          } else if (titleLower.includes('villageois') || descriptionLower.includes('villageois')) {
            return "Cliquez pour voir les séries Villageois";
          } else if (titleLower.includes('victoire') || descriptionLower.includes('victoire')) {
            return "Cliquez pour voir les séries de victoires";
          }
          return "Cliquez pour voir les séries consécutives";
        }
        break;
      case 'performance':
        if (Ranking.redirectTo.subTab === 'campStats') {
          // Extract camp from chartSection for a more specific tooltip
          const chartSection = (Ranking.redirectTo as any).chartSection;
          const filterInfo = rankingType === 'modded' 
            ? " (Filtre parties moddées activé)" 
            : " (Filtres réinitialisés)";
          
          if (chartSection === 'camp-loup') {
            return `Cliquez pour voir les performances camp Loup${filterInfo}`;
          } else if (chartSection === 'camp-villageois') {
            return `Cliquez pour voir les performances camp Villageois${filterInfo}`;
          } else if (chartSection === 'camp-idiot') {
            return `Cliquez pour voir les performances camp Idiot du Village${filterInfo}`;
          } else if (chartSection === 'camp-amoureux') {
            return `Cliquez pour voir les performances camp Amoureux${filterInfo}`;
          } else if (chartSection === 'solo-roles') {
            return `Cliquez pour voir le classement (rôles spéciaux)${filterInfo}`;
          } else if (chartSection === 'hall-of-fame') {
            return `Cliquez pour voir le Hall of Fame (toutes performances)${filterInfo}`;
          }
          return `Cliquez pour voir les performances par camp${filterInfo}`;
        }
        break;
      case 'voting':
        if (Ranking.redirectTo.subTab === 'votingStats') {
          const minMeetingsMatch = Ranking.description.match(/min\.\s*(\d+)/);
          const minMeetings = minMeetingsMatch ? parseInt(minMeetingsMatch[1], 10) : 25;
          
          const filterInfo = rankingType === 'modded' 
            ? " (Filtre parties moddées activé)" 
            : " (Filtres réinitialisés)";
          
          const titleLower = Ranking.title.toLowerCase();
          
          if (titleLower.includes('agressivité')) {
            return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir le score d'agressivité (min. ${minMeetings} meetings)${filterInfo}`;
          } else if (titleLower.includes('taux de vote')) {
            return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir le taux de vote (min. ${minMeetings} meetings)${filterInfo}`;
          } else if (titleLower.includes('précision')) {
            return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir la précision des votes${filterInfo}`;
          }
          return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir les statistiques de vote${filterInfo}`;
        }
        break;
      case 'loot':
        if (Ranking.redirectTo.subTab === 'lootStats') {
          const minGamesMatch = Ranking.description.match(/min\.\s*(\d+)/);
          const minGames = minGamesMatch ? parseInt(minGamesMatch[1], 10) : 25;
          
          const filterInfo = rankingType === 'modded' 
            ? " (Filtre parties moddées activé)" 
            : " (Filtres réinitialisés)";
          
          return `Classement: ${Ranking.rank}${Ranking.totalRanked ? `/${Ranking.totalRanked} joueurs` : ''} - Cliquez pour voir le taux de récolte (min. ${minGames} parties)${filterInfo}`;
        }
        break;
    }
    
    // Add filter reset information to all tooltips
    const baseTooltip = `Cliquez pour voir ${Ranking.redirectTo.subTab}`;
    const filterInfo = rankingType === 'modded' 
      ? " (Filtre parties moddées activé)" 
      : " (Filtres réinitialisés)";
    
    return baseTooltip + filterInfo;
  };

  // Helper function to get player color
  const getPlayerColor = (playerName: string) => {
    return playersColor[playerName] || getRandomColor(playerName);
  };

  // Helper function to highlight player names in comparison descriptions
  const highlightPlayerNames = (description: string) => {
    // Extract player names from comparison descriptions
    // They typically appear after "avec " or "contre "
    const patterns = [
      /avec ([^:]+?):/,
      /contre ([^:]+?):/,
    ];
    
    let highlightedDescription = description;
    
    patterns.forEach(pattern => {
      const match = description.match(pattern);
      if (match && match[1]) {
        const playerName = match[1].trim();
        const playerColor = getPlayerColor(playerName);
        const highlightedName = `<span class="player-name-highlight" style="color: ${playerColor};">${playerName}</span>`;
        highlightedDescription = highlightedDescription.replace(playerName, highlightedName);
      }
    });
    
    return highlightedDescription;
  };

  if (rankings.length === 0) {
    return (
      <div className="rankings-empty">
        <h4>{title}</h4>
        <p>{emptyMessage || 'Aucun succès dans cette catégorie'}</p>
      </div>
    );
  }

  // Helper function to get medal emoji for top 3 rankings
  const getMedalEmoji = (rank: number | undefined): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  // Helper function to get rank class name
  const getRankClassName = (rank: number | undefined): string => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    if (rank && rank <= 10) return 'rank-top-10';
    return '';
  };

  // Helper function to calculate gradient color from green (rank 4) to red (last rank)
  const getGradientColor = (rank: number | undefined, totalRanked: number | undefined): string | undefined => {
    // Only apply gradient for ranks 4 and beyond
    if (!rank || rank <= 3 || !totalRanked) return undefined;
    
    // Calculate the position in the gradient (0 = rank 4 = green, 1 = last rank = red)
    // We start from rank 4, so subtract 3 from both rank and totalRanked
    const adjustedRank = rank - 3; // rank 4 becomes 1, rank 5 becomes 2, etc.
    const adjustedTotal = totalRanked - 3; // total range excluding top 3
    
    // Prevent division by zero and handle edge cases
    if (adjustedTotal <= 1) return 'hsl(120, 70%, 50%)'; // All green if only one rank beyond top 3
    
    // Calculate position (0 to 1)
    const position = (adjustedRank - 1) / (adjustedTotal - 1);
    
    // Interpolate hue from 120 (green) to 0 (red)
    const hue = 120 * (1 - position);
    
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Helper function to calculate red gradient for reverse rankings (bad Rankings)
  const getRedGradientColor = (rank: number | undefined, totalRanked: number | undefined): string | undefined => {
    // Apply red gradient for all ranks (including top 3 when they appear in main grid)
    if (!rank || !totalRanked) return undefined;
    
    // Prevent division by zero
    if (totalRanked <= 1) return 'hsl(0, 70%, 50%)'; // Pure red if only one rank
    
    // Calculate position (0 = rank 1 = bright red, 1 = last rank = dark red)
    const position = (rank - 1) / (totalRanked - 1);
    
    // Stay in red spectrum: hue 0 (red) to hue 15 (red-orange)
    // Vary lightness from 50% (bright) to 35% (dark)
    const hue = position * 15; // 0 to 15
    const lightness = 50 - (position * 15); // 50% to 35%
    
    return `hsl(${hue}, 70%, ${lightness}%)`;
  };

  // Helper function to get border color with slight opacity adjustment
  const getBorderColorFromGradient = (baseColor: string | undefined): string | undefined => {
    if (!baseColor) return undefined;
    // Extract HSL values and create a slightly darker version for border
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const [, hue, saturation] = hslMatch;
      return `hsl(${hue}, ${saturation}%, 40%)`; // Darker lightness for border
    }
    return baseColor;
  };

  // Separate Rankings by category and sort by rank
  const goodRankings = rankings
    .filter(a => a.category !== 'comparison' && (a.type === 'good' || a.type === 'neutral'))
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const badRankings = rankings
    .filter(a => a.category !== 'comparison' && a.type === 'bad')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const comparisonRankings = rankings.filter(a => a.category === 'comparison');

  // Combine rankings: good Rankings (all ranks) + bad Rankings (all ranks)
  const allRankings = [...goodRankings, ...badRankings]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  // Count top 3 Rankings (only from good Rankings for podium)
  const top3Count = goodRankings.filter(a => a.rank && a.rank <= 3).length;

  return (
    <div className="rankings-container">
      <h4>{title}</h4>
      
      {/* Top 3 Showcase Section */}
      {top3Count > 0 && (
        <div className="top3-showcase">
          <h5 className="top3-title">✨ Podium d'Excellence ✨</h5>
          <div className="top3-grid">
            {goodRankings
              .filter(a => a.rank && a.rank <= 3)
              .map((Ranking, index) => (
                <div
                  key={Ranking.id}
                  className={`top3-card ${getRankClassName(Ranking.rank)} animate-slide-in`}
                  style={{ animationDelay: `${index * 0.15}s` }}
                  onClick={(e) => handleRankingClick(Ranking, e)}
                  title={getRankingTooltip(Ranking)}
                >
                  <div className="top3-medal-container">
                    <span className="top3-medal">{getMedalEmoji(Ranking.rank)}</span>
                  </div>
                  <div className="top3-content">
                    <div className="top3-rank-badge">
                      #{Ranking.rank}{Ranking.totalRanked ? `/${Ranking.totalRanked}` : ''}
                    </div>
                    <h6 className="top3-Ranking-title">{Ranking.title}</h6>
                    <p className="top3-Ranking-description">{Ranking.description}</p>
                  </div>
                  <div className="top3-sparkles">
                    <span className="sparkle sparkle-1">✨</span>
                    <span className="sparkle sparkle-2">⭐</span>
                    <span className="sparkle sparkle-3">✨</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {allRankings.length > 0 && (
        <div className="rankings-section unified-rankings">
          <h5>🏆 Classements</h5>
          <div className="rankings-grid">
            {allRankings
              .filter(a => {
                // Exclude top 3 good Rankings (they're in podium)
                // Include all bad Rankings (reverse rankings never go to podium)
                if (a.type === 'bad') return true;
                return !a.rank || a.rank > 3;
              })
              .map((Ranking, index) => {
                const isBad = Ranking.type === 'bad';
                const gradientColor = isBad 
                  ? getRedGradientColor(Ranking.rank, Ranking.totalRanked)
                  : getGradientColor(Ranking.rank, Ranking.totalRanked);
                const borderColor = getBorderColorFromGradient(gradientColor);
                // Only apply rank class name to good Rankings (prevents yellow styling on reverse rankings)
                const rankClass = isBad ? '' : getRankClassName(Ranking.rank);
                return (
                  <div
                    key={Ranking.id}
                    className={`Ranking-card ${isBad ? 'bad' : 'good'} ${rankClass}`}
                    onClick={(e) => handleRankingClick(Ranking, e)}
                    title={getRankingTooltip(Ranking)}
                    style={{ 
                      animationDelay: `${index * 0.05}s`,
                      borderLeftColor: borderColor,
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div className="Ranking-header">
                      <span className="Ranking-title">
                        {isBad && '💀 '}{Ranking.title}
                      </span>
                      <span 
                        className="Ranking-rank"
                        style={gradientColor ? { backgroundColor: gradientColor } : {}}
                      >
                        #{Ranking.rank}{Ranking.totalRanked ? `/${Ranking.totalRanked}` : ''}
                      </span>
                    </div>
                    <p className="Ranking-description">{Ranking.description}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {comparisonRankings.length > 0 && (
        <div className="rankings-section comparison-Rankings">
          <h5>📊 Statistiques Coéquipiers et Face-à-Face</h5>
          <div className="rankings-grid">
            {comparisonRankings.map((Ranking) => (
              <div
                key={Ranking.id}
                className="Ranking-card comparison"
                onClick={(e) => handleRankingClick(Ranking, e)}
                title={getRankingTooltip(Ranking)}
              >
                <div className="Ranking-header">
                  <span className="Ranking-title">{Ranking.title}</span>
                </div>
                <p 
                  className="Ranking-description"
                  dangerouslySetInnerHTML={{ __html: highlightPlayerNames(Ranking.description) }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}