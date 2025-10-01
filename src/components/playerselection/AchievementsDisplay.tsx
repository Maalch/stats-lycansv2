import { useNavigation } from '../../context/NavigationContext';
import { useThemeAdjustedPlayersColor, getRandomColor } from '../../types/api';
import type { Achievement } from '../../types/achievements';
import './AchievementsDisplay.css';

interface AchievementsDisplayProps {
  achievements: Achievement[];
  title: string;
  emptyMessage?: string;
}

export function AchievementsDisplay({ achievements, title, emptyMessage }: AchievementsDisplayProps) {
  const { navigateToTab } = useNavigation();
  const playersColor = useThemeAdjustedPlayersColor();

  const handleAchievementClick = (achievement: Achievement) => {
    if (achievement.redirectTo) {
      navigateToTab(achievement.redirectTo.tab, achievement.redirectTo.subTab);
    }
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
                onClick={() => handleAchievementClick(achievement)}
                title={`Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir le classement complet`}
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
                onClick={() => handleAchievementClick(achievement)}
                title={`Classement: ${achievement.rank}${achievement.totalRanked ? `/${achievement.totalRanked} joueurs` : ''} - Cliquez pour voir le classement complet`}
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
                onClick={() => handleAchievementClick(achievement)}
                title={`Cliquez pour voir les comparaisons détaillées`}
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