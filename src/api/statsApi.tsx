// src/api/statsApi.ts
import { dataService } from './dataService';

// Legacy function - now uses hybrid data service
export async function fetchCombinedStats(statsToInclude: string[]) {
  const statsParam = statsToInclude.join(',');
  return await dataService.getData('combinedStats', { stats: statsParam });
}

// New individual endpoint functions using hybrid approach
export async function fetchCampWinStats() {
  return await dataService.getData('campWinStats');
}

export async function fetchHarvestStats() {
  return await dataService.getData('harvestStats');
}

export async function fetchGameDurationAnalysis() {
  return await dataService.getData('gameDurationAnalysis');
}

export async function fetchPlayerStats() {
  return await dataService.getData('playerStats');
}

export async function fetchPlayerPairingStats() {
  return await dataService.getData('playerPairingStats');
}

export async function fetchPlayerCampPerformance() {
  return await dataService.getData('playerCampPerformance');
}

export async function fetchPlayerGameHistory(playerName: string) {
  return await dataService.getData('playerGameHistory', { playerName });
}

// Utility functions
export async function getDataFreshness() {
  return await dataService.getDataFreshness();
}

export async function forceRefreshFromAPI(endpoint: string, params: Record<string, string> = {}) {
  return await dataService.refreshFromAPI(endpoint, params);
}