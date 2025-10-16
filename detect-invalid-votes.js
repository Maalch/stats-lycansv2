/**
 * Script to detect cases where players vote after they should have been eliminated
 * based on their DeathTiming in the gameLog.json file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the gameLog.json file
const gameLogPath = path.join(__dirname, 'data', 'gameLog.json');

function parseDeathTiming(deathTiming) {
    if (!deathTiming) return null;
    
    // Parse patterns like N1, N2, M1, M2, J1, J2, etc.
    const match = deathTiming.match(/^([JNM])(\d+)$/);
    if (!match) return null;
    
    const [, phase, numberStr] = match;
    const number = parseInt(numberStr);
    
    return {
        phase: phase, // J, N, or M
        number: number,
        raw: deathTiming
    };
}

function canPlayerVoteInMeeting(deathTiming, day) {
    const death = parseDeathTiming(deathTiming);
    
    // If no death timing, player is alive and can vote
    if (!death) return true;
    
    const { phase, number } = death;
    
    switch (phase) {
        case 'J': // Day phase death
        case 'N': // Night phase death
            // Cannot vote in the meeting of the same number
            return day < number;
        
        case 'M': // Meeting phase death (voted out)
            // Cannot vote in the next meeting or later
            return day <= number;

        default:
            console.warn(`Unknown death phase: ${phase}`);
            return true;
    }
}

function detectInvalidVotes() {
    try {
        // Read and parse the gameLog.json file
        const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));
        const games = gameLogData.GameStats;
        
        console.log(`Analyzing ${games.length} games for invalid votes (voting after death)...\n`);
        
        let totalInvalidVotes = 0;
        let gamesWithInvalidVotes = 0;
        const invalidVotesByGame = [];
        
        // Iterate through each game
        games.forEach((game, gameIndex) => {
            if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) {
                return; // Skip games without PlayerStats
            }
            
            const gameInvalidVotes = [];
            
            // Iterate through each player in the game
            game.PlayerStats.forEach((player, playerIndex) => {
                if (!player.Votes || !Array.isArray(player.Votes)) {
                    return; // Skip players without votes
                }
                
                const deathTiming = player.DeathTiming;
                const playerInvalidVotes = [];
                
                // Check each vote
                player.Votes.forEach((vote, voteIndex) => {
                    const day = vote.Day;

                    if (!canPlayerVoteInMeeting(deathTiming, day)) {
                        playerInvalidVotes.push({
                            day: day,
                            target: vote.Target,
                            date: vote.Date,
                            voteIndex: voteIndex
                        });
                        totalInvalidVotes++;
                    }
                });
                
                if (playerInvalidVotes.length > 0) {
                    gameInvalidVotes.push({
                        gameId: game.Id,
                        gameIndex: gameIndex,
                        playerName: player.Username,
                        playerIndex: playerIndex,
                        deathTiming: deathTiming,
                        invalidVotes: playerInvalidVotes,
                        totalInvalidVotes: playerInvalidVotes.length
                    });
                }
            });
            
            if (gameInvalidVotes.length > 0) {
                gamesWithInvalidVotes++;
                invalidVotesByGame.push({
                    gameId: game.Id,
                    gameIndex: gameIndex,
                    startDate: game.StartDate,
                    mapName: game.MapName,
                    endTiming: game.EndTiming,
                    invalidVotes: gameInvalidVotes
                });
            }
        });
        
        // Display results
        console.log(`=== INVALID VOTES DETECTION RESULTS ===`);
        console.log(`Total games analyzed: ${games.length}`);
        console.log(`Games with invalid votes: ${gamesWithInvalidVotes}`);
        console.log(`Total invalid vote cases: ${totalInvalidVotes}\n`);
        
        if (invalidVotesByGame.length > 0) {
            console.log(`=== DETAILED RESULTS ===\n`);
            
            invalidVotesByGame.forEach((gameData, index) => {
                console.log(`${index + 1}. Game: ${gameData.gameId}`);
                console.log(`   Date: ${gameData.startDate}`);
                console.log(`   Map: ${gameData.mapName}`);
                console.log(`   End Timing: ${gameData.endTiming}`);
                console.log(`   Game Index: ${gameData.gameIndex}`);
                console.log(`   Invalid votes found:`);
                
                gameData.invalidVotes.forEach((invalidCase, caseIndex) => {
                    console.log(`     ${caseIndex + 1}. Player: ${invalidCase.playerName}`);
                    console.log(`        Death Timing: ${invalidCase.deathTiming}`);
                    console.log(`        Invalid votes (${invalidCase.totalInvalidVotes}):`);
                    invalidCase.invalidVotes.forEach((vote, voteIndex) => {
                        console.log(`          - Day ${vote.day}: Target="${vote.target}", Date="${vote.date}"`);

                        // Explain why this vote is invalid
                        const death = parseDeathTiming(invalidCase.deathTiming);
                        if (death) {
                            let explanation = '';
                            switch (death.phase) {
                                case 'J':
                                case 'N':
                                    explanation = `(Died in ${death.phase}${death.number}, cannot vote in M${death.number})`;
                                    break;
                                case 'M':
                                    explanation = `(Voted out in M${death.number}, cannot vote in M${vote.day})`;
                                    break;
                            }
                            console.log(`            ${explanation}`);
                        }
                    });
                    console.log('');
                });
                console.log('---\n');
            });
            
            // Generate summary by player
            const playerSummary = {};
            invalidVotesByGame.forEach(gameData => {
                gameData.invalidVotes.forEach(invalidCase => {
                    if (!playerSummary[invalidCase.playerName]) {
                        playerSummary[invalidCase.playerName] = {
                            totalOccurrences: 0,
                            totalInvalidVotes: 0,
                            games: []
                        };
                    }
                    playerSummary[invalidCase.playerName].totalOccurrences++;
                    playerSummary[invalidCase.playerName].totalInvalidVotes += invalidCase.totalInvalidVotes;
                    playerSummary[invalidCase.playerName].games.push({
                        gameId: gameData.gameId,
                        deathTiming: invalidCase.deathTiming,
                        invalidVoteCount: invalidCase.totalInvalidVotes,
                        invalidVotes: invalidCase.invalidVotes
                    });
                });
            });
            
            console.log(`=== SUMMARY BY PLAYER ===\n`);
            Object.entries(playerSummary)
                .sort(([,a], [,b]) => b.totalInvalidVotes - a.totalInvalidVotes)
                .forEach(([playerName, data]) => {
                    console.log(`${playerName}: ${data.totalInvalidVotes} invalid votes in ${data.totalOccurrences} games`);
                    data.games.forEach(game => {
                        console.log(`  - Game ${game.gameId}: Death=${game.deathTiming}, Invalid votes=${game.invalidVoteCount}`);
                        game.invalidVotes.forEach(vote => {
                            console.log(`    * Day ${vote.day} → ${vote.target}`);
                        });
                    });
                    console.log('');
                });
                
            // Generate summary by death timing pattern
            console.log(`=== SUMMARY BY DEATH TIMING PATTERN ===\n`);
            const deathTimingStats = {};
            invalidVotesByGame.forEach(gameData => {
                gameData.invalidVotes.forEach(invalidCase => {
                    const deathTiming = invalidCase.deathTiming;
                    if (!deathTimingStats[deathTiming]) {
                        deathTimingStats[deathTiming] = {
                            count: 0,
                            players: new Set()
                        };
                    }
                    deathTimingStats[deathTiming].count += invalidCase.totalInvalidVotes;
                    deathTimingStats[deathTiming].players.add(invalidCase.playerName);
                });
            });
            
            Object.entries(deathTimingStats)
                .sort(([,a], [,b]) => b.count - a.count)
                .forEach(([deathTiming, stats]) => {
                    console.log(`${deathTiming}: ${stats.count} invalid votes from ${stats.players.size} different players`);
                    console.log(`  Players: ${Array.from(stats.players).join(', ')}`);
                });
            
        } else {
            console.log(`✅ No invalid votes found! All players only voted while they were alive.`);
        }
        
        // Save results to file
        const outputPath = path.join(__dirname, 'invalid-votes-report.json');
        const report = {
            analysisDate: new Date().toISOString(),
            totalGamesAnalyzed: games.length,
            gamesWithInvalidVotes: gamesWithInvalidVotes,
            totalInvalidVotes: totalInvalidVotes,
            invalidVotesByGame: invalidVotesByGame
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error analyzing gameLog.json:', error.message);
        if (error.code === 'ENOENT') {
            console.error(`Make sure the file exists at: ${gameLogPath}`);
        }
        process.exit(1);
    }
}

// Run the detection
detectInvalidVotes();