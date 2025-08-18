// src/api/statsApi.ts
import { dataService } from './dataService';

// Individual endpoint functions using hybrid approach
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

// Helper function to get available players from static data
export async function getAvailablePlayersFromStatic() {
  try {
    const playerStats = await dataService.getData('playerStats');
    return playerStats.playerStats?.map((p: any) => p.player).filter(Boolean) || [];
  } catch (error) {
    console.warn('Could not load player list from static data:', error);
    return [];
  }
}

// Helper function to check if a player has static data available
export async function isPlayerDataAvailableStatic(playerName: string): Promise<boolean> {
  try {
    // Use the same path resolution as dataService
    const dataBasePath = import.meta.env.DEV ? '/data/' : '/stats-lycansv2/data/';
    const allHistories = await fetch(`${dataBasePath}allPlayerGameHistories.json`);
    if (!allHistories.ok) return false;
    
    const data = await allHistories.json();
    return !!data[playerName];
  } catch {
    return false;
  }
}