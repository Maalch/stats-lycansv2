/**
 * Title Definitions for Player Titles System
 * 
 * This module contains all title definitions and combination titles
 * used by the title generation system.
 */

// ============================================================================
// TITLE DEFINITIONS
// ============================================================================

/**
 * Title definitions with categories and combinations
 */
export const TITLE_DEFINITIONS = {
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
    high: { title: 'Le Loup Discret', emoji: '🐺', description: 'Récolte élevée en Loup' },
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
export const COMBINATION_TITLES = [
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
    description: 'Meurt souvent tôt mais survit jusqu\'au bout après',
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

  // High wolf win rate + High solo win rate = Traître
  {
    id: 'traitre',
    title: 'Le·a Traître·sse',
    emoji: '🦹',
    description: 'Gagnant·e dans tous les camps ennemis des Villageois',
    conditions: [
      { stat: 'winRateLoup', category: 'HIGH' },
      { stat: 'winRateSolo', category: 'HIGH' }
    ],
    priority: 14
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
  },

  // High voting accuracy + Low survival = Whistleblower
  {
    id: 'lanceur_alerte',
    title: 'Le·a Lanceur·se d\'Alerte',
    emoji: '🚨',
    description: 'Vote juste mais se fait éliminer pour ça',
    conditions: [
      { stat: 'votingAccuracy', category: 'HIGH' },
      { stat: 'survival', category: 'LOW' }
    ],
    priority: 13
  },

  // High loot Loup + High win rate Loup + Low talk = Lone Wolf
  {
    id: 'loup_solitaire',
    title: 'Le Loup Solitaire',
    emoji: '🐺',
    description: 'Loup efficace, discret et gagnant',
    conditions: [
      { stat: 'lootLoup', category: 'HIGH' },
      { stat: 'winRateLoup', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 16
  },

  // Serial Solo + High win rate Solo = Anarchist
  {
    id: 'anarchiste',
    title: 'L\'Anarchiste',
    emoji: '🦊',
    description: 'Maître des rôles solitaires',
    conditions: [
      { stat: 'campSolo', category: 'HIGH' },
      { stat: 'winRateSolo', category: 'HIGH' }
    ],
    priority: 14
  },

  // High survival + Low kill rate + High win rate = Diplomat
  {
    id: 'diplomate',
    title: 'Le·a Diplomate',
    emoji: '🤝',
    description: 'Gagne en survivant sans tuer',
    conditions: [
      { stat: 'survival', category: 'HIGH' },
      { stat: 'killRate', category: 'LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 15
  },

  // High talk + High voting aggressive + Low voting accuracy = Populist
  {
    id: 'populiste',
    title: 'Le·a Populiste',
    emoji: '📢',
    description: 'Bruyant·e et actif·ve mais se trompe de cible',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'votingAggressive', category: 'HIGH' },
      { stat: 'votingAccuracy', category: 'LOW' }
    ],
    priority: 11
  },

  // Serial Chasseur + High kill rate + High survival = Vigilante
  {
    id: 'justicier',
    title: 'Le·a Justicier·ère',
    emoji: '⚔️',
    description: 'Chasseur·se qui tue souvent et survit',
    conditions: [
      { stat: 'roleChasseur', category: 'HIGH' },
      { stat: 'killRate', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 16
  },

  // Extreme low talk + High win rate = Invisible
  {
    id: 'invisible',
    title: 'L\'Invisible',
    emoji: '👁️',
    description: 'Quasi muet·te mais redoutablement efficace',
    conditions: [
      { stat: 'talking', category: 'EXTREME_LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 15
  },

  // High talk during meeting + Low voting aggressive = Theorist
  {
    id: 'theoricien',
    title: 'Le·a Théoricien·ne',
    emoji: '🎓',
    description: 'Parle beaucoup en débat mais vote peu',
    conditions: [
      { stat: 'talkingDuringMeeting', category: 'HIGH' },
      { stat: 'votingAggressive', category: 'LOW' }
    ],
    priority: 10
  },

  // Low survival Day 1 + Low survival + High win rate = Sacrifice
  {
    id: 'sacrifice',
    title: 'Le·a Sacrifice',
    emoji: '🕯️',
    description: 'Meurt rapidement mais fait gagner son camp',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW' },
      { stat: 'survival', category: 'LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 15
  },

  // Low survival Day 1 + high talking
  {
    id: 'grande_gueule',
    title: 'La Grande Gueule',
    emoji: '📢',
    description: 'Parle trop et meurt Jour 1',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW' },
      { stat: 'talking', category: 'HIGH' }
    ],
    priority: 11
  },
  {
    id: 'couard',
    title: 'Le·a Couard·e',
    emoji: '🐢',
    description: 'Survit longtemps mais perd quand même',
    conditions: [
      { stat: 'survival', category: 'HIGH' },
      { stat: 'winRate', category: 'LOW' }
    ],
    priority: 12
  },
  // High kills + Low win rate = The Reckless
  {
    id: 'tete_brulee',
    title: 'La Tête Brûlée',
    emoji: '💣',
    description: 'Tue beaucoup mais fait perdre son camp',
    conditions: [
      { stat: 'killRate', category: 'HIGH' },
      { stat: 'winRate', category: 'LOW' }
    ],
    priority: 13
  },
  // High loot Villageois + Low win rate Villageois = The Worker Bee
  {
    id: 'abeille_ouvriere',
    title: 'L\'Abeille Ouvrière',
    emoji: '🐝',
    description: 'Récolte bien en Villageois mais perd',
    conditions: [
      { stat: 'lootVillageois', category: 'HIGH' },
      { stat: 'winRateVillageois', category: 'LOW' }
    ],
    priority: 11
  },
  // High loot Loup + Low win rate Loup = The Exposed Wolf
  {
    id: 'loup_repere',
    title: 'Le Loup Repéré',
    emoji: '🔦',
    description: 'Récolte en Loup mais se fait démasquer',
    conditions: [
      { stat: 'lootLoup', category: 'HIGH' },
      { stat: 'winRateLoup', category: 'LOW' }
    ],
    priority: 11
  },
  // Extreme high loot + Extreme low talk = The Machine
  {
    id: 'machine',
    title: 'La Machine',
    emoji: '⚙️',
    description: 'Récolte énormément sans dire un mot',
    conditions: [
      { stat: 'loot', category: 'EXTREME_HIGH' },
      { stat: 'talking', category: 'EXTREME_LOW' }
    ],
    priority: 16
  },
  // High talk + High survival + Low loot = The Politician
  {
    id: 'politicien',
    title: 'Le·a Politicien·ne',
    emoji: '🎩',
    description: 'Parle beaucoup, survit, mais ne récolte pas',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' },
      { stat: 'loot', category: 'LOW' }
    ],
    priority: 14
  },
];
