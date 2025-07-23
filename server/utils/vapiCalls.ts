/**
 * Vapi.ai Call API Integration
 * Handles outbound calls through Vapi.ai
 */

import fetch from 'node-fetch';

// Hardcoded Vapi.ai API key for production reliability
const VAPI_PRIVATE_KEY = '2291104d-93d4-4292-9d18-6f3af2e420e0';

/**
 * Make an outbound call using Vapi.ai
 * @param assistantId The Vapi.ai assistant ID
 * @param phoneNumberId The Vapi.ai phone number ID
 * @param customerNumber The customer's phone number to call
 * @returns Success status and message
 */
export async function makeOutboundCall(
  assistantId: string,
  phoneNumberId: string,
  customerNumber: string
): Promise<{ success: boolean; message?: string; callId?: string }> {
  try {
    // Validate required parameters
    if (!assistantId) {
      return { success: false, message: "Assistant ID is required" };
    }
    
    if (!phoneNumberId) {
      return { success: false, message: "Phone number ID is required" };
    }
    
    if (!customerNumber) {
      return { success: false, message: "Customer phone number is required" };
    }
    
    // Check for API key
    if (!VAPI_PRIVATE_KEY) {
      return {
        success: false,
        message: "Vapi.ai private key is not defined. Please set VAPI_PRIVATE_KEY in your environment variables."
      };
    }
    
    // Format customer number to ensure E.164 format with US +1 prefix
    let formattedCustomerNumber = customerNumber.trim();
    
    // Remove any non-digit characters except the leading +
    if (formattedCustomerNumber.startsWith('+')) {
      formattedCustomerNumber = '+' + formattedCustomerNumber.slice(1).replace(/\D/g, '');
    } else {
      // Remove all non-digits
      formattedCustomerNumber = formattedCustomerNumber.replace(/\D/g, '');
      
      // Auto-add +1 for US numbers if no country code present and appears to be 10-digit US number
      if (formattedCustomerNumber.length === 10) {
        formattedCustomerNumber = '+1' + formattedCustomerNumber;
      } else if (!formattedCustomerNumber.startsWith('1') && formattedCustomerNumber.length === 11) {
        formattedCustomerNumber = '+' + formattedCustomerNumber;
      } else {
        formattedCustomerNumber = '+' + formattedCustomerNumber;
      }
    }
    
    // Create payload exactly as required by Vapi.ai
    const payload = {
      assistantId,
      phoneNumberId,
      customer: {
        number: formattedCustomerNumber
      }
    };
    
    console.log('Making outbound call with payload:', JSON.stringify(payload, null, 2));
    
    // Make API request to Vapi.ai V1 calls endpoint
    const response = await fetch('https://api.vapi.ai/api/v1/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    // Handle response
    if (!response.ok) {
      let errorText = await response.text();
      let errorMessage;
      
      try {
        const errorJson = JSON.parse(errorText);
        
        // Handle array of error messages
        if (Array.isArray(errorJson?.message)) {
          errorMessage = errorJson.message.join(', ');
        } else {
          errorMessage = errorJson?.message || errorJson?.error || response.statusText;
        }
      } catch (e) {
        errorMessage = errorText || response.statusText;
      }
      
      console.error(`Vapi.ai call API error: ${errorMessage}`);
      
      // Try the alternative endpoint if the v1 endpoint fails
      console.log('Trying alternative Vapi.ai endpoint...');
      
      const altPayload = {
        assistant_id: assistantId,
        from: phoneNumberId, // Using the phone number ID as "from"
        to: formattedCustomerNumber
      };
      
      const altResponse = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(altPayload)
      });
      
      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.error(`Alternative Vapi.ai endpoint also failed: ${altErrorText}`);
        return {
          success: false,
          message: `Failed to initiate call: ${errorMessage}. Alternative endpoint also failed.`
        };
      }
      
      // Parse the successful alternative response
      const altResponseData = await altResponse.json();
      
      return {
        success: true,
        message: "Call initiated successfully using alternative endpoint",
        callId: altResponseData?.id
      };
    }
    
    // Parse the successful response
    const responseData = await response.json();
    
    return {
      success: true,
      message: "Call initiated successfully",
      callId: responseData?.id
    };
  } catch (error) {
    console.error('Error making outbound call:', error);
    return {
      success: false,
      message: `Error making outbound call: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}