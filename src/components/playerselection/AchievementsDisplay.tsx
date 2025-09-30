import { useNavigation } from '../../context/NavigationContext';
import type { Achievement } from '../../hooks/usePlayerAchievements';
import './AchievementsDisplay.css';

interface AchievementsDisplayProps {
  achievements: Achievement[];
  title: string;
  emptyMessage?: string;
}

export function AchievementsDisplay({ achievements, title, emptyMessage }: AchievementsDisplayProps) {
  const { navigateToTab } = useNavigation();

  const handleAchievementClick = (achievement: Achievement) => {
    if (achievement.redirectTo) {
      navigateToTab(achievement.redirectTo.tab, achievement.redirectTo.subTab);
    }
  };

  if (achievements.length === 0) {
    return (
      <div className="achievements-empty">
        <h4>{title}</h4>
        <p>{emptyMessage || 'Aucun succès dans cette catégorie'}</p>
      </div>
    );
  }

  // Separate good and bad achievements
  const goodAchievements = achievements.filter(a => a.type === 'good');
  const badAchievements = achievements.filter(a => a.type === 'bad');

  return (
    <div className="achievements-container">
      <h4>{title}</h4>
      
      {goodAchievements.length > 0 && (
        <div className="achievements-section good-achievements">
          <h5>🏆 Succès</h5>
          <div className="achievements-grid">
            {goodAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-card good rank-${achievement.rank}`}
                onClick={() => handleAchievementClick(achievement)}
                title={`Cliquez pour voir le classement complet`}
              >
                <div className="achievement-header">
                  <span className="achievement-title">{achievement.title}</span>
                  <span className="achievement-rank">#{achievement.rank}</span>
                </div>
                <p className="achievement-description">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {badAchievements.length > 0 && (
        <div className="achievements-section bad-achievements">
          <h5>💀 Anti-succès</h5>
          <div className="achievements-grid">
            {badAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-card bad rank-${achievement.rank}`}
                onClick={() => handleAchievementClick(achievement)}
                title={`Cliquez pour voir le classement complet`}
              >
                <div className="achievement-header">
                  <span className="achievement-title">{achievement.title}</span>
                  <span className="achievement-rank">#{achievement.rank}</span>
                </div>
                <p className="achievement-description">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}