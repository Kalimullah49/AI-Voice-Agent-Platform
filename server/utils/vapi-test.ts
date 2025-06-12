/**
 * Test file for Vapi.ai API connection
 * This is a utility to verify the Vapi.ai API key is working correctly
 */

import fetch from 'node-fetch';

// Get the Vapi.ai API token from environment variables
const VAPI_AI_TOKEN = 'fb797cfa-b827-4c00-a7ae-e7e481b27e73';

// Vapi.ai API Base URL
const VAPI_API_BASE_URL = 'https://api.vapi.ai';

/**
 * Test connection to the Vapi.ai API
 */
export async function testVapiApiConnection() {
  if (!VAPI_AI_TOKEN) {
    console.error('VAPI_AI_TOKEN is not defined in environment variables');
    return { success: false, message: 'API token not configured' };
  }

  try {
    // Try the phone-number endpoint which might have different permissions
    const response = await fetch(`${VAPI_API_BASE_URL}/phone-number`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_AI_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Vapi.ai API connection test failed:', data);
      return { 
        success: false, 
        message: `API Error: ${data.message || data.error || response.statusText}`,
        status: response.status
      };
    }
    
    console.log('Vapi.ai API connection successful');
    return { 
      success: true, 
      message: 'API connection successful',
      keyInfo: `Key starts with: ${VAPI_AI_TOKEN.substring(0, 8)}...`
    };
  } catch (error) {
    console.error('Error testing Vapi.ai API connection:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Run the test immediately when this file is loaded
testVapiApiConnection()
  .then(result => {
    console.log('Test result:', result);
  })
  .catch(error => {
    console.error('Test failed with exception:', error);
  });