/**
 * Vapi.ai Integration Utilities
 */

import fetch from 'node-fetch';
import { storage } from '../storage';

// Get Vapi.ai API key from environment variables
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || '';

/**
 * Register a phone number with Vapi.ai Numbers API
 * @param phoneNumber The phone number to register
 * @param twilioAccountSid The Twilio Account SID (NOT the phone number SID)
 * @param friendlyName A friendly name for the phone number
 * @returns Success status and Vapi phone number ID if successful
 */
export async function registerPhoneNumberWithVapiNumbers(
  phoneNumber: string,
  twilioAccountSid: string,
  friendlyName: string,
  twilioAuthToken?: string
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
    
    // Create the payload for Vapi.ai with correct field names
    // Using only fields that Vapi.ai specifically accepts
    // IMPORTANT: Vapi.ai requires the Twilio account SID, not the phone number SID
    // This is critical for verification with Twilio's API
    // Build the payload with available credentials
    const payload: any = {
      provider: "twilio",
      number: formattedPhoneNumber,
      twilioAccountSid: twilioAccountSid
    };
    
    // Add auth token if provided (helps with verification)
    if (twilioAuthToken) {
      payload.twilioAuthToken = twilioAuthToken;
    }
    
    console.log(`Attempting to register phone number ${formattedPhoneNumber} with Twilio account SID: ${twilioAccountSid}`);
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    // Check if the phone number is already in use at Vapi.ai
    // First, try to get the phone number details from Vapi.ai
    const checkResponse = await fetch(`https://api.vapi.ai/phone-number/${encodeURIComponent(formattedPhoneNumber)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
      }
    });
    
    // If the phone number already exists in Vapi, we can skip registration
    if (checkResponse.ok) {
      const existingData = await checkResponse.json();
      console.log(`Phone number ${formattedPhoneNumber} already exists in Vapi.ai with ID: ${existingData.id}`);
      return {
        success: true,
        message: "Phone number already registered with Vapi.ai",
        phoneNumberId: existingData.id
      };
    }
    
    // If the number doesn't exist yet, register it
    // Make API request to Vapi.ai using the correct endpoint
    // Using api.vapi.ai/phone-number as the endpoint (singular, not plural)
    const response = await fetch('https://api.vapi.ai/phone-number', {
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
      
      // Get a more detailed error message, especially for the "Number Not Found on Twilio" error
      let errorMessage: string;
      
      // Handle array of error messages
      if (Array.isArray(responseData?.message)) {
        errorMessage = responseData.message.join(', ');
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      } else if (responseData?.error) {
        errorMessage = responseData.error;
      } else {
        errorMessage = response.statusText;
      }
      
      // If the error is about verifying with Twilio, provide a more helpful message
      if (errorMessage.includes("Number Not Found on Twilio") || errorMessage.toLowerCase().includes("twilio")) {
        errorMessage = `This phone number couldn't be verified with your Twilio account. Please ensure the number exists in your Twilio account and the account SID is correct. Error: ${errorMessage}`;
      }
      
      return {
        success: false,
        message: `Error registering number with Vapi.ai: ${errorMessage}`
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
    
    // Check if agent already has a phone number assigned - we only allow one phone number per agent
    if (agentId) {
      const agentPhoneNumbers = await storage.getPhoneNumbersByAgentId(agentId);
      if (agentPhoneNumbers.length > 0 && !agentPhoneNumbers.some(pn => pn.id === phoneNumberId)) {
        return {
          success: false,
          message: `Agent "${agent.name}" already has a phone number assigned. Please unassign the existing number first.`
        };
      }
    }
    
    // Verify that this is a valid phone number in the Twilio account
    if (phoneNumber.twilioAccountId) {
      const twilioAccount = await storage.getTwilioAccount(phoneNumber.twilioAccountId);
      if (!twilioAccount) {
        return {
          success: false,
          message: "The Twilio account associated with this phone number was not found."
        };
      }
      
      // We need to make sure this phone number is actually valid in Twilio
      // Before we try to register it with Vapi
      if (!phoneNumber.twilioSid) {
        return {
          success: false,
          message: "This phone number doesn't have a valid Twilio SID. Please make sure it's properly imported from your Twilio account."
        };
      }
    }
    
    // For accurate synchronization with Vapi.ai, we need to register the phone number first
    // and only proceed with assignment if registration is successful
    if (agentId && phoneNumber.twilioAccountId) {
      try {
        // Get the Twilio account details to use the correct account SID
        const twilioAccount = await storage.getTwilioAccount(phoneNumber.twilioAccountId);
        if (!twilioAccount) {
          return {
            success: false,
            message: "Twilio account not found for this phone number. Cannot register with Vapi.ai."
          };
        }
        
        const friendlyName = `Agent Number - ${agent.name || agent.id}`;
        
        // Check if we already have a Vapi phone number ID
        if (phoneNumber.vapiPhoneNumberId) {
          console.log(`Phone number ${phoneNumber.number} already has Vapi ID: ${phoneNumber.vapiPhoneNumberId}`);
        } else {
          // Try to register with Vapi.ai, and REQUIRE it to be successful
          const registerResult = await registerPhoneNumberWithVapiNumbers(
            phoneNumber.number,
            twilioAccount.accountSid,
            friendlyName
          );
          
          if (!registerResult.success) {
            return {
              success: false,
              message: `Failed to register phone number with Vapi.ai: ${registerResult.message}. This is required for proper integration.`
            };
          }
          
          console.log(`Successfully registered ${phoneNumber.number} with Vapi.ai (ID: ${registerResult.phoneNumberId})`);
          
          if (registerResult.phoneNumberId) {
            // Update the phone number with the Vapi ID
            await storage.updatePhoneNumber(phoneNumberId, {
              vapiPhoneNumberId: registerResult.phoneNumberId
            });
            
            // Update our local copy for later use
            phoneNumber.vapiPhoneNumberId = registerResult.phoneNumberId;
          } else {
            console.warn("No Vapi phone number ID was returned in successful registration response");
          }
        }
        
        // Now associate the phone number with the agent's Vapi assistant
        if (agent.vapiAssistantId) {
          try {
            console.log(`Associating phone number ${phoneNumber.number} with Vapi assistant ${agent.vapiAssistantId}`);
            
            // Make API request to associate the number with the assistant
            const associateResponse = await fetch(`https://api.vapi.ai/phone-number/${encodeURIComponent(phoneNumber.number)}/assistant`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                assistantId: agent.vapiAssistantId
              })
            });
            
            if (!associateResponse.ok) {
              let errorMessage = `HTTP error ${associateResponse.status}`;
              try {
                const errorData = await associateResponse.json();
                errorMessage = `Vapi.ai API error: ${errorData.message || errorData.error || associateResponse.statusText}`;
                console.error(`Vapi.ai API error associating phone number with assistant: ${associateResponse.status} - `, errorData);
              } catch (parseError) {
                console.error(`Vapi.ai API error associating phone number with assistant: ${associateResponse.status}`);
              }
              
              return {
                success: false,
                message: `Failed to associate phone number with Vapi assistant: ${errorMessage}. This is required for proper integration.`
              };
            }
            
            console.log(`Successfully associated phone number ${phoneNumber.number} with Vapi assistant ${agent.vapiAssistantId}`);
          } catch (associationError) {
            console.error('Error associating phone number with Vapi assistant:', associationError);
            return {
              success: false,
              message: `Error associating phone number with Vapi assistant: ${associationError instanceof Error ? associationError.message : 'Unknown error'}`
            };
          }
        } else {
          return {
            success: false,
            message: "Agent doesn't have a Vapi assistant ID. Please create or update the agent first."
          };
        }
      } catch (vapiError) {
        console.error('Error during Vapi integration:', vapiError);
        return {
          success: false,
          message: `Error during Vapi.ai integration: ${vapiError instanceof Error ? vapiError.message : 'Unknown error'}`
        };
      }
    }
    
    // Check if this phone number is already assigned to another agent
    const existingPhoneNumbers = await storage.getPhoneNumbersByAgentId(agentId);
    if (existingPhoneNumbers.length > 0) {
      console.log(`Agent ${agentId} already has ${existingPhoneNumbers.length} phone numbers assigned`);
      // This is OK, one agent can have multiple phone numbers
    }
    
    // Check if any agent is using this phone number
    if (phoneNumber.agentId && phoneNumber.agentId !== agentId) {
      console.log(`Phone number ${phoneNumber.number} is already assigned to agent ${phoneNumber.agentId}, will reassign to ${agentId}`);
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