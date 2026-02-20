// Script to export all available titles (simple + combination) with details, sorted by priority

import { TITLE_DEFINITIONS, COMBINATION_TITLES } from '../titleDefinitions.js';
import fs from 'fs';

// Helper to translate stat names to French
const statNamesFr = {
  killRate: 'Taux de kills',
  killRateVillageois: 'Taux de kills Villageois',
  killRateLoup: 'Taux de kills Loup',
  killRateSolo: 'Taux de kills Solo',
  survival: 'Survie',
  survivalVillageois: 'Survie Villageois',
  survivalLoup: 'Survie Loup',
  survivalSolo: 'Survie Solo',
  survivalDay1: 'Survie Jour 1',
  survivalDay1Villageois: 'Survie Jour 1 (Villageois)',
  survivalDay1Loup: 'Survie Jour 1 (Loup)',
  survivalDay1Solo: 'Survie Jour 1 (Solo)',
  survivalAtMeetingVillageois: 'Survie au meeting (Villageois)',
  survivalAtMeetingLoup: 'Survie au meeting (Loup)',
  survivalAtMeetingSolo: 'Survie au meeting (Solo)',
  talking: 'Temps de parole',
  talkingOutsideMeeting: 'Parole hors meeting',
  talkingDuringMeeting: 'Parole en meeting',
  loot: 'Récolte',
  lootVillageois: 'Récolte Villageois',
  lootLoup: 'Récolte Loup',
  votingAggressive: 'Vote agressif',
  votingFirst: 'Premier voteur',
  votingAccuracy: 'Précision de vote',
  hunterAccuracy: 'Précision chasseur',
  hunterShotAccuracy: 'Précision de tir (chasseur)',
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
  wolfTransformRate: 'Taux de transformation en loup',
  wolfUntransformRate: 'Taux de retour après transformation',
  potionUsage: 'Utilisation de potions',
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

// Process simple titles from TITLE_DEFINITIONS
const simpleTitles = [];
Object.entries(TITLE_DEFINITIONS).forEach(([statKey, statTitles]) => {
  Object.entries(statTitles).forEach(([category, titleData]) => {
    // Skip if not a title object
    if (!titleData.title) return;
    
    // Convert category to percentile category format
    const categoryMap = {
      extremeHigh: 'EXTREME_HIGH',
      extremeLow: 'EXTREME_LOW',
      high: 'HIGH',
      low: 'LOW',
      average: 'AVERAGE',
      aboveAverage: 'ABOVE_AVERAGE',
      belowAverage: 'BELOW_AVERAGE',
      balanced: 'BALANCED',
      specialist: 'SPECIALIST',
      villageois: 'VILLAGEOIS',
      loup: 'LOUP',
      solo: 'SOLO',
      chasseur: 'CHASSEUR',
      alchimiste: 'ALCHIMISTE',
      amoureux: 'AMOUREUX',
      agent: 'AGENT',
      espion: 'ESPION',
      idiot: 'IDIOT',
      chasseurDePrime: 'CHASSEUR_DE_PRIME',
      contrebandier: 'CONTREBANDIER',
      bete: 'BETE',
      vaudou: 'VAUDOU',
      scientifique: 'SCIENTIFIQUE'
    };
    
    // Priority assignment based on category (matching generate-titles.js logic)
    const priorityMap = {
      extremeHigh: 8,
      extremeLow: 8,
      high: 6,
      low: 6,
      aboveAverage: 4,
      belowAverage: 4,
      average: 3,
      balanced: 6,
      specialist: 6,
      // Role titles
      villageois: 3,
      loup: 3,
      solo: 3,
      chasseur: 3,
      alchimiste: 3,
      amoureux: 3,
      agent: 3,
      espion: 3,
      idiot: 3,
      chasseurDePrime: 3,
      contrebandier: 3,
      bete: 3,
      vaudou: 3,
      scientifique: 3
    };
    
    const statName = statNamesFr[statKey] || statKey;
    const categoryFormatted = categoryNamesFr[categoryMap[category]] || category;
    const priority = priorityMap[category] || 5;
    
    simpleTitles.push({
      title: `${titleData.title} ${titleData.emoji}`,
      description: titleData.description,
      type: 'simple',
      conditions: [`${statName}: ${categoryFormatted}`],
      priority: priority
    });
  });
});

// Process combination titles
const combinationTitles = COMBINATION_TITLES
  .map(t => ({
    title: `${t.title} ${t.emoji}`,
    description: t.description,
    type: 'combination',
    conditions: formatConditions(t.conditions),
    priority: t.priority
  }));

// Combine all titles
const allTitles = [...simpleTitles, ...combinationTitles]
  .sort((a, b) => b.priority - a.priority);

// Output as JSON file
fs.writeFileSync('allTitlesExport.json', JSON.stringify(allTitles, null, 2), 'utf-8');

console.log(`✅ Exported ${allTitles.length} titles to allTitlesExport.json`);
console.log(`   - ${simpleTitles.length} simple titles`);
console.log(`   - ${combinationTitles.length} combination titles`);
console.log('\nFirst 5 titles:');
console.log(JSON.stringify(allTitles.slice(0, 5), null, 2));