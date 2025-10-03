#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates the consistency of victory conditions in the gameLog.json file
 * 
 * Rules:
 * 1. If a player with MainRoleFinal "Villageois" wins, all players with 
 *    MainRoleFinal "Villageois", "Alchimiste", or "Chasseur" should also win
 * 2. For other MainRoleFinal values, if one player wins with a specific role,
 *    all players with that role should win too
 * 3. Exception: For "Agent" role, only one of the two players can win
 */

function loadGameLog() {
    const gameLogPath = path.join(__dirname, 'docs', 'data', 'gameLog.json');
    
    if (!fs.existsSync(gameLogPath)) {
        console.error('❌ gameLog.json not found at:', gameLogPath);
        process.exit(1);
    }
    
    try {
        const content = fs.readFileSync(gameLogPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ Error reading/parsing gameLog.json:', error.message);
        process.exit(1);
    }
}

function validateGame(game, gameIndex) {
    const issues = [];
    const players = game.PlayerStats;
    
    if (!players || players.length === 0) {
        return [{ type: 'error', message: `Game ${gameIndex + 1} (${game.Id}) has no player data` }];
    }
    
    // Group players by MainRoleFinal
    const roleGroups = {};
    players.forEach(player => {
        const role = player.MainRoleFinal;
        if (!roleGroups[role]) {
            roleGroups[role] = [];
        }
        roleGroups[role].push(player);
    });
    
    // Check Villageois camp consistency
    const villageoisCampRoles = ['Villageois', 'Alchimiste', 'Chasseur'];
    const villageoisCampPlayers = players.filter(p => villageoisCampRoles.includes(p.MainRoleFinal));
    
    if (villageoisCampPlayers.length > 0) {
        const villageoisWinners = villageoisCampPlayers.filter(p => p.Victorious);
        const villageoisLosers = villageoisCampPlayers.filter(p => !p.Victorious);
        
        // If any villageois camp player wins, all should win
        if (villageoisWinners.length > 0 && villageoisLosers.length > 0) {
            issues.push({
                type: 'villageois_inconsistency',
                message: `Game ${gameIndex + 1} (${game.Id}): Villageois camp inconsistency - ${villageoisWinners.length} winners but ${villageoisLosers.length} losers`,
                winners: villageoisWinners.map(p => `${p.Username} (${p.MainRoleFinal})`),
                losers: villageoisLosers.map(p => `${p.Username} (${p.MainRoleFinal})`)
            });
        }
    }
    
    // Check other role consistency (excluding villageois camp roles and Agent)
    const otherRoles = Object.keys(roleGroups).filter(role => 
        !villageoisCampRoles.includes(role) && role !== 'Agent'
    );
    
    otherRoles.forEach(role => {
        const rolePlayers = roleGroups[role];
        const winners = rolePlayers.filter(p => p.Victorious);
        const losers = rolePlayers.filter(p => !p.Victorious);
        
        // If any player with this role wins, all players with this role should win
        if (winners.length > 0 && losers.length > 0) {
            issues.push({
                type: 'role_inconsistency',
                message: `Game ${gameIndex + 1} (${game.Id}): Role ${role} inconsistency - ${winners.length} winners but ${losers.length} losers`,
                role: role,
                winners: winners.map(p => p.Username),
                losers: losers.map(p => p.Username)
            });
        }
    });
    
    // Check Agent special case
    if (roleGroups['Agent']) {
        const agentPlayers = roleGroups['Agent'];
        const agentWinners = agentPlayers.filter(p => p.Victorious);
        
        // Agent should have exactly 2 players
        if (agentPlayers.length !== 2) {
            issues.push({
                type: 'agent_count_error',
                message: `Game ${gameIndex + 1} (${game.Id}): Agent role should have exactly 2 players, found ${agentPlayers.length}`,
                players: agentPlayers.map(p => p.Username)
            });
        }
        
        // Only one Agent should win
        if (agentWinners.length > 1) {
            issues.push({
                type: 'agent_multiple_winners',
                message: `Game ${gameIndex + 1} (${game.Id}): Multiple Agent winners found (${agentWinners.length}), only one should win`,
                winners: agentWinners.map(p => p.Username)
            });
        }
    }
    
    return issues;
}

function validateAllGames(gameLog) {
    console.log('🔍 Starting validation of gameLog.json...\n');
    console.log(`📊 Total games to validate: ${gameLog.GameStats.length}\n`);
    
    let totalIssues = 0;
    const issuesByType = {};
    
    gameLog.GameStats.forEach((game, index) => {
        const issues = validateGame(game, index);
        
        if (issues.length > 0) {
            totalIssues += issues.length;
            
            issues.forEach(issue => {
                if (!issuesByType[issue.type]) {
                    issuesByType[issue.type] = 0;
                }
                issuesByType[issue.type]++;
                
                console.log(`⚠️  ${issue.message}`);
                if (issue.winners) {
                    console.log(`   Winners: ${issue.winners.join(', ')}`);
                }
                if (issue.losers) {
                    console.log(`   Losers: ${issue.losers.join(', ')}`);
                }
                if (issue.players) {
                    console.log(`   Players: ${issue.players.join(', ')}`);
                }
                console.log('');
            });
        }
        
        // Progress indicator
        if ((index + 1) % 100 === 0) {
            console.log(`✓ Validated ${index + 1}/${gameLog.GameStats.length} games...`);
        }
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    if (totalIssues === 0) {
        console.log('✅ No inconsistencies found! All games follow the victory rules.');
    } else {
        console.log(`❌ Found ${totalIssues} total issues:\n`);
        
        Object.entries(issuesByType).forEach(([type, count]) => {
            const typeLabels = {
                'villageois_inconsistency': 'Villageois camp inconsistencies',
                'role_inconsistency': 'Other role inconsistencies',
                'agent_count_error': 'Agent count errors',
                'agent_multiple_winners': 'Multiple Agent winners',
                'error': 'Data errors'
            };
            
            console.log(`  • ${typeLabels[type] || type}: ${count}`);
        });
    }
    
    console.log(`\n🎯 Validation completed for ${gameLog.GameStats.length} games.`);
    
    return totalIssues === 0;
}

function main() {
    console.log('🎮 Game Log Consistency Validator');
    console.log('=' + '='.repeat(40) + '\n');
    
    const gameLog = loadGameLog();
    console.log(`📁 Loaded gameLog.json with ${gameLog.GameStats.length} games\n`);
    
    const isValid = validateAllGames(gameLog);
    
    process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
    main();
}