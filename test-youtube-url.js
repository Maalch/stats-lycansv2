// Test script to verify YouTube URL parsing
function extractYouTubeInfo(url) {
  if (!url) return { videoId: null, timestamp: null };
  
  try {
    const urlObj = new URL(url);
    let videoId = null;
    let timestamp = null;
    
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

function createYouTubeEmbedUrl(startUrl, endUrl) {
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

// Test with your examples
const startUrl = 'https://youtu.be/8spFTO1pz7I?si=CwE-oYIALEYgcsw3&t=245';
const endUrl = 'https://youtu.be/8spFTO1pz7I?si=q4vqF7sYJBvr1iIJ&t=1105';

console.log('Start URL:', startUrl);
console.log('End URL:', endUrl);
console.log('Start Info:', extractYouTubeInfo(startUrl));
console.log('End Info:', extractYouTubeInfo(endUrl));
console.log('Final Embed URL:', createYouTubeEmbedUrl(startUrl, endUrl));

// Test with the old format from your data
const oldStartUrl = 'https://www.youtube.com/watch?v=8spFTO1pz7I&t=240s';
const oldEndUrl = 'https://youtu.be/8spFTO1pz7I?si=q4vqF7sYJBvr1iIJ&t=1105';

console.log('\nOld format test:');
console.log('Old Start URL:', oldStartUrl);
console.log('Old End URL:', oldEndUrl);
console.log('Old Start Info:', extractYouTubeInfo(oldStartUrl));
console.log('Old End Info:', extractYouTubeInfo(oldEndUrl));
console.log('Final Old Embed URL:', createYouTubeEmbedUrl(oldStartUrl, oldEndUrl));
