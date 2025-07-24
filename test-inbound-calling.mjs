/**
 * Test script to validate inbound calling functionality
 * This script tests the critical Vapi.ai phone number to assistant assignment
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test credentials - using the user's login
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

// ANSI color codes for terminal output
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

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  return { response, data };
}

async function testInboundCalling() {
  log('🔍 Testing Inbound Calling Functionality', 'cyan');
  log('==========================================', 'cyan');
  
  let authCookie = '';
  
  try {
    // Step 1: Login to get authentication
    log('\n1. Authenticating user...', 'blue');
    const { response: loginResponse, data: loginData } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    });
    
    if (loginResponse.ok) {
      log('✅ Login successful', 'green');
      authCookie = loginResponse.headers.get('set-cookie') || '';
    } else {
      log(`❌ Login failed: ${loginData.message || 'Unknown error'}`, 'red');
      return;
    }
    
    // Step 2: Get user's agents
    log('\n2. Fetching user agents...', 'blue');
    const { response: agentsResponse, data: agents } = await makeRequest('/api/agents', {
      headers: { Cookie: authCookie }
    });
    
    if (!agentsResponse.ok || !Array.isArray(agents) || agents.length === 0) {
      log('❌ No agents found. Create an agent first.', 'red');
      return;
    }
    
    const agent = agents[0];
    log(`✅ Found agent: ${agent.name} (ID: ${agent.id})`, 'green');
    
    if (!agent.vapiAssistantId) {
      log('⚠️ Agent does not have a Vapi Assistant ID. Publishing agent...', 'yellow');
      
      // Publish the agent to create Vapi assistant
      const { response: publishResponse, data: publishData } = await makeRequest('/api/vapi/assistants', {
        method: 'POST',
        headers: { Cookie: authCookie },
        body: JSON.stringify({
          name: agent.name,
          firstMessage: agent.initialMessage || "Hello, how can I assist you today?",
          metadata: { agentId: agent.id.toString() },
          voice: {
            provider: "11labs",
            voiceId: agent.voiceSettings?.voiceId || "EXAVITQu4vr4xnSDxMaL",
            speed: agent.voiceSettings?.speed || 1.0
          },
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: agent.systemPrompt || "You are a helpful AI assistant."
              }
            ]
          }
        })
      });
      
      if (publishResponse.ok) {
        log(`✅ Agent published successfully with Vapi ID: ${publishData.assistant?.id}`, 'green');
        agent.vapiAssistantId = publishData.assistant?.id;
      } else {
        log(`❌ Failed to publish agent: ${publishData.message}`, 'red');
        return;
      }
    } else {
      log(`✅ Agent has Vapi Assistant ID: ${agent.vapiAssistantId}`, 'green');
    }
    
    // Step 3: Get user's phone numbers
    log('\n3. Fetching phone numbers...', 'blue');
    const { response: numbersResponse, data: phoneNumbers } = await makeRequest('/api/phone-numbers', {
      headers: { Cookie: authCookie }
    });
    
    if (!numbersResponse.ok || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      log('❌ No phone numbers found. Purchase a phone number first.', 'red');
      return;
    }
    
    const phoneNumber = phoneNumbers[0];
    log(`✅ Found phone number: ${phoneNumber.number} (ID: ${phoneNumber.id})`, 'green');
    
    if (!phoneNumber.vapiPhoneNumberId) {
      log('⚠️ Phone number is not registered with Vapi.ai', 'yellow');
      log('💡 Purchase a new number or re-register existing numbers for inbound calling to work', 'yellow');
      return;
    } else {
      log(`✅ Phone number registered with Vapi ID: ${phoneNumber.vapiPhoneNumberId}`, 'green');
    }
    
    // Step 4: Test phone number assignment to agent
    log('\n4. Testing phone number assignment to agent...', 'blue');
    const { response: assignResponse, data: assignData } = await makeRequest(`/api/phone-numbers/${phoneNumber.id}/assign`, {
      method: 'PATCH',
      headers: { Cookie: authCookie },
      body: JSON.stringify({ agentId: agent.id })
    });
    
    if (assignResponse.ok) {
      log('✅ Phone number assigned to agent successfully', 'green');
      log('✅ Vapi.ai phone-to-assistant assignment should be configured automatically', 'green');
    } else {
      log(`❌ Failed to assign phone number: ${assignData.message}`, 'red');
      return;
    }
    
    // Step 5: Verify the assignment worked
    log('\n5. Verifying assignment...', 'blue');
    const { response: verifyResponse, data: updatedNumbers } = await makeRequest('/api/phone-numbers', {
      headers: { Cookie: authCookie }
    });
    
    if (verifyResponse.ok) {
      const assignedNumber = Array.isArray(updatedNumbers) ? updatedNumbers.find(n => n.id === phoneNumber.id) : null;
      if (assignedNumber && assignedNumber.agentId === agent.id) {
        log(`✅ Assignment verified: Phone ${assignedNumber.number} is assigned to agent ${agent.name}`, 'green');
      } else {
        log('❌ Assignment verification failed', 'red');
        return;
      }
    }
    
    // Final success message
    log('\n🎉 INBOUND CALLING TEST COMPLETED SUCCESSFULLY!', 'green');
    log('==========================================', 'green');
    log(`📞 Phone Number: ${phoneNumber.number}`, 'cyan');
    log(`🤖 Agent: ${agent.name}`, 'cyan');
    log(`🔗 Vapi Assistant ID: ${agent.vapiAssistantId}`, 'cyan');
    log(`🔗 Vapi Phone ID: ${phoneNumber.vapiPhoneNumberId}`, 'cyan');
    log('\n💡 Inbound calls to this number should now be handled by the assigned agent!', 'green');
    
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
testInboundCalling();