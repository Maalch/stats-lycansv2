import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Raw sheet exports only (static endpoints now computed client-side)
const RAW_DATA_ENDPOINTS = [
  'rawGameData',
  'rawRoleData',
  'rawPonceData',
  'rawBRData'
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
    endpoints: RAW_DATA_ENDPOINTS,
    description: "Raw sheet exports for Lycans stats. Static computed endpoints are now calculated client-side. Updated daily via GitHub Actions."
  };

  const indexPath = path.join(ABSOLUTE_DATA_DIR, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log('✓ Created data index');
}

async function main() {
  console.log('🚀 Starting Lycans raw data sync...');
  console.log(`📁 Data directory: ${ABSOLUTE_DATA_DIR}`);
  
  try {
    await ensureDataDirectory();

    // Fetch raw sheet exports (these may be large)
    for (const endpoint of RAW_DATA_ENDPOINTS) {
      try {
        const data = await fetchEndpointData(endpoint);
        await saveDataToFile(endpoint, data);

        // Larger delay between heavy exports
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Failed to fetch raw endpoint ${endpoint}:`, err.message);
        // continue with other endpoints
      }
    }
    
    // Remove player game histories fetching since it's now computed client-side
    // Note: Individual player histories are now calculated from raw data
    
    await createDataIndex();
    
    console.log('✅ Raw data sync completed successfully!');
    console.log('ℹ️  Static computed endpoints are now calculated client-side from raw data');
  } catch (error) {
    console.error('❌ Data sync failed:', error.message);
    process.exit(1);
  }
}

main();
