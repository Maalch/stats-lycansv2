/**
 * Achievement Computation Module
 * 
 * This file now re-exports from the split achievements/ subfolder.
 * See compute/achievements/ for the actual implementation:
 *   - helpers.js:              Shared utility functions
 *   - evaluators-general.js:   Win/loss, death, map/color variety
 *   - evaluators-wolf.js:      Wolf-camp specific
 *   - evaluators-combat.js:    Hunter kills, potion, same-color, etc.
 *   - evaluators-roles.js:     Agent, bounty hunter, louveteau, idiot, solo roles
 *   - evaluators-amoureux.js:  Amoureux/lover-related
 *   - evaluators-voting.js:    Voting behavior
 *   - evaluators-social.js:    Talking, death zones
 *   - evaluators-br.js:        Battle Royale
 *   - index.js:                Aggregator + computeAllAchievements
 */

export { EVALUATORS, BR_EVALUATORS, computeAllAchievements } from './achievements/index.js';
