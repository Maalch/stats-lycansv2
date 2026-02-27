/**
 * Achievement Definitions for the Lycans game statistics system
 * 
 * Unlike Rankings (comparative) and Titles (percentile-based), achievements are
 * permanent unlockable rewards triggered by absolute thresholds.
 * 
 * Level tiers: ⭐ (1) / ⭐⭐ (2) / ⭐⭐⭐ (3) / 🐺 (4)
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
 * - levels: array of { stars, threshold } — not all achievements have 4 levels
 */

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
      { stars: 1, threshold: 10 },
      { stars: 2, threshold: 50 },
      { stars: 3, threshold: 100 },
      { stars: 4, threshold: 200 },
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
      { stars: 1, threshold: 10 },
      { stars: 2, threshold: 50 },
      { stars: 3, threshold: 100 },
      { stars: 4, threshold: 200 },
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
      { stars: 1, threshold: 5 },
      { stars: 2, threshold: 10 },
      { stars: 3, threshold: 15 },
      { stars: 4, threshold: 30 },
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
      { stars: 1, threshold: 10 },
      { stars: 2, threshold: 50 },
      { stars: 3, threshold: 100 },
      { stars: 4, threshold: 200 },
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
      { stars: 1, threshold: 10 },
      { stars: 2, threshold: 50 },
      { stars: 3, threshold: 100 },
      { stars: 4, threshold: 200 },
    ],
  },
  {
    id: 'vegan-wolf',
    name: 'Je suis Vegan',
    description: 'Vous avez eu la victoire sans rien faire, bravo',
    explanation: 'Gagner une partie en loup sans tuer personne',
    emoji: '🥬',
    category: 'victories',
    evaluator: 'wolfWinNoKills',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
    ],
  },
  {
    id: 'last-wolf',
    name: 'Le dernier loup',
    description: 'Vous n\'avez besoin de personne pour gagner… Vous seul survivez.',
    explanation: 'Gagner X parties en étant l\'unique survivant et donc le dernier loup',
    emoji: '🏚️',
    category: 'victories',
    evaluator: 'lastWolfStanding',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
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
      { stars: 1, threshold: 1 },
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
      { stars: 1, threshold: 1 },
    ],
  },
  {
    id: 'starvation',
    name: 'Famine Fatale',
    description: 'Manger, c\'est surfait',
    explanation: 'Mourir de faim',
    emoji: '🍽️',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'STARVATION' },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
    ],
  },
  {
    id: 'romeo-juliette',
    name: 'Roméo & Juliette',
    description: 'Vous ne pouviez pas survivre sans votre moitié',
    explanation: 'Mourir à cause de la mort de son amoureux (LOVER_DEATH)',
    emoji: '💔',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'LOVER_DEATH' },
    levels: [
      { stars: 1, threshold: 5 },
      { stars: 2, threshold: 15 },
      { stars: 3, threshold: 30 },
      { stars: 4, threshold: 50 },
    ],
  },
  {
    id: 'death-turn1',
    name: 'Bon, je reviens !',
    description: 'Vous êtes mort·e certes mais vous avez au moins eu le temps d\'aller faire un truc',
    explanation: 'Mourir la première nuit (DeathTiming = "N1")',
    emoji: '⏱️',
    category: 'deaths',
    evaluator: 'deathOnTiming',
    evaluatorParams: { timing: 'N1' },
    levels: [
      { stars: 1, threshold: 5 },
      { stars: 2, threshold: 15 },
      { stars: 3, threshold: 30 },
      { stars: 4, threshold: 50 },
    ],
  },
  {
    id: 'voted-as-villager',
    name: 'Coupable par défaut',
    description: 'Malgré que vous soyez dans le camp des gentils, personne ne vous croit',
    explanation: 'Être éjecté d\'un meeting en étant camp Villageois',
    emoji: '🗳️',
    category: 'deaths',
    evaluator: 'votedAsCamp',
    evaluatorParams: { camp: 'Villageois' },
    levels: [
      { stars: 1, threshold: 5 },
      { stars: 2, threshold: 15 },
      { stars: 3, threshold: 30 },
      { stars: 4, threshold: 50 },
    ],
  },
  {
    id: 'wolf-killed-by-beast',
    name: 'C\'est Bête',
    description: 'Un loup tué par La Bête... L\'ironie du sort',
    explanation: 'Mourir en Loup par La Bête (BY_BEAST)',
    emoji: '🦁',
    category: 'deaths',
    evaluator: 'roleDeathByType',
    evaluatorParams: { roleCamp: 'Loup', deathType: 'BY_BEAST' },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
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
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
    ],
  },
  {
    id: 'crushed',
    name: 'Au ras des pâquerettes',
    description: 'Difficile quand on est petit d\'éviter les pas des géants',
    explanation: 'Mourir X fois écrasé·e',
    emoji: '🪨',
    category: 'deaths',
    evaluator: 'deathByType',
    evaluatorParams: { deathType: 'CRUSHED' },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
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
      { stars: 1, threshold: 3 },
      { stars: 2, threshold: 10 },
      { stars: 3, threshold: 20 },
      { stars: 4, threshold: 40 },
    ],
  },

  // ============================================================================
  // KILLS
  // ============================================================================
  {
    id: 'ponce-fesses',
    name: 'Ponce fesses',
    description: 'Comme un certain streameur, tu ponces des culs',
    explanation: 'Avoir fait 100 kills en loup (cumulé)',
    emoji: '🍑',
    category: 'kills',
    evaluator: 'wolfKills',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 25 },
      { stars: 2, threshold: 50 },
      { stars: 3, threshold: 100 },
      { stars: 4, threshold: 200 },
    ],
  },
  {
    id: 'hunter-kill-enemy',
    name: 'Justice du Chasseur',
    description: 'Votre balle a trouvé sa cible... la bonne cette fois',
    explanation: 'En tant que Chasseur, tuer un joueur d\'un camp adverse',
    emoji: '🎯',
    category: 'kills',
    evaluator: 'hunterKillsEnemy',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
    ],
  },
  {
    id: 'hunter-kill-villager',
    name: 'Tir ami',
    description: 'C\'est un villageois que vous avez touché...',
    explanation: 'En tant que Chasseur, tuer un joueur du camp Villageois',
    emoji: '😬',
    category: 'kills',
    evaluator: 'hunterKillsAlly',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
    ],
  },
  {
    id: 'hunter-double-kill',
    name: 'Farmeur de loups',
    description: 'Un loup c\'est bien, deux loups c\'est mieux',
    explanation: 'En tant que chasseur, tuer deux loups/ennemis dans une seule partie',
    emoji: '🏹',
    category: 'kills',
    evaluator: 'hunterMultiKillsInGame',
    evaluatorParams: { minKills: 2 },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
      { stars: 4, threshold: 10 },
    ],
  },
  {
    id: 'hunter-killed-by-wolf',
    name: 'Le Loup, c\'est Khalen',
    description: 'Un loup vous a tué alors que vous êtes chasseur... Il évite les balles ?',
    explanation: 'Être chasseur et être tué par un loup',
    emoji: '🐺',
    category: 'kills',
    evaluator: 'hunterKilledByWolf',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
    ],
  },
  {
    id: 'assassin-potion-kill-enemy',
    name: 'Cocktail Mortel',
    description: 'La chimie au service de la justice',
    explanation: 'Tuer un joueur d\'un camp adverse avec une potion assassin',
    emoji: '🧪',
    category: 'kills',
    evaluator: 'assassinPotionKills',
    evaluatorParams: { targetCamp: 'enemy' },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
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
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
      { stars: 4, threshold: 10 },
    ],
  },
  {
    id: 'victim-of-love',
    name: 'Victime de l\'Amour',
    description: 'Pour que l\'Amour existe, vous avez dû périr',
    explanation: 'Être tué par le loup amoureux (loup qui est aussi Amoureux)',
    emoji: '💘',
    category: 'kills',
    evaluator: 'killedByLoverWolf',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 3 },
      { stars: 2, threshold: 10 },
      { stars: 3, threshold: 20 },
      { stars: 4, threshold: 40 },
    ],
  },

  // ============================================================================
  // ROLES
  // ============================================================================
  {
    id: 'agent-117',
    name: '117',
    description: 'Bravo, vous avez tout de suite été capté',
    explanation: 'Être tué aux votes en tant qu\'Agent',
    emoji: '🕵️',
    category: 'roles',
    evaluator: 'agentVoted',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
    ],
  },
  {
    id: 'louveteau-orphan',
    name: 'Le Louveteau Orphelin',
    description: 'Tous les loups sont morts mais vous, petit louveteau, vous avez tenu bon',
    explanation: 'Gagner en tant que Louveteau après la mort de tous les autres loups',
    emoji: '🐶',
    category: 'roles',
    evaluator: 'louveteauOrphanWin',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
    ],
  },
  {
    id: 'solo-master',
    name: 'Je maîtrise le solo',
    description: 'Maître de chaque rôle solitaire',
    explanation: 'Avoir au moins une victoire avec chaque rôle solo (Amoureux, Idiot du Village, Agent, etc.)',
    emoji: '👑',
    category: 'roles',
    evaluator: 'winWithAllSoloRoles',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
    ],
  },

  // ============================================================================
  // SOCIAL (voting/meetings)
  // ============================================================================
  {
    id: 'bavard',
    name: 'M. / Mme Bavard',
    description: 'Vous avez beaucoup de choses à dire, visiblement',
    explanation: 'Parler au moins 50% du temps total lors d\'une partie',
    emoji: '🗣️',
    category: 'social',
    evaluator: 'talkingPercentage',
    evaluatorParams: { minPercentage: 50 },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
    ],
  },
  {
    id: 'misunderstood',
    name: 'L\'Incompris',
    description: 'Vous avez vu juste mais personne ne vous a cru... et c\'est vous qui payez',
    explanation: 'Voter correctement pour un loup/rôle solo au conseil mais se faire voter à la place',
    emoji: '🤷',
    category: 'social',
    evaluator: 'correctVoteButVoted',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
      { stars: 4, threshold: 20 },
    ],
  },
  {
    id: 'false-guilty',
    name: 'Faux Coupable',
    description: 'Malgré votre innocence, tout le village s\'est retourné contre vous',
    explanation: 'Être voté à l\'unanimité alors que vous êtes villageois',
    emoji: '😤',
    category: 'social',
    evaluator: 'unanimousVoteAsVillager',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
    ],
  },
  {
    id: 'only-passer',
    name: 'Au cas où, je passe',
    description: 'Être le seul joueur à passer dans un meeting... Courage !',
    explanation: 'Être le seul joueur à passer (voter "Passé") lors d\'un meeting',
    emoji: '🙈',
    category: 'social',
    evaluator: 'onlyPasserInMeeting',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 5 },
      { stars: 3, threshold: 10 },
    ],
  },
  {
    id: 'kill-surprise',
    name: 'Kill surprise',
    description: 'Être le seul à voter pour un joueur... et il est éliminé. Surprise !',
    explanation: 'Être le seul votant pour un joueur qui se fait éliminer au vote',
    emoji: '😱',
    category: 'social',
    evaluator: 'soleVoterElimination',
    evaluatorParams: {},
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
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
    evaluatorParams: { minConsecutive: 5 },
    levels: [
      { stars: 1, threshold: 1 },
      { stars: 2, threshold: 3 },
      { stars: 3, threshold: 5 },
    ],
  },

  // ============================================================================
  // SPECIAL
  // ============================================================================
  {
    id: 'colors-of-lycans',
    name: 'United Colors of Lycans',
    description: 'L\'arc-en-ciel des victoires',
    explanation: 'Jouer et gagner des parties dans au moins 5 couleurs différentes',
    emoji: '🌈',
    category: 'special',
    evaluator: 'winInColors',
    evaluatorParams: { minColors: 5 },
    levels: [
      { stars: 1, threshold: 1 },
    ],
  },
];
