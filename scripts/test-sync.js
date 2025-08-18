#!/usr/bin/env node

// scripts/test-sync.js
// Test script to manually sync data and verify the hybrid system

import { dataService } from '../src/api/dataService.js';

async function testDataSync() {
  console.log('🧪 Testing hybrid data system...\n');

  // Test static data endpoints
  const staticEndpoints = [
    'campWinStats',
    'harvestStats', 
    'gameDurationAnalysis',
    'playerStats',
    'playerPairingStats',
    'playerCampPerformance'
  ];

  console.log('📊 Testing static data endpoints:');
  for (const endpoint of staticEndpoints) {
    try {
      const data = await dataService.getData(endpoint);
      console.log(`✅ ${endpoint}: ${JSON.stringify(data).length} bytes`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }

  // Test data freshness
  console.log('\n📅 Testing data freshness:');
  try {
    const freshness = await dataService.getDataFreshness();
    if (freshness) {
      console.log(`✅ Last updated: ${freshness.lastUpdated.toISOString()}`);
      console.log(`✅ Available endpoints: ${freshness.availableEndpoints.join(', ')}`);
    } else {
      console.log('❌ No freshness data available');
    }
  } catch (error) {
    console.log(`❌ Freshness check failed: ${error.message}`);
  }

  // Test API fallback
  console.log('\n🔄 Testing API fallback (if LYCANS_API_BASE is set):');
  if (process.env.VITE_LYCANS_API_BASE || process.env.LYCANS_API_BASE) {
    try {
      const data = await dataService.refreshFromAPI('campWinStats');
      console.log(`✅ API fallback works: ${JSON.stringify(data).length} bytes`);
    } catch (error) {
      console.log(`❌ API fallback failed: ${error.message}`);
    }
  } else {
    console.log('⚠️  No API base URL configured - skipping API tests');
  }

  console.log('\n🎯 Test completed!');
}

testDataSync().catch(console.error);
