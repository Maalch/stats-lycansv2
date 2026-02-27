/**
 * Achievement Definitions for the Lycans game statistics system
 * 
 * Unlike Rankings (comparative) and Titles (percentile-based), achievements are
 * permanent unlockable rewards triggered by absolute thresholds.
 * 
 * ## Tier System (Paliers)
 * 
 * Each tier can have up to 3 sub-levels. Not all achievements need all tiers/sub-levels.
 * 
 * | Tier    | Color  | Max Sub-levels | Difficulty    |
 * |---------|--------|----------------|---------------|
 * | bronze  | 🥉     | 3              | Débutant      |
 * | argent  | 🥈     | 3              | Intermédiaire |
 * | or      | 🥇     | 3              | Difficile     |
 * | lycans  | 🐺     | 1              | Expert        |
 * 
 * Example - Victories Villageois:
 *   Bronze: 1, 5, 10  |  Argent: 30, 50, 70  |  Or: 100, 130, 160  |  Lycans: 200
 * 
 * Each achievement has:
 * - id: unique string identifier
 * - name: French display name
 * - description: French flavor text
 * - explanation: French description of condition
 * - emoji: display emoji
 * - category: grouping category
 * - evaluator: key in EVALUATORS map (compute-achievements.js)
 * - evaluatorParams: extra config for the evaluator
 * - levels: array of { tier, subLevel, threshold }
 */

/**
 * Achievement tier definitions
 */
export const ACHIEVEMENT_TIERS = {
  bronze: { label: 'Bronze', emoji: '🥉', color: '#CD7F32', order: 1, maxSubLevels: 3 },
  argent: { label: 'Argent', emoji: '🥈', color: '#C0C0C0', order: 2, maxSubLevels: 3 },
  or:     { label: 'Or',     emoji: '🥇', color: '#FFD700', order: 3, maxSubLevels: 3 },
  lycans: { label: 'Lycans', emoji: '🐺', color: '#8B0000', order: 4, maxSubLevels: 1 },
};

/**
 * Achievement categories
 */
export const ACHIEVEMENT_CATEGORIES = {
  victories: { label: 'Victoires', emoji: '🏆', order: 1 },
  deaths: { label: 'Morts', emoji: '💀', order: 2 },
  kills: { label: 'Kills', emoji: '🔪', order: 3 },
  roles: { label: 'Rôles', emoji: '🎭', order: 4 },
  social: { label: 'Social', emoji: '💬', order: 5 },
  maps: { label: 'Cartes', emoji: '🗺️', order: 6 },
  special: { label: 'Spécial', emoji: '✨', order: 7 },
};

/**
 * Main achievement definitions array
 */
export const ACHIEVEMENT_DEFINITIONS = [

  // ============================================================================
  // VICTORIES
  // ============================================================================
  {
    id: 'victories-villageois',
    name: 'Héros du Village',
    description: 'La justice finit toujours par triompher',
    explanation: 'Gagner X victoires en camp Villageois',
    emoji: '🏘️',
    category: 'victories',
    evaluator: 'campWins',
    evaluatorParams: { camp: 'Villageois' },
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 30 - 50 - 70
      { tier: 'argent', subLevel: 1, threshold: 30 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 70 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'victories-loup',
    name: 'Terreur Nocturne',
    description: 'La nuit vous appartient',
    explanation: 'Gagner X victoires en camp Loup',
    emoji: '🐺',
    category: 'victories',
    evaluator: 'campWins',
    evaluatorParams: { camp: 'Loup' },
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 30 - 50 - 70
      { tier: 'argent', subLevel: 1, threshold: 30 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 70 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'victories-solo',
    name: 'Solo Winner',
    description: 'Vous n\'avez pas besoin d\'alliés pour gagner...',
    explanation: 'Gagner X victoires en camp solo (Amoureux, Idiot du Village, Agent, etc.)',
    emoji: '🎯',
    category: 'victories',
    evaluator: 'soloWins',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'defeats-solo',
    name: 'Solo Looser',
    description: 'En vrai, les alliés, c\'est sympa quand même...',
    explanation: 'Perdre X parties en camp solo (Amoureux, Idiot du Village, Agent, etc.)',
    emoji: '🎭',
    category: 'victories',
    evaluator: 'soloLosses',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'defeats-villageois',
    name: 'L\'important, c\'est de participer (Villageois)',
    description: 'Vous avez perdu mais au moins, vous avez tenté',
    explanation: 'Perdre X parties en camp Villageois',
    emoji: '😅',
    category: 'victories',
    evaluator: 'campLosses',
    evaluatorParams: { camp: 'Villageois' },
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 30 - 50 - 70
      { tier: 'argent', subLevel: 1, threshold: 30 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 70 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'defeats-loup',
    name: 'L\'important, c\'est de participer (Loup)',
    description: 'Même les loups ont des mauvais jours',
    explanation: 'Perdre X parties en camp Loup',
    emoji: '🐾',
    category: 'victories',
    evaluator: 'campLosses',
    evaluatorParams: { camp: 'Loup' },
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 30 - 50 - 70
      { tier: 'argent', subLevel: 1, threshold: 30 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 70 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'vegan-wolf',
    name: 'Je suis Vegan',
    description: 'Vous avez eu la victoire sans rien faire, bravo',
    explanation: 'Gagner X parties en Loup sans tuer',
    emoji: '🥬',
    category: 'victories',
    evaluator: 'wolfWinNoKills',
    evaluatorParams: {},
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 15
      { tier: 'lycans', subLevel: 1, threshold: 15 },
    ],
  },
  {
    id: 'wolf-loss-harvest-no-kills',
    name: 'Le loup trop gentil',
    description: 'Vous ne vouliez vraiment blesser personne...',
    explanation: 'Perdre X parties à la récolte en Loup sans avoir tué personne',
    emoji: '🌾',
    category: 'victories',
    evaluator: 'wolfLossHarvestNoKills',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'last-wolf',
    name: 'Le dernier loup',
    description: 'Vous n\'avez besoin de personne pour gagner… Vous seul survivez.',
    explanation: 'Gagner X parties en étant l\'unique survivant et donc le dernier Loup',
    emoji: '🏘️',
    category: 'victories',
    evaluator: 'lastWolfStanding',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'map-master',
    name: 'Map Master',
    description: 'Vous connaissez chaque recoin de chaque carte',
    explanation: 'Avoir au moins une victoire sur chaque map disponible',
    emoji: '🗺️',
    category: 'maps',
    evaluator: 'winOnAllMaps',
    evaluatorParams: {},
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 3
      { tier: 'argent', subLevel: 1, threshold: 3 },
      // Or: 5
      { tier: 'or', subLevel: 1, threshold: 5 },
      // Lycans: 10
      { tier: 'lycans', subLevel: 1, threshold: 10 },
    ],
  },
  {
    id: 'map-farmer',
    name: 'Map Farmer',
    description: 'C\'est bon, vous connaissez les maps',
    explanation: 'Avoir X victoires sur chaque map',
    emoji: '🌽',
    category: 'maps',
    evaluator: 'winsOnAllMaps',
    evaluatorParams: {},
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 2
      { tier: 'argent', subLevel: 1, threshold: 2 },
      // Or: 3
      { tier: 'or', subLevel: 1, threshold: 3 },
      // Lycans: 5
      { tier: 'lycans', subLevel: 1, threshold: 5 },
    ],
  },
  {
    id: 'wolf-sabotages',
    name: 'Sabotez-les tous !',
    description: 'Puits, chaudron, portails, bûches... Vous les connaissez tous',
    explanation: 'Faire X Sabotages en étant Loup',
    emoji: '🛠️',
    category: 'maps',
    evaluator: 'wolfSabotages',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 15
      { tier: 'argent', subLevel: 1, threshold: 15 },
      // Or: 30
      { tier: 'or', subLevel: 1, threshold: 30 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
    ],
  },

  // ============================================================================
  // DEATHS
  // ============================================================================
  {
    id: 'fall-death',
    name: 'Saut raté',
    description: 'Bien que la touche saut n\'existe pas, certains ont quand même chuté',
    explanation: 'Mourir X fois de chute',
    emoji: '🪂',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'FALL' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 2
      { tier: 'argent', subLevel: 1, threshold: 2 },
      // Or: 3
      { tier: 'or', subLevel: 1, threshold: 3 },
      // Lycans: 5
      { tier: 'lycans', subLevel: 1, threshold: 5 },
    ],
  },
  {
    id: 'starvation',
    name: 'Famine Fatale',
    description: 'Manger, c\'est surfait',
    explanation: 'Mourir X fois de faim',
    emoji: '🍽️',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'STARVATION' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 3
      { tier: 'argent', subLevel: 1, threshold: 3 },
      // Or: 5
      { tier: 'or', subLevel: 1, threshold: 5 },
      // Lycans: 10
      { tier: 'lycans', subLevel: 1, threshold: 10 },
    ],
  },
  {
    id: 'romeo-juliette',
    name: 'Roméo & Juliette',
    description: 'Vous ne pouviez pas survivre sans votre moitié',
    explanation: 'Mourir X fois à cause de la mort de son amoureux',
    emoji: '💔',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'LOVER_DEATH' },
    levels: [
      // Bronze: 10
      { tier: 'bronze', subLevel: 1, threshold: 10 },
      // Argent: 20
      { tier: 'argent', subLevel: 1, threshold: 20 },
      // Or: 30
      { tier: 'or', subLevel: 1, threshold: 30 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
    ],
  },
  {
    id: 'death-turn1',
    name: 'Bon, je reviens !',
    description: 'Vous êtes mort·e certes mais vous avez au moins eu le temps d\'aller faire un truc',
    explanation: 'Mourir X fois la première nuit',
    emoji: '⏱️',
    category: 'deaths',
    evaluator: 'deathOnTiming',
    evaluatorParams: { timing: 'N1' },
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 30 - 50 - 70
      { tier: 'argent', subLevel: 1, threshold: 30 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 70 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'voted-as-villager',
    name: 'Coupable par défaut',
    description: 'Vous avez beau crier que vous êtes gentil, personne ne vous croit...',
    explanation: 'Être X fois éjecté d\'un meeting en étant Villageois',
    emoji: '🗳️',
    category: 'deaths',
    evaluator: 'votedAsCamp',
    evaluatorParams: { camp: 'Villageois' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 15
      { tier: 'lycans', subLevel: 1, threshold: 15 },
    ],
  },
  {
    id: 'wolf-killed-by-beast',
    name: 'C\'est Bête',
    description: 'Un loup tué par La Bête... L\'ironie du sort',
    explanation: 'Mourir X fois en Loup par La Bête',
    emoji: '🦁',
    category: 'deaths',
    evaluator: 'roleDeathByType',
    evaluatorParams: { roleCamp: 'Loup', deathType: 'BY_BEAST' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 15
      { tier: 'lycans', subLevel: 1, threshold: 15 },
    ],
  },
  {
    id: 'wolf-killed-by-amoureux-loup',
    name: 'C\'est l\'Amour',
    description: 'Un loup tué par un autre loup... C\'est le ponpon',
    explanation: 'Mourir X fois en Loup par un Amoureux Loup',
    emoji: '💔',
    category: 'deaths',
    evaluator: 'wolfKilledByAmoureuxLoup',
    evaluatorParams: {},
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 15
      { tier: 'lycans', subLevel: 1, threshold: 15 },
    ],
  },
  {
    id: 'exploded',
    name: 'C\'est moi la bombe !',
    description: 'Ce n\'est pas la taille qui compte, c\'est l\'explosion',
    explanation: 'Mourir X fois d\'une explosion',
    emoji: '💣',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'BOMB' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 2
      { tier: 'argent', subLevel: 1, threshold: 2 },
      // Or: 3
      { tier: 'or', subLevel: 1, threshold: 3 },
      // Lycans: 5
      { tier: 'lycans', subLevel: 1, threshold: 5 },
    ],
  },
  {
    id: 'crushed',
    name: 'Au ras des pâquerettes',
    description: 'Difficile quand on est petit d\'éviter les pas des géants',
    explanation: 'Mourir X fois écrasé',
    emoji: '🪨',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'CRUSHED' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 15
      { tier: 'lycans', subLevel: 1, threshold: 15 },
    ],
  },
  {
    id: 'avenger-death',
    name: 'Porte-Malheur',
    description: 'Votre tueur a été victime de votre malédiction',
    explanation: 'Avoir X fois son tueur qui meurt le même jour',
    emoji: '⚖️',
    category: 'deaths',
    evaluator: 'killerDiedSameDay',
    evaluatorParams: {},
    levels: [
      // Bronze: 10
      { tier: 'bronze', subLevel: 1, threshold: 10 },
      // Argent: 20
      { tier: 'argent', subLevel: 1, threshold: 20 },
      // Or: 30
      { tier: 'or', subLevel: 1, threshold: 30 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
    ],
  },
  {
    id: 'deaths-all-zones',
    name: 'Sans Cimetière Fixe',
    description: 'On ne sait plus où mettre votre corps...',
    explanation: 'Mourir X fois dans chacune des 5 zones de la carte Village',
    emoji: '🪦',
    category: 'deaths',
    evaluator: 'deathsInAllZones',
    evaluatorParams: {},
    levels: [
      // Bronze: 3
      { tier: 'bronze', subLevel: 1, threshold: 3 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 20
      { tier: 'lycans', subLevel: 1, threshold: 20 },
    ],
  },
  {
    id: 'idiot-killed-by-hunter',
    name: 'Tir orienté',
    description: 'Vous savez vous mettre au bon endroit...',
    explanation: 'Mourir X fois par un tir du Chasseur en étant Idiot du Village',
    emoji: '🤡',
    category: 'deaths',
    evaluator: 'idiotKilledByHunter',
    evaluatorParams: {},
    levels: [
      // Bronze: 3
      { tier: 'bronze', subLevel: 1, threshold: 3 },
      // Argent: 5
      { tier: 'argent', subLevel: 1, threshold: 5 },
      // Or: 10
      { tier: 'or', subLevel: 1, threshold: 10 },
      // Lycans: 20
      { tier: 'lycans', subLevel: 1, threshold: 20 },
    ],
  },

  // ============================================================================
  // KILLS
  // ============================================================================
  {
    id: 'ponce-fesses',
    name: 'Ponce fesses',
    description: 'Comme un certain streameur, tu ponces des culs',
    explanation: 'Faire X kills en Loup',
    emoji: '🍑',
    category: 'kills',
    evaluator: 'wolfKills',
    evaluatorParams: {},
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 30 - 50 - 70
      { tier: 'argent', subLevel: 1, threshold: 30 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 70 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'hunter-kill-enemy',
    name: 'Justice du Chasseur',
    description: 'Votre balle a trouvé sa cible... La bonne cette fois',
    explanation: 'Tuer X fois un joueur ennemi en étant Chasseur',
    emoji: '🎯',
    category: 'kills',
    evaluator: 'hunterKillsEnemy',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'hunter-kill-villager',
    name: 'Tir ami',
    description: 'Vous avez tué quelqu\'un et c\'était pas un loup...',
    explanation: 'Tuer X fois un Villageois en étant Chasseur',
    emoji: '😬',
    category: 'kills',
    evaluator: 'hunterKillsAlly',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'hunter-double-kill',
    name: 'Farmeur de loups',
    description: 'Un loup c\'est bien, deux loups c\'est mieux',
    explanation: 'Tuer X fois deux Loups dans une même game en étant Chasseur',
    emoji: '🏹',
    category: 'kills',
    evaluator: 'hunterMultiKillsInGame',
    evaluatorParams: { minKills: 2 },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 3
      { tier: 'argent', subLevel: 1, threshold: 3 },
      // Or: 5
      { tier: 'or', subLevel: 1, threshold: 5 },
      // Lycans: 10
      { tier: 'lycans', subLevel: 1, threshold: 10 },
    ],
  },
  {
    id: 'hunter-triple-kill',
    name: 'Maître des loups',
    description: 'Un, deux, trois... Aucun loup ne vous arrête',
    explanation: 'Tuer X fois trois Loups dans une même game en étant Chasseur',
    emoji: '👑',
    category: 'kills',
    evaluator: 'hunterMultiKillsInGame',
    evaluatorParams: { minKills: 3 },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 2
      { tier: 'argent', subLevel: 1, threshold: 2 },
      // Or: 3
      { tier: 'or', subLevel: 1, threshold: 3 },
      // Lycans: 5
      { tier: 'lycans', subLevel: 1, threshold: 5 },
    ],
  },
  {
    id: 'hunter-killed-by-wolf',
    name: 'Le Loup, c\'est Khalen',
    description: 'Un loup vous a tué alors que vous êtes chasseur... Il évite les balles ?',
    explanation: 'Mourir X fois en Chasseur par un Loup',
    emoji: '🐺',
    category: 'kills',
    evaluator: 'hunterKilledByWolf',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'assassin-potion-kill-enemy',
    name: 'Cocktail Mortel',
    description: 'La chimie au service de la justice...',
    explanation: 'Tuer X fois un joueur ennemi avec une potion assassin',
    emoji: '🧪',
    category: 'kills',
    evaluator: 'assassinPotionKills',
    evaluatorParams: { targetCamp: 'enemy' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 3
      { tier: 'argent', subLevel: 1, threshold: 3 },
      // Or: 5
      { tier: 'or', subLevel: 1, threshold: 5 },
      // Lycans: 10
      { tier: 'lycans', subLevel: 1, threshold: 10 },
    ],
  },
  {
    id: 'assassin-potion-kill-ally',
    name: 'Oups, mauvaise pioche',
    description: 'C\'est pas votre faute, c\'est la potion qui vous a tenté',
    explanation: 'Tuer X fois un joueur allié avec une potion assassin',
    emoji: '☠️',
    category: 'kills',
    evaluator: 'assassinPotionKills',
    evaluatorParams: { targetCamp: 'ally' },
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 3
      { tier: 'argent', subLevel: 1, threshold: 3 },
      // Or: 5
      { tier: 'or', subLevel: 1, threshold: 5 },
      // Lycans: 10
      { tier: 'lycans', subLevel: 1, threshold: 10 },
    ],
  },
  {
    id: 'victim-of-love',
    name: 'Victime de l\'Amour',
    description: 'Pour que l\'Amour existe, vous avez dû périr',
    explanation: 'Mourir X fois par un Amoureux Loup',
    emoji: '💘',
    category: 'kills',
    evaluator: 'killedByLoverWolf',
    evaluatorParams: {},
    levels: [
      // Bronze: 10
      { tier: 'bronze', subLevel: 1, threshold: 10 },
      // Argent: 20
      { tier: 'argent', subLevel: 1, threshold: 20 },
      // Or: 30
      { tier: 'or', subLevel: 1, threshold: 30 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
    ],
  },
  {
    id: 'same-color-kills',
    name: 'C\'est MA couleur !',
    description: 'Vous voulez être le·a seul·e à la mode, ça se comprend...',
    explanation: 'Tuer X fois une personne qui porte la même couleur que vous',
    emoji: '🎨',
    category: 'kills',
    evaluator: 'sameColorKills',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },

  // ============================================================================
  // ROLES
  // ============================================================================
  {
    id: 'agent-117',
    name: '117',
    description: 'Bravo, vous avez tout de suite été capté',
    explanation: 'Mourir X fois aux votes en étant Agent',
    emoji: '🕵️',
    category: 'roles',
    evaluator: 'agentVoted',
    evaluatorParams: {},
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 3
      { tier: 'argent', subLevel: 1, threshold: 3 },
      // Or: 5
      { tier: 'or', subLevel: 1, threshold: 5 },
      // Lycans: 10
      { tier: 'lycans', subLevel: 1, threshold: 10 },
    ],
  },
  {
    id: 'louveteau-orphan',
    name: 'Le Louveteau Orphelin',
    description: 'Vous étiez trop jeune pour mourir',
    explanation: 'Gagner X fois en Louveteau après la mort des autres Loups',
    emoji: '🐶',
    category: 'roles',
    evaluator: 'louveteauOrphanWin',
    evaluatorParams: {},
    levels: [
      // Bronze: 1
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 2
      { tier: 'argent', subLevel: 1, threshold: 2 },
      // Or: 3
      { tier: 'or', subLevel: 1, threshold: 3 },
      // Lycans: 5
      { tier: 'lycans', subLevel: 1, threshold: 5 },
    ],
  },
  {
    id: 'solo-master',
    name: 'Je maîtrise le solo',
    description: 'Vous savez comment gagner avec chaque rôle',
    explanation: 'Avoir X victoires avec chaque rôle solo',
    emoji: '👑',
    category: 'roles',
    evaluator: 'winWithAllSoloRoles',
    evaluatorParams: {},
    levels: [
      // Bronze: 1 win with each solo role
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      // Argent: 2 wins with each
      { tier: 'argent', subLevel: 1, threshold: 2 },
      // Or: 3 wins with each
      { tier: 'or', subLevel: 1, threshold: 3 },
      // Lycans: 5 wins with each
      { tier: 'lycans', subLevel: 1, threshold: 5 },
    ],
  },

  // ============================================================================
  // SOCIAL (voting/meetings)
  // ============================================================================
  {
    id: 'bavard',
    name: 'M. / Mme Bavard',
    description: 'Vous avez beaucoup de choses à dire visiblement',
    explanation: 'Avoir X fois parlé au moins 50 % du temps sur une partie',
    emoji: '🗣️',
    category: 'social',
    evaluator: 'talkingPercentage',
    evaluatorParams: { minPercentage: 50 },
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'misunderstood',
    name: 'L\'Incompris',
    description: 'Vous l\'aviez dit pourtant que vous étiez innocent...',
    explanation: 'Voter X fois pour un Loup/rôle solo mais se faire voter à la place en étant Villageois',
    emoji: '🤷',
    category: 'social',
    evaluator: 'correctVoteButVoted',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'false-guilty',
    name: 'Faux Coupable',
    description: 'Dommage, vous n\'étiez pas l\'idiot du village...',
    explanation: 'Être X fois voté à l\'unanimité en tant que Villageois',
    emoji: '😤',
    category: 'social',
    evaluator: 'unanimousVoteAsVillager',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'only-passer',
    name: 'Au cas où, je passe',
    description: 'Vous vous méfiez de la fourberie des loups',
    explanation: 'Être X fois le seul joueur à passer dans un meeting',
    emoji: '🙈',
    category: 'social',
    evaluator: 'onlyPasserInMeeting',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'kill-surprise',
    name: 'Kill surprise',
    description: 'Allez, au dernier moment, ça passe !',
    explanation: 'Être X fois le seul joueur à voter dans un meeting',
    emoji: '😱',
    category: 'social',
    evaluator: 'soleVoterElimination',
    evaluatorParams: {},
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },
  {
    id: 'democrat',
    name: 'Troisième oeil',
    description: 'Vous connaissiez tous les rôles à l\'avance',
    explanation: 'Faire X parties en votant que des Loups ou des solos (minimum 3 votes)',
    emoji: '🏛️',
    category: 'social',
    evaluator: 'consecutiveCorrectVotes',
    evaluatorParams: { minConsecutive: 3 },
    levels: [
      // Bronze: 5
      { tier: 'bronze', subLevel: 1, threshold: 5 },
      // Argent: 10
      { tier: 'argent', subLevel: 1, threshold: 10 },
      // Or: 15
      { tier: 'or', subLevel: 1, threshold: 15 },
      // Lycans: 30
      { tier: 'lycans', subLevel: 1, threshold: 30 },
    ],
  },

  // ============================================================================
  // SPECIAL
  // ============================================================================
  {
    id: 'colors-of-lycans',
    name: 'United Colors of Lycans',
    description: 'L\'arc-en-ciel des victoires',
    explanation: 'Avoir gagné une partie avec au moins X couleurs différentes',
    emoji: '🌈',
    category: 'special',
    evaluator: 'winInColors',
    evaluatorParams: {},
    levels: [
      // Bronze: 1 - 2 - 3 couleurs
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 2 },
      { tier: 'bronze', subLevel: 3, threshold: 3 },
      // Argent: 4 - 5 - 6 couleurs
      { tier: 'argent', subLevel: 1, threshold: 4 },
      { tier: 'argent', subLevel: 2, threshold: 5 },
      { tier: 'argent', subLevel: 3, threshold: 6 },
      // Or: 7 - 8 - 9 couleurs
      { tier: 'or', subLevel: 1, threshold: 7 },
      { tier: 'or', subLevel: 2, threshold: 8 },
      { tier: 'or', subLevel: 3, threshold: 9 },
      // Lycans: 10 - 11 - 12 couleurs (toutes!)
      { tier: 'lycans', subLevel: 1, threshold: 10 },
      { tier: 'lycans', subLevel: 2, threshold: 11 },
      { tier: 'lycans', subLevel: 3, threshold: 12 },
    ],
  },
];
