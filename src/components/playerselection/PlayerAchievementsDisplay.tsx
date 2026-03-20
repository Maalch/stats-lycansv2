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
 * Global maximum sublevels per tier.
 * All rows always render this many slots per tier so every tier column is identical width.
 */
const MAX_SUBLEVELS: Record<AchievementTier, number> = {
  bronze: 3,
  argent: 3,
  or: 3,
  lycans: 1,
};

/**
 * Render tier indicators for an achievement.
 * ALWAYS renders all 4 tiers with exactly MAX_SUBLEVELS slots each (invisible spacers for
 * missing slots) so every row has an identical fixed layout: [3b | 3a | 3o | 1l].
 */
function renderTiers(
  levels: AchievementLevel[],
  unlockedCount: number,
  size: number = 18
) {
  // Build a map of tier → levels (in sublevel order) for O(1) lookup
  const tierLevelsMap = new Map<AchievementTier, AchievementLevel[]>();
  for (const level of levels) {
    if (!tierLevelsMap.has(level.tier)) tierLevelsMap.set(level.tier, []);
    tierLevelsMap.get(level.tier)!.push(level);
  }

  let levelIndex = 0;
  const hasMultipleLevels = levels.length > 1;

  return TIERS_ORDERED.map((tier, groupIdx) => {
    const tierLevels = tierLevelsMap.get(tier) || [];
    const maxSlots = MAX_SUBLEVELS[tier];
    
    // Calculate offset to center stars when there are fewer than maxSlots
    const offset = Math.floor((maxSlots - tierLevels.length) / 2);

    const stars = [];
    for (let slot = 0; slot < maxSlots; slot++) {
      // Check if this slot should have a real star (within the centered range)
      const levelIndex_inTier = slot - offset;
      const level = (levelIndex_inTier >= 0 && levelIndex_inTier < tierLevels.length) 
        ? tierLevels[levelIndex_inTier] 
        : null;
      
      if (level) {
        const isUnlocked = levelIndex < unlockedCount;
        const title = `${TIER_LABELS[level.tier]} ${level.subLevel} — ${level.threshold}`;
        levelIndex++;
        stars.push(
          <AchievementStar key={`${tier}-${slot}`} tier={tier} filled={isUnlocked} size={size} title={title} />
        );
      } else {
        // Ghost slot — keeps column width identical across all rows
        stars.push(
          <span
            key={`ghost-${tier}-${slot}`}
            style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, visibility: 'hidden' }}
          />
        );
      }
    }

    return (
      <span key={tier} className="achievement-tier-group">
        {groupIdx > 0 && hasMultipleLevels && <span className="achievement-tier-separator" />}
        {stars}
      </span>
    );
  });
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

  // Compute overlap breakdown for comparison mode
  const comparisonBreakdown = useMemo(() => {
    if (!compareIsActive || !playerAchievements || !comparePlayerData) {
      return { shared: 0, mainOnly: 0, otherOnly: 0, neither: 0 };
    }

    // Build sets of unlocked level keys: "achievementId-tier-subLevel"
    const buildUnlockedSet = (player: PlayerAchievements): Set<string> => {
      const set = new Set<string>();
      for (const ach of player.achievements) {
        for (const level of ach.unlockedLevels) {
          set.add(`${ach.id}-${level.tier}-${level.subLevel}`);
        }
      }
      return set;
    };

    const mainSet = buildUnlockedSet(playerAchievements);
    const otherSet = buildUnlockedSet(comparePlayerData);

    // Count all levels from definitions
    let shared = 0;
    let mainOnly = 0;
    let otherOnly = 0;
    let neither = 0;

    for (const ach of achievementsWithProgress) {
      for (const level of ach.levels) {
        const key = `${ach.id}-${level.tier}-${level.subLevel}`;
        const mainHas = mainSet.has(key);
        const otherHas = otherSet.has(key);

        if (mainHas && otherHas) shared++;
        else if (mainHas) mainOnly++;
        else if (otherHas) otherOnly++;
        else neither++;
      }
    }

    return { shared, mainOnly, otherOnly, neither };
  }, [compareIsActive, playerAchievements, comparePlayerData, achievementsWithProgress]);

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

  // Pre-compute value lists per achievement for Top X% percentile calculation
  const percentileData = useMemo(() => {
    if (!allData) return null;
    const achValues = new Map<string, number[]>();
    for (const def of achievementsWithProgress) {
      const values: number[] = [];
      for (const player of Object.values(allData.players)) {
        const ach = player.achievements.find(a => a.id === def.id);
        values.push(ach?.currentValue || 0);
      }
      achValues.set(def.id, values);
    }
    return achValues;
  }, [allData, achievementsWithProgress]);

  /** Get Top X% for a given achievement value. Returns undefined if not computable. */
  const getTopPercent = (achId: string, value: number): number | undefined => {
    if (!percentileData || value <= 0) return undefined;
    const values = percentileData.get(achId);
    if (!values || values.length === 0) return undefined;
    const betterCount = values.filter(v => v > value).length;
    return Math.max(1, Math.ceil(((betterCount + 1) / values.length) * 100));
  };

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
            <div className="achievements-summary-breakdown">
              <span className="breakdown-exclusive" title="Niveaux exclusifs">
                {comparisonBreakdown.mainOnly}
              </span>
              <span className="breakdown-shared" title="Niveaux en commun">
                +{comparisonBreakdown.shared}
              </span>
              <span className="breakdown-total">
                = {totalUnlocked}
              </span>
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

          <div className="achievements-summary-center">
            <div className="achievements-summary-vs">⚔️</div>
            <div className="achievements-summary-shared-info">
              <span className="shared-count">{comparisonBreakdown.shared}</span>
              <span className="shared-label">en commun</span>
            </div>
            <div className="achievements-summary-neither-info">
              <span className="neither-count">{comparisonBreakdown.neither}</span>
              <span className="neither-label">non débloqués</span>
            </div>
          </div>

          {/* Compare player column */}
          <div className="achievements-summary-player other-player">
            <span className="achievements-summary-player-name" title={comparePlayerName}>
              {truncateName(comparePlayerName)}
            </span>
            <div className="achievements-summary-breakdown">
              <span className="breakdown-exclusive" title="Niveaux exclusifs">
                {comparisonBreakdown.otherOnly}
              </span>
              <span className="breakdown-shared" title="Niveaux en commun">
                +{comparisonBreakdown.shared}
              </span>
              <span className="breakdown-total">
                = {compareTotalUnlocked}
              </span>
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

          {/* Segmented battle bar showing breakdown */}
          <div className="achievements-battle-bar segmented">
            <div
              className="achievements-battle-bar-segment main-only"
              style={{ width: `${(comparisonBreakdown.mainOnly / totalLevels) * 100}%` }}
              title={`${truncateName(currentPlayerName)} uniquement: ${comparisonBreakdown.mainOnly}`}
            />
            <div
              className="achievements-battle-bar-segment shared"
              style={{ width: `${(comparisonBreakdown.shared / totalLevels) * 100}%` }}
              title={`En commun: ${comparisonBreakdown.shared}`}
            />
            <div
              className="achievements-battle-bar-segment other-only"
              style={{ width: `${(comparisonBreakdown.otherOnly / totalLevels) * 100}%` }}
              title={`${truncateName(comparePlayerName)} uniquement: ${comparisonBreakdown.otherOnly}`}
            />
            <div
              className="achievements-battle-bar-segment neither"
              style={{ width: `${(comparisonBreakdown.neither / totalLevels) * 100}%` }}
              title={`Non débloqués: ${comparisonBreakdown.neither}`}
            />
          </div>
          
          {/* Legend */}
          <div className="achievements-battle-legend">
            <span className="legend-item main-only">
              <span className="legend-dot" />
              {truncateName(currentPlayerName, 8)} seul
            </span>
            <span className="legend-item shared">
              <span className="legend-dot" />
              Commun
            </span>
            <span className="legend-item other-only">
              <span className="legend-dot" />
              {truncateName(comparePlayerName, 8)} seul
            </span>
            <span className="legend-item neither">
              <span className="legend-dot" />
              Aucun
            </span>
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

      {/* Achievement List by Category */}
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

          <div className="achievements-list">
            {/* Column headers in comparison mode */}
            {compareIsActive && (
              <div className="achievement-row-header">
                <span />
                <span />
                <span className="achievement-col-label main">{truncateName(currentPlayerName)}</span>
                <span className="achievement-col-divider" />
                <span className="achievement-col-label other">{truncateName(comparePlayerName)}</span>
              </div>
            )}
            {group.items.map(achievement => {
              const progress = achievement.playerProgress;
              const unlockedCount = progress ? progress.unlockedLevels.length : 0;
              const fullyUnlocked = unlockedCount === achievement.levels.length;
              const hasProgress = progress !== null && progress.currentValue > 0;
              const currentValue = progress?.currentValue || 0;
              const topPercent = getTopPercent(achievement.id, currentValue);

              // Comparison data
              const compareProgress = compareIsActive ? (compareProgressMap.get(achievement.id) ?? null) : null;
              const compareUnlockedCount = compareProgress ? compareProgress.unlockedLevels.length : 0;
              const compareValue = compareProgress?.currentValue || 0;
              const compareTopPercent = compareIsActive ? getTopPercent(achievement.id, compareValue) : undefined;

              // Row state class
              let rowClass: string;
              if (compareIsActive) {
                if (unlockedCount > compareUnlockedCount) rowClass = 'compare-main-ahead';
                else if (compareUnlockedCount > unlockedCount) rowClass = 'compare-other-ahead';
                else if (unlockedCount > 0) rowClass = 'compare-tied';
                else rowClass = 'locked';
              } else {
                rowClass = fullyUnlocked ? 'fully-unlocked' : hasProgress ? 'has-progress' : 'locked';
              }

              return (
                <div
                  key={achievement.id}
                  className={`achievement-row ${rowClass}${compareIsActive ? ' compare-mode' : ''}`}
                  title={achievement.description}
                >
                  <span className="achievement-row-emoji">{achievement.emoji}</span>
                  <div className="achievement-row-info">
                    <span className="achievement-row-name">{achievement.name}</span>
                    <span className="achievement-row-description">{achievement.description}</span>
                    <span className="achievement-row-explanation">{achievement.explanation}</span>
                  </div>

                  {!compareIsActive ? (
                    <div className="achievement-row-stats">
                      <div className="achievement-stars">
                        {renderTiers(achievement.levels, unlockedCount, 16)}
                      </div>
                      {/* Always render value slot — ghost for not started */}
                      <span className="achievement-row-value" style={{ visibility: hasProgress ? 'visible' : 'hidden' }}>
                        {hasProgress ? currentValue : '0'}
                      </span>
                      {/* Always render Top X% slot — ghost for not started */}
                      <span 
                        className={`achievement-row-percent${topPercent && topPercent <= 10 ? ' top-tier' : topPercent && topPercent <= 25 ? ' high-tier' : ''}`}
                        style={{ visibility: topPercent !== undefined ? 'visible' : 'hidden' }}
                      >
                        {topPercent !== undefined ? `Top ${topPercent}%` : 'Top 0%'}
                      </span>
                      {/* Always render progress bar slot — ghost for not started */}
                      {!fullyUnlocked && (
                        <div 
                          className="achievement-row-progress" 
                          title={hasProgress && progress && progress.nextLevel ? `${currentValue} / ${progress.nextLevel.threshold}` : ''}
                          style={{ visibility: hasProgress ? 'visible' : 'hidden' }}
                        >
                          <div
                            className="achievement-row-progress-fill"
                            style={{ width: `${hasProgress && progress ? Math.max(progress.progress * 100, 2) : 0}%` }}
                          />
                        </div>
                      )}
                      {fullyUnlocked && (
                        <div className="achievement-row-progress complete" title="Complété">
                          <div
                            className="achievement-row-progress-fill complete"
                            style={{ width: '100%' }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="achievement-row-player main">
                        <div className="achievement-stars">
                          {renderTiers(achievement.levels, unlockedCount, 14)}
                        </div>
                        <span className="achievement-row-value">{currentValue || '–'}</span>
                        <span className="achievement-row-percent">
                          {topPercent !== undefined ? `${topPercent}%` : ''}
                        </span>
                      </div>
                      <div className="achievement-compare-divider" />
                      <div className="achievement-row-player other">
                        <div className="achievement-stars">
                          {renderTiers(achievement.levels, compareUnlockedCount, 14)}
                        </div>
                        <span className="achievement-row-value">{compareValue || '–'}</span>
                        <span className="achievement-row-percent">
                          {compareTopPercent !== undefined ? `${compareTopPercent}%` : ''}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
