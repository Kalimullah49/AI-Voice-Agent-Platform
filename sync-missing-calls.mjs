/**
 * Sync missing calls from Vapi.ai to local database
 * This addresses the webhook synchronization issues
 */

import fetch from 'node-fetch';

const VAPI_PRIVATE_KEY = '2291104d-93d4-4292-9d18-6f3af2e420e0';
const DATABASE_URL = process.env.DATABASE_URL;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fetchVapiCalls() {
  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    log(`❌ Error fetching Vapi calls: ${error.message}`, 'red');
    return null;
  }
}

async function syncMissingCalls() {
  log('🔄 Syncing Missing Calls from Vapi.ai', 'cyan');
  log('=====================================', 'cyan');
  
  // Fetch calls from Vapi
  log('\n📡 Fetching calls from Vapi.ai...', 'blue');
  const vapiCalls = await fetchVapiCalls();
  
  if (!vapiCalls || !Array.isArray(vapiCalls)) {
    log('❌ Failed to fetch Vapi calls', 'red');
    return;
  }
  
  log(`✅ Found ${vapiCalls.length} calls in Vapi.ai`, 'green');
  
  try {
    // Use the backend API to sync calls
    const BASE_URL = 'http://localhost:5000';
    
    // First login to get session
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aqibaziz817@gmail.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      log('❌ Failed to login, trying direct Vapi sync approach...', 'red');
      return;
    }
    
    const authCookie = loginResponse.headers.get('set-cookie') || '';
    log('✅ Successfully authenticated', 'green');
    
    // Create sync endpoint call
    const syncResponse = await fetch(`${BASE_URL}/api/calls/sync-vapi`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      },
      body: JSON.stringify({ force: true })
    });
    
    if (!syncResponse.ok) {
      log(`❌ Sync failed: ${syncResponse.status} ${syncResponse.statusText}`, 'red');
      const errorText = await syncResponse.text();
      log(`Error details: ${errorText}`, 'red');
      return;
    }
    
    const syncResult = await syncResponse.json();
    log('\n🎯 SYNC RESULTS:', 'cyan');
    log('================', 'cyan');
    log(`${JSON.stringify(syncResult, null, 2)}`, 'green');
    
  } catch (error) {
    log(`❌ Sync error: ${error.message}`, 'red');
  }
}

// Run the sync
syncMissingCalls();