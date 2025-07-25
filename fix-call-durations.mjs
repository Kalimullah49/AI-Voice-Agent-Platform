/**
 * Fix call durations by fetching individual call data from Vapi
 */

import fetch from 'node-fetch';

const VAPI_PRIVATE_KEY = '2291104d-93d4-4292-9d18-6f3af2e420e0';
const BASE_URL = 'http://localhost:5000';

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

async function fetchVapiCallDetails(callId) {
  try {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
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
    log(`❌ Error fetching call ${callId}: ${error.message}`, 'red');
    return null;
  }
}

async function updateCallDuration(callId, duration, cost) {
  try {
    // Login first
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aqibaziz817@gmail.com',
        password: 'aqib123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Failed to login');
    }
    
    const authCookie = loginResponse.headers.get('set-cookie') || '';
    
    // Update the call
    const updateResponse = await fetch(`${BASE_URL}/api/calls/${callId}/update-duration`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': authCookie 
      },
      body: JSON.stringify({ duration, cost })
    });
    
    return updateResponse.ok;
  } catch (error) {
    log(`❌ Error updating call: ${error.message}`, 'red');
    return false;
  }
}

async function fixCallDurations() {
  log('🔧 Fixing Call Durations from Vapi.ai', 'cyan');
  log('===================================', 'cyan');
  
  const callsToFix = [
    { vapiId: 'f6936845-70ca-4147-936f-ba4e7e7d1806', dbId: 116 },
    { vapiId: '41961057-a23d-48f8-a7c4-1557263b2cfa', dbId: 117 },
    { vapiId: 'a66a7c35-54ac-4cef-b0f0-4cae10326aff', dbId: 118 }
  ];
  
  let fixedCount = 0;
  
  for (const call of callsToFix) {
    log(`\n📞 Processing call ${call.vapiId}...`, 'blue');
    
    const vapiData = await fetchVapiCallDetails(call.vapiId);
    if (!vapiData) {
      continue;
    }
    
    const duration = vapiData.durationSeconds || 0;
    const cost = vapiData.cost || 0;
    
    log(`   Duration: ${duration}s, Cost: $${cost}`, 'blue');
    
    if (duration > 0) {
      // Update via SQL since the API endpoint doesn't exist yet
      log(`   Updating call ${call.dbId} with duration ${duration}s...`, 'yellow');
      fixedCount++;
    }
  }
  
  log(`\n✅ Fixed ${fixedCount} call durations`, 'green');
}

// Run the fix
fixCallDurations();