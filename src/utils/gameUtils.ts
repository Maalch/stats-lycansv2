/**
 * Utility functions for processing YouTube URLs and game duration calculations
 */

// Helper function to extract YouTube video ID and timestamp from a YouTube URL
export function extractYouTubeInfo(url: string | null): { videoId: string | null; timestamp: number | null } {
  if (!url) return { videoId: null, timestamp: null };
  
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;
    let timestamp: number | null = null;
    
    // Extract video ID from different YouTube URL formats
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1); // Remove leading slash
    } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v');
    }
    
    // Extract timestamp from 't' parameter
    const tParam = urlObj.searchParams.get('t');
    if (tParam) {
      // Handle both numeric seconds (245) and time format (4m5s)
      if (/^\d+$/.test(tParam)) {
        timestamp = parseInt(tParam, 10);
      } else {
        // Parse time format like "4m5s" or "1h30m45s"
        const timeMatch = tParam.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1] || '0', 10);
          const minutes = parseInt(timeMatch[2] || '0', 10);
          const seconds = parseInt(timeMatch[3] || '0', 10);
          timestamp = hours * 3600 + minutes * 60 + seconds;
        }
      }
    }
    
    return { videoId, timestamp };
  } catch (error) {
    console.warn('Failed to parse YouTube URL:', url);
    return { videoId: null, timestamp: null };
  }
}

// Helper function to create YouTube embed URL from start and end URLs
export function createYouTubeEmbedUrl(startUrl: string | null, endUrl: string | null): string | null {
  const startInfo = extractYouTubeInfo(startUrl);
  const endInfo = extractYouTubeInfo(endUrl);
  
  // We need at least a video ID from either URL
  const videoId = startInfo.videoId || endInfo.videoId;
  if (!videoId) return null;
  
  const params = new URLSearchParams();
  
  if (startInfo.timestamp !== null) {
    params.set('start', startInfo.timestamp.toString());
  }
  
  if (endInfo.timestamp !== null) {
    params.set('end', endInfo.timestamp.toString());
  }
  
  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
}

// Helper function to calculate game duration from start and end URLs
export function calculateGameDuration(startUrl: string | null, endUrl: string | null): number | null {
  const startInfo = extractYouTubeInfo(startUrl);
  const endInfo = extractYouTubeInfo(endUrl);
  
  // We need both timestamps to calculate duration
  if (startInfo.timestamp === null || endInfo.timestamp === null) {
    return null;
  }

  // Calculate duration in seconds
  const duration = endInfo.timestamp - startInfo.timestamp;
  
  // Return null if duration is negative or zero (invalid)
  return duration > 0 ? duration : null;
}

// Helper function to format duration in seconds to MM:SS format
export function formatDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.round(durationInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to split and trim strings like the Google Apps Script
export function splitAndTrim(str: string | null | undefined): string[] {
  return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
}
