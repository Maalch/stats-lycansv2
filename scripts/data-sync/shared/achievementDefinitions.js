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
  br: { label: 'Battle Royale', emoji: '⚔️', order: 7 },
  special: { label: 'Spécial', emoji: '✨', order: 8 },
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
    id: 'wolf-survived-hunter-shot',
    name: 'Loup Aventurier',
    description: 'Et puis vous avez pris une flèche dans le genou...',
    explanation: 'Perdre X parties en Loup tout en survivant au Chasseur (la balle ne vous tue pas)',
    emoji: '🏹',
    category: 'victories',
    evaluator: 'wolfSurvivedHunterShot',
    evaluatorParams: {},
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 15 - 20 - 25
      { tier: 'argent', subLevel: 1, threshold: 15 },
      { tier: 'argent', subLevel: 2, threshold: 20 },
      { tier: 'argent', subLevel: 3, threshold: 25 },
      // Or: 30 - 35 - 40
      { tier: 'or', subLevel: 1, threshold: 30 },
      { tier: 'or', subLevel: 2, threshold: 35 },
      { tier: 'or', subLevel: 3, threshold: 40 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
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
    id: 'wolf-menage-a-trois',
    name: 'Ménage à Trois',
    description: 'Il suffit de convaincre un villageois de voter pour votre victime et le tour est joué',
    explanation: 'Gagner X parties en faisant voter le dernier Villageois lors d\'un meeting à 3 en étant Loup',
    emoji: '3️⃣',
    category: 'victories',
    evaluator: 'wolfVotesLastVillagerInThree',
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
    id: 'wolf-all-kills-solo',
    name: 'Besoin de personne',
    description: 'Vous faites votre route solo et vous la faites plutôt bien',
    explanation: 'Gagner X parties en Loup en étant le seul à avoir fait des kills hors meeting',
    emoji: '🐺',
    category: 'victories',
    evaluator: 'wolfAllKillsSolo',
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
    id: 'wolf-win-early-death',
    name: 'Une game exemplaire',
    description: 'Tout s\'est déroulé comme prévu',
    explanation: 'Gagner X parties en Loup en mourant avant le premier meeting (N1 ou J1)',
    emoji: '💤',
    category: 'victories',
    evaluator: 'wolfWinEarlyDeath',
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
      // Bronze: 1 - 3 - 5
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 3 },
      { tier: 'bronze', subLevel: 3, threshold: 5 },
      // Argent: 10 - 15 - 20
      { tier: 'argent', subLevel: 1, threshold: 10 },
      { tier: 'argent', subLevel: 2, threshold: 15 },
      { tier: 'argent', subLevel: 3, threshold: 20 },
      // Or: 30 - 40 - 50
      { tier: 'or', subLevel: 1, threshold: 30 },
      { tier: 'or', subLevel: 2, threshold: 40 },
      { tier: 'or', subLevel: 3, threshold: 50 },
      // Lycans: 75
      { tier: 'lycans', subLevel: 1, threshold: 75 },
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
    id: 'zombie-kills',
    name: 'Revenu de Loin',
    description: 'La vengeance est un plat qui se mange froid...',
    explanation: 'Faire X kills en Zombie',
    emoji: '🧟',
    category: 'kills',
    evaluator: 'zombieKills',
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
    id: 'villageois-double-ally-kill',
    name: 'Oups',
    description: 'Alors, vous vous êtes trompés d\'alliés...',
    explanation: 'Faire X parties en tuant deux alliés hors meeting en étant Villageois',
    emoji: '🤦',
    category: 'kills',
    evaluator: 'villageoisDoubleAllyKill',
    evaluatorParams: { minKills: 2 },
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
    id: 'hunter-double-kill',
    name: 'Farmeur de loups',
    description: 'Un loup, c\'est bien, deux loups, c\'est mieux',
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
      // Lycans: 1 — exploit unique, complété dès la première réalisation
      { tier: 'lycans', subLevel: 1, threshold: 1 },
    ],
  },
  {
    id: 'hunter-kills-last-wolf',
    name: 'Réflexe et vision ou juste pif',
    description: 'Vous avez mis un point final à la game, le reste...',
    explanation: 'Gagner X parties en tuant le dernier Loup en étant Chasseur',
    emoji: '🎯',
    category: 'kills',
    evaluator: 'hunterKillsLastWolf',
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
    id: 'amoureux-loup-kills-lover',
    name: 'Un chouya fusionnel',
    description: 'Vous l\'aimez tellement que... Vous l\'avez croqué',
    explanation: 'Tuer X fois son amoureux en étant Amoureux Loup',
    emoji: '🐺❤️',
    category: 'kills',
    evaluator: 'amoureuxLoupKillsLover',
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
    id: 'amoureux-loup-total-kills',
    name: 'C\'est pour toi mon amour UwU',
    description: 'Vous tuez uniquement par passion. Elle vous fait dépasser les limites.',
    explanation: 'Faire X kills en Amoureux Loup',
    emoji: '🐺💕',
    category: 'kills',
    evaluator: 'amoureuxLoupTotalKills',
    evaluatorParams: {},
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 20 - 30 - 40
      { tier: 'argent', subLevel: 1, threshold: 20 },
      { tier: 'argent', subLevel: 2, threshold: 30 },
      { tier: 'argent', subLevel: 3, threshold: 40 },
      // Or: 60 - 80 - 100
      { tier: 'or', subLevel: 1, threshold: 60 },
      { tier: 'or', subLevel: 2, threshold: 80 },
      { tier: 'or', subLevel: 3, threshold: 100 },
      // Lycans: 200
      { tier: 'lycans', subLevel: 1, threshold: 200 },
    ],
  },
  {
    id: 'amoureux-loup-kills-two-wolves',
    name: 'Pas de concurrence',
    description: 'La meilleure défense, c\'est l\'attaque',
    explanation: 'Avoir X fois tué deux Loups en étant Amoureux Loup',
    emoji: '🐺🐺💕',
    category: 'kills',
    evaluator: 'amoureuxLoupKillsTwoWolves',
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
    id: 'amoureux-villageois-kills-enemy',
    name: 'Moi aussi je participe !',
    description: 'Vous aussi vous apportez votre part à l\'édifice',
    explanation: 'Avoir X fois tué un ennemi en étant Amoureux Villageois',
    emoji: '❤️🗡️',
    category: 'kills',
    evaluator: 'amoureuxVillageoisKillsEnemy',
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
    id: 'agent-007',
    name: '007',
    description: 'Bravo, vous êtes un véritable agent',
    explanation: 'Avoir X fois tué personnellement l\'autre Agent et ne jamais avoir été voté en étant Agent',
    emoji: '🔫',
    category: 'roles',
    evaluator: 'agentPerfectKill',
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
    id: 'chasseur-de-primes-wins',
    name: 'Une Dernière Volonté ?',
    description: "Vous avez accompli votre mission jusqu'au bout",
    explanation: 'Gagner X parties en tant que Chasseur de Primes',
    emoji: '🎯',
    category: 'roles',
    evaluator: 'roleWins',
    evaluatorParams: { role: 'Chasseur de primes' },
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
    id: 'scientifique-wins',
    name: 'Einstein',
    description: 'Votre recherche du savoir a enfin été récompensé',
    explanation: 'Gagner X victoires en Scientifique',
    emoji: '🧪',
    category: 'roles',
    evaluator: 'roleWins',
    evaluatorParams: { role: 'Scientifique' },
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
    id: 'vaudou-triple-resurrect',
    name: 'Zombie Nation',
    description: 'Votre armée de morts s\'est bien agrandie',
    explanation: 'Faire X parties en ressuscitant au moins 3 joueurs en étant Vaudou',
    emoji: '🧟',
    category: 'roles',
    evaluator: 'vaudouTripleResurrect',
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
    id: 'loup-necromancien-resurrect',
    name: 'Le Retour des Morts',
    description: 'Vous avez su qu\'il ou elle allait faire de grande chose',
    explanation: 'Faire X parties en ressuscitant un joueur qui en tue deux autres en étant Loup Nécromancien',
    emoji: '🧟⚔️',
    category: 'roles',
    evaluator: 'wolfNecromancerResurrect',
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
    id: 'loup-devin-double-seer',
    name: 'Tu es un Sorcier, Harry',
    description: 'Ce petit tour fait toujours son petit effet',
    explanation: 'Faire X parties en devinant le rôle de deux joueurs en étant Loup Devin',
    emoji: '🔮',
    category: 'roles',
    evaluator: 'wolfSeerDoubleKill',
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
    id: 'solo-master',
    name: 'Je maîtrise le solo',
    description: 'Vous savez comment gagner avec chaque rôle',
    explanation: 'Avoir X victoires avec 9 rôles solo différents',
    emoji: '👑',
    category: 'roles',
    evaluator: 'winWith9SoloRoles',
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

  {
    id: 'villageois-top-loot',
    name: 'Encore du travail',
    description: 'Du travail, encore et toujours du travail...',
    explanation: 'Être X fois le premier à la récolte parmi les Villageois',
    emoji: '🌾',
    category: 'roles',
    evaluator: 'topLootVillageoisGames',
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
    id: 'zombie-item-uses',
    name: 'Joueur comme les autres',
    description: "Même en zombie, vous voulez faire comme tout le monde",
    explanation: 'Avoir X fois bu une potion ou utilisé un objet en étant Zombie',
    emoji: '🧟',
    category: 'roles',
    evaluator: 'zombieItemUses',
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
    id: 'wolf-transform-kill-nights',
    name: 'Ni vu ni connu',
    description: 'Une ombre passe, un joueur trépasse',
    explanation: 'Passer X nuits à se transformer, tuer au moins un joueur et se détransformer',
    emoji: '🌑',
    category: 'roles',
    evaluator: 'wolfTransformKillNights',
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
    explanation: 'Être X fois le seul joueur Villageois à passer dans un meeting',
    emoji: '🙈',
    category: 'social',
    evaluator: 'onlyVillagerPasserInMeeting',
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
    id: 'lone-non-voter',
    name: 'Et le temps passe...',
    description: "Vous n'aviez pas vu que tout le monde vous attendait ?",
    explanation: 'Être X fois le seul joueur à ne pas voter quand tous les autres ont passé',
    emoji: '⏳',
    category: 'social',
    evaluator: 'loneNonVoterAllOthersPassed',
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
    explanation: 'Faire X parties en Villageois en ne votant que des Loups ou des solos (minimum 3 votes)',
    emoji: '🏛️',
    category: 'social',
    evaluator: 'onlyEnemyVotes',
    evaluatorParams: { minVotes: 3 },
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
      // Lycans: 12 couleurs (toutes!)
      { tier: 'lycans', subLevel: 1, threshold: 12 },
    ],
  },

  {
    id: 'winning-months',
    name: 'Gagnant du mois',
    description: 'Vous êtes beau, vous êtes grand, vous êtes gagnant... Au moins sur un mois.',
    explanation: 'Avoir X fois plus de 50 % de victoires sur un mois civil',
    emoji: '📅',
    category: 'victories',
    evaluator: 'winningMonths',
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
    id: 'perfect-sessions',
    name: "C'est qui le patron ?",
    description: "C'est vous...",
    explanation: 'Avoir X sessions (même jour, min. 5 parties) à 100 % de victoire',
    emoji: '💼',
    category: 'victories',
    evaluator: 'perfectSessions',
    evaluatorParams: { minGames: 5 },
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
    id: 'calife-a-la-place-du-calife',
    name: 'Calife à la place du Calife',
    description: 'Quoi de mieux que de battre le développeur du jeu',
    explanation: 'Gagner X parties lors desquelles Onutrem a perdu',
    emoji: '👑',
    category: 'special',
    evaluator: 'winsAgainstOnutrem',
    evaluatorParams: {},
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 15 - 20 - 25
      { tier: 'argent', subLevel: 1, threshold: 15 },
      { tier: 'argent', subLevel: 2, threshold: 20 },
      { tier: 'argent', subLevel: 3, threshold: 25 },
      // Or: 30 - 35 - 40
      { tier: 'or', subLevel: 1, threshold: 30 },
      { tier: 'or', subLevel: 2, threshold: 35 },
      { tier: 'or', subLevel: 3, threshold: 40 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
    ],
  },

  {
    id: 'resurrected',
    name: 'Pas de Pause AFK !',
    description: 'Vous pensiez avoir le temps de partir ?',
    explanation: 'Être X fois ressuscité (Loup Nécromancien ou Vaudou)',
    emoji: '🧟',
    category: 'special',
    evaluator: 'resurrectedCount',
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
    id: 'juste-un-dernier-verre',
    name: 'Juste un dernier verre',
    description: 'Vous arrêtez quand vous voulez...',
    explanation: 'Faire X parties en ayant bu au moins 5 potions',
    emoji: '🍶',
    category: 'special',
    evaluator: 'justeUnDernierVerre',
    evaluatorParams: { minPotions: 5 },
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
    id: 'collectionneur',
    name: 'Collectionneur',
    description: 'Vous êtes prêt en toute circonstance',
    explanation: 'Faire X parties en utilisant au moins 5 items différents (gadgets ou potions)',
    emoji: '🎒',
    category: 'special',
    evaluator: 'collectionneur',
    evaluatorParams: { minDistinctItems: 5 },
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
  // BATTLE ROYALE (main team only - no BR data for Discord)
  // ============================================================================
  {
    id: 'br-victories',
    name: 'Roi de la Colline',
    description: 'Seul contre tous, vous avez triomphé',
    explanation: 'Gagner X parties en Battle Royale',
    emoji: '👑',
    category: 'br',
    evaluator: 'brWins',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 1 - 10 - 20
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 10 },
      { tier: 'bronze', subLevel: 3, threshold: 20 },
      // Argent: 35 - 50 - 75
      { tier: 'argent', subLevel: 1, threshold: 35 },
      { tier: 'argent', subLevel: 2, threshold: 50 },
      { tier: 'argent', subLevel: 3, threshold: 75 },
      // Or: 100 - 150 - 200
      { tier: 'or', subLevel: 1, threshold: 100 },
      { tier: 'or', subLevel: 2, threshold: 150 },
      { tier: 'or', subLevel: 3, threshold: 200 },
      // Lycans: 300
      { tier: 'lycans', subLevel: 1, threshold: 300 },
    ],
  },
  {
    id: 'br-participations',
    name: 'Vétéran de l\'Arène',
    description: 'Vous en avez connu, des batailles ...',
    explanation: 'Participer à X parties en Battle Royale',
    emoji: '⚔️',
    category: 'br',
    evaluator: 'brParticipations',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 1 - 10 - 25
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 10 },
      { tier: 'bronze', subLevel: 3, threshold: 25 },
      // Argent: 50 - 100 - 150
      { tier: 'argent', subLevel: 1, threshold: 50 },
      { tier: 'argent', subLevel: 2, threshold: 100 },
      { tier: 'argent', subLevel: 3, threshold: 150 },
      // Or: 200 - 300 - 400
      { tier: 'or', subLevel: 1, threshold: 200 },
      { tier: 'or', subLevel: 2, threshold: 300 },
      { tier: 'or', subLevel: 3, threshold: 400 },
      // Lycans: 500
      { tier: 'lycans', subLevel: 1, threshold: 500 },
    ],
  },
  {
    id: 'br-total-kills',
    name: 'Tueur en série',
    description: 'Le Roi du 3 6',
    explanation: 'Faire X kills au total en Battle Royale',
    emoji: '💀',
    category: 'br',
    evaluator: 'brTotalKills',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 10 - 25 - 50
      { tier: 'bronze', subLevel: 1, threshold: 10 },
      { tier: 'bronze', subLevel: 2, threshold: 25 },
      { tier: 'bronze', subLevel: 3, threshold: 50 },
      // Argent: 100 - 200 - 300
      { tier: 'argent', subLevel: 1, threshold: 100 },
      { tier: 'argent', subLevel: 2, threshold: 200 },
      { tier: 'argent', subLevel: 3, threshold: 300 },
      // Or: 500 - 750 - 1000
      { tier: 'or', subLevel: 1, threshold: 500 },
      { tier: 'or', subLevel: 2, threshold: 750 },
      { tier: 'or', subLevel: 3, threshold: 1000 },
      // Lycans: 1500
      { tier: 'lycans', subLevel: 1, threshold: 1500 },
    ],
  },
  {
    id: 'br-pacifist',
    name: 'Le pacifisme incarné',
    description: 'Tuer c\'est mal... Même quand c\'est le principe...',
    explanation: 'Faire une partie BR avec 0 kill',
    emoji: '🕊️',
    category: 'br',
    evaluator: 'brZeroKillGames',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 1 - 3 - 5
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 3 },
      { tier: 'bronze', subLevel: 3, threshold: 5 },
      // Argent: 10 - 15 - 20
      { tier: 'argent', subLevel: 1, threshold: 10 },
      { tier: 'argent', subLevel: 2, threshold: 15 },
      { tier: 'argent', subLevel: 3, threshold: 20 },
      // Or: 30 - 40 - 50
      { tier: 'or', subLevel: 1, threshold: 30 },
      { tier: 'or', subLevel: 2, threshold: 40 },
      { tier: 'or', subLevel: 3, threshold: 50 },
      // Lycans: 75
      { tier: 'lycans', subLevel: 1, threshold: 75 },
    ],
  },
  {
    id: 'br-high-kills-single-game',
    name: 'Carnage',
    description: 'Un vrai massacre dans l\'arène !',
    explanation: 'Faire X kills dans une seule partie BR',
    emoji: '🔥',
    category: 'br',
    evaluator: 'brHighKillGame',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
        // Bronze: 2
        { tier: 'bronze', subLevel: 1, threshold: 2 },
        // Argent: 4
        { tier: 'argent', subLevel: 1, threshold: 4 },
        // Or: 6
        { tier: 'or', subLevel: 1, threshold: 6 },
        // Lycans: 8
        { tier: 'lycans', subLevel: 1, threshold: 8 },
    ],
          
  },
  {
    id: 'br-top-kills-but-loss',
    name: 'Aux portes de la Victoire',
    description: 'Tuer, c\'est bien (dans le jeu), gagner c\'est mieux...',
    explanation: 'Perdre X parties en ayant le plus de kills',
    emoji: '😭',
    category: 'br',
    evaluator: 'brTopKillsButLoss',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 1 - 3 - 5
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 3 },
      { tier: 'bronze', subLevel: 3, threshold: 5 },
      // Argent: 10 - 15 - 20
      { tier: 'argent', subLevel: 1, threshold: 10 },
      { tier: 'argent', subLevel: 2, threshold: 15 },
      { tier: 'argent', subLevel: 3, threshold: 20 },
      // Or: 30 - 40 - 50
      { tier: 'or', subLevel: 1, threshold: 30 },
      { tier: 'or', subLevel: 2, threshold: 40 },
      { tier: 'or', subLevel: 3, threshold: 50 },
      // Lycans: 75
      { tier: 'lycans', subLevel: 1, threshold: 75 },
    ],
  },
  {
    id: 'br-lucky-luke',
    name: 'Lucky Luke',
    description: 'Vous tirez plus vite que votre ombre, c\'est prouvé',
    explanation: 'Faire X parties à 5 kills ou plus en mode BR',
    emoji: '🤠',
    category: 'br',
    evaluator: 'brLuckyLuke',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 1 - 5 - 10
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 5 },
      { tier: 'bronze', subLevel: 3, threshold: 10 },
      // Argent: 15 - 20 - 25
      { tier: 'argent', subLevel: 1, threshold: 15 },
      { tier: 'argent', subLevel: 2, threshold: 20 },
      { tier: 'argent', subLevel: 3, threshold: 25 },
      // Or: 30 - 35 - 40
      { tier: 'or', subLevel: 1, threshold: 30 },
      { tier: 'or', subLevel: 2, threshold: 35 },
      { tier: 'or', subLevel: 3, threshold: 40 },
      // Lycans: 50
      { tier: 'lycans', subLevel: 1, threshold: 50 },
    ],
  },
  {
    id: 'br-one-shot-victory',
    name: 'Un tir, une victoire',
    description: 'Rien ne sert de courir, il suffit de tirer',
    explanation: 'Gagner X parties en ayant un seul kill',
    emoji: '🎯',
    category: 'br',
    evaluator: 'brOneShotVictory',
    evaluatorParams: {},
    requiresBRData: true,
    levels: [
      // Bronze: 1 - 2 - 3
      { tier: 'bronze', subLevel: 1, threshold: 1 },
      { tier: 'bronze', subLevel: 2, threshold: 2 },
      { tier: 'bronze', subLevel: 3, threshold: 3 },
      // Argent: 5 - 7 - 10
      { tier: 'argent', subLevel: 1, threshold: 5 },
      { tier: 'argent', subLevel: 2, threshold: 7 },
      { tier: 'argent', subLevel: 3, threshold: 10 },
      // Or: 15 - 20 - 25
      { tier: 'or', subLevel: 1, threshold: 15 },
      { tier: 'or', subLevel: 2, threshold: 20 },
      { tier: 'or', subLevel: 3, threshold: 25 },
      // Lycans: 40
      { tier: 'lycans', subLevel: 1, threshold: 40 },
    ],
  },
];
