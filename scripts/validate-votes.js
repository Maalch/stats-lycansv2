/**
 * Game Data Validation Script for gameLog.json
 * 
 * Validates the following rules:
 * 
 * VOTE VALIDATION:
 * 1. A player cannot vote if their DeathTiming is before the meeting (JX or NX means they can't vote on Day X or after)
 * 2. A player cannot be voted if their DeathTiming is before the meeting (same rule applies)
 * 3. A player cannot vote multiple times on the same Day in the same game
 * 
 * VICTORY CONSISTENCY:
 * 4. All Villageois players must have the same Victorious status
 * 5. All Loups (Loup, Traître, Louveteau) must have the same Victorious status
 * 6. All Amoureux (Amoureux, Amoureux Loup, Amoureux Villageois) must have the same Victorious status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse DeathTiming to extract the day number
// Format: "J1", "N1", "M1", "U1" where J=Jour (Day), N=Nuit (Night), M=Meeting, U=Unknown/Urgence
// J1 and N1 mean the player died before Meeting 1, so they can't vote on Day 1 or after
// M1 means they died during Meeting 1, so they could vote on Day 1 but not after
// U (urgence/emergency) - treat as unknown, skip validation
function parseDeathTiming(deathTiming) {
    if (!deathTiming) return null;
    
    const match = deathTiming.match(/^([JNMU])(\d+)$/);
    if (!match) {
        console.warn(`Unknown DeathTiming format: ${deathTiming}`);
        return null;
    }
    
    const phase = match[1]; // J, N, M, or U
    const day = parseInt(match[2], 10);
    
    return { phase, day };
}

// Determine the last day a player could vote based on their DeathTiming
// Returns null if the player is alive (can vote any day)
// Returns a number representing the last day they could vote on
function getLastVotableDay(deathTiming) {
    const parsed = parseDeathTiming(deathTiming);
    if (!parsed) return null; // Player is alive or unknown timing
    
    const { phase, day } = parsed;
    
    if (phase === 'U') {
        // Unknown/Urgence timing - skip validation
        return null;
    }
    
    if (phase === 'J' || phase === 'N') {
        // Died during Day (J) or Night (N) phase - before the meeting
        // Can only vote up to day - 1 (died before meeting X, so can't vote on day X)
        return day - 1;
    } else if (phase === 'M') {
        // Died during Meeting phase - could have voted that day
        return day;
    }
    
    return null;
}

// Validate votes for a single game
function validateGame(game) {
    const errors = [];
    const gameId = game.Id || 'Unknown';
    
    if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) {
        return errors;
    }
    
    // Create a map of player names to their death info for vote target validation
    const playerDeathMap = new Map();
    game.PlayerStats.forEach(player => {
        const username = player.Username;
        const lastVotableDay = getLastVotableDay(player.DeathTiming);
        playerDeathMap.set(username, {
            deathTiming: player.DeathTiming,
            lastVotableDay: lastVotableDay
        });
    });
    
    // Validate each player's votes
    for (const player of game.PlayerStats) {
        const username = player.Username;
        const votes = player.Votes || [];
        const lastVotableDay = getLastVotableDay(player.DeathTiming);
        
        // Track votes per day for duplicate detection
        const votesByDay = new Map();
        
        for (const vote of votes) {
            const voteDay = vote.Day;
            const target = vote.Target;
            
            // Rule 1: Check if player voted after they died
            if (lastVotableDay !== null && voteDay > lastVotableDay) {
                errors.push({
                    type: 'DEAD_PLAYER_VOTED',
                    gameId,
                    player: username,
                    deathTiming: player.DeathTiming,
                    voteDay,
                    voteTarget: target,
                    message: `${username} voted on Day ${voteDay} but died at ${player.DeathTiming} (can only vote up to Day ${lastVotableDay})`
                });
            }
            
            // Rule 2: Check if the vote target was already dead
            // Skip "Passé" votes (abstain/pass votes)
            if (target && target !== 'Passé') {
                const targetInfo = playerDeathMap.get(target);
                if (targetInfo && targetInfo.lastVotableDay !== null && voteDay > targetInfo.lastVotableDay) {
                    errors.push({
                        type: 'VOTED_FOR_DEAD_PLAYER',
                        gameId,
                        player: username,
                        voteDay,
                        target,
                        targetDeathTiming: targetInfo.deathTiming,
                        message: `${username} voted for ${target} on Day ${voteDay} but ${target} died at ${targetInfo.deathTiming} (was dead since Day ${targetInfo.lastVotableDay + 1})`
                    });
                }
            }
            
            // Rule 3: Check for duplicate votes on the same day
            if (votesByDay.has(voteDay)) {
                const previousVotes = votesByDay.get(voteDay);
                previousVotes.push({ target, date: vote.Date });
                
                if (previousVotes.length === 2) {
                    // Only log on the second occurrence
                    errors.push({
                        type: 'DUPLICATE_VOTE_SAME_DAY',
                        gameId,
                        player: username,
                        voteDay,
                        votes: previousVotes,
                        message: `${username} voted ${previousVotes.length} times on Day ${voteDay}: ${previousVotes.map(v => v.target).join(', ')}`
                    });
                } else if (previousVotes.length > 2) {
                    // Update the message with the new count
                    const existingError = errors.find(
                        e => e.type === 'DUPLICATE_VOTE_SAME_DAY' && 
                             e.gameId === gameId && 
                             e.player === username && 
                             e.voteDay === voteDay
                    );
                    if (existingError) {
                        existingError.votes = previousVotes;
                        existingError.message = `${username} voted ${previousVotes.length} times on Day ${voteDay}: ${previousVotes.map(v => v.target).join(', ')}`;
                    }
                }
            } else {
                votesByDay.set(voteDay, [{ target, date: vote.Date }]);
            }
        }
    }
    
    return errors;
}

// Get the final role of a player (considering role changes)
function getFinalRole(player) {
    const roleChanges = player.MainRoleChanges || [];
    if (roleChanges.length > 0) {
        // Return the last role change
        return roleChanges[roleChanges.length - 1].NewMainRole;
    }
    return player.MainRoleInitial;
}

// Camp definitions for victory consistency
// Villageois camp - all standard village roles
const VILLAGEOIS_ROLES = ['Villageois', 'Chasseur', 'Alchimiste'];
// Loups camp - wolves and their allies
const LOUPS_ROLES = ['Loup', 'Traître', 'Louveteau'];
// Amoureux camp - lovers win together
const AMOUREUX_ROLES = ['Amoureux', 'Amoureux Loup', 'Amoureux Villageois'];
// Vaudou camp - Vaudou and Zombies win together
const VAUDOU_ROLES = ['Vaudou', 'Zombie'];
// Solo roles - these players win alone, no consistency check needed
// Note: Agent has 2 players but only 1 can win, so it's treated as solo
const SOLO_ROLES = ['Idiot du Village', 'Agent', 'Cannibale', 'La Bête', 'Scientifique', 'Espion', 'Chasseur de primes'];

// Determine which camp a role belongs to for victory consistency
function getCampForVictoryCheck(role) {
    if (LOUPS_ROLES.includes(role)) return 'Loups';
    if (AMOUREUX_ROLES.includes(role)) return 'Amoureux';
    if (VAUDOU_ROLES.includes(role)) return 'Vaudou';
    if (VILLAGEOIS_ROLES.includes(role)) return 'Villageois';
    if (SOLO_ROLES.includes(role)) return null; // Solo roles - no camp consistency check
    // Unknown role - skip validation
    return null;
}

// Validate victory consistency for a single game
function validateVictoryConsistency(game) {
    const errors = [];
    const gameId = game.Id || 'Unknown';
    
    if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) {
        return errors;
    }
    
    // Group players by their camp (based on final role)
    const campPlayers = {
        'Villageois': [],
        'Loups': [],
        'Amoureux': [],
        'Vaudou': []
    };
    
    for (const player of game.PlayerStats) {
        const finalRole = getFinalRole(player);
        const camp = getCampForVictoryCheck(finalRole);
        
        if (camp && campPlayers[camp]) {
            campPlayers[camp].push({
                username: player.Username,
                role: finalRole,
                initialRole: player.MainRoleInitial,
                victorious: player.Victorious
            });
        }
    }
    
    // Check victory consistency for each camp
    for (const [camp, players] of Object.entries(campPlayers)) {
        if (players.length < 2) continue; // Need at least 2 players to check consistency
        
        const victoriousPlayers = players.filter(p => p.victorious === true);
        const defeatedPlayers = players.filter(p => p.victorious === false);
        
        // If there are both victorious and defeated players in the same camp, it's an error
        if (victoriousPlayers.length > 0 && defeatedPlayers.length > 0) {
            errors.push({
                type: 'VICTORY_INCONSISTENCY',
                gameId,
                camp,
                victoriousPlayers: victoriousPlayers.map(p => `${p.username} (${p.role})`),
                defeatedPlayers: defeatedPlayers.map(p => `${p.username} (${p.role})`),
                message: `${camp} camp has inconsistent victory status: ` +
                    `Victorious: [${victoriousPlayers.map(p => p.username).join(', ')}] vs ` +
                    `Defeated: [${defeatedPlayers.map(p => p.username).join(', ')}]`
            });
        }
    }
    
    return errors;
}

// Main validation function
function validateGameLog(filePath) {
    console.log(`Reading game log from: ${filePath}`);
    
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    const games = data.GameStats || [];
    console.log(`Found ${games.length} games to validate`);
    
    const allErrors = [];
    let gamesWithVotes = 0;
    let totalVotes = 0;
    
    for (const game of games) {
        // Count games with vote data
        const hasVotes = game.PlayerStats?.some(p => p.Votes && p.Votes.length > 0);
        if (hasVotes) {
            gamesWithVotes++;
            game.PlayerStats.forEach(p => {
                totalVotes += (p.Votes?.length || 0);
            });
        }
        
        // Run vote validation
        const voteErrors = validateGame(game);
        allErrors.push(...voteErrors);
        
        // Run victory consistency validation
        const victoryErrors = validateVictoryConsistency(game);
        allErrors.push(...victoryErrors);
    }
    
    return {
        totalGames: games.length,
        gamesWithVotes,
        totalVotes,
        errors: allErrors
    };
}

// Generate report
function generateReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('GAME DATA VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\nSummary:`);
    console.log(`  Total games: ${results.totalGames}`);
    console.log(`  Games with vote data: ${results.gamesWithVotes}`);
    console.log(`  Total votes analyzed: ${results.totalVotes}`);
    console.log(`  Total errors found: ${results.errors.length}`);
    
    // Group errors by type
    const errorsByType = {};
    for (const error of results.errors) {
        if (!errorsByType[error.type]) {
            errorsByType[error.type] = [];
        }
        errorsByType[error.type].push(error);
    }
    
    console.log(`\nErrors by type:`);
    for (const [type, errors] of Object.entries(errorsByType)) {
        console.log(`  ${type}: ${errors.length}`);
    }
    
    // Print detailed errors
    if (results.errors.length > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log('DETAILED ERRORS');
        console.log('-'.repeat(80));
        
        for (const [type, errors] of Object.entries(errorsByType)) {
            console.log(`\n### ${type} (${errors.length} errors) ###\n`);
            
            for (const error of errors) {
                console.log(`  Game: ${error.gameId}`);
                console.log(`  ${error.message}`);
                console.log('');
            }
        }
    }
    
    return results.errors.length === 0;
}

// Run validation
const gameLogPath = path.join(__dirname, '..', 'public', 'data', 'gameLog.json');
const outputJsonPath = path.join(__dirname, '..', 'public', 'data', 'validation-errors.json');

try {
    const results = validateGameLog(gameLogPath);
    const isValid = generateReport(results);
    
    // Write errors to JSON file for further analysis
    fs.writeFileSync(outputJsonPath, JSON.stringify({
        validatedAt: new Date().toISOString(),
        summary: {
            totalGames: results.totalGames,
            gamesWithVotes: results.gamesWithVotes,
            totalVotes: results.totalVotes,
            totalErrors: results.errors.length
        },
        errors: results.errors
    }, null, 2));
    console.log(`\nErrors exported to: ${outputJsonPath}`);
    
    // Exit with error code if validation failed
    process.exit(isValid ? 0 : 1);
} catch (error) {
    console.error('Error running validation:', error.message);
    process.exit(2);
}
