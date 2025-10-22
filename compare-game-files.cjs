const fs = require('fs');

// Read both files
const file1 = JSON.parse(fs.readFileSync('ExternalData/Ponce-20251014000000.json', 'utf8'));
const file2 = JSON.parse(fs.readFileSync('ExternalData/Ponce-20251014102813.json', 'utf8'));

console.log('=== GAME FILES COMPARISON ===\n');
console.log(`File 1: ${file1.Filename} (${file1.GameStats.length} games)`);
console.log(`File 2: ${file2.Filename} (${file2.GameStats.length} games)`);
console.log('\n');

// Compare each game
file1.GameStats.forEach((game1, index) => {
  const game2 = file2.GameStats[index];
  
  if (!game2) {
    console.log(`⚠️  Game ${index + 1} exists only in file 1`);
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`GAME ${index + 1}: ${game1.Id} vs ${game2.Id}`);
  console.log('='.repeat(80));

  // Compare GameStats level fields
  const gameFields = ['MapName', 'HarvestGoal', 'HarvestDone', 'EndTiming'];
  let gameDifferences = [];

  gameFields.forEach(field => {
    if (game1[field] !== game2[field]) {
      gameDifferences.push({
        field,
        file1: game1[field],
        file2: game2[field]
      });
    }
  });

  if (gameDifferences.length > 0) {
    console.log('\n📊 GAME-LEVEL DIFFERENCES:');
    gameDifferences.forEach(diff => {
      console.log(`  ❌ ${diff.field}:`);
      console.log(`      File 1: ${diff.file1}`);
      console.log(`      File 2: ${diff.file2}`);
    });
  } else {
    console.log('\n✅ No game-level differences');
  }

  // Create player maps by ID
  const players1 = new Map();
  const players2 = new Map();

  game1.PlayerStats.forEach(p => players1.set(p.ID, p));
  game2.PlayerStats.forEach(p => players2.set(p.ID, p));

  console.log(`\n👥 PLAYER COMPARISON (${players1.size} vs ${players2.size} players):`);

  // Check for players only in one file
  const onlyInFile1 = [...players1.keys()].filter(id => !players2.has(id));
  const onlyInFile2 = [...players2.keys()].filter(id => !players1.has(id));

  if (onlyInFile1.length > 0) {
    console.log(`\n⚠️  Players only in File 1:`);
    onlyInFile1.forEach(id => {
      const player = players1.get(id);
      console.log(`    - ${player.Username} (ID: ${id})`);
    });
  }

  if (onlyInFile2.length > 0) {
    console.log(`\n⚠️  Players only in File 2:`);
    onlyInFile2.forEach(id => {
      const player = players2.get(id);
      console.log(`    - ${player.Username} (ID: ${id})`);
    });
  }

  // Compare common players
  const commonPlayerIds = [...players1.keys()].filter(id => players2.has(id));
  
  const playerFields = [
    'Color', 
    'MainRoleInitial', 
    'MainRoleChanges', 
    'Power', 
    'SecondaryRole', 
    'DeathTiming', 
    'DeathType', 
    'KillerName', 
    'Victorious', 
    'Votes'
  ];

  let totalPlayerDifferences = 0;

  commonPlayerIds.forEach(id => {
    const player1 = players1.get(id);
    const player2 = players2.get(id);
    const playerDiffs = [];

    playerFields.forEach(field => {
      const val1 = player1[field];
      const val2 = player2[field];

      // Special handling for arrays and objects
      if (field === 'MainRoleChanges') {
        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          playerDiffs.push({ field, val1, val2 });
        }
      } else if (field === 'Votes') {
        // Compare votes by normalizing them (ignoring Day field)
        const votes1 = normalizeVotesIgnoreDay(val1);
        const votes2 = normalizeVotesIgnoreDay(val2);
        if (votes1 !== votes2) {
          playerDiffs.push({ 
            field, 
            val1: val1, 
            val2: val2,
            normalized1: votes1,
            normalized2: votes2
          });
        }
      } else if (field === 'KillerName') {
        // Normalize killer names for comparison
        if (normalizePlayerName(val1) !== normalizePlayerName(val2)) {
          playerDiffs.push({ field, val1, val2 });
        }
      } else {
        if (val1 !== val2) {
          playerDiffs.push({ field, val1, val2 });
        }
      }
    });

    if (playerDiffs.length > 0) {
      totalPlayerDifferences++;
      console.log(`\n  Player: ${player1.Username} (ID: ${id})`);
      playerDiffs.forEach(diff => {
        console.log(`    ❌ ${diff.field}:`);
        if (diff.field === 'Votes') {
          console.log(`        File 1: ${JSON.stringify(diff.val1, null, 2).replace(/\n/g, '\n        ')}`);
          console.log(`        File 2: ${JSON.stringify(diff.val2, null, 2).replace(/\n/g, '\n        ')}`);
        } else {
          console.log(`        File 1: ${JSON.stringify(diff.val1)}`);
          console.log(`        File 2: ${JSON.stringify(diff.val2)}`);
        }
      });
    }
  });

  if (totalPlayerDifferences === 0 && onlyInFile1.length === 0 && onlyInFile2.length === 0) {
    console.log('\n  ✅ All players match perfectly');
  } else {
    console.log(`\n  Summary: ${totalPlayerDifferences} players with differences`);
  }
});

// Helper function to normalize player names
function normalizePlayerName(name) {
  if (!name) return name;
  
  // Normalize known player name variations
  if (name === 'LuttiLutti' || name === 'Lutti') return 'Lutti';
  if (name === 'TL areliaNNNN' || name === 'Areliann') return 'Areliann';
  
  return name;
}

// Helper function to normalize votes for comparison (ignoring Day and Date fields)
function normalizeVotesIgnoreDay(votes) {
  if (!votes || votes.length === 0) return '[]';
  
  // Sort by Target only (after normalizing names)
  const sorted = [...votes].sort((a, b) => {
    return normalizePlayerName(a.Target).localeCompare(normalizePlayerName(b.Target));
  });
  
  // Create a normalized string representation using only Target
  return sorted.map(v => normalizePlayerName(v.Target)).join(';');
}

console.log('\n\n' + '='.repeat(80));
console.log('COMPARISON COMPLETE');
console.log('='.repeat(80));
