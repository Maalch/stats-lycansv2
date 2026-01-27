/**
 * Player Titles Generation System
 * 
 * Generates dynamic titles for players based on their statistics.
 * Uses percentile-based distribution to ensure fair title assignment.
 * 
 * Titles are generated from modded games only and require minimum 25 games.
 */

import fs from 'fs/promises';
import path from 'path';

// Import compute functions
import { computePlayerStats } from './compute/compute-player-stats.js';
import { computePlayerCampPerformance } from './compute/compute-camp-performance.js';
import { computePlayerSeriesData } from './compute/compute-series-data.js';
import { computeVotingStatistics } from './compute/compute-voting-stats.js';
import { computeHunterStatistics } from './compute/compute-hunter-stats.js';
import { computeTalkingTimeStats } from './compute/compute-talking-stats.js';
import { computeDeathStatistics } from './compute/compute-death-stats.js';
import { computeLootStatistics } from './compute/compute-loot-stats.js';

// Import data source configuration
import { DATA_SOURCES } from './shared/data-sources.js';

// Minimum games required for title eligibility
const MIN_GAMES_FOR_TITLES = 25;
const MIN_GAMES_FOR_ROLE_TITLES = 10;

// Percentile thresholds for title categories
const PERCENTILE_THRESHOLDS = {
  EXTREME_HIGH: 85,   // Top 15% (was 90)
  HIGH: 65,           // Top 35% (was 75)
  ABOVE_AVERAGE: 55,  // Top 45% (was 60)
  AVERAGE_HIGH: 52,
  AVERAGE_LOW: 48,
  BELOW_AVERAGE: 45,  // Bottom 55% (was 40)
  LOW: 35,            // Bottom 35% (was 25)
  EXTREME_LOW: 15     // Bottom 15% (was 10)
};

/**
 * Calculate percentile for a value in a distribution
 * @param {number} value - The value to calculate percentile for
 * @param {Array<number>} distribution - Sorted array of all values
 * @returns {number} - Percentile (0-100)
 */
function calculatePercentile(value, distribution) {
  if (distribution.length === 0) return 50;
  const sorted = [...distribution].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}

/**
 * Get percentile category for a value
 * @param {number} percentile - Percentile value (0-100)
 * @returns {string} - Category name
 */
function getPercentileCategory(percentile) {
  if (percentile >= PERCENTILE_THRESHOLDS.EXTREME_HIGH) return 'EXTREME_HIGH';
  if (percentile >= PERCENTILE_THRESHOLDS.HIGH) return 'HIGH';
  if (percentile >= PERCENTILE_THRESHOLDS.ABOVE_AVERAGE) return 'ABOVE_AVERAGE';
  if (percentile >= PERCENTILE_THRESHOLDS.AVERAGE_HIGH) return 'AVERAGE';
  if (percentile <= PERCENTILE_THRESHOLDS.EXTREME_LOW) return 'EXTREME_LOW';
  if (percentile <= PERCENTILE_THRESHOLDS.LOW) return 'LOW';
  if (percentile <= PERCENTILE_THRESHOLDS.BELOW_AVERAGE) return 'BELOW_AVERAGE';
  return 'AVERAGE';
}

// ============================================================================
// TITLE DEFINITIONS
// ============================================================================

/**
 * Title definitions with categories and combinations
 */
const TITLE_DEFINITIONS = {
  // === CONTROLLABLE STATS (Player skill/behavior) ===
  
  // Talking time titles
  talking: {
    high: { title: 'Le·a Bavard·e', emoji: '🗣️', description: 'Parle beaucoup (par 60 min de jeu)' },
    average: { title: 'Le·a Équilibré·e', emoji: '⚖️', description: 'Temps de parole normal' },
    low: { title: 'Le·a Silencieux·se', emoji: '🤫', description: 'Parle peu (par 60 min de jeu)' },
    extremeHigh: { title: 'Le Moulin à Paroles', emoji: '💬', description: 'Parle énormément' },
    extremeLow: { title: 'Le·a Fantôme', emoji: '👻', description: 'Quasi muet·te' }
  },
  talkingOutsideMeeting: {
    high: { title: 'Le·a Chuchoteur·se', emoji: '👂', description: 'Bavard·e hors meeting' },
    low: { title: 'Le·a Concentré·e', emoji: '🎯', description: 'Silencieux·se hors meeting' }
  },
  talkingDuringMeeting: {
    high: { title: "L'Orateur·rice", emoji: '🎤', description: 'Bavard·e en meeting' },
    low: { title: 'Le·a Discret·ète', emoji: '🤐', description: 'Silencieux·se en meeting' }
  },

  // Kill rate titles
  killRate: {
    high: { title: 'Le·a Prédateur·rice', emoji: '🐺', description: 'Taux de kills élevé' },
    low: { title: 'Le·a Doux·ce', emoji: '🕊️', description: 'Taux de kills faible' },
    extremeHigh: { title: "L'Exterminateur·rice", emoji: '💀', description: 'Tueur·se en série' },
    extremeLow: { title: "L'Agneau", emoji: '🐑', description: 'Ne tue jamais' }
  },

  // Survival titles
  survival: {
    high: { title: 'Le·a Survivant·e', emoji: '🛡️', description: 'Survie élevée fin de game' },
    low: { title: 'La Cible', emoji: '🎯', description: 'Meurt souvent' }
  },
  survivalDay1: {
    high: { title: 'Le·a Prudent·e', emoji: '🏃', description: 'Survit au Jour 1' },
    low: { title: 'La Première Victime', emoji: '⚰️', description: 'Meurt souvent Jour 1' }
  },

  // Loot/Harvest titles
  loot: {
    high: { title: 'Le·a Fermier·ère', emoji: '🌾', description: 'Récolte élevée' },
    average: { title: 'Le·a Travailleur·se', emoji: '👷', description: 'Récolte correcte' },
    low: { title: 'Le·a Flâneur·se', emoji: '🚶', description: 'Récolte faible' },
    extremeHigh: { title: 'Le·a Stakhanoviste', emoji: '⚒️', description: 'Récolte exceptionnelle' },
    extremeLow: { title: 'Le·a Touriste', emoji: '📸', description: 'Ne récolte jamais' }
  },
  lootVillageois: {
    high: { title: 'Le·a Citoyen·ne Modèle', emoji: '🏘️', description: 'Récolte excellente en Villageois' },
    low: { title: 'Le·a Villageois·e Paresseux·se', emoji: '💤', description: 'Faible récolte en Villageois' }
  },
  lootLoup: {
    high: { title: 'Le Loup Discret', emoji: '🐺', description: 'Récolte élevée en Loup (camouflage)' },
    low: { title: 'Le Loup Impatient', emoji: '😤', description: 'Faible récolte en Loup' }
  },

  // Voting behavior titles
  votingAggressive: {
    high: { title: "L'Agitateur·rice", emoji: '📢', description: 'Voteur·se agressif·ve' },
    low: { title: 'Le·a Sage', emoji: '🧘', description: 'Voteur·se passif·ve' },
    extremeHigh: { title: 'Le·a Tribun·e', emoji: '⚖️', description: 'Toujours en action' },
    extremeLow: { title: "L'Indécis·e", emoji: '🤷', description: 'Vote rarement' }
  },
  votingFirst: {
    high: { title: "L'Impulsif·ve", emoji: '🏃', description: 'Premier·ère voteur·se' },
    low: { title: 'Le·a Stratège', emoji: '🧠', description: 'Attend avant de voter' }
  },
  votingAccuracy: {
    high: { title: 'Le·a Flaireur·se', emoji: '👃', description: 'Bon instinct de vote' },
    low: { title: "L'Aveugle", emoji: '🙈', description: 'Mauvais instinct de vote' }
  },

  // Hunter accuracy titles
  hunterAccuracy: {
    high: { title: 'Le·a Sniper', emoji: '🎯', description: 'Bon·ne chasseur·se (tue des ennemis)' },
    low: { title: 'Le·a Myope', emoji: '👓', description: 'Mauvais·e chasseur·se (tue des alliés)' },
    extremeHigh: { title: "L'Exécuteur·rice", emoji: '⚔️', description: 'Chasseur·se parfait·e' },
    extremeLow: { title: 'Le·a Chasseur·se Maudit·e', emoji: '💔', description: 'Tire toujours sur les mauvaises cibles' }
  },

  // Win rate titles
  winRate: {
    high: { title: 'Le·a Winner', emoji: '🏆', description: 'Taux de victoire élevé' },
    average: { title: 'Le·a Constant·e', emoji: '📊', description: 'Performance stable' },
    low: { title: 'Le·a Looser', emoji: '😢', description: 'Taux de victoire faible' },
    extremeHigh: { title: "L'Inarrêtable", emoji: '👑', description: 'Gagne presque toujours' },
    extremeLow: { title: 'Le·a Maudit·e', emoji: '🪦', description: 'Perd presque toujours' }
  },
  winRateVillageois: {
    high: { title: 'Le·a Protecteur·rice du Village', emoji: '🦸', description: 'Excellent·e en camp Villageois' },
    low: { title: 'Idiot·e en Formation', emoji: '🤡', description: 'Mauvais·e en camp Villageois' }
  },
  winRateLoup: {
    high: { title: 'Le·a Chef de Meute', emoji: '🐺', description: 'Excellent·e en camp Loup' },
    low: { title: 'Loup Débutant·e', emoji: '🐩', description: 'Mauvais·e en camp Loup' }
  },
  winRateSolo: {
    high: { title: "L'Électron Libre", emoji: '🦊', description: 'Excellent·e en rôles Solo' },
    low: { title: "L'Enfant Perdu·e", emoji: '👶', description: 'Mauvais·e en rôles Solo' }
  },

  // Series titles
  winSeries: {
    high: { title: 'En Feu', emoji: '🔥', description: 'Grosse série de victoires' }
  },
  lossSeries: {
    high: { title: 'Glacé·e', emoji: '❄️', description: 'Grosse série de défaites' }
  },

  // === UNCONTROLLABLE STATS (Role assignment luck) ===
  
  campAssignment: {
    villageois: { title: 'Serial Villageois·e', emoji: '🏘️', description: 'Joue souvent Villageois' },
    loup: { title: 'Serial Loup', emoji: '🌙', description: 'Joue souvent Loup' },
    solo: { title: 'Serial Solo', emoji: '🎭', description: 'Joue souvent en Solo' }
  },

  roleAssignment: {
    chasseur: { title: 'Serial Chasseur', emoji: '🔫', description: 'Joue souvent Chasseur' },
    alchimiste: { title: 'Serial Alchimiste', emoji: '⚗️', description: 'Joue souvent Alchimiste' },
    amoureux: { title: 'Serial Amoureux', emoji: '💕', description: 'Joue souvent Amoureux' },
    agent: { title: 'Serial Agent', emoji: '🕵️', description: 'Joue souvent Agent' },
    espion: { title: 'Serial Espion', emoji: '🔍', description: 'Joue souvent Espion' },
    idiot: { title: 'Serial Idiot', emoji: '🃏', description: 'Joue souvent Idiot du Village' },
    chasseurDePrime: { title: 'Serial Bounty Hunter', emoji: '💰', description: 'Joue souvent Chasseur de Prime' },
    contrebandier: { title: 'Serial Contrebandier', emoji: '📦', description: 'Joue souvent Contrebandier' },
    bete: { title: 'Serial Bête', emoji: '🦁', description: 'Joue souvent La Bête' },
    vaudou: { title: 'Serial Vaudou', emoji: '🎃', description: 'Joue souvent Vaudou' },
    scientifique: { title: 'Serial Scientifique', emoji: '🔬', description: 'Joue souvent Scientifique' }
  },

  // Participation & consistency titles
  participation: {
    high: { title: 'Le·a Noctambule', emoji: '🌙', description: 'Joue énormément de parties' },
    low: { title: 'Le·a Occasionnel·le', emoji: '🎲', description: 'Joue peu de parties' }
  },

  // Camp versatility titles
  campBalance: {
    balanced: { title: 'Le·a Polyvalent·e', emoji: '🎭', description: 'Performance équilibrée dans tous les camps' },
    specialist: { title: 'Le·a Spécialiste', emoji: '🎯', description: 'Excellent dans un camp spécifique' }
  }
};

// ============================================================================
// COMBINATION TITLES
// ============================================================================

/**
 * Combination title definitions - special titles for stat combinations
 */
const COMBINATION_TITLES = [
  // High talk + High loot = Hyperactive
  {
    id: 'hyperactif',
    title: 'L\'Hyperactif·ve',
    emoji: '⚡',
    description: 'Bavard·e ET grande récolte',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'loot', category: 'HIGH' }
    ],
    priority: 10
  },

  // Low kills + High win rate = The Pacifist
  {
    id: 'pacifiste',
    title: 'Le·a Pacifiste',
    emoji: '☮️',
    description: 'Gagne sans tuer',
    conditions: [
      { stat: 'killRate', category: 'LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 13
  },

  // Low survival + High win rate = The Martyr
  {
    id: 'martyr',
    title: 'Le·a Martyr·e',
    emoji: '✝️',
    description: 'Meurt souvent mais fait gagner son camp',
    conditions: [
      { stat: 'survival', category: 'LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 14
  },

  // High talk outside meeting + Low talk during meeting = The Conspirator
  {
    id: 'conspirateur',
    title: 'Le·a Conspirateur·rice',
    emoji: '🗨️',
    description: 'Bavard·e hors meeting, silencieux·se pendant',
    conditions: [
      { stat: 'talkingOutsideMeeting', category: 'HIGH' },
      { stat: 'talkingDuringMeeting', category: 'LOW' }
    ],
    priority: 11
  },

  // Low talk outside + High talk during meeting = The Lawyer
  {
    id: 'avocat',
    title: 'L\'Avocat·e',
    emoji: '⚖️',
    description: 'Silencieux·se hors débats, éloquent·e en meeting',
    conditions: [
      { stat: 'talkingOutsideMeeting', category: 'LOW' },
      { stat: 'talkingDuringMeeting', category: 'HIGH' }
    ],
    priority: 11
  },

  // High survival + High win rate loup = The Alpha Wolf
  {
    id: 'loup_alpha',
    title: 'Le Loup Alpha',
    emoji: '🐺',
    description: 'Survit et domine en Loup',
    conditions: [
      { stat: 'survival', category: 'HIGH' },
      { stat: 'winRateLoup', category: 'HIGH' }
    ],
    priority: 14
  },

  // High loot villageois + High win rate villageois = The Model Citizen
  {
    id: 'citoyen_exemplaire',
    title: 'Le·a Citoyen·ne Exemplaire',
    emoji: '👑',
    description: 'Récolte et gagne en Villageois',
    conditions: [
      { stat: 'lootVillageois', category: 'HIGH' },
      { stat: 'winRateVillageois', category: 'HIGH' }
    ],
    priority: 13
  },

  // Extreme high talk + Low loot + Low kills = The Commentator
  {
    id: 'commentateur',
    title: 'Le·a Commentateur·rice',
    emoji: '📻',
    description: 'Ne fait que parler, ne récolte rien et tue peu',
    conditions: [
      { stat: 'talking', category: 'EXTREME_HIGH' },
      { stat: 'loot', category: 'LOW' },
      { stat: 'killRate', category: 'LOW' }
    ],
    priority: 17
  },

  // High win rate + High loot + High survival = The Perfect Player
  {
    id: 'joueur_parfait',
    title: 'Le·a Joueur·se Parfait·e',
    emoji: '💎',
    description: 'Gagne, récolte, et survit',
    conditions: [
      { stat: 'winRate', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'loot', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'survival', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 19
  },

  // Low everything = The Beginner
  {
    id: 'debutant',
    title: 'Le·a Débutant·e',
    emoji: '🆘',
    description: 'Peine en victoire, survie et récolte',
    conditions: [
      { stat: 'winRate', category: 'LOW' },
      { stat: 'survival', category: 'LOW' },
      { stat: 'loot', category: 'LOW' }
    ],
    priority: 19
  },

  // Low loot + High kill rate = The Assassin
  {
    id: 'assassin',
    title: 'L\'Assassin·e',
    emoji: '🗡️',
    description: 'Ignore la récolte, se concentre sur les kills',
    conditions: [
      { stat: 'loot', category: 'LOW' },
      { stat: 'killRate', category: 'HIGH' }
    ],
    priority: 12
  },
  
  // Low talk + High loot = Efficient
  {
    id: 'efficace',
    title: 'L\'Efficace',
    emoji: '🎯',
    description: 'Silencieux·se mais productif·ve',
    conditions: [
      { stat: 'talking', category: 'LOW' },
      { stat: 'loot', category: 'HIGH' }
    ],
    priority: 10
  },

  // High talk + Low loot = Philosopher
  {
    id: 'philosophe',
    title: 'Le·a Philosophe',
    emoji: '📚',
    description: 'Bavard·e mais improductif·ve',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'loot', category: 'LOW' }
    ],
    priority: 10
  },

  // High kills + High survival = Predator
  {
    id: 'alpha_predator',
    title: 'L\'Alpha',
    emoji: '🦁',
    description: 'Tue beaucoup et survit',
    conditions: [
      { stat: 'killRate', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 15
  },

  // High kills + Low survival = Kamikaze
  {
    id: 'kamikaze',
    title: 'Le·a Kamikaze',
    emoji: '💥',
    description: 'Tue mais meurt en retour',
    conditions: [
      { stat: 'killRate', category: 'HIGH' },
      { stat: 'survival', category: 'LOW' }
    ],
    priority: 10
  },

  // Low survival Day 1 + High survival = Phoenix
  {
    id: 'phoenix',
    title: 'Le·a Phoenix',
    emoji: '🔥',
    description: 'Souvent ciblé·e tôt mais survit',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 12
  },

  // Aggressive voter + First voter = Impulsive
  {
    id: 'cowboy',
    title: 'Le·a Cow-Boy',
    emoji: '🤠',
    description: 'Vote vite et souvent',
    conditions: [
      { stat: 'votingAggressive', category: 'HIGH' },
      { stat: 'votingFirst', category: 'HIGH' }
    ],
    priority: 10
  },

  // Good voting accuracy + Low talk = Detective
  {
    id: 'detective',
    title: 'Le·a Détective',
    emoji: '🔎',
    description: 'Observe silencieusement et vote juste',
    conditions: [
      { stat: 'votingAccuracy', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 12
  },

  // High talk during meeting + Good voting + Aggressive = Master of Ceremony
  {
    id: 'maitre_ceremonie',
    title: 'Le·a Maître·sse de Cérémonie',
    emoji: '🎙️',
    description: 'Mène les débats et vote juste',
    conditions: [
      { stat: 'talkingDuringMeeting', category: 'HIGH' },
      { stat: 'votingAccuracy', category: 'HIGH' },
      { stat: 'votingAggressive', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 14
  },

  // High talk + Bad voting = Demagogue
  {
    id: 'demagogue',
    title: 'Le·a Démagogue',
    emoji: '📣',
    description: 'Parle beaucoup mais vote mal',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'votingAccuracy', category: 'LOW' }
    ],
    priority: 10
  },

  // Super Loup + Low talk = Perfect Infiltrator
  {
    id: 'infiltrateur',
    title: 'L\'Infiltré·e',
    emoji: '🎭',
    description: 'Excellent·e loup discret·ète',
    conditions: [
      { stat: 'winRateLoup', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 15
  },

  // Super Loup + High talk = Manipulator
  {
    id: 'manipulateur',
    title: 'Le·a Manipulateur·rice',
    emoji: '🐍',
    description: 'Loup bavard·e et gagnant·e',
    conditions: [
      { stat: 'winRateLoup', category: 'HIGH' },
      { stat: 'talking', category: 'HIGH' }
    ],
    priority: 15
  },

  // High win rate + Serial Winner = The Legend
  {
    id: 'legende',
    title: 'La Légende',
    emoji: '🏅',
    description: 'Gagne tout le temps + grosses séries',
    conditions: [
      { stat: 'winRate', category: 'EXTREME_HIGH' },
      { stat: 'winSeries', category: 'HIGH' }
    ],
    priority: 20
  },

  // Low win rate + Serial Looser = The Cursed
  {
    id: 'poissard',
    title: 'Le·a Poissard·e',
    emoji: '🌧️',
    description: 'Perd tout le temps + grosses séries de défaites',
    conditions: [
      { stat: 'winRate', category: 'EXTREME_LOW' },
      { stat: 'lossSeries', category: 'HIGH' }
    ],
    priority: 20
  },

  // High loot + High survival + Low talk = Robot
  {
    id: 'robot',
    title: 'Le·a Robot',
    emoji: '🤖',
    description: 'Productif·ve, survit, parle peu',
    conditions: [
      { stat: 'loot', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 18
  },

  // High talk + Low loot + Low survival = Clown
  {
    id: 'pitre',
    title: 'Le·a Pitre',
    emoji: '🎪',
    description: 'Bavard·e, improductif·ve, meurt souvent',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'loot', category: 'LOW' },
      { stat: 'survival', category: 'LOW' }
    ],
    priority: 18
  },

  // Serial Amoureux + Winner = Cupidon
  {
    id: 'cupidon',
    title: 'Cupidon',
    emoji: '💘',
    description: 'Souvent amoureux et gagnant',
    conditions: [
      { stat: 'roleAmoureux', category: 'HIGH' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 12
  },

  // Serial Amoureux + Looser = Romeo
  {
    id: 'romeo',
    title: 'Roméo',
    emoji: '💔',
    description: 'Souvent amoureux mais perd',
    conditions: [
      { stat: 'roleAmoureux', category: 'HIGH' },
      { stat: 'winRate', category: 'LOW' }
    ],
    priority: 12
  },

  // Serial Chasseur + Good hunter accuracy = Sniper Elite
  {
    id: 'sniper_elite',
    title: 'Sniper Elite',
    emoji: '🎖️',
    description: 'Chasseur·se fréquent·e et précis·e',
    conditions: [
      { stat: 'roleChasseur', category: 'HIGH' },
      { stat: 'hunterAccuracy', category: 'HIGH' }
    ],
    priority: 15
  },

  // Serial Chasseur + Bad hunter accuracy = Clumsy Hunter
  {
    id: 'chasseur_maladroit',
    title: 'Le·a Chasseur·se Maladroit·e',
    emoji: '🔫',
    description: 'Chasseur·se fréquent·e mais imprécis·e',
    conditions: [
      { stat: 'roleChasseur', category: 'HIGH' },
      { stat: 'hunterAccuracy', category: 'LOW' }
    ],
    priority: 15
  },

  // High participation + specialist camps = Taulier
  {
    id: 'taulier',
    title: 'Le·a Taulier·e',
    emoji: '🔑',
    description: 'Participe beaucoup et excelle dans un camp',
    conditions: [
      { stat: 'gamesPlayed', category: 'HIGH', minValue: 100 },
      { stat: 'campBalance', category: 'SPECIALIST' }
    ],
    priority: 10
  },

  // High participation + balanced camps = The Enthusiast
  {
    id: 'enthusiaste',
    title: 'L\'Enthousiaste',
    emoji: '🌟',
    description: 'Participe beaucoup et gagne autant dans chaque camp',
    conditions: [
      { stat: 'gamesPlayed', category: 'HIGH', minValue: 100 },
      { stat: 'campBalance', category: 'BALANCED' }
    ],
    priority: 10
  },

  // High win rate + low participation = The Opportunist
  {
    id: 'opportuniste',
    title: 'L\'Opportuniste',
    emoji: '🎯',
    description: 'Gagne souvent mais joue peu',
    conditions: [
      { stat: 'winRate', category: 'HIGH' },
      { stat: 'gamesPlayed', category: 'LOW' }
    ],
    priority: 13
  },

  // Balanced win rates across all camps = The Adaptable
  {
    id: 'adaptable',
    title: 'L\'Adaptable',
    emoji: '🦎',
    description: 'Bon dans tous les camps',
    conditions: [
      { stat: 'winRateVillageois', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'winRateLoup', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'winRateSolo', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 16
  },

  // Poor performance across all camps = The Struggling
  {
    id: 'en_rodage',
    title: 'En Rodage',
    emoji: '⚙️',
    description: 'Peine dans tous les camps',
    conditions: [
      { stat: 'winRateVillageois', category: 'LOW' },
      { stat: 'winRateLoup', category: 'LOW' },
      { stat: 'winRateSolo', category: 'LOW' }
    ],
    priority: 16
  },

  // High loot + Low survival = The Greedy
  {
    id: 'avide',
    title: 'L\'Avide',
    emoji: '💰',
    description: 'Récolte beaucoup mais meurt',
    conditions: [
      { stat: 'loot', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'survival', category: 'LOW', minCategory: 'BELOW_AVERAGE' }
    ],
    priority: 11
  },

  // Low loot + High survival = The Cautious
  {
    id: 'prudent',
    title: 'Le·a Prudent·e',
    emoji: '🛡️',
    description: 'Survit mais récolte peu',
    conditions: [
      { stat: 'loot', category: 'LOW', minCategory: 'BELOW_AVERAGE' },
      { stat: 'survival', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 11
  },

  // Average talk + Average loot + Average win = The Average Joe
  {
    id: 'monsieur_madame_tout_le_monde',
    title: 'Monsieur·Madame Tout-le-Monde',
    emoji: '👤',
    description: 'Performance moyenne partout',
    conditions: [
      { stat: 'talking', category: 'AVERAGE' },
      { stat: 'loot', category: 'AVERAGE' },
      { stat: 'winRate', category: 'AVERAGE' }
    ],
    priority: 5
  }
];

// ============================================================================
// STATISTICS COMPUTATION
// ============================================================================

/**
 * Compute all player statistics needed for title generation
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Object} - Computed statistics by player
 */
function computeAllStatistics(moddedGames) {
  console.log(`  Computing statistics from ${moddedGames.length} modded games...`);

  // Compute all stats using existing compute functions
  const playerStats = computePlayerStats(moddedGames);
  const campStats = computePlayerCampPerformance(moddedGames);
  const seriesData = computePlayerSeriesData(moddedGames);
  const votingStats = computeVotingStatistics(moddedGames);
  const hunterStats = computeHunterStatistics(moddedGames);
  const talkingStats = computeTalkingTimeStats(moddedGames);
  const deathStats = computeDeathStatistics(moddedGames);
  
  // Try to compute loot stats if available
  let lootStats = null;
  try {
    lootStats = computeLootStatistics(moddedGames);
  } catch (e) {
    console.log('  ⚠️  Loot statistics not available');
  }

  // Aggregate all stats by player
  const aggregatedStats = new Map();

  // Process base player stats
  if (playerStats?.playerStats) {
    playerStats.playerStats.forEach(player => {
      const playerId = player.playerId || player.player;
      if (!aggregatedStats.has(playerId)) {
        aggregatedStats.set(playerId, {
          playerId,
          playerName: player.playerName,
          gamesPlayed: 0,
          stats: {}
        });
      }
      const agg = aggregatedStats.get(playerId);
      agg.gamesPlayed = player.gamesPlayed || 0;
      agg.stats.winRate = parseFloat(player.winPercent) || 0;
      agg.stats.gamesPlayed = player.gamesPlayed || 0;
      
      // Camp-specific win rates
      if (player.camps) {
        const vill = player.camps.villageois;
        const loup = player.camps.loups;
        const solo = player.camps.solo;
        
        agg.stats.winRateVillageois = vill?.played > 5 
          ? (vill.won / vill.played) * 100 : null;
        agg.stats.winRateLoup = loup?.played > 5 
          ? (loup.won / loup.played) * 100 : null;
        agg.stats.winRateSolo = solo?.played > 3 
          ? (solo.won / solo.played) * 100 : null;
        
        // Camp assignment percentages
        const total = (vill?.played || 0) + (loup?.played || 0) + (solo?.played || 0);
        if (total > 0) {
          agg.stats.campVillageoisPercent = ((vill?.played || 0) / total) * 100;
          agg.stats.campLoupPercent = ((loup?.played || 0) / total) * 100;
          agg.stats.campSoloPercent = ((solo?.played || 0) / total) * 100;
        }
      }
    });
  }

  // Process talking stats
  if (talkingStats?.playerStats) {
    talkingStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Only set talking stats if data exists (not 0 from missing data)
      agg.stats.talkingPer60Min = (player.secondsAllPer60Min !== undefined && player.secondsAllPer60Min !== null) 
        ? player.secondsAllPer60Min : null;
      agg.stats.talkingOutsidePer60Min = (player.secondsOutsidePer60Min !== undefined && player.secondsOutsidePer60Min !== null) 
        ? player.secondsOutsidePer60Min : null;
      agg.stats.talkingDuringPer60Min = (player.secondsDuringPer60Min !== undefined && player.secondsDuringPer60Min !== null) 
        ? player.secondsDuringPer60Min : null;
    });
  }

  // Process voting behavior stats
  if (votingStats?.playerBehaviorStats) {
    votingStats.playerBehaviorStats.forEach(player => {
      const playerId = player.player; // Use 'player' field from compute-voting-stats
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Use aggressivenessScore directly from compute-voting-stats
      if (player.aggressivenessScore !== undefined && player.aggressivenessScore !== null) {
        agg.stats.votingAggressiveness = player.aggressivenessScore;
      }
    });
  }

  // Process voting accuracy
  if (votingStats?.playerAccuracyStats) {
    votingStats.playerAccuracyStats.forEach(player => {
      const playerId = player.player; // Use 'player' field from compute-voting-stats
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const totalVotes = player.totalVotes || 0;
      const accuracyRate = player.accuracyRate;
      
      if (totalVotes >= 10 && accuracyRate !== undefined && accuracyRate !== null) {
        agg.stats.votingAccuracy = accuracyRate;
      }
    });
  }

  // Process voting first/early stats
  if (votingStats?.playerFirstVoteStats) {
    votingStats.playerFirstVoteStats.forEach(player => {
      const playerId = player.player;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const totalMeetingsWithVotes = player.totalMeetingsWithVotes || 0;
      const earlyVoteRate = player.earlyVoteRate;
      
      // Use early vote rate (top 33% of voters) as the "first vote" metric
      if (totalMeetingsWithVotes >= 5 && earlyVoteRate !== undefined && earlyVoteRate !== null) {
        agg.stats.votingFirst = earlyVoteRate;
      }
    });
  }

  // Process hunter stats
  if (hunterStats?.hunterStats) {
    hunterStats.hunterStats.forEach(hunterData => {
      const hunterId = hunterData.hunterId;
      if (!aggregatedStats.has(hunterId)) return;
      const agg = aggregatedStats.get(hunterId);
      
      const gamesAsHunter = hunterData.gamesPlayedAsHunter || 0;
      const totalKills = hunterData.totalKills || 0;
      const goodKills = hunterData.nonVillageoisKills || 0;
      const badKills = hunterData.villageoisKills || 0;
      
      // Only compute accuracy if played at least MIN_GAMES_FOR_ROLE_TITLES games as hunter
      if (gamesAsHunter >= MIN_GAMES_FOR_ROLE_TITLES) {
        agg.stats.hunterGames = gamesAsHunter;
        agg.stats.hunterAccuracy = totalKills > 0 
          ? (goodKills / totalKills) * 100 : null;
      }
    });
  }

  // Process death stats for survival rates
  if (deathStats?.playerDeathStats) {
    deathStats.playerDeathStats.forEach(player => {
      const playerId = player.player; // Use 'player' field, not 'playerId'
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const gamesPlayed = agg.gamesPlayed || 0;
      const deaths = player.totalDeaths || 0;
      
      if (gamesPlayed > 0) {
        agg.stats.survivalRate = ((gamesPlayed - deaths) / gamesPlayed) * 100;
      }
      
      // Survival Day 1 Rate - now available from compute-death-stats.js
      if (player.survivalDay1Rate !== undefined && player.survivalDay1Rate !== null) {
        agg.stats.survivalDay1Rate = player.survivalDay1Rate;
      }
      
      // Kill rate - get from killerStats
      const killerData = deathStats.killerStats?.find(k => k.killerId === playerId);
      const kills = killerData?.kills || 0;
      agg.stats.killRate = kills / Math.max(gamesPlayed, 1);
    });
  }

  // Process series data
  if (seriesData) {
    Object.entries(seriesData).forEach(([playerId, data]) => {
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      agg.stats.longestWinSeries = data.longestWinSeries?.seriesLength || 0;
      agg.stats.longestLossSeries = data.longestLossSeries?.seriesLength || 0;
    });
  }

  // Process loot stats if available
  if (lootStats?.playerStats) {
    lootStats.playerStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Only set loot stats if data exists (not 0 from missing data)
      agg.stats.lootPer60Min = (player.lootPer60Min !== undefined && player.lootPer60Min !== null) 
        ? player.lootPer60Min : null;
      agg.stats.lootVillageoisPer60Min = (player.lootVillageoisPer60Min !== undefined && player.lootVillageoisPer60Min !== null) 
        ? player.lootVillageoisPer60Min : null;
      agg.stats.lootLoupPer60Min = (player.lootLoupPer60Min !== undefined && player.lootLoupPer60Min !== null) 
        ? player.lootLoupPer60Min : null;
    });
  }

  return aggregatedStats;
}

/**
 * Compute role assignment frequencies from game data
 * @param {Array} moddedGames - Array of modded game entries
 * @returns {Map} - Role frequencies by player
 */
function computeRoleFrequencies(moddedGames) {
  const roleFrequencies = new Map();

  moddedGames.forEach(game => {
    if (!game.PlayerStats) return;
    
    game.PlayerStats.forEach(player => {
      const playerId = player.ID || player.Username;
      
      if (!roleFrequencies.has(playerId)) {
        roleFrequencies.set(playerId, {
          gamesPlayed: 0,
          roles: {}
        });
      }
      
      const freq = roleFrequencies.get(playerId);
      freq.gamesPlayed++;
      
      const role = player.MainRoleInitial;
      const power = player.Power;
      
      // Track specific roles
      const effectiveRole = power || role;
      freq.roles[effectiveRole] = (freq.roles[effectiveRole] || 0) + 1;
    });
  });

  return roleFrequencies;
}

// ============================================================================
// TITLE GENERATION
// ============================================================================

/**
 * Assign unique primary titles to players
 * Each title is ideally given to only one player - the one with the strongest claim
 * @param {Object} playerTitles - Player titles object (modified in place)
 */
function assignUniquePrimaryTitles(playerTitles) {
  const usedTitles = new Set();
  const playerIds = Object.keys(playerTitles);
  
  // Create a list of all title claims with their strength
  const titleClaims = [];
  
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    
    player.titles.forEach((title, titleIndex) => {
      // Calculate claim strength based on:
      // 1. Priority (higher is better)
      // 2. Percentile (higher is better for the stat)
      // 3. Title position (earlier in list is better)
      const claimStrength = 
        (title.priority || 0) * 1000 + 
        (title.percentile || 50) * 10 - 
        titleIndex;
      
      titleClaims.push({
        playerId,
        playerName: player.playerName,
        title,
        titleIndex,
        claimStrength
      });
    });
  });
  
  // Sort claims by strength (highest first)
  titleClaims.sort((a, b) => b.claimStrength - a.claimStrength);
  
  // First pass: assign unique titles
  titleClaims.forEach(claim => {
    const player = playerTitles[claim.playerId];
    
    // Skip if player already has a primary title
    if (player.primaryTitle) return;
    
    // Skip if this title is already used
    if (usedTitles.has(claim.title.id)) return;
    
    // Assign this title to the player
    player.primaryTitle = claim.title;
    usedTitles.add(claim.title.id);
  });
  
  // Second pass: assign any remaining players their best available title (even if used)
  playerIds.forEach(playerId => {
    const player = playerTitles[playerId];
    
    if (!player.primaryTitle && player.titles.length > 0) {
      // Give them their highest priority title, even if already used
      player.primaryTitle = player.titles[0];
    }
  });
  
  // Log uniqueness stats
  const uniqueTitles = usedTitles.size;
  const totalPlayers = playerIds.length;
  console.log(`  ✓ Primary title uniqueness: ${uniqueTitles}/${totalPlayers} unique (${Math.round(uniqueTitles/totalPlayers*100)}%)`);
}

/**
 * Generate titles for all eligible players
 * @param {Map} aggregatedStats - Aggregated statistics by player
 * @param {Map} roleFrequencies - Role frequencies by player
 * @returns {Object} - Generated titles by player
 */
function generatePlayerTitles(aggregatedStats, roleFrequencies) {
  console.log('  Generating player titles...');

  // Filter eligible players (min games requirement)
  const eligiblePlayers = Array.from(aggregatedStats.entries())
    .filter(([_, data]) => data.gamesPlayed >= MIN_GAMES_FOR_TITLES);

  console.log(`  ${eligiblePlayers.length} players eligible for titles (${MIN_GAMES_FOR_TITLES}+ games)`);

  // Build distributions for percentile calculations
  const distributions = buildDistributions(eligiblePlayers);
  
  // Calculate percentiles for each player
  const playerPercentiles = new Map();
  eligiblePlayers.forEach(([playerId, data]) => {
    const percentiles = {};
    
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && distributions[statName]) {
        percentiles[statName] = {
          value,
          percentile: calculatePercentile(value, distributions[statName]),
          category: getPercentileCategory(calculatePercentile(value, distributions[statName]))
        };
      }
    });
    
    playerPercentiles.set(playerId, {
      ...data,
      percentiles
    });
  });

  // Generate titles for each player
  const playerTitles = {};
  
  playerPercentiles.forEach((data, playerId) => {
    const titles = [];
    
    // Generate basic stat-based titles
    const basicTitles = generateBasicTitles(data.percentiles);
    titles.push(...basicTitles);
    
    // Generate camp balance titles
    const campBalanceTitles = generateCampBalanceTitles(data.percentiles);
    titles.push(...campBalanceTitles);
    
    // Generate combination titles
    const comboTitles = generateCombinationTitles(data.percentiles);
    titles.push(...comboTitles);
    
    // Generate role-based titles
    const roleData = roleFrequencies.get(playerId);
    if (roleData && roleData.gamesPlayed >= MIN_GAMES_FOR_ROLE_TITLES) {
      const roleTitles = generateRoleTitles(roleData, eligiblePlayers.length);
      titles.push(...roleTitles);
    }
    
    // Sort by priority and deduplicate
    const sortedTitles = titles
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .filter((title, index, self) => 
        index === self.findIndex(t => t.id === title.id)
      );
    
    playerTitles[playerId] = {
      playerId,
      playerName: data.playerName,
      gamesPlayed: data.gamesPlayed,
      titles: sortedTitles,
      primaryTitle: null, // Will be assigned in unique allocation phase
      percentiles: data.percentiles,
      stats: data.stats
    };
  });

  // Assign unique primary titles
  assignUniquePrimaryTitles(playerTitles);

  return playerTitles;
}

/**
 * Build statistical distributions for percentile calculations
 * @param {Array} eligiblePlayers - Array of [playerId, data] entries
 * @returns {Object} - Distributions by stat name
 */
function buildDistributions(eligiblePlayers) {
  const distributions = {};
  
  eligiblePlayers.forEach(([_, data]) => {
    Object.entries(data.stats).forEach(([statName, value]) => {
      if (value !== null && value !== undefined && !isNaN(value)) {
        if (!distributions[statName]) {
          distributions[statName] = [];
        }
        distributions[statName].push(value);
      }
    });
  });
  
  return distributions;
}

/**
 * Generate basic stat-based titles
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of title objects
 */
function generateBasicTitles(percentiles) {
  const titles = [];

  // Map stat names to title definitions
  const statToTitleMap = {
    talkingPer60Min: 'talking',
    talkingOutsidePer60Min: 'talkingOutsideMeeting',
    talkingDuringPer60Min: 'talkingDuringMeeting',
    killRate: 'killRate',
    survivalRate: 'survival',
    survivalDay1Rate: 'survivalDay1',
    lootPer60Min: 'loot',
    lootVillageoisPer60Min: 'lootVillageois',
    lootLoupPer60Min: 'lootLoup',
    votingAggressiveness: 'votingAggressive',
    votingFirst: 'votingFirst',
    votingAccuracy: 'votingAccuracy',
    hunterAccuracy: 'hunterAccuracy',
    winRate: 'winRate',
    winRateVillageois: 'winRateVillageois',
    winRateLoup: 'winRateLoup',
    winRateSolo: 'winRateSolo',
    longestWinSeries: 'winSeries',
    longestLossSeries: 'lossSeries'
  };

  Object.entries(percentiles).forEach(([statName, data]) => {
    const titleKey = statToTitleMap[statName];
    if (!titleKey || !TITLE_DEFINITIONS[titleKey]) return;
    
    const titleDef = TITLE_DEFINITIONS[titleKey];
    let selectedTitle = null;
    let priority = 5;

    switch (data.category) {
      case 'EXTREME_HIGH':
        selectedTitle = titleDef.extremeHigh || titleDef.high;
        priority = 8;
        break;
      case 'HIGH':
        selectedTitle = titleDef.high;
        priority = 6;
        break;
      case 'ABOVE_AVERAGE':
        selectedTitle = titleDef.aboveAverage || titleDef.average;
        priority = 4;
        break;
      case 'AVERAGE':
        selectedTitle = titleDef.average;
        priority = 3;
        break;
      case 'BELOW_AVERAGE':
        selectedTitle = titleDef.belowAverage || titleDef.average;
        priority = 4;
        break;
      case 'EXTREME_LOW':
        selectedTitle = titleDef.extremeLow || titleDef.low;
        priority = 8;
        break;
      case 'LOW':
        selectedTitle = titleDef.low;
        priority = 6;
        break;
    }

    if (selectedTitle) {
      titles.push({
        id: `${titleKey}_${data.category.toLowerCase()}`,
        ...selectedTitle,
        stat: statName,
        value: data.value,
        percentile: data.percentile,
        category: data.category,
        priority,
        type: 'basic'
      });
    }
  });

  return titles;
}

/**
 * Check if player has balanced camp performance
 * @param {Object} percentiles - Player's percentile data
 * @param {string} type - Type of balance check ('BALANCED' or 'SPECIALIST')
 * @returns {boolean} - Whether condition is met
 */
function checkCampBalance(percentiles, type) {
  const villWinRate = percentiles.winRateVillageois?.value;
  const loupWinRate = percentiles.winRateLoup?.value;
  const soloWinRate = percentiles.winRateSolo?.value;
  
  // Need at least 5 camp win rates to determine balance
  const validRates = [villWinRate, loupWinRate, soloWinRate].filter(r => r !== null && r !== undefined);
  if (validRates.length < 5) return false;
  
  if (type === 'BALANCED') {
    // Balanced: low variance in win rates (within 20% difference)
    const max = Math.max(...validRates);
    const min = Math.min(...validRates);
    return (max - min) <= 20;
  }
  
  if (type === 'SPECIALIST') {
    // Specialist: high variance in win rates (>30% difference)
    const max = Math.max(...validRates);
    const min = Math.min(...validRates);
    return (max - min) > 30;
  }
  
  return false;
}

/**
 * Generate camp balance titles
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of camp balance title objects
 */
function generateCampBalanceTitles(percentiles) {
  const titles = [];
  
  // Check if player has balanced camp performance
  if (checkCampBalance(percentiles, 'BALANCED')) {
    const titleDef = TITLE_DEFINITIONS.campBalance.balanced;
    titles.push({
      id: 'campBalance_balanced',
      ...titleDef,
      stat: 'campBalance',
      category: 'BALANCED',
      priority: 6,
      type: 'campBalance'
    });
  }
  
  // Check if player is a specialist
  if (checkCampBalance(percentiles, 'SPECIALIST')) {
    const titleDef = TITLE_DEFINITIONS.campBalance.specialist;
    titles.push({
      id: 'campBalance_specialist',
      ...titleDef,
      stat: 'campBalance',
      category: 'SPECIALIST',
      priority: 6,
      type: 'campBalance'
    });
  }
  
  return titles;
}

/**
 * Generate combination titles based on multiple stats
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of combination title objects
 */
function generateCombinationTitles(percentiles) {
  const titles = [];

  // Map stat names used in conditions to percentile keys
  const conditionStatMap = {
    talking: 'talkingPer60Min',
    talkingDuringMeeting: 'talkingDuringPer60Min',
    loot: 'lootPer60Min',
    killRate: 'killRate',
    survival: 'survivalRate',
    survivalDay1: 'survivalDay1Rate',
    votingAggressive: 'votingAggressiveness',
    votingFirst: 'votingFirstRate',
    votingAccuracy: 'votingAccuracy',
    hunterAccuracy: 'hunterAccuracy',
    winRate: 'winRate',
    winRateVillageois: 'winRateVillageois',
    winRateLoup: 'winRateLoup',
    winRateSolo: 'winRateSolo',
    winSeries: 'longestWinSeries',
    lossSeries: 'longestLossSeries',
    gamesPlayed: 'gamesPlayed',
    roleAmoureux: 'roleAmoureux',
    roleChasseur: 'roleChasseur',
    campBalance: 'campBalance' // Synthetic stat
  };

  COMBINATION_TITLES.forEach(combo => {    
    // Check if all conditions are met
    const conditionsMet = combo.conditions.every(condition => {
      const statKey = conditionStatMap[condition.stat] || condition.stat;
      const playerData = percentiles[statKey];
      
      if (!playerData) {
        // Special handling for synthetic stats
        if (condition.stat === 'campBalance') {
          return checkCampBalance(percentiles, condition.category);
        }
        if (condition.stat === 'gamesPlayed' && condition.minValue) {
          return percentiles.gamesPlayed?.value >= condition.minValue;
        }
        return false;
      }
      
      // Check minimum value if specified
      if (condition.minValue && playerData.value < condition.minValue) {
        return false;
      }
      
      // Check if category matches with optional minCategory fallback
      const minCategory = condition.minCategory;
      
      if (condition.category === 'HIGH') {
        const acceptableCategories = ['HIGH', 'EXTREME_HIGH'];
        if (minCategory) acceptableCategories.push('ABOVE_AVERAGE');
        return acceptableCategories.includes(playerData.category);
      }
      if (condition.category === 'LOW') {
        const acceptableCategories = ['LOW', 'EXTREME_LOW'];
        if (minCategory) acceptableCategories.push('BELOW_AVERAGE');
        return acceptableCategories.includes(playerData.category);
      }
      if (condition.category === 'AVERAGE') {
        return ['AVERAGE', 'AVERAGE_HIGH', 'AVERAGE_LOW'].includes(playerData.category);
      }
      if (condition.category === 'EXTREME_HIGH') {
        return playerData.category === 'EXTREME_HIGH';
      }
      if (condition.category === 'EXTREME_LOW') {
        return playerData.category === 'EXTREME_LOW';
      }
      if (condition.category === 'BALANCED') {
        return checkCampBalance(percentiles, 'BALANCED');
      }
      
      return playerData.category === condition.category;
    });

    if (conditionsMet) {
      titles.push({
        id: combo.id,
        title: combo.title,
        emoji: combo.emoji,
        description: combo.description,
        priority: combo.priority,
        type: 'combination',
        conditions: combo.conditions.map(c => ({
          stat: c.stat,
          category: c.category,
          actualValue: percentiles[conditionStatMap[c.stat] || c.stat]?.value,
          actualPercentile: percentiles[conditionStatMap[c.stat] || c.stat]?.percentile
        }))
      });
    }
  });

  return titles;
}

/**
 * Generate role-based titles (uncontrollable stats)
 * @param {Object} roleData - Player's role frequency data
 * @param {number} totalPlayers - Total number of eligible players
 * @returns {Array} - Array of role title objects
 */
function generateRoleTitles(roleData, totalPlayers) {
  const titles = [];
  const gamesPlayed = roleData.gamesPlayed;
  
  // Role to title mapping
  const roleToTitle = {
    'Chasseur': 'chasseur',
    'Alchimiste': 'alchimiste',
    'Amoureux': 'amoureux',
    'Agent': 'agent',
    'Espion': 'espion',
    'Idiot du Village': 'idiot',
    'Chasseur de Prime': 'chasseurDePrime',
    'Contrebandier': 'contrebandier',
    'La Bête': 'bete',
    'Vaudou': 'vaudou',
    'Scientifique': 'scientifique'
  };

  Object.entries(roleData.roles).forEach(([role, count]) => {
    const percentage = (count / gamesPlayed) * 100;
    const titleKey = roleToTitle[role];
    
    if (titleKey && TITLE_DEFINITIONS.roleAssignment[titleKey]) {
      // Only give role title if player has high percentage of that role
      // Using 12% as threshold (lowered from 15% to award more titles)
      if (percentage >= 12 && count >= 5) {
        const titleDef = TITLE_DEFINITIONS.roleAssignment[titleKey];
        titles.push({
          id: `role_${titleKey}`,
          ...titleDef,
          roleCount: count,
          rolePercentage: percentage,
          priority: 3,
          type: 'role'
        });
      }
    }
  });

  return titles;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function to generate player titles
 * @param {string} teamKey - Team key from DATA_SOURCES ('main' or 'discord')
 */
async function generateTitles(teamKey = 'main') {
  const dataSource = DATA_SOURCES[teamKey];
  if (!dataSource) {
    console.error(`❌ Unknown team key: ${teamKey}`);
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), dataSource.outputDir);
  const gameLogPath = path.join(outputDir, 'gameLog.json');
  const titlesOutputPath = path.join(outputDir, 'playerTitles.json');

  console.log(`🏷️  Generating player titles for ${dataSource.name}...`);
  console.log(`📁 Output directory: ${outputDir}`);

  try {
    // Load game log
    const gameLogContent = await fs.readFile(gameLogPath, 'utf8');
    const gameLogData = JSON.parse(gameLogContent);

    // Filter modded games only
    const allGames = gameLogData.GameStats || [];
    const moddedGames = allGames.filter(game => game.Modded === true && game.EndDate);

    console.log(`📊 Total games: ${allGames.length}, Modded games: ${moddedGames.length}`);

    if (moddedGames.length === 0) {
      console.log('⚠️  No modded games found, skipping title generation');
      return;
    }

    // Compute statistics
    const aggregatedStats = computeAllStatistics(moddedGames);
    const roleFrequencies = computeRoleFrequencies(moddedGames);

    // Generate titles
    const playerTitles = generatePlayerTitles(aggregatedStats, roleFrequencies);

    // Prepare output
    const output = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      teamName: dataSource.name,
      totalPlayers: Object.keys(playerTitles).length,
      minGamesRequired: MIN_GAMES_FOR_TITLES,
      moddedGamesAnalyzed: moddedGames.length,
      percentileThresholds: PERCENTILE_THRESHOLDS,
      players: playerTitles
    };

    // Save titles
    await fs.writeFile(titlesOutputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`✅ Generated titles for ${Object.keys(playerTitles).length} players`);
    console.log(`📁 Saved to: ${titlesOutputPath}`);

    // Print summary
    const totalTitles = Object.values(playerTitles).reduce(
      (sum, p) => sum + (p.titles?.length || 0), 0
    );
    console.log(`📊 Total titles assigned: ${totalTitles}`);

    // Show top players by title count
    const topByTitles = Object.entries(playerTitles)
      .sort((a, b) => (b[1].titles?.length || 0) - (a[1].titles?.length || 0))
      .slice(0, 5);
    
    console.log('\n🏅 Top players by title count:');
    topByTitles.forEach(([_, data], i) => {
      console.log(`   ${i + 1}. ${data.playerName}: ${data.titles?.length || 0} titles`);
      if (data.primaryTitle) {
        console.log(`      Primary: ${data.primaryTitle.emoji} ${data.primaryTitle.title}`);
      }
    });

  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const teamKey = args[0] || 'main';

generateTitles(teamKey);

export { generateTitles, TITLE_DEFINITIONS, COMBINATION_TITLES, PERCENTILE_THRESHOLDS };
