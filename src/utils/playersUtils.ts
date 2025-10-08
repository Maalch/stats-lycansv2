import type { Player, JoueursData } from '../types/joueurs';

/**
 * Find a player by name (case-insensitive)
 */
export function findPlayerByName(players: Player[], playerName: string): Player | undefined {
  return players.find(p => p.Joueur.toLowerCase() === playerName.toLowerCase());
}

/**
 * Get all player names as an array
 */
export function getPlayerNames(joueursData: JoueursData): string[] {
  return joueursData.Players.map(p => p.Joueur);
}

/**
 * Filter players by those who have social media links
 */
export function getPlayersWithSocialMedia(players: Player[]): Player[] {
  return players.filter(p => p.Twitch !== null || p.Youtube !== null);
}

/**
 * Filter players by those who have Twitch links
 */
export function getPlayersWithTwitch(players: Player[]): Player[] {
  return players.filter(p => p.Twitch !== null);
}

/**
 * Filter players by those who have YouTube links
 */
export function getPlayersWithYoutube(players: Player[]): Player[] {
  return players.filter(p => p.Youtube !== null);
}

/**
 * Filter players by those who have profile images
 */
export function getPlayersWithImages(players: Player[]): Player[] {
  return players.filter(p => p.Image !== null);
}

/**
 * Search players by partial name match (case-insensitive)
 */
export function searchPlayersByName(players: Player[], searchTerm: string): Player[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return players;
  
  return players.filter(p => p.Joueur.toLowerCase().includes(term));
}

/**
 * Sort players alphabetically by name
 */
export function sortPlayersByName(players: Player[], ascending: boolean = true): Player[] {
  return [...players].sort((a, b) => {
    const comparison = a.Joueur.localeCompare(b.Joueur);
    return ascending ? comparison : -comparison;
  });
}

/**
 * Get player social media links formatted for display
 */
export function getPlayerSocialLinks(player: Player): { twitch?: string; youtube?: string } {
  const links: { twitch?: string; youtube?: string } = {};
  
  if (player.Twitch) {
    links.twitch = player.Twitch;
  }
  
  if (player.Youtube) {
    links.youtube = player.Youtube;
  }
  
  return links;
}

/**
 * Check if a player name exists in the players list
 */
export function isValidPlayerName(players: Player[], playerName: string): boolean {
  return findPlayerByName(players, playerName) !== undefined;
}