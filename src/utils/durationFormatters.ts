/**
 * Utility functions for formatting game durations
 */

/**
 * Format duration from seconds to "Xm Ys" format
 * @param totalSeconds - Duration in seconds
 * @returns Formatted string like "13m 14s"
 */
export function formatSecondsToMinutesSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${minutes}m ${seconds}s`;
}

/**
 * Format duration string to "Xm Ys" format
 * Handles formats like "XXhYYmZZs" or "YYmZZs"
 * @param durationStr - Duration string in format "XXhYYmZZs"
 * @returns Formatted string like "13m 14s"
 */
export function formatDurationToMinutesSeconds(durationStr: string): string {
  if (!durationStr) return durationStr;
  
  // Parse the duration string (format: "XXhYYmZZs" or "YYmZZs")
  const hourMatch = durationStr.match(/(\d+)h/);
  const minuteMatch = durationStr.match(/(\d+)m/);
  const secondMatch = durationStr.match(/(\d+)s/);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
  const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
  
  // Convert everything to minutes and seconds
  const totalMinutes = hours * 60 + minutes;
  
  return `${totalMinutes}m ${seconds}s`;
}

/**
 * Format duration with days for durations >= 24 hours
 * @param durationStr - Duration string in format "XXhYYmZZs"
 * @returns Formatted string like "5 Jours 7 Heures" or original format if < 24h
 */
export function formatDurationWithDays(durationStr: string): string {
  if (!durationStr) return durationStr;
  
  // Parse the duration string (format: "XXhYYmZZs")
  const hourMatch = durationStr.match(/(\d+)h/);
  
  const totalHours = hourMatch ? parseInt(hourMatch[1]) : 0;
  
  // If less than 24 hours, return original format
  if (totalHours < 24) {
    return durationStr;
  }
  
  // Calculate days, remaining hours
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  
  // Build the formatted string
  const parts = [];
  if (days > 0) {
    parts.push(`${days} Jour${days > 1 ? 's' : ''}`);
  }
  if (remainingHours > 0) {
    parts.push(`${remainingHours} Heure${remainingHours > 1 ? 's' : ''}`);
  }
  
  return parts.join(' ');
}

/**
 * Format duration from seconds to a readable format
 * Used in game details tables
 * @param durationInSeconds - Duration in seconds (can be null)
 * @returns Formatted string like "13m 14s" or "N/A" if null
 */
export function formatDuration(durationInSeconds: number | null): string {
  if (durationInSeconds === null || durationInSeconds <= 0) {
    return 'N/A';
  }

  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format cumulative duration from seconds to "X Jours Y Heures Z Minutes" format
 * Used for large cumulative play times
 * @param totalSeconds - Duration in seconds
 * @returns Formatted string like "5 Jours 7 Heures" (>= 1 day) or "3 Heures 45 Minutes" (< 1 day)
 */
export function formatCumulativeDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return '0 Minute';
  }

  const days = Math.floor(totalSeconds / 86400); // 86400 seconds in a day
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  
  if (days > 0) {
    parts.push(`${days} Jour${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} Heure${hours > 1 ? 's' : ''}`);
  }
  // Only show minutes if duration is less than 1 day
  if (days === 0 && minutes > 0) {
    parts.push(`${minutes} Minute${minutes > 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(' ') : '0 Minute';
}
