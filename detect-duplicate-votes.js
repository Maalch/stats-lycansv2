/**
 * Script to detect cases where the same player has multiple votes for the same Day
 * in the gameLog.json file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the gameLog.json file
const gameLogPath = path.join(__dirname, 'data', 'gameLog.json');

function detectDuplicateVotes() {
    try {
        // Read and parse the gameLog.json file
        const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));
        const games = gameLogData.GameStats;
        
        console.log(`Analyzing ${games.length} games for duplicate votes...\n`);
        
        let totalDuplicatesFound = 0;
        let gamesWithDuplicates = 0;
        const duplicatesByGame = [];
        
        // Iterate through each game
        games.forEach((game, gameIndex) => {
            if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) {
                return; // Skip games without PlayerStats
            }
            
            const gameDuplicates = [];
            
            // Iterate through each player in the game
            game.PlayerStats.forEach((player, playerIndex) => {
                if (!player.Votes || !Array.isArray(player.Votes)) {
                    return; // Skip players without votes
                }
                
                // Group votes by Day
                const votesByDay = {};
                player.Votes.forEach((vote, voteIndex) => {
                    const day = vote.Day;
                    if (!votesByDay[day]) {
                        votesByDay[day] = [];
                    }
                    votesByDay[day].push({
                        target: vote.Target,
                        date: vote.Date,
                        voteIndex: voteIndex
                    });
                });
                
                // Check for duplicates (multiple votes for same Day)
                Object.entries(votesByDay).forEach(([day, votes]) => {
                    if (votes.length > 1) {
                        gameDuplicates.push({
                            gameId: game.Id,
                            gameIndex: gameIndex,
                            playerName: player.Username,
                            playerIndex: playerIndex,
                            day: parseInt(day),
                            duplicateVotes: votes,
                            totalVotesForMeeting: votes.length
                        });
                        totalDuplicatesFound++;
                    }
                });
            });
            
            if (gameDuplicates.length > 0) {
                gamesWithDuplicates++;
                duplicatesByGame.push({
                    gameId: game.Id,
                    gameIndex: gameIndex,
                    startDate: game.StartDate,
                    mapName: game.MapName,
                    duplicates: gameDuplicates
                });
            }
        });
        
        // Display results
        console.log(`=== DUPLICATE VOTES DETECTION RESULTS ===`);
        console.log(`Total games analyzed: ${games.length}`);
        console.log(`Games with duplicate votes: ${gamesWithDuplicates}`);
        console.log(`Total duplicate vote cases: ${totalDuplicatesFound}\n`);
        
        if (duplicatesByGame.length > 0) {
            console.log(`=== DETAILED RESULTS ===\n`);
            
            duplicatesByGame.forEach((gameData, index) => {
                console.log(`${index + 1}. Game: ${gameData.gameId}`);
                console.log(`   Date: ${gameData.startDate}`);
                console.log(`   Map: ${gameData.mapName}`);
                console.log(`   Game Index: ${gameData.gameIndex}`);
                console.log(`   Duplicates found:`);
                
                gameData.duplicates.forEach((duplicate, dupIndex) => {
                    console.log(`     ${dupIndex + 1}. Player: ${duplicate.playerName}`);
                    console.log(`        Day: ${duplicate.day}`);
                    console.log(`        Number of votes: ${duplicate.totalVotesForDay}`);
                    console.log(`        Votes:`);
                    duplicate.duplicateVotes.forEach((vote, voteIndex) => {
                        console.log(`          - Vote ${voteIndex + 1}: Target="${vote.target}", Date="${vote.date}"`);
                    });
                    console.log('');
                });
                console.log('---\n');
            });
            
            // Generate summary by player
            const playerSummary = {};
            duplicatesByGame.forEach(gameData => {
                gameData.duplicates.forEach(duplicate => {
                    if (!playerSummary[duplicate.playerName]) {
                        playerSummary[duplicate.playerName] = {
                            totalOccurrences: 0,
                            games: []
                        };
                    }
                    playerSummary[duplicate.playerName].totalOccurrences++;
                    playerSummary[duplicate.playerName].games.push({
                        gameId: gameData.gameId,
                        day: duplicate.day,
                        votes: duplicate.duplicateVotes.length
                    });
                });
            });
            
            console.log(`=== SUMMARY BY PLAYER ===\n`);
            Object.entries(playerSummary)
                .sort(([,a], [,b]) => b.totalOccurrences - a.totalOccurrences)
                .forEach(([playerName, data]) => {
                    console.log(`${playerName}: ${data.totalOccurrences} duplicate vote cases`);
                    data.games.forEach(game => {
                        console.log(`  - Game ${game.gameId}, Day ${game.day}: ${game.votes} votes`);
                    });
                    console.log('');
                });
        } else {
            console.log(`✅ No duplicate votes found! All players have at most one vote per day.`);
        }
        
        // Save results to file
        const outputPath = path.join(__dirname, 'duplicate-votes-report.json');
        const report = {
            analysisDate: new Date().toISOString(),
            totalGamesAnalyzed: games.length,
            gamesWithDuplicates: gamesWithDuplicates,
            totalDuplicateCases: totalDuplicatesFound,
            duplicatesByGame: duplicatesByGame
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
detectDuplicateVotes();