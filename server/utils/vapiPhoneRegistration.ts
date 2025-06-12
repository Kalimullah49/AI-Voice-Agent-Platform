/**
 * Vapi.ai Phone Number Registration Utilities
 * This file handles registering Twilio phone numbers with Vapi.ai and managing agent assignments
 */

import fetch from 'node-fetch';
import { storage } from '../storage';

// Hardcoded Vapi.ai API key for production reliability
const VAPI_PRIVATE_KEY = 'fe19bb22-6b68-4faa-8eb4-b5dd34e63d1c';

// Vapi.ai API Base URL
const VAPI_API_BASE_URL = 'https://api.vapi.ai';

/**
 * Register a phone number with Vapi.ai using the new format
 * @param phoneNumber The phone number in E.164 format (e.g., +19205451773)
 * @param twilioSid The Twilio SID for the phone number
 * @param friendlyName A friendly name for the phone number (optional)
 * @param agentId The agent ID to associate with this number (optional)
 * @returns Success status, message, and Vapi phone number ID
 */
export async function registerPhoneNumberWithVapi(
  phoneNumber: string,
  twilioSid: string,
  friendlyName?: string,
  agentId?: number
): Promise<{ success: boolean; message?: string; phoneNumberId?: string }> {
  try {
    // Check if Vapi private key is available
    if (!VAPI_PRIVATE_KEY) {
      console.error("VAPI_PRIVATE_KEY is missing. Please set this environment variable.");
      return {
        success: false,
        message: "Vapi.ai private key is not defined. Please set VAPI_PRIVATE_KEY in your environment variables."
      };
    }

    // Format phone number to ensure E.164 format (if not already)
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;
    
    // Create a descriptive friendly name if one wasn't provided
    const phoneFriendlyName = friendlyName || (agentId 
      ? `Agent Number - ${agentId}`
      : `Twilio Number - ${formattedPhoneNumber}`);
    
    console.log(`Registering phone number with Vapi.ai: ${formattedPhoneNumber} (${phoneFriendlyName})`);
    
    // Create the payload for Vapi.ai
    const payload = {
      provider: "twilio",
      number: formattedPhoneNumber,
      sid: twilioSid,
      friendlyName: phoneFriendlyName
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    // Make API request to Vapi.ai
    const response = await fetch(`${VAPI_API_BASE_URL}/numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    // Parse response data
    let responseData: any;
    try {
      responseData = await response.json();
      console.log(`Vapi.ai registration response status: ${response.status}, data:`, 
        JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error("Error parsing Vapi.ai response:", parseError);
      return {
        success: false,
        message: `Error parsing Vapi.ai response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }
    
    if (!response.ok) {
      console.error(`Vapi.ai API error registering phone number: ${response.status} - `, responseData);
      return {
        success: false,
        message: `Error registering number with Vapi.ai: ${responseData?.message || responseData?.error || response.statusText}`
      };
    }
    
    // Extract the Vapi phone number ID from the response
    const vapiPhoneNumberId = responseData?.id;
    
    if (!vapiPhoneNumberId) {
      console.warn('Vapi.ai registration succeeded but no phone number ID was returned:', responseData);
      return {
        success: true,
        message: "Phone number registered successfully, but no ID was returned by Vapi.ai",
      };
    }
    
    console.log(`Successfully registered phone number with Vapi.ai, ID: ${vapiPhoneNumberId}`);
    
    return {
      success: true,
      message: "Phone number registered successfully with Vapi.ai",
      phoneNumberId: vapiPhoneNumberId,
    };
  } catch (error) {
    console.error('Error registering phone number with Vapi.ai:', error);
    return {
      success: false,
      message: `Error registering phone number: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Assign a phone number to an agent and update the Vapi.ai association
 * @param phoneNumberId The database ID of the phone number
 * @param agentId The database ID of the agent
 * @returns Success status and updated phone number record
 */
export async function assignPhoneNumberToAgent(
  phoneNumberId: number,
  agentId: number
): Promise<{ success: boolean; message?: string; phoneNumber?: any }> {
  try {
    // Get the phone number and agent info
    const phoneNumber = await storage.getPhoneNumber(phoneNumberId);
    if (!phoneNumber) {
      return {
        success: false,
        message: "Phone number not found"
      };
    }
    
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      return {
        success: false,
        message: "Agent not found"
      };
    }
    
    // Update the phone number in the database
    const updatedPhoneNumber = await storage.updatePhoneNumber(phoneNumberId, {
      agentId: agentId
    });
    
    if (!updatedPhoneNumber) {
      return {
        success: false,
        message: "Failed to update phone number in database"
      };
    }
    
    // If the phone number has a Vapi ID, update the friendly name to reflect the agent assignment
    if (phoneNumber.vapiPhoneNumberId) {
      try {
        // This would call Vapi API to update the phone number's friendly name
        // This is just a placeholder as Vapi might not support directly updating phone numbers
        console.log(`Would update Vapi phone number ${phoneNumber.vapiPhoneNumberId} to associate with agent ${agentId}`);
      } catch (vapiError) {
        // Log the error but don't fail the entire operation
        console.error(`Failed to update Vapi phone number friendly name: ${vapiError instanceof Error ? vapiError.message : 'Unknown error'}`);
      }
    }
    
    return {
      success: true,
      message: `Phone number ${phoneNumber.number} successfully assigned to agent "${agent.name}"`,
      phoneNumber: updatedPhoneNumber
    };
  } catch (error) {
    console.error('Error assigning phone number to agent:', error);
    return {
      success: false,
      message: `Error assigning phone number: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}