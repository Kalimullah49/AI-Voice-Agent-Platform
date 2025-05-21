/**
 * Vapi.ai Webhook Handler
 * 
 * This handles webhooks from Vapi.ai for:
 * - end-of-call-reports: To update call duration, cost, etc.
 * - status-updates: To track call status changes
 * - function-calls: To handle custom function calls from agents
 */

import { Request, Response } from 'express';
import { storage } from '../storage';
import { InsertWebhookLog } from '@shared/schema';

/**
 * Process an end-of-call report
 * @param data The webhook payload for an end-of-call report
 */
async function processEndOfCallReport(data: any) {
  try {
    console.log('Processing end-of-call report:', JSON.stringify(data, null, 2));
    
    // Support both old and new Vapi webhook formats
    const callData = data.call || data;
    
    if (!callData) {
      console.error('Invalid end-of-call report: missing call data');
      return;
    }
    
    // Extract call details from the webhook data
    const callId = callData.id || callData.call?.id || '';
    const assistantId = callData.assistantId || callData.assistant?.id || '';
    
    // Extract time and duration information
    let duration = callData.duration || 0;
    
    // If we don't have duration directly, try to calculate it
    if (!duration && callData.createdAt && callData.updatedAt) {
      const startTime = new Date(callData.createdAt);
      const endTime = new Date(callData.updatedAt);
      duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 1000); // duration in seconds
    }
    
    // If we still don't have duration, check if there's a transcript with timing info
    if (!duration && callData.transcript && callData.transcript.length > 0) {
      // Try to calculate from the transcript data
      const lastEntry = callData.transcript[callData.transcript.length - 1];
      if (lastEntry.secondsFromStart) {
        duration = Math.ceil(lastEntry.secondsFromStart);
      }
    }
    
    // Extract other call details
    const cost = callData.cost || 0;
    const status = callData.status || 'completed';
    const endReason = callData.endReason || null;
    
    // Extract phone numbers
    let fromNumber = '';
    let toNumber = '';
    
    // Try different possible locations for the phone numbers in the webhook
    if (callData.phoneNumber && callData.phoneNumber.number) {
      fromNumber = callData.phoneNumber.number;
    } else if (callData.transport && callData.transport.from) {
      fromNumber = callData.transport.from;
    } else if (callData.from) {
      fromNumber = callData.from;
    }
    
    if (callData.customer && callData.customer.number) {
      toNumber = callData.customer.number;
    } else if (callData.transport && callData.transport.to) {
      toNumber = callData.transport.to;
    } else if (callData.to) {
      toNumber = callData.to;
    }
    
    console.log(`Call ${callId} ended with duration ${duration}s, cost $${cost}, status: ${status}`);
    console.log(`From: ${fromNumber}, To: ${toNumber}, Assistant ID: ${assistantId}`);
    
    // Find the agent associated with this assistantId
    const agents = await storage.getAllAgents();
    const agent = agents.find(agent => agent.vapiAssistantId === assistantId);
    
    if (!agent) {
      console.warn(`No agent found for assistant ID ${assistantId}`);
      return;
    }
    
    // Try to find existing call in our database - with better matching
    const calls = await storage.getAllCalls();
    
    // First try to match by exact number combination
    let existingCall = calls.find(call => 
      (call.fromNumber === fromNumber && call.toNumber === toNumber) || 
      (call.fromNumber === toNumber && call.toNumber === fromNumber)
    );
    
    // If we can't find by numbers, try to look up by agent
    if (!existingCall && agent) {
      existingCall = calls.find(call => 
        call.agentId === agent.id && 
        (new Date(call.startedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
      );
    }
    
    // Determine the call direction
    const direction = callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound';
    
    if (existingCall) {
      // Update existing call record
      console.log(`Updating existing call record for call ${existingCall.id}`);
      
      await storage.updateCall(existingCall.id, {
        duration,
        endedReason: endReason,
        cost,
        outcome: status
      });
      
      console.log(`Call record updated with cost: $${cost}, duration: ${duration}s`);
    } else {
      // Create a new call record
      console.log(`Creating new call record for call ${callId}`);
      
      // Create the call record with agent info and call details
      const newCall = await storage.createCall({
        fromNumber,
        toNumber,
        agentId: agent.id,
        duration,
        endedReason: endReason,
        cost,
        outcome: status,
        direction
      });
      
      console.log(`New call record created with ID: ${newCall.id}, cost: $${cost}, duration: ${duration}s`);
    }
    
    // Update the webhook log to include the agent information
    try {
      const logs = await storage.getWebhookLogs(1);
      if (logs.length > 0) {
        const agentInfo = {
          agentId: agent.id,
          agentName: agent.name,
          userId: agent.userId,
          assistantId: assistantId,
        };
        
        // Add more context to the webhook log
        // Convert payload to plain object if needed, then add agent info
        let currentPayload = {};
        if (logs[0].payload) {
          try {
            if (typeof logs[0].payload === 'string') {
              currentPayload = JSON.parse(logs[0].payload);
            } else {
              currentPayload = logs[0].payload;
            }
          } catch (e) {
            console.error("Error parsing payload:", e);
          }
        }
        
        await storage.updateWebhookLog(logs[0].id, {
          processed: true,
          error: "",
          payload: {
            ...currentPayload,
            agentInfo
          }
        });
      }
    } catch (logError) {
      console.error("Error updating webhook log with agent info:", logError);
    }
    
    console.log(`Call data successfully recorded`);
  } catch (error) {
    console.error('Error processing end-of-call report:', error);
  }
}

/**
 * Process a status update
 * @param data The webhook payload for a status update
 */
async function processStatusUpdate(data: any) {
  try {
    console.log('Processing status update:', JSON.stringify(data, null, 2));
    
    // Extract basic call information to identify the call
    const callId = data.call?.id;
    const status = data.call?.status;
    
    if (!callId || !status) {
      console.error('Invalid status update: missing call ID or status');
      return;
    }
    
    console.log(`Call ${callId} status updated to: ${status}`);
    
    // Additional handling could be added here based on specific status values
    // For example: "in-progress", "completed", "failed", etc.
  } catch (error) {
    console.error('Error processing status update:', error);
  }
}

/**
 * Process a function call
 * @param data The webhook payload for a function call
 */
async function processFunctionCall(data: any) {
  try {
    console.log('Processing function call:', JSON.stringify(data, null, 2));
    
    // Extract function name and arguments
    const functionName = data.function?.name;
    const functionArgs = data.function?.arguments;
    
    if (!functionName) {
      console.error('Invalid function call: missing function name');
      return;
    }
    
    console.log(`Function call received: ${functionName}`, functionArgs);
    
    // Handle different function types
    switch (functionName) {
      case 'transfer_call':
        // Logic for transferring calls could be implemented here
        console.log('Transfer call function triggered');
        break;
        
      case 'end_call':
        // Logic for ending calls could be implemented here
        console.log('End call function triggered');
        break;
        
      default:
        console.log(`Unknown function call: ${functionName}`);
    }
  } catch (error) {
    console.error('Error processing function call:', error);
  }
}

/**
 * Handle Vapi webhook requests
 * @param req Express request
 * @param res Express response
 */
export async function handleVapiWebhook(req: Request, res: Response) {
  try {
    const data = req.body;
    console.log('Received Vapi webhook:', JSON.stringify(data, null, 2));
    
    // First, log the webhook payload regardless of its structure
    // This ensures we capture all webhook data for debugging
    let webhookType = "unknown";
    let processed = false;
    let error = "";
    
    try {
      // Try to determine the type of webhook with improved detection for all Vapi formats
      if (data.event === "end-of-call-report") {
        webhookType = "end-of-call-report";
      } else if (data.message && data.message.type) {
        // New Vapi format where type is nested within message object
        webhookType = data.message.type;
      } else if (data.type) {
        webhookType = data.type;
      } else if (data.event) {
        webhookType = data.event;
      } else if (data.call && data.call.status) {
        webhookType = `call-status-${data.call.status}`;
      } else if (data.assistant && data.assistant.id) {
        webhookType = "assistant-event";
      } else if (data.function) {
        webhookType = `function-${data.function.name || "unknown"}`;
      }
      
      // Create webhook log entry
      await storage.createWebhookLog({
        type: webhookType,
        payload: data,
        processed: false,
        error: ""
      });
    } catch (logError) {
      console.error("Error logging webhook:", logError);
    }
    
    // Determine webhook type from the Vapi webhook format - handle all variations
    if (data.event === "end-of-call-report") {
      // Handle end-of-call report in the direct format
      await processEndOfCallReport(data.data || data);
      processed = true;
    } else if (data.message && data.message.type === "end-of-call-report") {
      // Handle end-of-call report in the newer nested message format
      await processEndOfCallReport(data.message);
      processed = true;
    } else if (data.type) {
      // Handle webhook based on the older format
      switch (data.type) {
        case 'end-of-call-report':
          await processEndOfCallReport(data);
          processed = true;
          break;
          
        case 'status-update':
          await processStatusUpdate(data);
          processed = true;
          break;
          
        case 'function-call':
          await processFunctionCall(data);
          processed = true;
          break;
          
        default:
          console.log(`Unhandled webhook type: ${data.type}`);
          error = `Unhandled webhook type: ${data.type}`;
      }
    } else if (data.call && data.call.status) {
      // Handle call status updates
      await processStatusUpdate(data);
      processed = true;
    } else {
      console.error('Unknown webhook format:', data);
      error = 'Unknown webhook format';
    }
    
    // Update the webhook log with processing status
    try {
      const logs = await storage.getWebhookLogs(1);
      if (logs.length > 0) {
        await storage.updateWebhookLog(logs[0].id, {
          processed,
          error
        });
      }
    } catch (updateError) {
      console.error("Error updating webhook log:", updateError);
    }
    
    // Always return success to acknowledge receipt
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling Vapi webhook:', error);
    
    // Try to log the error
    try {
      await storage.createWebhookLog({
        type: "error",
        payload: req.body,
        processed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } catch (logError) {
      console.error("Error logging webhook error:", logError);
    }
    
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}