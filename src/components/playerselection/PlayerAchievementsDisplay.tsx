import { useState, useMemo, useEffect } from 'react';
import './PlayerAchievementsDisplay.css';
import { AchievementStar } from './AchievementStar';
import type {
  AchievementWithProgress,
  AchievementCategory,
  PlayerAchievements,
  AchievementLevel,
  AchievementTier,
  AchievementsData,
  PlayerAchievementProgress,
} from '../../types/achievements';

interface PlayerAchievementsDisplayProps {
  achievementsWithProgress: AchievementWithProgress[];
  playerAchievements: PlayerAchievements | null;
  categories: Record<string, AchievementCategory>;
  isLoading: boolean;
  /** Full achievements dataset — enables comparison mode */
  allData?: AchievementsData | null;
  /** Name of the player currently viewed */
  currentPlayerName?: string | null;
}

/** Tier display configuration */
const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  argent: 'Argent',
  or: 'Or',
  lycans: 'Lycans',
};

/** Tier summary emojis for the summary bar */
const TIER_SUMMARY_EMOJI: Record<AchievementTier, string> = {
  bronze: '🥉',
  argent: '🥈',
  or: '🥇',
  lycans: '🐺',
};

const TIERS_ORDERED: AchievementTier[] = ['bronze', 'argent', 'or', 'lycans'];

/** Compute tier unlock counts from a PlayerAchievements object */
function computeTierCounts(playerAchievements: PlayerAchievements | null): Record<AchievementTier, number> {
  const counts: Record<AchievementTier, number> = { bronze: 0, argent: 0, or: 0, lycans: 0 };
  if (playerAchievements) {
    for (const ach of playerAchievements.achievements) {
      for (const level of ach.unlockedLevels) {
        counts[level.tier]++;
      }
    }
  }
  return counts;
}

/** Truncate a player name for compact display */
function truncateName(name: string | null | undefined, maxLen = 12): string {
  if (!name) return '?';
  return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
}

/**
 * Group levels by tier for visual separation.
 * Returns [[bronze levels], [argent levels], [or levels], [lycans levels]]
 */
function groupLevelsByTier(levels: AchievementLevel[]): { tier: AchievementTier; levels: AchievementLevel[] }[] {
  const groups: { tier: AchievementTier; levels: AchievementLevel[] }[] = [];
  let currentTier: AchievementTier | null = null;
  let currentGroup: AchievementLevel[] = [];

  for (const level of levels) {
    if (level.tier !== currentTier) {
      if (currentGroup.length > 0 && currentTier) {
        groups.push({ tier: currentTier, levels: currentGroup });
      }
      currentTier = level.tier;
      currentGroup = [level];
    } else {
      currentGroup.push(level);
    }
  }
  if (currentGroup.length > 0 && currentTier) {
    groups.push({ tier: currentTier, levels: currentGroup });
  }
  return groups;
}

/** Render tier indicators for an achievement — colored stars grouped by tier with separators */
function renderTiers(
  levels: AchievementLevel[],
  unlockedCount: number
) {
  const tierGroups = groupLevelsByTier(levels);
  let levelIndex = 0;

  return tierGroups.map((group, groupIdx) => (
    <span key={group.tier} className="achievement-tier-group">
      {groupIdx > 0 && <span className="achievement-tier-separator" />}
      {group.levels.map((level) => {
        const isUnlocked = levelIndex < unlockedCount;
        const title = `${TIER_LABELS[level.tier]} ${level.subLevel} — ${level.threshold}`;
        levelIndex++;
        return (
          <AchievementStar
            key={`${level.tier}-${level.subLevel}`}
            tier={level.tier}
            filled={isUnlocked}
            size={18}
            title={title}
          />
        );
      })}
    </span>
  ));
}

export function PlayerAchievementsDisplay({
  achievementsWithProgress,
  playerAchievements,
  categories,
  isLoading,
  allData,
  currentPlayerName,
}: PlayerAchievementsDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Must be declared before early returns (Rules of Hooks)
  const [comparePlayerName, setComparePlayerName] = useState<string>('');

  // Reset comparison when the viewed player changes
  useEffect(() => {
    setComparePlayerName('');
  }, [currentPlayerName]);

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
  const tierCounts = computeTierCounts(playerAchievements);

  // --- Comparison mode data ---

  // List of all players available for comparison (excluding the current player)
  const availablePlayers = useMemo(() => {
    if (!allData) return [];
    return Object.values(allData.players)
      .map(p => p.playerName)
      .filter(name => name !== currentPlayerName)
      .sort((a, b) => a.localeCompare(b));
  }, [allData, currentPlayerName]);

  // Resolve the comparison player's full data
  const comparePlayerData = useMemo((): PlayerAchievements | null => {
    if (!allData || !comparePlayerName) return null;
    const entry = Object.entries(allData.players).find(([, p]) => p.playerName === comparePlayerName);
    return entry ? entry[1] : null;
  }, [allData, comparePlayerName]);

  // Map achievementId → compare player's progress for O(1) lookup
  const compareProgressMap = useMemo(() => {
    const map = new Map<string, PlayerAchievementProgress>();
    if (!comparePlayerData) return map;
    for (const ach of comparePlayerData.achievements) {
      map.set(ach.id, ach);
    }
    return map;
  }, [comparePlayerData]);

  const compareIsActive = Boolean(comparePlayerName && comparePlayerData);
  const compareTierCounts = useMemo(() => computeTierCounts(comparePlayerData), [comparePlayerData]);
  const compareTotalUnlocked = comparePlayerData?.totalUnlocked || 0;

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
      {/* Comparison toggle / selector */}
      {allData && availablePlayers.length > 0 && !compareIsActive && (
        <div className="achievements-compare-toggle">
          <button
            type="button"
            className="achievements-compare-btn"
            onClick={() => setComparePlayerName(availablePlayers[0])}
          >
            ⚔️ Comparer avec un autre joueur
          </button>
        </div>
      )}
      {compareIsActive && (
        <div className="achievements-compare-selector">
          <label htmlFor="compare-player-select">⚔️ Comparer avec :</label>
          <select
            id="compare-player-select"
            className="achievements-compare-select"
            value={comparePlayerName}
            onChange={(e) => setComparePlayerName(e.target.value)}
          >
            {availablePlayers.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button
            type="button"
            className="achievements-compare-close"
            onClick={() => setComparePlayerName('')}
            title="Fermer la comparaison"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Bar — single or comparison layout */}
      {!compareIsActive ? (
        <div className="achievements-summary">
          <div className="achievements-summary-item">
            <span className="achievements-summary-value">{totalUnlocked}</span>
            <span className="achievements-summary-label">/ {totalLevels} niveaux</span>
          </div>
          {(Object.entries(tierCounts) as [AchievementTier, number][])
            .filter(([, count]) => count > 0)
            .map(([tier, count]) => (
              <div key={tier} className="achievements-summary-item">
                {tier !== 'lycans' ? (
                  <AchievementStar tier={tier} filled={true} size={20} />
                ) : (
                  <span>{TIER_SUMMARY_EMOJI[tier]}</span>
                )}
                <span className="achievements-summary-value">{count}</span>
              </div>
            ))}
        </div>
      ) : (
        <div className="achievements-summary compare-mode">
          {/* Main player column */}
          <div className="achievements-summary-player main-player">
            <span className="achievements-summary-player-name" title={currentPlayerName || ''}>
              {truncateName(currentPlayerName)}
            </span>
            <div className="achievements-summary-item">
              <span className="achievements-summary-value">{totalUnlocked}</span>
              <span className="achievements-summary-label">/ {totalLevels}</span>
            </div>
            <div className="achievements-summary-tiers">
              {TIERS_ORDERED.filter(t => tierCounts[t] > 0).map(tier => (
                <span key={tier} className="achievements-summary-tier-item">
                  {tier !== 'lycans'
                    ? <AchievementStar tier={tier} filled={true} size={16} />
                    : <span>{TIER_SUMMARY_EMOJI[tier]}</span>}
                  <span>{tierCounts[tier]}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="achievements-summary-vs">⚔️</div>

          {/* Compare player column */}
          <div className="achievements-summary-player other-player">
            <span className="achievements-summary-player-name" title={comparePlayerName}>
              {truncateName(comparePlayerName)}
            </span>
            <div className="achievements-summary-item">
              <span className="achievements-summary-value">{compareTotalUnlocked}</span>
              <span className="achievements-summary-label">/ {totalLevels}</span>
            </div>
            <div className="achievements-summary-tiers">
              {TIERS_ORDERED.filter(t => compareTierCounts[t] > 0).map(tier => (
                <span key={tier} className="achievements-summary-tier-item">
                  {tier !== 'lycans'
                    ? <AchievementStar tier={tier} filled={true} size={16} />
                    : <span>{TIER_SUMMARY_EMOJI[tier]}</span>}
                  <span>{compareTierCounts[tier]}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Battle bar — each player fills from their side */}
          <div className="achievements-battle-bar">
            <div
              className="achievements-battle-bar-p1"
              style={{ width: `${(totalUnlocked / totalLevels) * 100}%` }}
            />
            <div
              className="achievements-battle-bar-p2"
              style={{ width: `${(compareTotalUnlocked / totalLevels) * 100}%` }}
            />
          </div>
        </div>
      )}

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

              // Comparison state for this achievement
              const compareProgress = compareIsActive ? (compareProgressMap.get(achievement.id) ?? null) : null;
              const compareUnlockedCount = compareProgress ? compareProgress.unlockedLevels.length : 0;

              // Card class: comparison mode overrides normal state
              let cardClass: string;
              if (compareIsActive) {
                if (unlockedCount > compareUnlockedCount) cardClass = 'compare-main-ahead';
                else if (compareUnlockedCount > unlockedCount) cardClass = 'compare-other-ahead';
                else if (unlockedCount > 0) cardClass = 'compare-tied';
                else cardClass = 'locked';
              } else {
                cardClass = fullyUnlocked ? 'fully-unlocked' : hasProgress ? 'has-progress' : 'locked';
              }

              return (
                <div
                  key={achievement.id}
                  className={`achievement-card ${cardClass}`}
                  title={achievement.explanation}
                >
                  <div className="achievement-emoji">
                    {achievement.emoji}
                  </div>
                  <div className="achievement-content">
                    <h5 className="achievement-name">{achievement.name}</h5>
                    <p className="achievement-description">{achievement.description}</p>
                    <p className="achievement-explanation">{achievement.explanation}</p>

                    {/* Stars — single row in normal mode, two rows in comparison mode */}
                    {!compareIsActive ? (
                      <div className="achievement-stars">
                        {renderTiers(achievement.levels, unlockedCount)}
                      </div>
                    ) : (
                      <div className="achievement-compare-rows">
                        <div className="achievement-compare-row main">
                          <span className="achievement-compare-label" title={currentPlayerName || ''}>
                            {truncateName(currentPlayerName, 10)}
                          </span>
                          <div className="achievement-stars">
                            {renderTiers(achievement.levels, unlockedCount)}
                          </div>
                          {progress !== null && progress.currentValue > 0 && (
                            <span className="achievement-compare-value">{progress.currentValue}</span>
                          )}
                        </div>
                        <div className="achievement-compare-row other">
                          <span className="achievement-compare-label" title={comparePlayerName}>
                            {truncateName(comparePlayerName, 10)}
                          </span>
                          <div className="achievement-stars">
                            {renderTiers(achievement.levels, compareUnlockedCount)}
                          </div>
                          {compareProgress !== null && compareProgress.currentValue > 0 && (
                            <span className="achievement-compare-value">{compareProgress.currentValue}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress bar — single mode only */}
                    {!compareIsActive && hasProgress && !fullyUnlocked && progress && (
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

                    {/* Fully completed indicator — single mode only */}
                    {!compareIsActive && fullyUnlocked && progress && (
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
