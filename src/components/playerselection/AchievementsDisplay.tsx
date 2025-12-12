import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useThemeAdjustedDynamicPlayersColor, getRandomColor } from '../../types/api';
import { useJoueursData } from '../../hooks/useJoueursData';
import type { Achievement } from '../../types/achievements';
import './AchievementsDisplay.css';

interface AchievementsDisplayProps {
  achievements: Achievement[];
  title: string;
  emptyMessage?: string;
  achievementType?: 'all' | 'modded'; // Track which type of achievements are displayed
}

export function AchievementsDisplay({ achievements, title, emptyMessage, achievementType = 'all' }: AchievementsDisplayProps) {
  const { navigateToTab, updateNavigationState, clearNavigation } = useNavigation();
  const { settings, updateSettings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  const handleAchievementClick = (achievement: Achievement, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements (like the player card)
    event.stopPropagation();
    
    if (!achievement.redirectTo) return;

    // Clear any existing navigation context and settings filters
    clearNavigation();
    
    // Reset all settings to defaults while preserving the highlighted player
    const currentHighlightedPlayer = settings.highlightedPlayer;
    
    if (achievementType === 'modded') {
      // Set modded games filter if we're viewing modded achievements
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
      // For 'all' achievements, reset everything to defaults but preserve highlighted player
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

    // Handle special navigation cases based on achievement category and chart section
    if (achievement.category === 'comparison' && achievement.redirectTo.subTab === 'comparison') {
      // Extract the other player name from the achievement description
      const currentPlayer = settings.highlightedPlayer || '';
      const otherPlayer = extractOtherPlayerName(achievement.description, currentPlayer);
      
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
    
    // Handle pairing achievements that should go to specific pairing tabs
    if (achievement.category === 'comparison' && achievement.redirectTo.subTab === 'pairing') {
      // For wolf/lover pairing achievements, navigate to the appropriate tab
      const isWolfPairing = achievement.description.toLowerCase().includes('loup');
      updateNavigationState({
        selectedPairingTab: isWolfPairing ? 'wolves' : 'lovers'
      });
    }
    
    // Handle death statistics achievements
    if (achievement.category === 'kills' && achievement.redirectTo.subTab === 'deathStats') {
      // Extract camp information if present in the description
      const campMatch = achievement.description.match(/(Villageois|Loups|Autres)/i);
      if (campMatch) {
        updateNavigationState({
          deathStatsSelectedCamp: campMatch[1]
        });
      }
      
      // Extract minimum games from achievement description (e.g., "min. 25 parties")
      let minGames = 10; // default
      const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1], 10);
      }
      
      // Determine focus chart and view based on chartSection
      let focusChart: 'totalKills' | 'averageKills' | 'totalDeaths' | 'survivalRate' = 'totalKills'; // default
      let selectedView: 'killers' | 'deaths' | 'hunter' | 'survival' = 'killers'; // default
      const chartSection = (achievement.redirectTo as any).chartSection;
      
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
          // Both good and bad hunter achievements should navigate to hunter view
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
    
    // Handle map achievements (Village 🏘️ and Château 🏰)
    if (achievement.category === 'map' && achievement.redirectTo.subTab === 'playersGeneral') {
      // Extract map filter from server-side achievement
      const mapFilter = (achievement.redirectTo as any).mapFilter || 'all';
      
      // Extract minimum games from achievement description (e.g., "min. 10 parties")
      let minGames = 10; // default for map achievements
      const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1]);
      }
      
      // Set up map filter in settings
      if (achievementType === 'modded') {
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
          winRateOrder: 'best', // Map achievements are always about good performance
          focusChart: 'winRate' // Focus on win rate chart for map achievements
        }
      });
      
      // Navigate to general statistics
      navigateToTab('players', 'playersGeneral');
      return; // Early return to skip the default navigation
    }

    // Handle player history achievements that should highlight specific maps
    if (achievement.category === 'history' && achievement.redirectTo.subTab === 'history') {
      // Set the player name for the history chart
      updateNavigationState({
        selectedPlayerName: settings.highlightedPlayer || '',
        groupingMethod: 'session' // Default to session view for achievement navigation
      });
    }

    // Handle series achievements with specific series types
    if (achievement.category === 'series' && achievement.redirectTo.subTab === 'series') {
      // Determine which series type based on achievement title/description
      let seriesType: 'villageois' | 'loup' | 'wins' | 'losses' = 'wins'; // default
      
      const titleLower = achievement.title.toLowerCase();
      const descriptionLower = achievement.description.toLowerCase();
      
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

    // Handle general achievements with specific minGames and focus
    if (achievement.category === 'general' && achievement.redirectTo.subTab === 'playersGeneral') {
      // Extract minimum games from achievement description (e.g., "min. 50 parties")
      let minGames = 10; // default
      const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
      if (minGamesMatch) {
        minGames = parseInt(minGamesMatch[1], 10);
      }
      
      // Determine focus chart and win rate order based on achievement title/description
      let focusChart: 'participation' | 'winRate' = 'winRate'; // default for most achievements
      let winRateOrder: 'best' | 'worst' = 'best'; // default
      
      const titleLower = achievement.title.toLowerCase();
      const descriptionLower = achievement.description.toLowerCase();
      
      if (titleLower.includes('participation') || descriptionLower.includes('participation')) {
        focusChart = 'participation';
      } else if (titleLower.includes('taux de victoire') || descriptionLower.includes('taux de victoire')) {
        focusChart = 'winRate';
        // Determine if it's a "worst" achievement or "best" achievement
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

    // Handle performance achievements with specific camp and minGames filters
    if (achievement.category === 'performance' && achievement.redirectTo.subTab === 'campPerformance') {
      // Extract camp from chartSection (e.g., 'camp-loup' → 'Loup')
      const chartSection = (achievement.redirectTo as any).chartSection;
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
      
      // Extract minimum games from achievement description (e.g., "min. 10")
      const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
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

    // Handle voting achievements with specific category and view
    if (achievement.category === 'voting' && achievement.redirectTo.subTab === 'votingStats') {
      const titleLower = achievement.title.toLowerCase();
      let selectedCategory: 'overview' | 'behavior' = 'overview';
      let selectedView: 'behavior' | 'accuracy' | 'targets' | 'voteRate' | 'skipRate' | 'abstentionRate' = 'behavior';
      
      // Determine category and view based on achievement title
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

    // Navigate to the specified tab and subTab
    navigateToTab(achievement.redirectTo.tab, achievement.redirectTo.subTab);
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

  // Helper function to generate appropriate tooltip text based on achievement type
  const getAchievementTooltip = (achievement: Achievement): string => {
    if (!achievement.redirectTo) {
      return "Aucune navigation disponible";
    }

    switch (achievement.category) {
      case 'general':
        if (achievement.redirectTo.subTab === 'playersGeneral') {
          // Extract minimum games for a more specific tooltip
          const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
          const minGames = minGamesMatch ? parseInt(minGamesMatch[1], 10) : 10;
          
          const titleLower = achievement.title.toLowerCase();
          const filterInfo = achievementType === 'modded' 
            ? " (Filtre parties moddées activé)" 
            : " (Filtres réinitialisés)";
            
          if (titleLower.includes('taux de victoire')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir les taux de victoire (min. ${minGames} parties)${filterInfo}`;
          } else if (titleLower.includes('participation')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir les participations${filterInfo}`;
          }
          return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir le classement général des joueurs${filterInfo}`;
        }
        break;
      case 'map':
        if (achievement.redirectTo.subTab === 'playersGeneral') {
          const mapFilter = (achievement.redirectTo as any).mapFilter;
          const mapName = mapFilter === 'village' ? 'Village' : mapFilter === 'chateau' ? 'Château' : 'map';
          const filterInfo = achievementType === 'modded' 
            ? " (Filtres parties moddées + map activés)" 
            : " (Filtre map activé)";
          return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir les statistiques générales filtrées sur ${mapName}${filterInfo}`;
        }
        break;
      case 'history':
        if (achievement.redirectTo.subTab === 'history') {
          return "Cliquez pour voir l'historique détaillé du joueur par map";
        }
        break;
      case 'comparison':
        if (achievement.redirectTo.subTab === 'comparison') {
          const otherPlayer = extractOtherPlayerName(achievement.description, settings.highlightedPlayer || '');
          return `Cliquez pour comparer avec ${otherPlayer || 'ce joueur'}`;
        }
        if (achievement.redirectTo.subTab === 'pairing') {
          return "Cliquez pour voir les statistiques de paires";
        }
        break;
      case 'kills':
        if (achievement.redirectTo.subTab === 'deathStats') {
          // Extract camp and minimum games for a more specific tooltip
          const campMatch = achievement.description.match(/(Villageois|Loups|Autres)/i);
          const minGamesMatch = achievement.description.match(/min\.\s*(\d+)/);
          const minGames = minGamesMatch ? parseInt(minGamesMatch[1], 10) : 10;
          const camp = campMatch?.[1] || 'Tous les camps';
          
          const chartSection = (achievement.redirectTo as any).chartSection;
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
        if (achievement.redirectTo.subTab === 'series') {
          // Determine which series type for better tooltip
          const titleLower = achievement.title.toLowerCase();
          const descriptionLower = achievement.description.toLowerCase();
          
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
        if (achievement.redirectTo.subTab === 'campPerformance') {
          // Extract camp from chartSection for a more specific tooltip
          const chartSection = (achievement.redirectTo as any).chartSection;
          const filterInfo = achievementType === 'modded' 
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
        if (achievement.redirectTo.subTab === 'votingStats') {
          const minMeetingsMatch = achievement.description.match(/min\.\s*(\d+)/);
          const minMeetings = minMeetingsMatch ? parseInt(minMeetingsMatch[1], 10) : 25;
          
          const filterInfo = achievementType === 'modded' 
            ? " (Filtre parties moddées activé)" 
            : " (Filtres réinitialisés)";
          
          const titleLower = achievement.title.toLowerCase();
          
          if (titleLower.includes('agressivité')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir le score d'agressivité (min. ${minMeetings} meetings)${filterInfo}`;
          } else if (titleLower.includes('taux de vote')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir le taux de vote (min. ${minMeetings} meetings)${filterInfo}`;
          } else if (titleLower.includes('précision')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir la précision des votes${filterInfo}`;
          }
          return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir les statistiques de vote${filterInfo}`;
        }
        break;
    }
    
    // Add filter reset information to all tooltips
    const baseTooltip = `Cliquez pour voir ${achievement.redirectTo.subTab}`;
    const filterInfo = achievementType === 'modded' 
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

  if (achievements.length === 0) {
    return (
      <div className="achievements-empty">
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

  // Separate achievements by category and sort by rank
  const goodAchievements = achievements
    .filter(a => a.category !== 'comparison' && (a.type === 'good' || a.type === 'neutral'))
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const badAchievements = achievements
    .filter(a => a.category !== 'comparison' && a.type === 'bad')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const comparisonAchievements = achievements.filter(a => a.category === 'comparison');

  // Count top 3 achievements
  const top3Count = goodAchievements.filter(a => a.rank && a.rank <= 3).length;

  return (
    <div className="achievements-container">
      <h4>{title}</h4>
      
      {/* Top 3 Showcase Section */}
      {top3Count > 0 && (
        <div className="top3-showcase">
          <h5 className="top3-title">✨ Podium d'Excellence ✨</h5>
          <div className="top3-grid">
            {goodAchievements
              .filter(a => a.rank && a.rank <= 3)
              .map((achievement, index) => (
                <div
                  key={achievement.id}
                  className={`top3-card ${getRankClassName(achievement.rank)} animate-slide-in`}
                  style={{ animationDelay: `${index * 0.15}s` }}
                  onClick={(e) => handleAchievementClick(achievement, e)}
                  title={getAchievementTooltip(achievement)}
                >
                  <div className="top3-medal-container">
                    <span className="top3-medal">{getMedalEmoji(achievement.rank)}</span>
                  </div>
                  <div className="top3-content">
                    <div className="top3-rank-badge">
                      #{achievement.rank}{achievement.totalRanked ? `/${achievement.totalRanked}` : ''}
                    </div>
                    <h6 className="top3-achievement-title">{achievement.title}</h6>
                    <p className="top3-achievement-description">{achievement.description}</p>
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
      
      {goodAchievements.length > 0 && (
        <div className="achievements-section good-achievements">
          <h5>🏆 Classements</h5>
          <div className="achievements-grid">
            {goodAchievements
              .filter(a => !a.rank || a.rank > 3) // Exclude top 3 from this section
              .map((achievement, index) => (
              <div
                key={achievement.id}
                className={`achievement-card good ${getRankClassName(achievement.rank)}`}
                onClick={(e) => handleAchievementClick(achievement, e)}
                title={getAchievementTooltip(achievement)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="achievement-header">
                  <span className="achievement-title">
                    {achievement.title}
                  </span>
                  <span className="achievement-rank">
                    #{achievement.rank}{achievement.totalRanked ? `/${achievement.totalRanked}` : ''}
                  </span>
                </div>
                <p className="achievement-description">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {badAchievements.length > 0 && (
        <div className="achievements-section bad-achievements">
          <h5>💀 Classements (Inversés)</h5>
          <div className="achievements-grid">
            {badAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-card bad rank-${achievement.rank}`}
                onClick={(e) => handleAchievementClick(achievement, e)}
                title={getAchievementTooltip(achievement)}
              >
                <div className="achievement-header">
                  <span className="achievement-title">{achievement.title}</span>
                  <span className="achievement-rank">
                    #{achievement.rank}{achievement.totalRanked ? `/${achievement.totalRanked}` : ''}
                  </span>
                </div>
                <p className="achievement-description">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {comparisonAchievements.length > 0 && (
        <div className="achievements-section comparison-achievements">
          <h5>📊 Statistiques Face-à-Face</h5>
          <div className="achievements-grid">
            {comparisonAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="achievement-card comparison"
                onClick={(e) => handleAchievementClick(achievement, e)}
                title={getAchievementTooltip(achievement)}
              >
                <div className="achievement-header">
                  <span className="achievement-title">{achievement.title}</span>
                </div>
                <p 
                  className="achievement-description"
                  dangerouslySetInnerHTML={{ __html: highlightPlayerNames(achievement.description) }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}