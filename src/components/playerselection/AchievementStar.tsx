/**
 * SVG Star components for achievement tier display.
 * 
 * Based on team discussion: colored stars (bronze/silver/gold) with
 * filled = unlocked, outlined = locked. Lycans tier uses wolf emoji.
 * 
 * All three tiers (bronze, argent, or) use the same 5-pointed star shape,
 * differentiated only by color. Lycans tier uses wolf emoji.
 */

import type { AchievementTier } from '../../types/achievements';

/** Color palette for each tier */
const TIER_COLORS: Record<Exclude<AchievementTier, 'lycans'>, { fill: string; stroke: string; emptyFill: string }> = {
  bronze: {
    fill: '#CD7F32',      // Warm bronze
    stroke: '#B8691E',    // Darker bronze outline
    emptyFill: 'rgba(205, 127, 50, 0.12)',
  },
  argent: {
    fill: '#C0C0C0',      // Silver
    stroke: '#A0A0A8',    // Darker silver outline
    emptyFill: 'rgba(192, 192, 192, 0.12)',
  },
  or: {
    fill: '#FFD700',      // Gold
    stroke: '#DAA520',    // Goldenrod outline
    emptyFill: 'rgba(255, 215, 0, 0.12)',
  },
};

interface AchievementStarProps {
  tier: AchievementTier;
  filled: boolean;
  size?: number;
  title?: string;
}

/**
 * 5-pointed star SVG path (used for all non-lycans tiers: bronze, argent, gold)
 * Centered in a 24x24 viewBox
 */
function FivePointStar({ fill, stroke, strokeWidth }: { fill: string; stroke: string; strokeWidth: number }) {
  return (
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

/**
 * Renders a single colored star for an achievement tier.
 * - Bronze, Argent & Or: same 5-pointed star, differentiated by color
 * - Lycans: Wolf emoji span
 */
export function AchievementStar({ tier, filled, size = 18, title }: AchievementStarProps) {
  // Lycans tier uses wolf emoji
  if (tier === 'lycans') {
    return (
      <span
        className={`achievement-star-svg lycans ${filled ? 'unlocked' : ''}`}
        title={title}
        style={{ fontSize: size * 0.9, lineHeight: 1 }}
      >
        🐺
      </span>
    );
  }

  const colors = TIER_COLORS[tier];
  const StarShape = FivePointStar;
  const viewBox = '0 0 24 24';

  return (
    <svg
      className={`achievement-star-svg ${filled ? 'unlocked' : ''}`}
      width={size}
      height={size}
      viewBox={viewBox}
      aria-label={title}
      role="img"
    >
      {title && <title>{title}</title>}
      {filled ? (
        // Filled star with gradient for depth
        <>
          <defs>
            <linearGradient id={`grad-${tier}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity="1" />
              <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <StarShape
            fill={`url(#grad-${tier})`}
            stroke={colors.stroke}
            strokeWidth={0.8}
          />
        </>
      ) : (
        // Empty outlined star
        <StarShape
          fill={colors.emptyFill}
          stroke={colors.stroke}
          strokeWidth={1.2}
        />
      )}
    </svg>
  );
}
