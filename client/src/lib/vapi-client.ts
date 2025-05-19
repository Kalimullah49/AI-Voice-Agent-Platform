/**
 * Helper functions for integrating with Vapi.ai
 */

/**
 * Get the Vapi API token for client-side use
 * @returns Promise that resolves to the token
 */
export async function getVapiToken(): Promise<{success: boolean, token?: string, message?: string}> {
  try {
    const response = await fetch('/api/vapi/web-token');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting Vapi token:', error);
    return {
      success: false,
      message: 'Failed to fetch Vapi token'
    };
  }
}

/**
 * Initialize a test call using Vapi web SDK
 * This function is called from the client side and requires the Vapi web SDK
 * @param assistantId The ID of the Vapi assistant to call
 * @param apiKey The Vapi API key
 */
export async function initializeVapiCall(assistantId: string, apiKey: string) {
  try {
    // This requires the @vapi-ai/web package to be loaded
    // and is meant to be called from a client component
    const Vapi = (window as any).Vapi;
    
    if (!Vapi) {
      throw new Error('Vapi SDK not loaded');
    }
    
    // Initialize the Vapi client with the API key
    const vapi = new Vapi(apiKey);
    
    // Start a call with the assistant
    await vapi.start(assistantId);
    
    return {
      success: true,
      instance: vapi
    };
  } catch (error: unknown) {
    console.error('Error initializing Vapi call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Vapi call';
    return {
      success: false,
      message: errorMessage
    };
  }
}