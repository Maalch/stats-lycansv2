import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useThemeAdjustedPlayersColor, getRandomColor } from '../../types/api';
import type { Achievement } from '../../types/achievements';
import './AchievementsDisplay.css';

interface AchievementsDisplayProps {
  achievements: Achievement[];
  title: string;
  emptyMessage?: string;
}

export function AchievementsDisplay({ achievements, title, emptyMessage }: AchievementsDisplayProps) {
  const { navigateToTab, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  const playersColor = useThemeAdjustedPlayersColor();

  const handleAchievementClick = (achievement: Achievement, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements (like the player card)
    event.stopPropagation();
    
    if (!achievement.redirectTo) return;

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
      
      // Determine focus chart based on chartSection
      let focusChart: 'totalKills' | 'averageKills' | 'totalDeaths' | 'survivalRate' = 'totalKills'; // default
      const chartSection = (achievement.redirectTo as any).chartSection;
      
      if (chartSection) {
        if (chartSection === 'killers-total') {
          focusChart = 'totalKills';
        } else if (chartSection === 'killers-average') {
          focusChart = 'averageKills';
        } else if (chartSection === 'deaths-total') {
          focusChart = 'totalDeaths';
        } else if (chartSection === 'survivors-average') {
          focusChart = 'survivalRate';
        }
      }
      
      // Set the death statistics chart state
      updateNavigationState({
        deathStatisticsState: {
          selectedCamp: campMatch?.[1] || 'Tous les camps',
          minGamesForAverage: minGames,
          focusChart: focusChart
        }
      });
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
      
      // Determine view mode based on chart section
      let viewMode: 'player-performance' | 'top-performers' = 'player-performance';
      if (chartSection === 'solo-roles' || chartSection === 'hall-of-fame') {
        viewMode = 'top-performers';
      }
      
      // Set the camp performance chart state
      updateNavigationState({
        campPerformanceState: {
          selectedCampPerformanceView: viewMode,
          selectedCampPerformanceCamp: selectedCamp,
          selectedCampPerformanceMinGames: minGames
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
          if (titleLower.includes('taux de victoire')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir les taux de victoire (min. ${minGames} parties)`;
          } else if (titleLower.includes('participation')) {
            return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir les participations`;
          }
          return `Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir le classement général des joueurs`;
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
          if (chartSection === 'camp-loup') {
            return "Cliquez pour voir les performances camp Loup";
          } else if (chartSection === 'camp-villageois') {
            return "Cliquez pour voir les performances camp Villageois";
          } else if (chartSection === 'camp-idiot') {
            return "Cliquez pour voir les performances camp Idiot du Village";
          } else if (chartSection === 'camp-amoureux') {
            return "Cliquez pour voir les performances camp Amoureux";
          } else if (chartSection === 'solo-roles') {
            return "Cliquez pour voir le Hall of Fame (tous rôles solo)";
          } else if (chartSection === 'hall-of-fame') {
            return "Cliquez pour voir le Hall of Fame (toutes performances)";
          }
          return "Cliquez pour voir les performances par camp";
        }
        break;
    }
    
    return `Cliquez pour voir ${achievement.redirectTo.subTab}`;
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

  // Separate achievements by category and sort by rank
  const goodAchievements = achievements
    .filter(a => a.category !== 'comparison' && a.type === 'good')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const badAchievements = achievements
    .filter(a => a.category !== 'comparison' && a.type === 'bad')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const comparisonAchievements = achievements.filter(a => a.category === 'comparison');

  return (
    <div className="achievements-container">
      <h4>{title}</h4>
      
      {goodAchievements.length > 0 && (
        <div className="achievements-section good-achievements">
          <h5>🏆 Classements</h5>
          <div className="achievements-grid">
            {goodAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-card good rank-${achievement.rank}`}
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