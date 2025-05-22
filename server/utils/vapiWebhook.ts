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
    
    // Support all Vapi webhook formats
    const callData = data.call || data;
    
    if (!callData) {
      console.error('Invalid end-of-call report: missing call data');
      return;
    }
    
    // Extract call details from the webhook data
    const callId = callData.id || callData.call?.id || '';
    const assistantId = callData.assistantId || callData.assistant?.id || '';
    
    // Extract time and duration information with better handling for different formats
    let duration = 0;
    
    // Look for duration in different possible locations
    if (callData.durationSeconds) {
      // Newest format with explicit duration in seconds
      duration = Math.ceil(callData.durationSeconds);
    } else if (callData.durationMs) {
      // Newer format with duration in milliseconds
      duration = Math.ceil(callData.durationMs / 1000);
    } else if (callData.duration) {
      // Legacy format with direct duration
      duration = callData.duration;
    } else if (callData.startedAt && callData.endedAt) {
      // Calculate from start/end timestamps
      const startTime = new Date(callData.startedAt);
      const endTime = new Date(callData.endedAt);
      duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 1000);
    } else if (callData.createdAt && callData.updatedAt) {
      // Fall back to created/updated timestamps
      const startTime = new Date(callData.createdAt);
      const endTime = new Date(callData.updatedAt);
      duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 1000);
    }
    
    // If we still don't have duration, check if there's a transcript with timing info
    if (duration === 0 && callData.messages && callData.messages.length > 0) {
      // Try to calculate from the messages data
      const lastEntry = callData.messages[callData.messages.length - 1];
      if (lastEntry.secondsFromStart) {
        duration = Math.ceil(lastEntry.secondsFromStart);
      }
    }
    
    // Extract cost information with better handling for different formats
    let cost = 0;
    if (typeof callData.cost === 'number') {
      // Direct cost field
      cost = callData.cost;
    } else if (callData.costBreakdown && callData.costBreakdown.total) {
      // Cost from breakdown total
      cost = callData.costBreakdown.total;
    } else if (callData.costs && Array.isArray(callData.costs)) {
      // Sum up costs from itemized costs array
      cost = callData.costs.reduce((totalCost: number, costItem: any) => {
        return totalCost + (typeof costItem.cost === 'number' ? costItem.cost : 0);
      }, 0);
    }
    
    // Extract other call details
    const status = callData.status || 'completed';
    const endReason = callData.endedReason || null;
    
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
    
    // Make sure we have valid phone numbers
    console.log(`Extracted phone numbers - From: ${fromNumber}, To: ${toNumber}`);
    
    // If we still don't have valid phone numbers, check for nested objects
    if (!fromNumber && callData.call && callData.call.phoneNumber) {
      fromNumber = callData.call.phoneNumber.number || '';
    }
    
    if (!toNumber && callData.call && callData.call.customer) {
      toNumber = callData.call.customer.number || '';
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
    
    console.log(`Looking for matching call with fromNumber=${fromNumber}, toNumber=${toNumber}, agentId=${agent.id}`);
    
    // First try to match by exact number combination
    let existingCall = calls.find(call => 
      (call.fromNumber === fromNumber && call.toNumber === toNumber) || 
      (call.fromNumber === toNumber && call.toNumber === fromNumber)
    );
    
    // If we can't find by numbers, try to look up by agent and most recent calls
    if (!existingCall && agent) {
      console.log(`No exact number match found, trying to match by agent ID: ${agent.id}`);
      
      // Get calls for this agent within the last 24 hours
      const recentCalls = calls
        .filter(call => call.agentId === agent.id)
        .filter(call => {
          const callTime = new Date(call.startedAt).getTime();
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          return callTime > oneDayAgo;
        })
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      
      console.log(`Found ${recentCalls.length} recent calls for agent ID: ${agent.id}`);
      
      // Use the most recent call if available
      if (recentCalls.length > 0) {
        existingCall = recentCalls[0];
        console.log(`Using most recent call (ID: ${existingCall.id}) for this agent`);
      }
    }
    
    // Determine the call direction
    const direction = callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound';
    
    if (existingCall) {
      // Update existing call record
      console.log(`Updating existing call record for call ${existingCall.id}`);
      
      // Ensure we have valid values before updating
      const updateData: any = {};
      
      if (duration > 0) {
        updateData.duration = duration;
      }
      
      if (endReason) {
        updateData.endedReason = endReason;
      }
      
      if (cost > 0) {
        updateData.cost = cost;
      }
      
      if (status) {
        updateData.outcome = status;
      }
      
      console.log(`Call update data: ${JSON.stringify(updateData)}`);
      
      // Only update if we have data to update
      if (Object.keys(updateData).length > 0) {
        const updatedCall = await storage.updateCall(existingCall.id, updateData);
        console.log(`Call record updated: ${JSON.stringify(updatedCall)}`);
        console.log(`Updated call with cost: $${cost}, duration: ${duration}s`);
      } else {
        console.log(`No valid update data found for call ${existingCall.id}`);
      }
    } else {
      // Create a new call record
      console.log(`Creating new call record for call ${callId}`);
      
      // Create the call record with agent info and call details
      const callData = {
        fromNumber,
        toNumber,
        agentId: agent.id,
        direction,
        startedAt: new Date()
      } as any;
      
      // Only add metrics if they have valid values
      if (duration > 0) {
        callData.duration = duration;
      }
      
      if (endReason) {
        callData.endedReason = endReason;
      }
      
      if (cost > 0) {
        callData.cost = cost;
      }
      
      if (status) {
        callData.outcome = status;
      }
      
      const newCall = await storage.createCall(callData);
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