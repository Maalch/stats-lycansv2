// src/api/dataService.ts

/**
 * Simplified data service that only handles static JSON files
 * No API fallback - static files are always expected to be available
 */
export class DataService {
  private static instance: DataService;
  private dataIndex: any = null;

  private constructor() {
    // No API base needed anymore
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
   * Load raw JSON data from static files only
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
      console.error(`Failed to load raw data for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get data from static files only
   */
  public async getData(endpoint: string) {
    // Only support known raw data endpoints
    const supportedEndpoints = ['rawGameData', 'rawRoleData', 'rawPonceData', 'rawBRData'];
    
    if (!supportedEndpoints.includes(endpoint)) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return await this.loadStaticData(endpoint);
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
}

// Export singleton instance
export const dataService = DataService.getInstance();
