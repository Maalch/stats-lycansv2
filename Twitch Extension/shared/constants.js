/**
 * Shared constants for the Lycans Tracker Twitch Extension.
 * Consumed by both the panel and video overlay components.
 */

/** Base URL for all data files served from GitHub Pages. */
const LYCANS_DATA_URL = 'https://www.lycanstracker.fr/data';

/** Base URL of the main Lycans Tracker dashboard. */
const LYCANS_DASHBOARD_URL = 'https://www.lycanstracker.fr';

/** Cache TTLs in milliseconds. */
const CACHE_TTL = {
  SUMMARY:      60 * 60 * 1000,  // 1 hour  — updated weekly
  TITLES:       60 * 60 * 1000,  // 1 hour
  ACHIEVEMENTS: 60 * 60 * 1000,  // 1 hour
  JOUEURS:   6 * 60 * 60 * 1000, // 6 hours — very rarely changes
};

/** Tier display metadata for achievements. */
const TIER_META = {
  bronze: { label: 'Bronze',  color: '#CD7F32', stars: '⭐'   },
  argent: { label: 'Argent',  color: '#C0C0C0', stars: '⭐⭐'  },
  or:     { label: 'Or',      color: '#FFD700', stars: '⭐⭐⭐' },
  lycans: { label: 'Lycans',  color: '#8B0000', stars: '🐺'   },
};

/**
 * Emoji for each role name.
 * Falls back to 🎭 for unknown roles.
 */
const ROLE_EMOJI = {
  'Villageois':        '👤',
  'Villageois Élite':  '⚜️',
  'Chasseur':          '🎯',
  'Alchimiste':        '⚗️',
  'Protecteur':        '🛡️',
  'Disciple':          '📖',
  'Inquisiteur':       '⚖️',
  'Loup':              '🐺',
  'Traître':           '🌑',
  'Louveteau':         '🐾',
  'Sorcière':          '🧙',
  'Voyante':           '🔮',
  'Chaman':            '🌿',
  'Amoureux':          '❤️',
  'Amoureux Loup':     '❤️‍🔥',
  'Amoureux Villageois':'❤️',
  'Idiot du Village':  '🤡',
  'Agent':             '🕵️',
  'Zombie':            '🧟',
  'Vaudou':            '🪆',
  'Fantôme':           '👻',
  'Survivant':         '🏕️',
  'Contrebandier':     '🎒',
  'Inconnu':           '❓',
};

/** Camp colours for the streak / stat bars. */
const CAMP_COLORS = {
  Villageois: '#4A90E2',
  Loup:       '#E85D5D',
  Autres:     '#9B59B6',
};
