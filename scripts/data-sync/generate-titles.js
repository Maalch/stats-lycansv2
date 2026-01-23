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
  EXTREME_HIGH: 90,   // Top 10%
  HIGH: 75,           // Top 25%
  ABOVE_AVERAGE: 60,  // Above average
  AVERAGE_HIGH: 55,
  AVERAGE_LOW: 45,
  BELOW_AVERAGE: 40,  // Below average
  LOW: 25,            // Bottom 25%
  EXTREME_LOW: 10     // Bottom 10%
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
    high: { title: 'Le Bavard', emoji: '🗣️', description: 'Parle beaucoup (par 60 min de jeu)' },
    low: { title: 'Le Silencieux', emoji: '🤫', description: 'Parle peu (par 60 min de jeu)' },
    extremeHigh: { title: 'Le Moulin à Paroles', emoji: '💬', description: 'Parle énormément' },
    extremeLow: { title: 'Le Fantôme', emoji: '👻', description: 'Quasi muet' }
  },
  talkingOutsideMeeting: {
    high: { title: 'Le Chuchoteur', emoji: '👂', description: 'Bavard hors meeting' },
    low: { title: 'Le Concentré', emoji: '🎯', description: 'Silencieux hors meeting' }
  },
  talkingDuringMeeting: {
    high: { title: "L'Orateur", emoji: '🎤', description: 'Bavard en meeting' },
    low: { title: 'Le Discret', emoji: '🤐', description: 'Silencieux en meeting' }
  },

  // Kill rate titles
  killRate: {
    high: { title: 'Le Prédateur', emoji: '🐺', description: 'Taux de kills élevé' },
    low: { title: 'Le Pacifiste', emoji: '☮️', description: 'Taux de kills faible' },
    extremeHigh: { title: "L'Exterminateur", emoji: '💀', description: 'Tueur en série' },
    extremeLow: { title: "L'Agneau", emoji: '🐑', description: 'Ne tue jamais' }
  },

  // Survival titles
  survival: {
    high: { title: 'Le Survivant', emoji: '🛡️', description: 'Survie élevée fin de game' },
    low: { title: 'La Cible', emoji: '🎯', description: 'Meurt souvent' },
    extremeHigh: { title: "L'Immortel", emoji: '⭐', description: 'Survie exceptionnelle' },
    extremeLow: { title: 'Le Martyr', emoji: '✝️', description: 'Première victime récurrente' }
  },
  survivalDay1: {
    high: { title: 'Le Prudent', emoji: '🏃', description: 'Survit au Jour 1' },
    low: { title: 'Le Téméraire', emoji: '⚡', description: 'Meurt souvent Jour 1' }
  },

  // Loot/Harvest titles
  loot: {
    high: { title: 'Le Fermier', emoji: '🌾', description: 'Récolte élevée' },
    low: { title: 'Le Flâneur', emoji: '🚶', description: 'Récolte faible' },
    extremeHigh: { title: 'Le Stakhanoviste', emoji: '⚒️', description: 'Récolte exceptionnelle' },
    extremeLow: { title: 'Le Touriste', emoji: '📸', description: 'Ne récolte jamais' }
  },
  lootVillageois: {
    high: { title: 'Le Citoyen Modèle', emoji: '🏘️', description: 'Récolte excellente en Villageois' },
    low: { title: 'Le Villageois Paresseux', emoji: '💤', description: 'Faible récolte en Villageois' }
  },
  lootLoup: {
    high: { title: 'Le Loup Discret', emoji: '🐺', description: 'Récolte élevée en Loup (camouflage)' },
    low: { title: 'Le Loup Impatient', emoji: '😤', description: 'Faible récolte en Loup' }
  },

  // Voting behavior titles
  votingAggressive: {
    high: { title: "L'Agitateur", emoji: '📢', description: 'Voteur agressif' },
    low: { title: 'Le Sage', emoji: '🧘', description: 'Voteur passif' },
    extremeHigh: { title: 'Le Tribun', emoji: '⚖️', description: 'Toujours en action' },
    extremeLow: { title: "L'Indécis", emoji: '🤷', description: 'Vote rarement' }
  },
  votingFirst: {
    high: { title: "L'Impulsif", emoji: '🏃', description: 'Premier voteur' },
    low: { title: 'Le Stratège', emoji: '🧠', description: 'Attend avant de voter' }
  },
  votingAccuracy: {
    high: { title: 'Le Flaireur', emoji: '👃', description: 'Bon instinct de vote' },
    low: { title: "L'Aveugle", emoji: '🙈', description: 'Mauvais instinct de vote' }
  },

  // Hunter accuracy titles
  hunterAccuracy: {
    high: { title: 'Le Sniper', emoji: '🎯', description: 'Bon chasseur (tue des ennemis)' },
    low: { title: 'Le Myope', emoji: '👓', description: 'Mauvais chasseur (tue des alliés)' },
    extremeHigh: { title: "L'Exécuteur", emoji: '⚔️', description: 'Chasseur parfait' },
    extremeLow: { title: 'Le Chasseur Maudit', emoji: '💔', description: 'Tire toujours sur les mauvaises cibles' }
  },

  // Win rate titles
  winRate: {
    high: { title: 'Le Winner', emoji: '🏆', description: 'Taux de victoire élevé' },
    low: { title: 'Le Looser', emoji: '😢', description: 'Taux de victoire faible' },
    extremeHigh: { title: "L'Inarrêtable", emoji: '👑', description: 'Gagne presque toujours' },
    extremeLow: { title: 'Le Maudit', emoji: '🪦', description: 'Perd presque toujours' }
  },
  winRateVillageois: {
    high: { title: 'Super Villageois', emoji: '🦸', description: 'Excellent en camp Villageois' },
    low: { title: 'Villageois Nul', emoji: '🤡', description: 'Mauvais en camp Villageois' }
  },
  winRateLoup: {
    high: { title: 'Super Loup', emoji: '🐺', description: 'Excellent en camp Loup' },
    low: { title: 'Loup Nul', emoji: '🐩', description: 'Mauvais en camp Loup' }
  },
  winRateSolo: {
    high: { title: 'Super Solo', emoji: '🦊', description: 'Excellent en rôles Solo' },
    low: { title: 'Solo Nul', emoji: '💩', description: 'Mauvais en rôles Solo' }
  },

  // Series titles
  winSeries: {
    high: { title: 'Serial Winner', emoji: '🔥', description: 'Grosse série de victoires' }
  },
  lossSeries: {
    high: { title: 'Serial Looser', emoji: '❄️', description: 'Grosse série de défaites' }
  },

  // === UNCONTROLLABLE STATS (Role assignment luck) ===
  
  campAssignment: {
    villageois: { title: 'Serial Villageois', emoji: '🏘️', description: 'Joue souvent Villageois' },
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
    title: 'L\'Hyperactif',
    emoji: '⚡',
    description: 'Bavard ET grande récolte',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'loot', category: 'HIGH' }
    ],
    priority: 10
  },
  
  // Low talk + High loot = Efficient
  {
    id: 'efficace',
    title: 'L\'Efficace',
    emoji: '🎯',
    description: 'Silencieux mais productif',
    conditions: [
      { stat: 'talking', category: 'LOW' },
      { stat: 'loot', category: 'HIGH' }
    ],
    priority: 10
  },

  // High talk + Low loot = Philosopher
  {
    id: 'philosophe',
    title: 'Le Philosophe',
    emoji: '📚',
    description: 'Bavard mais improductif',
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
    title: 'Le Kamikaze',
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
    title: 'Le Phoenix',
    emoji: '🔥',
    description: 'Souvent ciblé tôt mais survit',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 12
  },

  // Aggressive voter + First voter = Impulsive
  {
    id: 'cowboy',
    title: 'Le Cow-Boy',
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
    title: 'Le Détective',
    emoji: '🔎',
    description: 'Observe silencieusement et vote juste',
    conditions: [
      { stat: 'votingAccuracy', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 12
  },

  // High talk + Bad voting = Demagogue
  {
    id: 'demagogue',
    title: 'Le Démagogue',
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
    title: 'L\'Infiltré',
    emoji: '🎭',
    description: 'Excellent loup discret',
    conditions: [
      { stat: 'winRateLoup', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 15
  },

  // Super Loup + High talk = Manipulator
  {
    id: 'manipulateur',
    title: 'Le Manipulateur',
    emoji: '🐍',
    description: 'Loup bavard et gagnant',
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
    title: 'Le Poissard',
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
    title: 'Le Robot',
    emoji: '🤖',
    description: 'Productif, survit, parle peu',
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
    title: 'Le Pitre',
    emoji: '🎪',
    description: 'Bavard, improductif, meurt souvent',
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
    description: 'Chasseur fréquent et précis',
    conditions: [
      { stat: 'roleChasseur', category: 'HIGH' },
      { stat: 'hunterAccuracy', category: 'HIGH' }
    ],
    priority: 15
  },

  // Serial Chasseur + Bad hunter accuracy = Clumsy Hunter
  {
    id: 'chasseur_maladroit',
    title: 'Le Chasseur Maladroit',
    emoji: '🔫',
    description: 'Chasseur fréquent mais imprécis',
    conditions: [
      { stat: 'roleChasseur', category: 'HIGH' },
      { stat: 'hunterAccuracy', category: 'LOW' }
    ],
    priority: 15
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
      
      agg.stats.talkingPer60Min = player.secondsAllPer60Min || 0;
      agg.stats.talkingOutsidePer60Min = player.secondsOutsidePer60Min || 0;
      agg.stats.talkingDuringPer60Min = player.secondsDuringPer60Min || 0;
    });
  }

  // Process voting stats
  if (votingStats?.votingBehavior) {
    votingStats.votingBehavior.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      // Calculate voting rate (votes per meeting attended)
      const totalMeetings = player.totalMeetings || 0;
      const totalVotes = player.totalVotes || 0;
      const totalSkips = player.totalSkips || 0;
      const totalAbstentions = player.totalAbstentions || 0;
      
      if (totalMeetings > 0) {
        const votingRate = (totalVotes / totalMeetings) * 100;
        const skipRate = (totalSkips / totalMeetings) * 100;
        const abstentionRate = (totalAbstentions / totalMeetings) * 100;
        
        // Aggressiveness score: high voting rate, low skip/abstention
        agg.stats.votingAggressiveness = votingRate - (skipRate * 0.5) - (abstentionRate * 0.7);
      }
    });
  }

  // Process voting accuracy
  if (votingStats?.votingAccuracy) {
    votingStats.votingAccuracy.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const totalVotes = player.totalVotes || 0;
      const votesForEnemy = player.votesForEnemyCamp || 0;
      
      if (totalVotes >= 10) {
        agg.stats.votingAccuracy = (votesForEnemy / totalVotes) * 100;
      }
    });
  }

  // Process hunter stats
  if (hunterStats) {
    Object.entries(hunterStats).forEach(([hunterId, data]) => {
      if (!aggregatedStats.has(hunterId)) return;
      const agg = aggregatedStats.get(hunterId);
      
      const gamesAsHunter = data.gamesPlayed || 0;
      const kills = data.kills || [];
      
      // Count enemy kills vs ally kills
      let enemyKills = 0;
      let allyKills = 0;
      kills.forEach(kill => {
        if (kill.victimCamp !== 'Villageois') {
          enemyKills++;
        } else {
          allyKills++;
        }
      });
      
      if (gamesAsHunter >= 3) {
        agg.stats.hunterGames = gamesAsHunter;
        agg.stats.hunterAccuracy = kills.length > 0 
          ? (enemyKills / kills.length) * 100 : null;
      }
    });
  }

  // Process death stats for survival rates
  if (deathStats?.playerDeathStats) {
    deathStats.playerDeathStats.forEach(player => {
      const playerId = player.playerId;
      if (!aggregatedStats.has(playerId)) return;
      const agg = aggregatedStats.get(playerId);
      
      const gamesPlayed = agg.gamesPlayed || 0;
      const deaths = player.totalDeaths || 0;
      
      if (gamesPlayed > 0) {
        agg.stats.survivalRate = ((gamesPlayed - deaths) / gamesPlayed) * 100;
      }
      
      // Early deaths (Day 1)
      const earlyDeaths = player.earlyDeaths || 0;
      if (gamesPlayed > 0) {
        agg.stats.survivalDay1Rate = ((gamesPlayed - earlyDeaths) / gamesPlayed) * 100;
      }
      
      // Kill rate
      const kills = player.killCount || 0;
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
      
      agg.stats.lootPer60Min = player.lootPer60Min || 0;
      agg.stats.lootVillageoisPer60Min = player.lootVillageoisPer60Min || 0;
      agg.stats.lootLoupPer60Min = player.lootLoupPer60Min || 0;
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
      primaryTitle: sortedTitles[0] || null,
      percentiles: data.percentiles,
      stats: data.stats
    };
  });

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
 * Generate combination titles based on multiple stats
 * @param {Object} percentiles - Player's percentile data
 * @returns {Array} - Array of combination title objects
 */
function generateCombinationTitles(percentiles) {
  const titles = [];

  // Map stat names used in conditions to percentile keys
  const conditionStatMap = {
    talking: 'talkingPer60Min',
    loot: 'lootPer60Min',
    killRate: 'killRate',
    survival: 'survivalRate',
    survivalDay1: 'survivalDay1Rate',
    votingAggressive: 'votingAggressiveness',
    votingFirst: 'votingFirstRate',
    votingAccuracy: 'votingAccuracy',
    hunterAccuracy: 'hunterAccuracy',
    winRate: 'winRate',
    winRateLoup: 'winRateLoup',
    winSeries: 'longestWinSeries',
    lossSeries: 'longestLossSeries',
    roleAmoureux: 'roleAmoureux',
    roleChasseur: 'roleChasseur'
  };

  COMBINATION_TITLES.forEach(combo => {
    // Check if all conditions are met
    const conditionsMet = combo.conditions.every(condition => {
      const statKey = conditionStatMap[condition.stat] || condition.stat;
      const playerData = percentiles[statKey];
      
      if (!playerData) return false;
      
      // Check if category matches
      if (condition.category === 'HIGH') {
        return playerData.category === 'HIGH' || playerData.category === 'EXTREME_HIGH';
      }
      if (condition.category === 'LOW') {
        return playerData.category === 'LOW' || playerData.category === 'EXTREME_LOW';
      }
      if (condition.category === 'EXTREME_HIGH') {
        return playerData.category === 'EXTREME_HIGH';
      }
      if (condition.category === 'EXTREME_LOW') {
        return playerData.category === 'EXTREME_LOW';
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
      // Using 15% as threshold (above average for most roles)
      if (percentage >= 15 && count >= 5) {
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
