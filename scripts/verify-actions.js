/**
 * Verification script for gameLog.json Actions section
 * 
 * Checks for:
 * 1. Duplicate actions reported many times in short time frames or 6+ times in the same game
 * 2. Untransform actions without corresponding Transform action in the same night
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SHORT_TIME_THRESHOLD_MS = 5000; // 5 seconds - consider as "very short"
const DUPLICATE_COUNT_THRESHOLD = 6; // Minimum duplicates to report
const RAPID_DUPLICATE_COUNT = 3; // How many rapid duplicates to flag
const IGNORED_ACTION_TYPES = ['Transform', 'Untransform', 'Sabotage']; // Action types to ignore for duplicate detection

// Read gameLog.json
const gameLogPath = path.join(__dirname, '../data/discord/gameLog.json');
console.log('Loading gameLog.json...');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf-8'));

let totalGames = 0;
let totalPlayers = 0;
let totalActions = 0;
let duplicateActionIssues = [];
let untransformIssues = [];

/**
 * Check if two actions are the same (ignoring position and date)
 */
function actionsAreSimilar(action1, action2) {
  return action1.ActionType === action2.ActionType &&
         action1.ActionName === action2.ActionName &&
         action1.ActionTarget === action2.ActionTarget;
}

/**
 * Get time difference in milliseconds between two ISO date strings
 */
function getTimeDiffMs(date1, date2) {
  return Math.abs(new Date(date1) - new Date(date2));
}

/**
 * Check for duplicate actions in rapid succession or high frequency
 */
function checkDuplicateActions(game, player, actions) {
  if (!actions || actions.length === 0) return;

  // Group actions by type/name/target
  const actionGroups = new Map();
  
  actions.forEach((action, index) => {
    const key = `${action.ActionType}|${action.ActionName}|${action.ActionTarget}`;
    if (!actionGroups.has(key)) {
      actionGroups.set(key, []);
    }
    actionGroups.get(key).push({ action, index });
  });

  // Check each group
  actionGroups.forEach((group, key) => {
    const actionType = group[0].action.ActionType;
    
    // Check 1: 6+ times in the same game (skip ignored action types)
    if (group.length >= DUPLICATE_COUNT_THRESHOLD && !IGNORED_ACTION_TYPES.includes(actionType)) {
      duplicateActionIssues.push({
        type: 'HIGH_FREQUENCY',
        gameId: game.DisplayedId || game.Id,
        gameDate: game.StartDate,
        player: player.Username,
        actionType: actionType,
        actionName: group[0].action.ActionName,
        count: group.length,
        timing: group[0].action.Timing,
        message: `Action repeated ${group.length} times in the same game`
      });
    }

    // Check 2: Rapid succession (3+ times within short time frame) - check ALL action types
    if (group.length >= RAPID_DUPLICATE_COUNT) {
      for (let i = 0; i < group.length - (RAPID_DUPLICATE_COUNT - 1); i++) {
        const subsequence = group.slice(i, i + RAPID_DUPLICATE_COUNT);
        const firstDate = subsequence[0].action.Date;
        const lastDate = subsequence[RAPID_DUPLICATE_COUNT - 1].action.Date;
        
        if (firstDate && lastDate) {
          const timeDiff = getTimeDiffMs(firstDate, lastDate);
          
          if (timeDiff < SHORT_TIME_THRESHOLD_MS) {
            duplicateActionIssues.push({
              type: 'RAPID_SUCCESSION',
              gameId: game.DisplayedId || game.Id,
              gameDate: game.StartDate,
              player: player.Username,
              actionType: subsequence[0].action.ActionType,
              actionName: subsequence[0].action.ActionName,
              count: RAPID_DUPLICATE_COUNT,
              timeDiffMs: timeDiff,
              timing: subsequence[0].action.Timing,
              message: `${RAPID_DUPLICATE_COUNT} identical actions within ${(timeDiff / 1000).toFixed(2)}s`
            });
            break; // Only report once per group
          }
        }
      }
    }
  });
}

/**
 * Check for Untransform without Transform in the same timing period
 */
function checkTransformPairs(game, player, actions) {
  if (!actions || actions.length === 0) return;

  // Group actions by timing period
  const timingGroups = new Map();
  
  actions.forEach(action => {
    if (action.ActionType === 'Transform' || action.ActionType === 'Untransform') {
      if (!timingGroups.has(action.Timing)) {
        timingGroups.set(action.Timing, {
          transforms: [],
          untransforms: []
        });
      }
      
      const group = timingGroups.get(action.Timing);
      if (action.ActionType === 'Transform') {
        group.transforms.push(action);
      } else {
        group.untransforms.push(action);
      }
    }
  });

  // Check each timing period
  timingGroups.forEach((group, timing) => {
    // Only check night periods (starts with 'N')
    if (timing && timing.startsWith('N')) {
      if (group.untransforms.length > 0 && group.transforms.length === 0) {
        untransformIssues.push({
          gameId: game.DisplayedId || game.Id,
          gameDate: game.StartDate,
          player: player.Username,
          timing: timing,
          untransformCount: group.untransforms.length,
          message: `${group.untransforms.length} Untransform action(s) without Transform in ${timing}`
        });
      }
    }
  });
}

// Process all games
console.log('Processing games...\n');

gameLogData.GameStats.forEach(game => {
  totalGames++;
  
  if (!game.PlayerStats || game.PlayerStats.length === 0) return;
  
  game.PlayerStats.forEach(player => {
    totalPlayers++;
    
    if (!player.Actions || player.Actions.length === 0) return;
    
    totalActions += player.Actions.length;
    
    // Run checks
    checkDuplicateActions(game, player, player.Actions);
    checkTransformPairs(game, player, player.Actions);
  });
});

// Report results
console.log('='.repeat(80));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(80));
console.log(`Total games processed: ${totalGames}`);
console.log(`Total players processed: ${totalPlayers}`);
console.log(`Total actions processed: ${totalActions}`);
console.log('='.repeat(80));

// Report duplicate action issues
console.log(`\n${'='.repeat(80)}`);
console.log(`DUPLICATE ACTION ISSUES: ${duplicateActionIssues.length} found`);
console.log('='.repeat(80));

if (duplicateActionIssues.length > 0) {
  // Group by type
  const highFreq = duplicateActionIssues.filter(i => i.type === 'HIGH_FREQUENCY');
  const rapidSucc = duplicateActionIssues.filter(i => i.type === 'RAPID_SUCCESSION');
  
  if (highFreq.length > 0) {
    console.log(`\n--- HIGH FREQUENCY (${highFreq.length}) ---`);
    highFreq.forEach(issue => {
      console.log(`\nGame: ${issue.gameId} (${issue.gameDate})`);
      console.log(`  Player: ${issue.player}`);
      console.log(`  Action: ${issue.actionType}${issue.actionName ? ' - ' + issue.actionName : ''}`);
      console.log(`  Count: ${issue.count} times`);
      console.log(`  Timing: ${issue.timing}`);
      console.log(`  ⚠️  ${issue.message}`);
    });
  }
  
  if (rapidSucc.length > 0) {
    console.log(`\n--- RAPID SUCCESSION (${rapidSucc.length}) ---`);
    rapidSucc.forEach(issue => {
      console.log(`\nGame: ${issue.gameId} (${issue.gameDate})`);
      console.log(`  Player: ${issue.player}`);
      console.log(`  Action: ${issue.actionType}${issue.actionName ? ' - ' + issue.actionName : ''}`);
      console.log(`  Time difference: ${(issue.timeDiffMs / 1000).toFixed(2)}s`);
      console.log(`  Timing: ${issue.timing}`);
      console.log(`  ⚠️  ${issue.message}`);
    });
  }
} else {
  console.log('\n✅ No duplicate action issues found!');
}

// Report untransform issues
console.log(`\n${'='.repeat(80)}`);
console.log(`UNTRANSFORM WITHOUT TRANSFORM ISSUES: ${untransformIssues.length} found`);
console.log('='.repeat(80));

if (untransformIssues.length > 0) {
  untransformIssues.forEach(issue => {
    console.log(`\nGame: ${issue.gameId} (${issue.gameDate})`);
    console.log(`  Player: ${issue.player}`);
    console.log(`  Timing: ${issue.timing}`);
    console.log(`  Count: ${issue.untransformCount} Untransform action(s) without Transform`);
    console.log(`  ⚠️  ${issue.message}`);
  });
} else {
  console.log('\n✅ No untransform issues found!');
}

// Summary
console.log(`\n${'='.repeat(80)}`);
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total issues found: ${duplicateActionIssues.length + untransformIssues.length}`);
console.log(`  - Duplicate action issues: ${duplicateActionIssues.length}`);
console.log(`  - Untransform issues: ${untransformIssues.length}`);

if (duplicateActionIssues.length + untransformIssues.length === 0) {
  console.log('\n✅ All checks passed! No issues found.');
} else {
  console.log('\n⚠️  Issues found. Please review the details above.');
}

// Save detailed report to file
const reportPath = path.join(__dirname, '../data/action-verification-report.json');
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalGames,
    totalPlayers,
    totalActions,
    totalIssues: duplicateActionIssues.length + untransformIssues.length,
    duplicateActionIssues: duplicateActionIssues.length,
    untransformIssues: untransformIssues.length
  },
  duplicateActions: duplicateActionIssues,
  untransformIssues: untransformIssues
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nDetailed report saved to: ${reportPath}`);
