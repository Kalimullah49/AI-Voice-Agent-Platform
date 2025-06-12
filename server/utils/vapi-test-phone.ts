/**
 * Test file for Vapi.ai Phone Number API connection
 * This tests if we can access phone numbers with the public API key
 */

import fetch from 'node-fetch';

// Hardcoded Vapi.ai API keys for production reliability
const VAPI_PUBLIC_KEY = 'fb797cfa-b827-4c00-a7ae-e7e481b27e73';
const VAPI_PRIVATE_KEY = 'fe19bb22-6b68-4faa-8eb4-b5dd34e63d1c';

// Vapi.ai API Base URL
const VAPI_API_BASE_URL = 'https://api.vapi.ai';

/**
 * Test connecting to the Vapi.ai phone number API
 */
export async function testVapiPhoneAPI() {
  if (!VAPI_PUBLIC_KEY) {
    console.error('VAPI_PUBLIC_KEY is not defined in environment variables');
    return { success: false, message: 'Public API key not configured' };
  }

  try {
    // Make a GET request to the phone number endpoint to test access with private key
    const response = await fetch(`${VAPI_API_BASE_URL}/phone-number`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Vapi.ai phone API connection test failed:', data);
      return { 
        success: false, 
        message: `API Error: ${data.message || data.error || response.statusText}`,
        status: response.status
      };
    }
    
    console.log('Vapi.ai phone API connection successful');
    return { 
      success: true, 
      message: 'Phone API connection successful',
      phoneNumbers: data
    };
  } catch (error) {
    console.error('Error testing Vapi.ai phone API connection:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Run the test immediately when this file is loaded
testVapiPhoneAPI()
  .then(result => {
    console.log('Test result:', result);
  })
  .catch(error => {
    console.error('Test failed with exception:', error);
  });