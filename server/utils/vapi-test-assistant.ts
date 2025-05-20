/**
 * Test file for Vapi.ai Assistant API connection
 * This tests if we can create an assistant with the current API key
 */

import fetch from 'node-fetch';

// Get the Vapi.ai API token from environment variables
const VAPI_AI_TOKEN = process.env.VAPI_AI_TOKEN || '';

// Vapi.ai API Base URL
const VAPI_API_BASE_URL = 'https://api.vapi.ai';

/**
 * Test creating a Vapi.ai assistant
 */
export async function testCreateVapiAssistant() {
  if (!VAPI_AI_TOKEN) {
    console.error('VAPI_AI_TOKEN is not defined in environment variables');
    return { success: false, message: 'API token not configured' };
  }

  try {
    // Test data for assistant creation - updated to match current API requirements
    const assistantData = {
      name: "Test Assistant",
      model: {
        provider: "openai",
        model: "gpt-4-turbo",
        temperature: 0.7,
        systemPrompt: "You are a helpful test assistant created to verify API access."
      },
      metadata: {
        test: true,
        created: new Date().toISOString()
      }
    };
    
    console.log('Attempting to create Vapi test assistant with data:', JSON.stringify(assistantData, null, 2));
    
    // Make API request to Vapi.ai to create an assistant
    const response = await fetch(`${VAPI_API_BASE_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      },
      body: JSON.stringify(assistantData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Vapi.ai assistant creation test failed:', data);
      return { 
        success: false, 
        message: `API Error: ${data.message || data.error || response.statusText}`,
        status: response.status
      };
    }
    
    console.log('Vapi.ai assistant creation successful');
    return { 
      success: true, 
      message: 'Assistant creation successful',
      assistantId: data.id,
      data: data
    };
  } catch (error) {
    console.error('Error testing Vapi.ai assistant creation:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Run the test immediately when this file is loaded
testCreateVapiAssistant()
  .then(result => {
    console.log('Test result:', result);
  })
  .catch(error => {
    console.error('Test failed with exception:', error);
  });