// src/api/statsApi.ts
import { dataService } from './dataService';

// ===================================================================
// RAW DATA FUNCTIONS - Use these for the new raw data architecture
// ===================================================================

export async function fetchRawGameData() {
  return await dataService.getData('rawGameData');
}

export async function fetchRawRoleData() {
  return await dataService.getData('rawRoleData');
}

export async function fetchRawPonceData() {
  return await dataService.getData('rawPonceData');
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

// Utility functions
export async function getDataFreshness() {
  return await dataService.getDataFreshness();
}

export async function forceRefreshFromAPI(endpoint: string, params: Record<string, string> = {}) {
  return await dataService.refreshFromAPI(endpoint, params);
}

// Helper function to get raw data freshness
export async function getRawDataFreshness() {
  const freshness = await dataService.getDataFreshness();
  return freshness;
}

// Helper function to check if raw data is available
export async function isRawDataAvailable(): Promise<boolean> {
  try {
    const freshness = await dataService.getDataFreshness();
    return !!freshness && freshness.availableEndpoints.includes('rawGameData');
  } catch {
    return false;
  }
}