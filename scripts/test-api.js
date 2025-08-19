#!/usr/bin/env node

// scripts/test-api.js
// Simple Node.js test script to verify API endpoints work

// Use Node.js built-in fetch (Node 18+)
global.fetch = fetch;

// Test endpoints
const STATIC_ENDPOINTS = [
  'campWinStats',
  'harvestStats', 
  'gameDurationAnalysis',
  'playerStats',
  'playerPairingStats',
  'playerCampPerformance'
];

const RAW_ENDPOINTS = [
  'rawGameData',
  'rawRoleData',
  'rawPonceData'
];

async function testEndpoint(endpoint) {
  const apiBase = process.env.LYCANS_API_BASE;
  if (!apiBase) {
    throw new Error('LYCANS_API_BASE environment variable is required');
  }

  const url = `${apiBase}?action=${endpoint}`;
  console.log(`🔍 Testing ${endpoint}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const dataStr = JSON.stringify(data);
    console.log(`✅ ${endpoint}: ${dataStr.length} bytes`);
    
    // For raw endpoints, show record count if available
    if (RAW_ENDPOINTS.includes(endpoint) && data.totalRecords) {
      console.log(`   📊 Records: ${data.totalRecords}`);
    }
    
    return data;
  } catch (error) {
    console.log(`❌ ${endpoint}: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🧪 Testing Lycans API endpoints...\n');
  
  if (!process.env.LYCANS_API_BASE) {
    console.log('❌ LYCANS_API_BASE environment variable not set');
    console.log('Set it with: set LYCANS_API_BASE=your_api_url (Windows)');
    console.log('Or: export LYCANS_API_BASE=your_api_url (Mac/Linux)');
    process.exit(1);
  }

  console.log(`🔗 API Base: ${process.env.LYCANS_API_BASE}\n`);

  // Test static endpoints
  console.log('📊 Testing static data endpoints:');
  for (const endpoint of STATIC_ENDPOINTS) {
    try {
      await testEndpoint(endpoint);
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Continue with other endpoints
    }
  }

  // Test raw endpoints
  console.log('\n🗂️  Testing raw sheet exports:');
  for (const endpoint of RAW_ENDPOINTS) {
    try {
      await testEndpoint(endpoint);
      // Longer delay for heavy exports
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // Continue with other endpoints
    }
  }

  console.log('\n🎯 API test completed!');
}

main().catch(console.error);
