/**
 * Logger utility for consistent error handling and logging
 * In production, logs are sent to console.error only
 * In development, more verbose logging is available
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log error messages (always logged)
   */
  error: (message: string, ...args: unknown[]) => {
    console.error(`[Error] ${message}`, ...args);
  },

  /**
   * Log warning messages (development only)
   */
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.error(`[Warning] ${message}`, ...args);
    }
  },

  /**
   * Log info messages (development only)
   */
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.error(`[Info] ${message}`, ...args);
    }
  },

  /**
   * Log debug messages (development only)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.error(`[Debug] ${message}`, ...args);
    }
  },
};

/**
 * Error handler for fetch operations
 */
export function handleFetchError(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`Fetch error in ${context}:`, errorMessage);
  return errorMessage;
}

/**
 * Validation helper for data integrity
 */
export function validateData<T>(
  data: T | null | undefined,
  validator: (data: T) => boolean,
  context: string
): data is T {
  if (!data) {
    logger.warn(`${context}: Data is null or undefined`);
    return false;
  }
  
  const isValid = validator(data);
  if (!isValid) {
    logger.warn(`${context}: Data validation failed`);
  }
  
  return isValid;
}
