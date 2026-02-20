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
    low: { title: 'Le·a Non-Violent·e', emoji: '✌️', description: 'Taux de kills faible' },
    extremeHigh: { title: "L'Exterminateur·rice", emoji: '💀', description: 'Tueur·se en série' },
    extremeLow: { title: "L'Agneau", emoji: '🐑', description: 'Ne tue jamais' }
  },

  // Survival titles
  survival: {
    high: { title: 'Le·a Survivant·e', emoji: '🛡️', description: 'Survie élevée fin de game' },
    low: { title: 'La Cible', emoji: '🎯', description: 'Meurt souvent' }
  },
  survivalDay1: {
    high: { title: 'Le·a Vigilant·e', emoji: '🏃', description: 'Survit au Jour 1' },
    low: { title: 'La Première Victime', emoji: '⚰️', description: 'Meurt souvent Jour 1' }
  },

  // Loot/Harvest titles
  loot: {
    high: { title: 'Le·a Récolteur·euse', emoji: '🧺', description: 'Récolte élevée' },
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

  // Hunter shot accuracy titles (hit vs miss from Actions data)
  hunterShotAccuracy: {
    high: { title: 'Le·a Tireur·se d\'Élite', emoji: '🔫', description: 'Touche souvent sa cible' },
    low: { title: 'Le·a Maladroit·e', emoji: '💨', description: 'Rate souvent ses tirs' },
    extremeHigh: { title: 'Œil de Faucon', emoji: '🦅', description: 'Ne rate presque jamais' },
    extremeLow: { title: 'Le·a Stormtrooper', emoji: '⚡', description: 'Rate presque tout' }
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
    high: { title: 'Le·a Chef·fe de Meute', emoji: '🐺', description: 'Excellent·e en camp Loup' },
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
  },

  // === ZONE STATS (Village map position analysis) ===

  // Per-zone affinity titles (only extremeHigh is meaningful per zone)
  zoneVillagePrincipal: {
    extremeHigh: { title: 'Le·a Citadin·e', emoji: '🏘️', description: 'Traîne beaucoup au Village Principal' }
  },
  zoneFerme: {
    extremeHigh: { title: 'Le·a Fermier·ère', emoji: '🌾', description: 'Traîne beaucoup à la Ferme' }
  },
  zoneVillagePecheur: {
    extremeHigh: { title: 'Le·a Pêcheur·euse', emoji: '🎣', description: 'Traîne beaucoup au Village Pêcheur' }
  },
  zoneRuines: {
    extremeHigh: { title: 'L\'Archéologue', emoji: '🏛️', description: 'Traîne beaucoup aux Ruines' }
  },
  zoneResteCarte: {
    extremeHigh: { title: 'Le·a Nomade', emoji: '🧭', description: 'Traîne beaucoup hors des zones principales' }
  },

  // Dominant zone concentration (meaningful in both directions)
  zoneDominantPercentage: {
    extremeHigh: { title: 'Le·a Casanier·ère', emoji: '🏠', description: 'Toujours dans la même zone' },
    high: { title: 'L\'Habitué·e', emoji: '🪑', description: 'A un coin préféré' },
    low: { title: 'Le·a Vagabond·e', emoji: '🗺️', description: 'Se déplace beaucoup entre les zones' },
    extremeLow: { title: 'L\'Explorateur·ice', emoji: '🧭', description: 'Réparti·e uniformément sur toute la carte' }
  },

  // === WOLF TRANSFORMATION STATS ===

  // Wolf transformation rate (transformations per night as wolf)
  wolfTransformRate: {
    extremeHigh: { title: 'Le Loup-Garou Frénétique', emoji: '🐺', description: 'Se transforme très souvent en loup' },
    high: { title: 'Le·a Transform·é·e', emoji: '🌙', description: 'Se transforme fréquemment' },
    low: { title: 'Le·a Loup Prudent·e', emoji: '🐕', description: 'Se transforme rarement' },
    extremeLow: { title: 'Le Loup Fantôme', emoji: '👻', description: 'Ne se transforme presque jamais' }
  },

  // Wolf untransformation rate (untransformations per night as wolf)
  wolfUntransformRate: {
    extremeHigh: { title: 'L\'Adaptable', emoji: '🦎', description: 'Se détransforme très souvent' },
    high: { title: 'Le·a Discret·ète', emoji: '🤫', description: 'Se détransforme fréquemment' },
    low: { title: 'Le Loup Assumé', emoji: '🐺', description: 'Se détransforme rarement' },
    extremeLow: { title: 'Le Loup Permanent', emoji: '🌑', description: 'Reste presque toujours en loup' }
  },

  // === POTION USAGE STATS ===

  // Potion usage rate (potions drunk per 60 minutes of gameplay)
  potionUsage: {
    extremeHigh: { title: 'L\'Alchimiste Amateur·e', emoji: '🧪', description: 'Boit énormément de potions' },
    high: { title: 'Le·a Potion Addict', emoji: '⚗️', description: 'Boit beaucoup de potions' },
    low: { title: 'Le·a Sobre', emoji: '💧', description: 'Boit peu de potions' },
    extremeLow: { title: 'L\'Abstinent·e', emoji: '🚫', description: 'Ne boit presque jamais de potions' }
  }
};

// ============================================================================
// COMBINATION TITLES
// ============================================================================

/**
 * Combination title definitions - special titles for stat combinations
 */
export const COMBINATION_TITLES = [

  // High win rate + Serial Winner = The Legend
  {
    id: 'legende',
    title: 'La Légende',
    emoji: '🏅',
    description: 'Gagne tout le temps + grosses séries',
    conditions: [
      { stat: 'winRate', category: 'EXTREME_HIGH' },
      { stat: 'winSeries', category: 'HIGH' },
      { stat: 'gamesPlayed', minValue: 100 },
    ],
    priority: 20
  },
  // High win rate + High loot + High survival = MVP
  {
    id: 'mvp',
    title: 'Le·a MVP',
    emoji: '⭐',
    description: 'Gagne, récolte, et survit',
    conditions: [
      { stat: 'winRate', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'loot', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'survival', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 19
  },
  // Serial Chasseur + High kill rate + High survival = Vigilante
  {
    id: 'justicier',
    title: 'Le·a Justicier·ère',
    emoji: '⚔️',
    description: 'Chasseur·se qui vise juste, tue souvent et survit',
    conditions: [
      { stat: 'hunterAccuracy', category: 'HIGH' },
      { stat: 'killRate', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 18
  },
  // Good camp accuracy + Good hunter accuracy = Sniper Elite
  {
    id: 'sniper_elite',
    title: 'Sniper Elite',
    emoji: '🎖️',
    description: 'Chasseur·se ultra précis·e',
    conditions: [
      { stat: 'hunterShotAccuracy', category: 'HIGH' },
      { stat: 'hunterAccuracy', category: 'HIGH' }
    ],
    priority: 18
  },
  // Balanced win rates across all camps = The Adaptable
  {
    id: 'adaptable',
    title: 'Le·a Caméléon',
    emoji: '🦎',
    description: 'Bon dans tous les camps',
    conditions: [
      { stat: 'winRateVillageois', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'winRateLoup', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'winRateSolo', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 18
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
    priority: 18
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
    priority: 18
  },
  // Extreme high talk + Low loot + Low kills = The Commentator
  {
    id: 'commentateur',
    title: 'Le·a Commentateur·rice',
    emoji: '📻',
    description: 'Ne fait que parler, ne récolte rien et tue peu',
    conditions: [
      { stat: 'talking', category: 'EXTREME_HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'loot', category: 'LOW' },
      { stat: 'killRate', category: 'LOW' }
    ],
    priority: 17
  },
  // Low survival Day 1 + High survival = Phoenix
  {
    id: 'phoenix',
    title: 'Le Phoenix',
    emoji: '🔥',
    description: 'Meurt souvent tôt mais survit jusqu\'au bout après',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW', minCategory: 'BELOW_AVERAGE' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 17
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
    priority: 17
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
      { stat: 'survival', category: 'LOW', minCategory: 'BELOW_AVERAGE' }
    ],
    priority: 17
  },

  // High talk during meeting + Good voting + Aggressive = Master of Ceremony
  {
    id: 'maitre_ceremonie',
    title: 'Le·a Maître·sse de Cérémonie',
    emoji: '🎙️',
    description: 'Mène les débats et vote juste',
    conditions: [
      { stat: 'talkingDuringMeeting', category: 'HIGH' },
      { stat: 'votingAccuracy', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' },
      { stat: 'votingAggressive', category: 'HIGH', minCategory: 'ABOVE_AVERAGE' }
    ],
    priority: 16
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
    priority: 16
  },

  // High survival + Low kill rate + High win rate = Diplomat
  {
    id: 'diplomate',
    title: 'Le·a Diplomate',
    emoji: '🤝',
    description: 'Gagne en survivant sans tuer',
    conditions: [
      { stat: 'survival', category: 'HIGH' },
      { stat: 'killRate', category: 'LOW', minCategory: 'BELOW_AVERAGE'  },
      { stat: 'winRate', category: 'HIGH' }
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
    priority: 16
  },

  // High survival + High win rate loup = The Alpha Wolf
  {
    id: 'loup_alpha',
    title: 'Le Loup Alpha',
    emoji: '🐺',
    description: 'Survit et domine en Loup',
    conditions: [
      { stat: 'survival', category: 'HIGH' },
      { stat: 'winRateLoup', category: 'HIGH' },
      { stat: 'killRateLoup', category: 'HIGH' }
    ],
    priority: 15
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
    priority: 15
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
  //High transform rate + High untransform rate = Hyperactive Wolf
  {
    id: 'loup_hyperactif',
    title: 'Le Loup Hyperactif',
    emoji: '⚡',
    description: 'Se transforme et détransforme constamment',
    conditions: [
      { stat: 'wolfTransformRate', category: 'HIGH' },
      { stat: 'wolfUntransformRate', category: 'HIGH' }
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

  // Low kill rate + Low wolf kill rate + Low transform rate + High wolf win rate = The Pacifist
  {
    id: 'pacifiste',
    title: 'Le·a Pacifiste',
    emoji: '🕊️',
    description: 'Gagne sans tuer',
    conditions: [
      { stat: 'killRateLoup', category: 'LOW' },
      { stat: 'wolfTransformRate', category: 'LOW' },
      { stat: 'winRateLoup', category: 'HIGH' }
    ],
    priority: 14
  },

  // Bad camp accuracy + Good shoot accuracy = Clumsy Hunter
  {
    id: 'chasseur_maladroit',
    title: 'Le·a Chasseur·se Maladroit·e',
    emoji: '🔫',
    description: 'Chasseur·se précis qui touche les mauvaises cibles',
    conditions: [
      { stat: 'hunterShotAccuracy', category: 'HIGH' },
      { stat: 'hunterAccuracy', category: 'LOW' }
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
    priority: 14
  },

  // Low loot + High kill rate = The Assassin
  {
    id: 'assassin',
    title: 'L\'Assassin',
    emoji: '🗡️',
    description: 'Ignore la récolte, se concentre sur les kills',
    conditions: [
      { stat: 'loot', category: 'LOW' },
      { stat: 'killRate', category: 'HIGH' }
    ],
    priority: 14
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
  // Casanier (high dominant%) + Low Loot = The Camper
  {
    id: 'campeur',
    title: 'Le·a Campeur·euse',
    emoji: '🏕️',
    description: 'Reste au même endroit sans récolter',
    conditions: [
      { stat: 'zoneDominantPercentage', category: 'EXTREME_HIGH' },
      { stat: 'loot', category: 'LOW' }
    ],
    priority: 14
  },
  // Low transform rate + High survival + High win rate Loup = Disguised Wolf
  {
    id: 'loup_deguise',
    title: 'Le·a Loup·ve Déguisé·e',
    emoji: '🦊',
    description: 'Reste humain, survit et gagne en Loup',
    conditions: [
      { stat: 'wolfTransformRate', category: 'LOW' },
      { stat: 'survival', category: 'HIGH' },
      { stat: 'winRateLoup', category: 'HIGH' }
    ],
    priority: 14
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
    priority: 13
  },
  // Ruines + High Kill Rate = The Ambusher
  {
    id: 'embusquer',
    title: 'L\'Embusqué·e',
    emoji: '🏹',
    description: 'Tend des pièges dans les Ruines',
    conditions: [
      { stat: 'zoneRuines', category: 'HIGH' },
      { stat: 'killRate', category: 'HIGH' }
    ],
    priority: 13
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

  // The Alchemist - High potion usage + High survival
  {
    id: 'apothicaire',
    title: 'L\'Apothicaire',
    emoji: '⚗️',
    description: 'Boit beaucoup de potions et survit grâce à elles',
    conditions: [
      { stat: 'potionUsage', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 13
  },

  // Low survival Day 1 + Low survival + High win rate = Sacrifice
  {
    id: 'sacrifice',
    title: 'Le·a Sacrifié·e',
    emoji: '🕯️',
    description: 'Meurt rapidement mais fait gagner son camp',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW' },
      { stat: 'survival', category: 'LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 13
  },

  // High voting accuracy + Low survival + Low meeting survival as Villageois = Whistleblower
  {
    id: 'lanceur_alerte',
    title: 'Le·a Lanceur·se d\'Alerte',
    emoji: '🚨',
    description: 'Vote juste mais se fait éliminer pour ça',
    conditions: [
      { stat: 'votingAccuracy', category: 'HIGH' },
      { stat: 'survival', category: 'LOW' },
      { stat: 'survivalAtMeetingVillageois', category: 'LOW' }
    ],
    priority: 13
  },
  // Explorer + high win rate = The Adventurer
  {
    id: 'aventurier',
    title: 'L\'Aventurier·ère',
    emoji: '🗺️',
    description: 'Explore toute la carte et gagne',
    conditions: [
      { stat: 'zoneDominantPercentage', category: 'LOW' },
      { stat: 'winRate', category: 'HIGH' }
    ],
    priority: 12

  },

  // Ruines + Low Talking = The Hermit
  {
    id: 'ermite',
    title: 'L\'Ermite',
    emoji: '🧙',
    description: 'Silencieux·se, reclus·e dans les Ruines',
    conditions: [
      { stat: 'zoneRuines', category: 'HIGH' },
      { stat: 'talking', category: 'LOW' }
    ],
    priority: 12
  },
  // Village Pêcheur + High Survival = The Harbor Master
  {
    id: 'capitaine_port',
    title: 'Le·a Capitaine du Port',
    emoji: '⚓',
    description: 'Survit au bord de l\'eau',
    conditions: [
      { stat: 'zoneVillagePecheur', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 12
  },

  // Explorer + High Loot = The Gatherer
  {
    id: 'cueilleur',
    title: 'Le·a Cueilleur·se',
    emoji: '🧺',
    description: 'Récolte en parcourant toute la carte',
    conditions: [
      { stat: 'zoneDominantPercentage', category: 'LOW' },
      { stat: 'loot', category: 'HIGH' }
    ],
    priority: 12
  },
  // High transform rate + Low untransform rate + High win rate Loup = Aggressive Alpha
  {
    id: 'chasseur_nocturne',
    title: 'Le·a Chasseur·se Nocturne',
    emoji: '🌙',
    description: 'Se transforme, reste loup, et domine',
    conditions: [
      { stat: 'wolfTransformRate', category: 'HIGH' },
      { stat: 'wolfUntransformRate', category: 'LOW' },
      { stat: 'winRateLoup', category: 'HIGH' }
    ],
    priority: 14
  },
  // The Witch - High potion usage + High talking (brews potions and talks about them)
  {
    id: 'sorciere',
    title: 'Le·a Sorcièr·e',
    emoji: '🧙',
    description: 'Prépare des potions tout en racontant ses recettes',
    conditions: [
      { stat: 'potionUsage', category: 'HIGH' },
      { stat: 'talking', category: 'HIGH' }
    ],
    priority: 12
  },


  // High kills + Low survival (but different focus) = Berserker
  {
    id: 'berserker',
    title: 'Le·a Berserker',
    emoji: '⚔️',
    description: 'Tue beaucoup mais meurt souvent',
    conditions: [
      { stat: 'killRate', category: 'HIGH' },
      { stat: 'survival', category: 'LOW' }
    ],
    priority: 12
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
  // Low win rate + Loss series + Low survival + Medium games = The Unlucky
  {
    id: 'malchanceux',
    title: 'Le·a Malchanceux·se',
    emoji: '🌧️',
    description: 'Perd tout le temps + grosses séries de défaites',
    conditions: [
      { stat: 'winRate', category: 'LOW' },
      { stat: 'lossSeries', category: 'HIGH' },
      { stat: 'survival', category: 'LOW' },
      { stat: 'gamesPlayed', minValue: 50 },
    ],
    priority: 12
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
    priority: 12
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
    priority: 12
  },
    // The Pharmacy - High potion usage + Low loot (focuses on potions, not harvest)
  {
    id: 'pharmacien',
    title: 'Le·a Pharmacien·ne',
    emoji: '💊',
    description: 'Ignore la récolte pour se concentrer sur les potions',
    conditions: [
      { stat: 'potionUsage', category: 'HIGH' },
      { stat: 'loot', category: 'LOW' }
    ],
    priority: 12
  },
  // Survives outside main zones = The Prowler
  {
    id: 'rodeur',
    title: 'Le·a Rôdeur·euse',
    emoji: '🌙',
    description: 'Rôde hors des villages et survit',
    conditions: [
      { stat: 'zoneResteCarte', category: 'HIGH' },
      { stat: 'survival', category: 'HIGH' }
    ],
    priority: 12
  },
  // Stays at farm + high loot = The Harvester
  {
    id: 'moissonneur',
    title: 'Le·a Moissonneur·euse',
    emoji: '🌾',
    description: 'Récolte à la Ferme sans relâche',
    conditions: [
      { stat: 'zoneFerme', category: 'HIGH' },
      { stat: 'loot', category: 'HIGH' }
    ],
    priority: 11
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
      { stat: 'loot', category: 'LOW' },
      { stat: 'gamesPlayed', category: 'LOW' }
    ],
    priority: 11
  },
  //The Experimenter - High potion usage + Low win rate (potions don't help them win)
  {
    id: 'experimentateur',
    title: 'L\'Experimentateur',
    emoji: '🧪',
    description: 'Boit des potions mais ça ne l\'aide pas à gagner',
    conditions: [
      { stat: 'potionUsage', category: 'HIGH' },
      { stat: 'winRate', category: 'LOW' }
    ],
    priority: 11
  },

  // Low survival Day 1 + high talking
  {
    id: 'grande_gueule',
    title: 'La Grande Gueule',
    emoji: '🗯️',
    description: 'Parle trop et meurt Jour 1',
    conditions: [
      { stat: 'survivalDay1', category: 'LOW' },
      { stat: 'talking', category: 'HIGH' }
    ],
    priority: 11
  },
  {
    id: 'peureux',
    title: 'Le·a Peureux·se',
    emoji: '🐢',
    description: 'Survit longtemps mais perd quand même',
    conditions: [
      { stat: 'survival', category: 'HIGH' },
      { stat: 'winRate', category: 'LOW' }
    ],
    priority: 11
  },

  // High loot Villageois + Low win rate Villageois = The Worker
  {
    id: 'travailleur',
    title: 'Le·a Travailleur·se',
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

  // High participation + specialist camps = Taulier
  {
    id: 'taulier',
    title: 'Le·a Taulier·e',
    emoji: '🔑',
    description: 'Participe beaucoup et excelle dans un camp',
    conditions: [
      { stat: 'gamesPlayed', category: 'HIGH' },
      { stat: 'campBalance', category: 'SPECIALIST' }
    ],
    priority: 11
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
    priority: 11
  },

  // Poor performance across all camps = The Apprentice
  {
    id: 'apprenti',
    title: 'L\'Apprenti',
    emoji: '🔧',
    description: 'Peine dans tous les camps',
    conditions: [
      { stat: 'winRateVillageois', category: 'LOW' },
      { stat: 'winRateLoup', category: 'LOW' },
      { stat: 'winRateSolo', category: 'LOW' }
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

  // High talk + Bad voting = Sweet Talker
  {
    id: 'baratineur',
    title: 'Le·a Baratineur·se',
    emoji: '📣',
    description: 'Parle beaucoup mais vote mal',
    conditions: [
      { stat: 'talking', category: 'HIGH' },
      { stat: 'votingAccuracy', category: 'LOW' }
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
      { stat: 'gamesPlayed', category: 'HIGH' },
      { stat: 'campBalance', category: 'BALANCED' }
    ],
    priority: 10
  },


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
  
  // Low talk + High loot = Efficient
  {
    id: 'efficace',
    title: 'L\'Efficace',
    emoji: '🏭',
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

];
