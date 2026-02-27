/**
 * Achievement System Types
 * 
 * Mirrors the JSON structure output by generate-achievements.js.
 * Achievements use tier-based progression: Bronze (🥉), Argent (🥈), Or (🥇), Lycans (🐺).
 */

/** Tier names */
export type AchievementTier = 'bronze' | 'argent' | 'or' | 'lycans';

/** A single level within an achievement */
export interface AchievementLevel {
  /** Tier name: bronze, argent, or, lycans */
  tier: AchievementTier;
  /** Sub-level within the tier (1-3 for most, 1 for lycans) */
  subLevel: number;
  /** Threshold value to unlock this level */
  threshold: number;
}

/** Client-side achievement definition (from achievementDefinitions in JSON) */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  explanation: string;
  emoji: string;
  /** Category key (e.g., 'victories', 'deaths', 'kills', 'roles', 'social', 'maps', 'special') */
  category: string;
  levels: AchievementLevel[];
}

/** An unlocked level for a player's achievement */
export interface UnlockedLevel {
  tier: AchievementTier;
  subLevel: number;
  threshold: number;
  /** Game ID where this level was first crossed */
  unlockedAtGame: string | null;
}

/** A player's progress on a single achievement */
export interface PlayerAchievementProgress {
  id: string;
  currentValue: number;
  unlockedLevels: UnlockedLevel[];
  nextLevel: AchievementLevel | null;
  /** Progress fraction toward next level (0–1, or 1.0 if all unlocked) */
  progress: number;
}

/** Aggregated achievement data for a single player */
export interface PlayerAchievements {
  playerId: string;
  playerName: string;
  totalUnlocked: number;
  achievements: PlayerAchievementProgress[];
}

/** Category metadata */
export interface AchievementCategory {
  label: string;
  emoji: string;
  order: number;
}

/** Top-level JSON structure from playerAchievements.json */
export interface AchievementsData {
  version: string;
  generatedAt: string;
  teamName: string;
  totalPlayers: number;
  totalGames: number;
  categories: Record<string, AchievementCategory>;
  achievementDefinitions: AchievementDefinition[];
  players: Record<string, PlayerAchievements>;
}

/** Merged view: definition + player progress (for display) */
export interface AchievementWithProgress extends AchievementDefinition {
  /** Player's current progress, or null if no progress at all */
  playerProgress: PlayerAchievementProgress | null;
}
