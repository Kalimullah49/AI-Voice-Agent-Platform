/**
 * Vapi.ai Integration Utilities
 */

import fetch from 'node-fetch';
import { storage } from '../storage';

// Get Vapi.ai API key from environment variables
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || '';

/**
 * Register a phone number with Vapi.ai
 * @param phoneNumber The phone number in E.164 format
 * @param twilioSid The Twilio SID for the phone number
 * @param friendlyName A friendly name for the phone number
 * @returns Success status, message, and Vapi phone number ID
 */
export async function registerPhoneNumberWithVapiNumbers(
  phoneNumber: string,
  twilioSid: string,
  friendlyName: string
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
    
    // Format phone number to ensure E.164 format
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;
    
    console.log(`Registering phone number with Vapi.ai: ${formattedPhoneNumber} (${friendlyName})`);
    
    // Create the payload for Vapi.ai
    const payload = {
      provider: "twilio",
      number: formattedPhoneNumber,
      sid: twilioSid,
      friendlyName
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    // Make API request to Vapi.ai using the new /numbers endpoint
    const response = await fetch('https://api.vapi.ai/numbers', {
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
      console.warn('Vapi.ai registration succeeded but no ID was returned:', responseData);
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
 * Assign a phone number to an agent
 * @param phoneNumberId Database ID of the phone number
 * @param agentId Database ID of the agent
 * @returns Success status and updated phone number
 */
export async function assignPhoneToAgent(
  phoneNumberId: number,
  agentId: number
): Promise<{ success: boolean; message?: string; phoneNumber?: any }> {
  try {
    // Get the phone number and agent data
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
    
    // If the phone number doesn't have a Vapi ID yet but has a Twilio SID
    // Register it with Vapi.ai
    if (!phoneNumber.vapiPhoneNumberId && phoneNumber.twilioSid) {
      try {
        const friendlyName = `Agent Number - ${agent.name || agent.id}`;
        
        const vapiResult = await registerPhoneNumberWithVapiNumbers(
          phoneNumber.number,
          phoneNumber.twilioSid,
          friendlyName
        );
        
        if (vapiResult.success && vapiResult.phoneNumberId) {
          console.log(`Successfully registered ${phoneNumber.number} with Vapi.ai (ID: ${vapiResult.phoneNumberId})`);
          
          // Update the phone number with the Vapi ID
          await storage.updatePhoneNumber(phoneNumberId, {
            vapiPhoneNumberId: vapiResult.phoneNumberId
          });
          
          // Update our local copy
          phoneNumber.vapiPhoneNumberId = vapiResult.phoneNumberId;
        } else {
          console.warn(`Failed to register phone number with Vapi.ai: ${vapiResult.message}`);
        }
      } catch (vapiError) {
        console.error('Error registering with Vapi:', vapiError);
        // Continue with assignment even if Vapi registration fails
      }
    }
    
    // Update the phone number-agent mapping
    const updatedPhoneNumber = await storage.updatePhoneNumber(phoneNumberId, { agentId });
    
    if (!updatedPhoneNumber) {
      return {
        success: false,
        message: "Failed to update phone number in database"
      };
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