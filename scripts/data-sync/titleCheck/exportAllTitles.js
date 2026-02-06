// Script to export all available combination titles with details, sorted by priority

import { COMBINATION_TITLES } from '../titleDefinitions.js';
import fs from 'fs';

// Helper to translate stat names to French
const statNamesFr = {
  talking: 'Temps de parole',
  loot: 'Récolte',
  killRate: 'Taux de kills',
  survival: 'Survie',
  survivalDay1: 'Survie Jour 1',
  talkingOutsideMeeting: 'Parole hors meeting',
  talkingDuringMeeting: 'Parole en meeting',
  lootVillageois: 'Récolte Villageois',
  lootLoup: 'Récolte Loup',
  votingAggressive: 'Vote agressif',
  votingFirst: 'Premier voteur',
  votingAccuracy: 'Précision de vote',
  hunterAccuracy: 'Précision chasseur',
  winRate: 'Taux de victoire',
  winRateVillageois: 'Victoires Villageois',
  winRateLoup: 'Victoires Loup',
  winRateSolo: 'Victoires Solo',
  winSeries: 'Série de victoires',
  lossSeries: 'Série de défaites',
  roleChasseur: 'Rôle Chasseur',
  roleAmoureux: 'Rôle Amoureux',
  campSolo: 'Camp Solo',
  gamesPlayed: 'Parties jouées',
  campBalance: 'Équilibre des camps',
  zoneVillagePrincipal: 'Zone Village Principal',
  zoneFerme: 'Zone Ferme',
  zoneVillagePecheur: 'Zone Village Pêcheur',
  zoneRuines: 'Zone Ruines',
  zoneResteCarte: 'Zone Reste Carte',
  zoneDominantPercentage: 'Concentration zone dominante'
};

// Helper to translate category names to French
const categoryNamesFr = {
  HIGH: 'Élevé',
  LOW: 'Faible',
  EXTREME_HIGH: 'Très élevé',
  EXTREME_LOW: 'Très faible',
  ABOVE_AVERAGE: 'Au-dessus de la moyenne',
  BELOW_AVERAGE: 'En-dessous de la moyenne',
  AVERAGE: 'Moyen',
  BALANCED: 'Équilibré',
  SPECIALIST: 'Spécialiste'
};

// Helper to format conditions into readable French
function formatConditions(conditions) {
  return conditions.map(cond => {
    const statName = statNamesFr[cond.stat] || cond.stat;
    const category = categoryNamesFr[cond.category] || cond.category;
    let result = `${statName}: ${category}`;
    
    if (cond.minCategory) {
      result += ` (min: ${categoryNamesFr[cond.minCategory] || cond.minCategory})`;
    }
    if (cond.minValue !== undefined) {
      result += ` (min: ${cond.minValue})`;
    }
    
    return result;
  });
}

// Prepare export array
const exportTitles = COMBINATION_TITLES
  .map(t => ({
    title: `${t.title} ${t.emoji}`,
    description: t.description,
    conditions: formatConditions(t.conditions),
    priority: t.priority
  }))
  .sort((a, b) => b.priority - a.priority);

// Output as JSON file
fs.writeFileSync('allTitlesExport.json', JSON.stringify(exportTitles, null, 2), 'utf-8');

console.log(`✅ Exported ${exportTitles.length} titles to allTitlesExport.json`);
console.log('\nFirst 3 titles:');
console.log(JSON.stringify(exportTitles.slice(0, 3), null, 2));