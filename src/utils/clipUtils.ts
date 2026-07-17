import type { Clip } from '../hooks/useCombinedRawData';

/**
 * Convert Twitch clip URL to embeddable format
 * Handles various Twitch URL formats:
 * - https://clips.twitch.tv/ClipSlug
 * - https://www.twitch.tv/channel/clip/ClipSlug
 * - https://twitch.tv/clip/ClipSlug
 */
export function getTwitchEmbedUrl(clipUrl: string | null): string | null {
  if (!clipUrl) return null;

  try {
    const url = new URL(clipUrl);
    
    // Extract clip slug from different URL formats
    let clipSlug: string | null = null;
    
    if (url.hostname === 'clips.twitch.tv') {
      // Format: https://clips.twitch.tv/ClipSlug
      clipSlug = url.pathname.split('/')[1];
    } else if (url.hostname.includes('twitch.tv')) {
      // Format: https://www.twitch.tv/channel/clip/ClipSlug or https://twitch.tv/clip/ClipSlug
      const pathParts = url.pathname.split('/');
      const clipIndex = pathParts.indexOf('clip');
      if (clipIndex !== -1 && pathParts[clipIndex + 1]) {
        clipSlug = pathParts[clipIndex + 1];
      }
    }
    
    if (clipSlug) {
      // Return Twitch embed URL with parent parameter
      return `https://clips.twitch.tv/embed?clip=${clipSlug}&parent=${window.location.hostname}`;
    }
  } catch (error) {
    console.warn('Failed to parse Twitch clip URL:', clipUrl, error);
  }
  
  return null;
}

/**
 * Get display name for a clip
 * Uses NewName if available, otherwise falls back to ClipName or generates from ClipId
 */
export function getClipDisplayName(clip: Clip): string {
  if (clip.NewName) return clip.NewName;
  if (clip.ClipName) return clip.ClipName;
  return `Clip ${clip.ClipId}`;
}

/**
 * Parse comma-separated player names from OthersPlayers field
 */
export function parseOtherPlayers(othersPlayers: string | null): string[] {
  if (!othersPlayers) return [];
  return othersPlayers.split(',').map(name => name.trim()).filter(name => name.length > 0);
}

/**
 * Parse comma-separated clip IDs from RelatedClips field
 */
export function parseRelatedClipIds(relatedClips: string | null): string[] {
  if (!relatedClips) return [];
  return relatedClips.split(',').map(id => id.trim()).filter(id => id.length > 0);
}

/**
 * Get all players involved in a clip (POV + others)
 */
export function getAllClipPlayers(clip: Clip): string[] {
  const players = [clip.POVPlayer];
  const others = parseOtherPlayers(clip.OthersPlayers);
  return [...players, ...others];
}

/**
 * Filter clips by player name (checks both POV and OthersPlayers)
 */
export function filterClipsByPlayer(clips: Clip[], playerName: string): Clip[] {
  const lowerPlayerName = playerName.toLowerCase();
  return clips.filter(clip => {
    const allPlayers = getAllClipPlayers(clip).map(p => p.toLowerCase());
    return allPlayers.includes(lowerPlayerName);
  });
}

/**
 * Filter clips by tag
 */
export function filterClipsByTag(clips: Clip[], tag: string): Clip[] {
  return clips.filter(clip => Array.isArray(clip.Tags) && clip.Tags.includes(tag));
}

/**
 * Get all unique tags from a list of clips
 */
export function getUniqueTags(clips: Clip[]): string[] {
  const tags = new Set<string>();
  clips.forEach(clip => {
    if (Array.isArray(clip.Tags)) {
      clip.Tags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
}


/**
 * Get a random clip from an array of clips
 */
export function getRandomClip(clips: Clip[]): Clip | null {
  if (clips.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * clips.length);
  return clips[randomIndex];
}

/**
 * Find related clips in a clip array
 */
export function findRelatedClips(clip: Clip, allClips: Clip[]): Clip[] {
  const relatedIds = parseRelatedClipIds(clip.RelatedClips);
  return allClips.filter(c => relatedIds.includes(c.ClipId));
}

/**
 * Find next clip in sequence
 */
export function findNextClip(clip: Clip, allClips: Clip[]): Clip | null {
  if (!clip.NextClip) return null;
  return allClips.find(c => c.ClipId === clip.NextClip) || null;
}

/**
 * Group clips by tag
 */
export function groupClipsByTag(clips: Clip[]): Map<string, Clip[]> {
  const grouped = new Map<string, Clip[]>();
  
  clips.forEach(clip => {
    if (Array.isArray(clip.Tags) && clip.Tags.length > 0) {
      clip.Tags.forEach(tag => {
        if (!grouped.has(tag)) {
          grouped.set(tag, []);
        }
        grouped.get(tag)!.push(clip);
      });
    } else {
      // Clips without tags go to 'Sans catégorie'
      if (!grouped.has('Sans catégorie')) {
        grouped.set('Sans catégorie', []);
      }
      grouped.get('Sans catégorie')!.push(clip);
    }
  });
  
  return grouped;
}
