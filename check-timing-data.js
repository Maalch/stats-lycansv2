import fs from 'fs';

// Read the gameLog.json file
const gameLogData = JSON.parse(fs.readFileSync('./data/gameLog.json', 'utf8'));

// Filter games with Version >= 0.201 and Modded: true
const timedGames = gameLogData.GameStats.filter(game => {
  if (!game.Modded) return false;
  if (!game.Version) return false;
  
  // Parse version - must be >= 0.201
  const versionMatch = game.Version.match(/^(\d+)\.(\d+)/);
  if (!versionMatch) return false;
  
  const major = parseInt(versionMatch[1]);
  const minor = parseInt(versionMatch[2]);
  
  // Version 0.201+ or 1.0+
  return (major === 0 && minor >= 201) || major >= 1;
});

console.log(`Total games: ${gameLogData.GameStats.length}`);
console.log(`Games with timing data (Version >= 0.201, Modded): ${timedGames.length}`);

// Track player meeting counts
const playerMeetings = new Map();

timedGames.forEach(game => {
  // Group votes by meeting (Day)
  const votesByMeeting = new Map();

  game.PlayerStats.forEach(player => {
    if (!player.Votes || player.Votes.length === 0) return;
    
    player.Votes.forEach(vote => {
      if (!vote.Date || vote.Target === 'Passé') return;
      
      const meetingVotes = votesByMeeting.get(vote.Day) || [];
      meetingVotes.push({
        playerName: player.Username,
        date: new Date(vote.Date),
        target: vote.Target
      });
      votesByMeeting.set(vote.Day, meetingVotes);
    });
  });

  // Count meetings for each player
  votesByMeeting.forEach((votes) => {
    if (votes.length === 0) return;
    
    votes.forEach((vote) => {
      const count = playerMeetings.get(vote.playerName) || 0;
      playerMeetings.set(vote.playerName, count + 1);
    });
  });
});

// Sort by meeting count
const sortedPlayers = Array.from(playerMeetings.entries())
  .sort((a, b) => b[1] - a[1]);

console.log(`\nTotal players with timing data: ${sortedPlayers.length}`);

// Count players with at least 25 meetings
const playersWithMin25 = sortedPlayers.filter(([_, count]) => count >= 25);
console.log(`Players with at least 25 meetings: ${playersWithMin25.length}`);

console.log('\nTop 20 players by meeting count:');
sortedPlayers.slice(0, 20).forEach(([player, count], index) => {
  console.log(`${index + 1}. ${player}: ${count} meetings`);
});

console.log('\nPlayers with 20-30 meetings:');
sortedPlayers
  .filter(([_, count]) => count >= 20 && count <= 30)
  .forEach(([player, count]) => {
    console.log(`  ${player}: ${count} meetings`);
  });
