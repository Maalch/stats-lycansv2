// src/api/dataService.ts

export interface DataConfig {
  useStatic: boolean;
  endpoints: {
    [key: string]: 'static' | 'api' | 'hybrid';
  };
}

// Configuration for data sources
export const DATA_CONFIG: DataConfig = {
  useStatic: true,
  endpoints: {
    // Static data - updated daily, no parameters needed
    campWinStats: 'static',
    harvestStats: 'static',
    gameDurationAnalysis: 'static',
    playerStats: 'static',
    playerPairingStats: 'static',
    playerCampPerformance: 'static',
    
    // API data - requires parameters or real-time data
    playerGameHistory: 'api',
    combinedStats: 'hybrid' // Can use static for basic requests
  }
};

export class DataService {
  private static instance: DataService;
  private apiBase: string;
  private dataIndex: any = null;

  private constructor() {
    this.apiBase = import.meta.env.VITE_LYCANS_API_BASE || '';
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * Load data index to check availability and freshness
   */
  private async loadDataIndex() {
    if (this.dataIndex) return this.dataIndex;
    
    try {
      const response = await fetch('/data/index.json');
      if (response.ok) {
        this.dataIndex = await response.json();
        return this.dataIndex;
      }
    } catch (error) {
      console.warn('Could not load static data index:', error);
    }
    return null;
  }

  /**
   * Load static JSON data from the repository
   */
  private async loadStaticData(endpoint: string) {
    try {
      const response = await fetch(`/data/${endpoint}.json`);
      if (!response.ok) {
        throw new Error(`Static data not available for ${endpoint}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load static data for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from the Apps Script API
   */
  private async fetchFromAPI(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(this.apiBase);
    url.searchParams.set('action', endpoint);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get data using the hybrid approach
   */
  public async getData(endpoint: string, params: Record<string, string> = {}) {
    const config = DATA_CONFIG.endpoints[endpoint];
    
    if (!config) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    // For static endpoints, try static first, fallback to API
    if (config === 'static') {
      try {
        return await this.loadStaticData(endpoint);
      } catch (error) {
        console.warn(`Static data failed for ${endpoint}, falling back to API`);
        return await this.fetchFromAPI(endpoint, params);
      }
    }

    // For API-only endpoints, always use API
    if (config === 'api') {
      return await this.fetchFromAPI(endpoint, params);
    }

    // For hybrid endpoints, decide based on parameters
    if (config === 'hybrid') {
      // If no parameters or basic request, try static first
      if (Object.keys(params).length === 0 || this.isBasicRequest(endpoint, params)) {
        try {
          return await this.loadStaticData(endpoint);
        } catch (error) {
          console.warn(`Static data failed for ${endpoint}, falling back to API`);
        }
      }
      
      // Fall back to or directly use API
      return await this.fetchFromAPI(endpoint, params);
    }

    throw new Error(`Invalid configuration for endpoint: ${endpoint}`);
  }

  /**
   * Check if this is a basic request that can use static data
   */
  private isBasicRequest(endpoint: string, params: Record<string, string>): boolean {
    // Add logic here to determine if params represent a "basic" request
    // that might be available in pre-computed static data
    
    if (endpoint === 'combinedStats') {
      // If requesting all stats or common combinations, use static
      const stats = params.stats?.split(',') || [];
      const commonStats = ['campWinStats', 'harvestStats', 'gameDurationAnalysis', 'playerStats'];
      return stats.length === 0 || stats.every(stat => commonStats.includes(stat));
    }

    return false;
  }

  /**
   * Get data freshness information
   */
  public async getDataFreshness() {
    const index = await this.loadDataIndex();
    if (!index) return null;

    return {
      lastUpdated: new Date(index.lastUpdated),
      availableEndpoints: index.endpoints
    };
  }

  /**
   * Force refresh from API (bypass static data)
   */
  public async refreshFromAPI(endpoint: string, params: Record<string, string> = {}) {
    return await this.fetchFromAPI(endpoint, params);
  }
}

// Export singleton instance
export const dataService = DataService.getInstance();
