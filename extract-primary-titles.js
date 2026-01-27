import fs from 'fs';

// Lire le fichier playerTitles.json
const data = JSON.parse(fs.readFileSync('./data/playerTitles.json', 'utf-8'));

// Extraire et afficher les titres principaux
console.log('\n=== TITRES PRINCIPAUX ===\n');

Object.values(data.players)
  .sort((a, b) => a.playerName.localeCompare(b.playerName))
  .forEach(player => {
    const title = player.primaryTitle?.title || 'Aucun titre';
    console.log(`${player.playerName}: ${title}`);
  });

console.log('\n');
