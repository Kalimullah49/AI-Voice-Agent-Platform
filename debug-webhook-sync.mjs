/**
 * Debug script to compare Vapi.ai call data with local database
 * This helps identify webhook synchronization issues
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

async function fetchDatabaseCalls() {
  try {
    // Login first to get authentication
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    if (!loginResponse.ok) {
      log('❌ Login failed, using direct database query...', 'yellow');
      return null;
    }
    
    const authCookie = loginResponse.headers.get('set-cookie') || '';
    
    const callsResponse = await fetch(`${BASE_URL}/api/calls`, {
      headers: { Cookie: authCookie }
    });
    
    if (!callsResponse.ok) {
      throw new Error(`Database API error: ${callsResponse.status} ${callsResponse.statusText}`);
    }
    
    const calls = await callsResponse.json();
    return calls;
  } catch (error) {
    log(`❌ Error fetching database calls: ${error.message}`, 'red');
    return null;
  }
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(cost) {
  return `$${(cost || 0).toFixed(4)}`;
}

async function compareCallData() {
  log('🔍 Webhook Synchronization Debug', 'cyan');
  log('================================', 'cyan');
  
  // Fetch data from both sources
  log('\n📡 Fetching calls from Vapi.ai...', 'blue');
  const vapiCalls = await fetchVapiCalls();
  
  log('🗄️ Fetching calls from local database...', 'blue');
  const dbCalls = await fetchDatabaseCalls();
  
  if (!vapiCalls || !dbCalls) {
    log('❌ Failed to fetch data from one or both sources', 'red');
    return;
  }
  
  log(`\n📊 COMPARISON RESULTS`, 'cyan');
  log(`Vapi.ai calls: ${vapiCalls.length}`, 'blue');
  log(`Database calls: ${Array.isArray(dbCalls) ? dbCalls.length : 0}`, 'blue');
  
  if (!Array.isArray(vapiCalls) || vapiCalls.length === 0) {
    log('❌ No calls found in Vapi.ai', 'red');
    return;
  }
  
  if (!Array.isArray(dbCalls) || dbCalls.length === 0) {
    log('❌ No calls found in database', 'red');
    return;
  }
  
  // Compare each Vapi call with database
  log('\n🔄 DETAILED COMPARISON:', 'cyan');
  log('======================', 'cyan');
  
  for (let i = 0; i < vapiCalls.length; i++) {
    const vapiCall = vapiCalls[i];
    const dbCall = dbCalls.find(call => call.vapiCallId === vapiCall.id);
    
    log(`\n📞 Call ${i + 1}: ${vapiCall.id}`, 'yellow');
    log('─'.repeat(50), 'gray');
    
    // Vapi call details
    log(`📡 VAPI DATA:`, 'blue');
    log(`   ID: ${vapiCall.id}`);
    log(`   Status: ${vapiCall.status || 'unknown'}`);
    log(`   Type: ${vapiCall.type || 'unknown'}`);
    log(`   Duration: ${formatDuration(vapiCall.durationSeconds)}`);
    log(`   Cost: ${formatCost(vapiCall.cost)}`);
    log(`   Started: ${vapiCall.startedAt ? new Date(vapiCall.startedAt).toLocaleString() : 'unknown'}`);
    log(`   Ended: ${vapiCall.endedAt ? new Date(vapiCall.endedAt).toLocaleString() : 'unknown'}`);
    log(`   From: ${vapiCall.customer?.number || 'unknown'}`);
    log(`   To: ${vapiCall.phoneNumber?.number || 'unknown'}`);
    log(`   Assistant ID: ${vapiCall.assistantId || 'unknown'}`);
    log(`   End Reason: ${vapiCall.endedReason || 'unknown'}`);
    
    // Database call details
    if (dbCall) {
      log(`🗄️ DATABASE DATA:`, 'green');
      log(`   ID: ${dbCall.id} (Local)`);
      log(`   Vapi ID: ${dbCall.vapiCallId}`);
      log(`   Status: ${dbCall.outcome || 'unknown'}`);
      log(`   Duration: ${formatDuration(dbCall.duration)}`);
      log(`   Cost: ${formatCost(dbCall.cost)}`);
      log(`   Started: ${dbCall.startedAt ? new Date(dbCall.startedAt).toLocaleString() : 'unknown'}`);
      log(`   From: ${dbCall.fromNumber || 'unknown'}`);
      log(`   To: ${dbCall.toNumber || 'unknown'}`);
      log(`   Agent ID: ${dbCall.agentId || 'unknown'}`);
      log(`   End Reason: ${dbCall.endedReason || 'unknown'}`);
      log(`   Recording: ${dbCall.recordingUrl ? '✅ Available' : '❌ Missing'}`);
      
      // Check for discrepancies
      const issues = [];
      if (vapiCall.durationSeconds !== dbCall.duration) {
        issues.push(`Duration mismatch: Vapi=${vapiCall.durationSeconds}s, DB=${dbCall.duration}s`);
      }
      if (Math.abs((vapiCall.cost || 0) - (dbCall.cost || 0)) > 0.0001) {
        issues.push(`Cost mismatch: Vapi=${formatCost(vapiCall.cost)}, DB=${formatCost(dbCall.cost)}`);
      }
      if (vapiCall.status !== dbCall.outcome) {
        issues.push(`Status mismatch: Vapi=${vapiCall.status}, DB=${dbCall.outcome}`);
      }
      
      if (issues.length > 0) {
        log(`⚠️ DISCREPANCIES FOUND:`, 'yellow');
        issues.forEach(issue => log(`   • ${issue}`, 'yellow'));
      } else {
        log(`✅ Data matches correctly`, 'green');
      }
    } else {
      log(`❌ MISSING FROM DATABASE`, 'red');
      log(`   This call exists in Vapi but not in local database!`, 'red');
      log(`   Possible webhook processing issue.`, 'red');
    }
  }
  
  // Check for database calls without Vapi match
  log('\n🔍 ORPHANED DATABASE CALLS:', 'cyan');
  const orphanedCalls = dbCalls.filter(dbCall => 
    !vapiCalls.find(vapiCall => vapiCall.id === dbCall.vapiCallId)
  );
  
  if (orphanedCalls.length > 0) {
    log(`❌ Found ${orphanedCalls.length} calls in database that don't exist in Vapi:`, 'red');
    orphanedCalls.forEach(call => {
      log(`   • DB ID: ${call.id}, Vapi ID: ${call.vapiCallId || 'missing'}, Started: ${new Date(call.startedAt).toLocaleString()}`, 'red');
    });
  } else {
    log(`✅ No orphaned calls found`, 'green');
  }
  
  log('\n🎯 WEBHOOK SYNC SUMMARY:', 'cyan');
  log('========================', 'cyan');
  
  const syncedCalls = dbCalls.filter(dbCall => 
    vapiCalls.find(vapiCall => vapiCall.id === dbCall.vapiCallId)
  ).length;
  const missingSynced = vapiCalls.length - syncedCalls;
  
  log(`Total Vapi calls: ${vapiCalls.length}`, 'blue');
  log(`Successfully synced: ${syncedCalls}`, syncedCalls === vapiCalls.length ? 'green' : 'yellow');
  log(`Missing from DB: ${missingSynced}`, missingSynced === 0 ? 'green' : 'red');
  log(`Orphaned in DB: ${orphanedCalls.length}`, orphanedCalls.length === 0 ? 'green' : 'red');
  
  if (missingSynced === 0 && orphanedCalls.length === 0) {
    log('\n🎉 WEBHOOK SYNCHRONIZATION IS WORKING PERFECTLY!', 'green');
  } else {
    log('\n⚠️ WEBHOOK SYNCHRONIZATION ISSUES DETECTED', 'red');
    log('Check webhook processing logic and ensure all events are handled properly.', 'yellow');
  }
}

// Run the comparison
compareCallData();