import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Configuration for static data endpoints
const STATIC_DATA_ENDPOINTS = [
  'campWinStats',
  'harvestStats', 
  'gameDurationAnalysis',
  'playerStats',
  'playerPairingStats',
  'playerCampPerformance'
];

// Data directory relative to project root
const DATA_DIR = '../../data';
const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), DATA_DIR);

async function ensureDataDirectory() {
  try {
    await fs.access(ABSOLUTE_DATA_DIR);
  } catch {
    await fs.mkdir(ABSOLUTE_DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${ABSOLUTE_DATA_DIR}`);
  }
}

async function fetchEndpointData(endpoint) {
  const apiBase = process.env.LYCANS_API_BASE;
  if (!apiBase) {
    throw new Error('LYCANS_API_BASE environment variable is required');
  }

  const url = `${apiBase}?action=${endpoint}`;
  console.log(`Fetching ${endpoint}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    throw error;
  }
}

async function saveDataToFile(endpoint, data) {
  const filename = `${endpoint}.json`;
  const filepath = path.join(ABSOLUTE_DATA_DIR, filename);
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, jsonData, 'utf8');
    console.log(`✓ Saved ${endpoint} data to ${filename}`);
  } catch (error) {
    console.error(`Failed to save ${endpoint}:`, error.message);
    throw error;
  }
}

async function createDataIndex() {
  const indexData = {
    lastUpdated: new Date().toISOString(),
    endpoints: STATIC_DATA_ENDPOINTS,
    description: "Static data cache for Lycans stats. Updated daily via GitHub Actions."
  };

  const indexPath = path.join(ABSOLUTE_DATA_DIR, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log('✓ Created data index');
}

async function main() {
  console.log('🚀 Starting Lycans data sync...');
  console.log(`📁 Data directory: ${ABSOLUTE_DATA_DIR}`);
  
  try {
    await ensureDataDirectory();
    
    // Fetch all static data endpoints
    for (const endpoint of STATIC_DATA_ENDPOINTS) {
      const data = await fetchEndpointData(endpoint);
      await saveDataToFile(endpoint, data);
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await createDataIndex();
    
    console.log('✅ Data sync completed successfully!');
  } catch (error) {
    console.error('❌ Data sync failed:', error.message);
    process.exit(1);
  }
}

main();
