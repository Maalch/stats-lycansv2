// src/api/statsApi.ts
import { dataService } from './dataService';

// ===================================================================
// RAW DATA FUNCTIONS - For compatibility with existing code
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

export async function fetchRawBRData() {
  return await dataService.getData('rawBRData');
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

// Get data freshness information from static index
export async function getDataFreshness() {
  return await dataService.getDataFreshness();
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