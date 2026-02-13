import { useState, useMemo } from 'react';
import './PlayerAchievementsDisplay.css';
import type {
  AchievementWithProgress,
  AchievementCategory,
  PlayerAchievements,
} from '../../types/achievements';

interface PlayerAchievementsDisplayProps {
  achievementsWithProgress: AchievementWithProgress[];
  playerAchievements: PlayerAchievements | null;
  categories: Record<string, AchievementCategory>;
  isLoading: boolean;
}

/** Render star indicators for an achievement */
function renderStars(
  levels: AchievementWithProgress['levels'],
  unlockedCount: number
) {
  return levels.map((level, i) => {
    const isUnlocked = i < unlockedCount;
    const isLycan = level.stars === 4;
    return (
      <span
        key={level.stars}
        className={`achievement-star ${isUnlocked ? 'unlocked' : ''} ${isLycan ? 'lycan' : ''}`}
        title={`${isLycan ? '🐺 Lycan' : '⭐'.repeat(level.stars)} — ${level.threshold}`}
      >
        {isLycan ? '🐺' : '⭐'}
      </span>
    );
  });
}

export function PlayerAchievementsDisplay({
  achievementsWithProgress,
  playerAchievements,
  categories,
  isLoading,
}: PlayerAchievementsDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="achievements-section">
        <div className="achievements-loading">
          <div className="loading-spinner"></div>
          <p>Chargement des succès...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!achievementsWithProgress || achievementsWithProgress.length === 0) {
    return (
      <div className="achievements-section">
        <div className="achievements-empty">
          <p>🏆 Aucun succès disponible</p>
          <p className="achievements-empty-subtitle">
            Les succès seront disponibles après la prochaine synchronisation hebdomadaire
          </p>
        </div>
      </div>
    );
  }

  // Compute summary stats
  const totalLevels = achievementsWithProgress.reduce((sum, a) => sum + a.levels.length, 0);
  const totalUnlocked = playerAchievements?.totalUnlocked || 0;

  // Count unlocked by star tier
  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (playerAchievements) {
    for (const ach of playerAchievements.achievements) {
      for (const level of ach.unlockedLevels) {
        starCounts[level.stars as 1 | 2 | 3 | 4]++;
      }
    }
  }

  // Count per-category unlocked achievements (at least 1 level)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; unlocked: number }> = {};
    for (const ach of achievementsWithProgress) {
      if (!counts[ach.category]) counts[ach.category] = { total: 0, unlocked: 0 };
      counts[ach.category].total++;
      if (ach.playerProgress && ach.playerProgress.unlockedLevels.length > 0) {
        counts[ach.category].unlocked++;
      }
    }
    return counts;
  }, [achievementsWithProgress]);

  // Filter by category
  const filteredAchievements = selectedCategory
    ? achievementsWithProgress.filter(a => a.category === selectedCategory)
    : achievementsWithProgress;

  // Sort: unlocked first (by progress desc), then locked, group by category
  const sortedCategories = Object.entries(categories)
    .sort(([, a], [, b]) => a.order - b.order);

  // Group filtered achievements by category (maintaining order)
  const groupedAchievements = useMemo(() => {
    const groups: { key: string; label: string; emoji: string; items: AchievementWithProgress[] }[] = [];
    
    for (const [catKey, catMeta] of sortedCategories) {
      const items = filteredAchievements.filter(a => a.category === catKey);
      if (items.length === 0) continue;

      // Sort within category: unlocked first, then by progress
      items.sort((a, b) => {
        const aUnlocked = a.playerProgress ? a.playerProgress.unlockedLevels.length : 0;
        const bUnlocked = b.playerProgress ? b.playerProgress.unlockedLevels.length : 0;
        // Fully unlocked first
        const aFull = aUnlocked === a.levels.length ? 1 : 0;
        const bFull = bUnlocked === b.levels.length ? 1 : 0;
        if (aFull !== bFull) return bFull - aFull;
        // Then by unlocked count
        if (aUnlocked !== bUnlocked) return bUnlocked - aUnlocked;
        // Then by progress
        const aProg = a.playerProgress?.progress || 0;
        const bProg = b.playerProgress?.progress || 0;
        return bProg - aProg;
      });

      groups.push({ key: catKey, label: catMeta.label, emoji: catMeta.emoji, items });
    }
    return groups;
  }, [filteredAchievements, sortedCategories]);

  return (
    <div className="achievements-section">
      {/* Summary Bar */}
      <div className="achievements-summary">
        <div className="achievements-summary-item">
          <span className="achievements-summary-value">{totalUnlocked}</span>
          <span className="achievements-summary-label">/ {totalLevels} niveaux</span>
        </div>
        {starCounts[1] > 0 && (
          <div className="achievements-summary-item">
            <span>⭐</span>
            <span className="achievements-summary-value">{starCounts[1]}</span>
          </div>
        )}
        {starCounts[2] > 0 && (
          <div className="achievements-summary-item">
            <span>⭐⭐</span>
            <span className="achievements-summary-value">{starCounts[2]}</span>
          </div>
        )}
        {starCounts[3] > 0 && (
          <div className="achievements-summary-item">
            <span>⭐⭐⭐</span>
            <span className="achievements-summary-value">{starCounts[3]}</span>
          </div>
        )}
        {starCounts[4] > 0 && (
          <div className="achievements-summary-item">
            <span>🐺</span>
            <span className="achievements-summary-value">{starCounts[4]}</span>
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="achievements-categories">
        <button
          type="button"
          className={`achievements-category-btn ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          Tous
          <span className="achievements-category-count">({achievementsWithProgress.length})</span>
        </button>
        {sortedCategories.map(([catKey, catMeta]) => {
          const counts = categoryCounts[catKey];
          if (!counts) return null;
          return (
            <button
              key={catKey}
              type="button"
              className={`achievements-category-btn ${selectedCategory === catKey ? 'active' : ''}`}
              onClick={() => setSelectedCategory(catKey)}
            >
              {catMeta.emoji} {catMeta.label}
              <span className="achievements-category-count">
                ({counts.unlocked}/{counts.total})
              </span>
            </button>
          );
        })}
      </div>

      {/* Achievement Cards by Category */}
      {groupedAchievements.map(group => (
        <div key={group.key}>
          {/* Only show category header when viewing all */}
          {!selectedCategory && (
            <div className="achievements-category-header">
              <span>{group.emoji}</span>
              <h4>{group.label}</h4>
              <span className="cat-count">
                ({categoryCounts[group.key]?.unlocked || 0}/{categoryCounts[group.key]?.total || 0})
              </span>
            </div>
          )}

          <div className="achievements-grid">
            {group.items.map(achievement => {
              const progress = achievement.playerProgress;
              const unlockedCount = progress ? progress.unlockedLevels.length : 0;
              const fullyUnlocked = unlockedCount === achievement.levels.length;
              const hasProgress = progress !== null && progress.currentValue > 0;
              const isLocked = !hasProgress;

              return (
                <div
                  key={achievement.id}
                  className={`achievement-card ${
                    fullyUnlocked ? 'fully-unlocked' :
                    hasProgress ? 'has-progress' :
                    'locked'
                  }`}
                  title={achievement.explanation}
                >
                  <div className="achievement-emoji">
                    {achievement.emoji}
                  </div>
                  <div className="achievement-content">
                    <h5 className="achievement-name">{achievement.name}</h5>
                    <p className="achievement-description">{achievement.description}</p>
                    {!isLocked && (
                      <p className="achievement-explanation">{achievement.explanation}</p>
                    )}

                    {/* Stars */}
                    <div className="achievement-stars">
                      {renderStars(achievement.levels, unlockedCount)}
                    </div>

                    {/* Progress */}
                    {hasProgress && !fullyUnlocked && progress && (
                      <div className="achievement-progress-container">
                        <div className="achievement-progress-bar">
                          <div
                            className="achievement-progress-fill"
                            style={{ width: `${Math.max(progress.progress * 100, 2)}%` }}
                          />
                        </div>
                        <div className="achievement-progress-text">
                          <span className="achievement-progress-value">
                            {progress.currentValue}
                          </span>
                          {progress.nextLevel && (
                            <span>prochain : {progress.nextLevel.threshold}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Fully completed indicator */}
                    {fullyUnlocked && progress && (
                      <div className="achievement-progress-container">
                        <div className="achievement-progress-bar">
                          <div
                            className="achievement-progress-fill complete"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="achievement-progress-text">
                          <span className="achievement-progress-value">
                            {progress.currentValue}
                          </span>
                          <span>✅ Complété</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
