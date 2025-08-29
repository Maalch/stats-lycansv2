// src/api/dataService.ts

export interface DataConfig {
  useStatic: boolean;
  endpoints: {
    [key: string]: 'static' | 'api';
  };
}

// Configuration for raw data sources only
export const DATA_CONFIG: DataConfig = {
  useStatic: true,
  endpoints: {
    // Raw sheet exports - these are the only static files we sync
    rawGameData: 'static',
    rawRoleData: 'static',
    rawPonceData: 'static',
    rawBRData: 'static'
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
      const indexPath = `${this.getDataBasePath()}index.json`;
      const response = await fetch(indexPath);
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
   * Get the correct base path for static data
   */
  private getDataBasePath(): string {
    // In development, use root path. In production, respect the base path.
    return import.meta.env.DEV ? '/data/' : '/stats-lycansv2/data/';
  }

  /**
   * Load raw JSON data from the repository
   */
  private async loadStaticData(endpoint: string) {
    try {
      const dataPath = `${this.getDataBasePath()}${endpoint}.json`;
      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Raw data not available for ${endpoint} (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load raw data for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from the Apps Script API
   */
  private async fetchFromAPI(endpoint: string, params: Record<string, string> = {}) {
    if (!this.apiBase) {
      throw new Error('API base URL not configured. Raw data hooks should be used instead.');
    }

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
   * Get data using the simplified approach: raw data from static files, computed stats via API fallback
   */
  public async getData(endpoint: string, params: Record<string, string> = {}) {
    const config = DATA_CONFIG.endpoints[endpoint];
    
    
    if (!config) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    // For raw data endpoints, load from static files
    if (config === 'static') {
      try {
        const result = await this.loadStaticData(endpoint);
        return result;
      } catch (error) {
        console.warn(`⚠️ Raw data failed for ${endpoint}, falling back to API:`, error);
        return await this.fetchFromAPI(endpoint, params);
      }
    }

    // For computed statistics, use API (these should now use raw data hooks instead)
    if (config === 'api') {
      console.warn(`⚠️ Using legacy API endpoint for ${endpoint}. Consider migrating to raw data hooks.`);
      return await this.fetchFromAPI(endpoint, params);
    }

    throw new Error(`Invalid configuration for endpoint: ${endpoint}`);
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
