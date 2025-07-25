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
 * Process and save call data to the database
 * This function finds the correct agent and updates or creates a call record
 */
async function processCallData(
  assistantId: string, 
  callId: string, 
  fromNumber: string, 
  toNumber: string, 
  duration: number, 
  cost: number, 
  status: string, 
  endReason: string | null,
  direction: string,
  recordingUrl: string | null = null,
  actualStartTime: Date | null = null
) {
  console.log(`Processing call data for assistantId: ${assistantId}, callId: ${callId}`);
  console.log(`Call details - Duration: ${duration}s, Cost: $${cost}, Status: ${status}, End Reason: ${endReason}`);
  console.log(`From: ${fromNumber}, To: ${toNumber}`);
  
  // Find the agent associated with this assistantId
  const agents = await storage.getAllAgents();
  const agent = agents.find(agent => agent.vapiAssistantId === assistantId);
  
  if (!agent) {
    console.warn(`No agent found for assistant ID ${assistantId}`);
    return;
  }
  
  // Try to find existing call in our database
  const calls = await storage.getAllCalls();
  
  console.log(`Looking for matching call with fromNumber=${fromNumber}, toNumber=${toNumber}, agentId=${agent.id}, callId=${callId}`);
  
  // First try to match by Vapi call ID if available - this is the most reliable
  let existingCall = null;
  if (callId) {
    // Check if there are multiple calls with the same Vapi call ID (duplicates)
    const duplicateCalls = calls.filter(call => call.vapiCallId === callId);
    
    if (duplicateCalls.length > 1) {
      console.warn(`⚠️ Found ${duplicateCalls.length} duplicate calls with Vapi ID: ${callId}`);
      
      // Use the call with the most complete data (highest duration, cost, recording)
      existingCall = duplicateCalls.sort((a, b) => {
        // Prioritize by recording URL presence
        if (a.recordingUrl && !b.recordingUrl) return -1;
        if (!a.recordingUrl && b.recordingUrl) return 1;
        
        // Then by duration
        if (a.duration !== b.duration) return (b.duration || 0) - (a.duration || 0);
        
        // Then by cost
        if (a.cost !== b.cost) return (b.cost || 0) - (a.cost || 0);
        
        // Finally by start time (most recent)
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      })[0];
      
      // Delete the other duplicate calls to prevent data inconsistency
      const duplicatesToDelete = duplicateCalls.filter(call => call.id !== existingCall.id);
      console.log(`🗑️ Removing ${duplicatesToDelete.length} duplicate calls`);
      
      for (const duplicate of duplicatesToDelete) {
        try {
          await storage.deleteCall(duplicate.id);
          console.log(`✅ Deleted duplicate call ID: ${duplicate.id}`);
        } catch (error) {
          console.error(`❌ Failed to delete duplicate call ID: ${duplicate.id}`, error);
        }
      }
    } else if (duplicateCalls.length === 1) {
      existingCall = duplicateCalls[0];
    }
    
    if (existingCall) {
      console.log(`Found existing call by Vapi call ID: ${callId}, call record ID: ${existingCall.id}`);
    }
  }
  
  // If no match by Vapi call ID, try more sophisticated matching
  if (!existingCall && fromNumber && toNumber) {
    // Try to match by exact number combination and agent within the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const potentialMatches = calls.filter(call => 
      call.agentId === agent.id && 
      new Date(call.startedAt).getTime() > oneHourAgo &&
      ((call.fromNumber === fromNumber && call.toNumber === toNumber) || 
       (call.fromNumber === toNumber && call.toNumber === fromNumber))
    );
    
    if (potentialMatches.length > 0) {
      // Use the most recent match
      existingCall = potentialMatches.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0];
      console.log(`Found existing call by phone number match: call record ID: ${existingCall.id}`);
    }
  }
  
  // If we still can't find by numbers and have unknown numbers, try to match by agent and timing
  if (!existingCall && (fromNumber === 'unknown' || !fromNumber) && agent) {
    console.log(`Trying to match call with unknown numbers by agent and timing`);
    
    // Get calls for this agent within the last 5 minutes that don't have vapi_call_id set
    const recentCalls = calls
      .filter(call => call.agentId === agent.id)
      .filter(call => !call.vapiCallId) // Only consider calls without vapi_call_id
      .filter(call => {
        const callTime = new Date(call.startedAt).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5 minutes
        return callTime > fiveMinutesAgo;
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    console.log(`Found ${recentCalls.length} recent calls without vapi_call_id for agent ID: ${agent.id}`);
    
    // Use the most recent call if available
    if (recentCalls.length > 0) {
      existingCall = recentCalls[0];
      console.log(`Using most recent call without vapi_call_id (ID: ${existingCall.id}) for this agent`);
    }
  }
  
  // Prepare the call status update
  const isCallFinished = ['completed', 'ended', 'failed', 'error', 'voicemail'].includes(status);
  const hasValidMetrics = duration > 0 || cost > 0 || endReason;
  
  if (existingCall) {
    // Update existing call record
    console.log(`Updating existing call record for call ${existingCall.id}, status: ${status}, isCallFinished: ${isCallFinished}`);
    
    // Ensure we have valid values before updating
    const updateData: any = {};
    
    if (status) {
      updateData.outcome = status;
    }
    
    // Only update metrics if the call is finished or we have valid metrics
    if (isCallFinished || hasValidMetrics) {
      console.log(`Call is finished or has valid metrics. Status: ${status}, Duration: ${duration}s, Cost: $${cost}`);
      
      if (duration > 0) {
        updateData.duration = duration;
      }
      
      if (endReason) {
        updateData.endedReason = endReason;
      }
      
      if (cost > 0) {
        updateData.cost = cost;
      }
    }
    
    console.log(`Call update data: ${JSON.stringify(updateData)}`);
    
    // Add vapi_call_id if we have it and it's not already set
    if (callId && !existingCall.vapiCallId) {
      updateData.vapiCallId = callId;
    }
    
    // Add recording URL if we have it and it's not already set
    if (recordingUrl && !existingCall.recordingUrl) {
      updateData.recordingUrl = recordingUrl;
    }
    
    // Update start time if we have actual start time from Vapi and current call doesn't have proper phone numbers
    if (actualStartTime && (!existingCall.fromNumber || existingCall.fromNumber === 'unknown')) {
      updateData.startedAt = actualStartTime;
      
      // Also update phone numbers if they're missing or unknown
      // For inbound calls, ensure correct phone number mapping
      if (direction === 'inbound') {
        // For inbound: customer calls us, so FROM=customer, TO=our business number
        if (fromNumber && fromNumber !== 'unknown') {
          updateData.fromNumber = fromNumber;
        }
        if (toNumber && toNumber !== 'unknown') {
          updateData.toNumber = toNumber;
        } else if (!existingCall.toNumber || existingCall.toNumber === 'unknown') {
          // Default to our business number for inbound calls
          updateData.toNumber = '+12183797501';
        }
      } else {
        // For outbound: we call customer, so FROM=our business number, TO=customer
        if (fromNumber && fromNumber !== 'unknown') {
          updateData.fromNumber = fromNumber;
        }
        if (toNumber && toNumber !== 'unknown') {
          updateData.toNumber = toNumber;
        }
      }
    }
    
    // Only update if we have data to update
    if (Object.keys(updateData).length > 0) {
      const updatedCall = await storage.updateCall(existingCall.id, updateData);
      console.log(`Call record updated: ${JSON.stringify(updatedCall)}`);
      console.log(`Updated call with status: ${status}, cost: $${cost}, duration: ${duration}s`);
      
      // Emit real-time update to the user's dashboard
      const io = (global as any).io;
      if (io && agent) {
        // Get the agent to find the user ID
        const agents = await storage.getAllAgents();
        const agentData = agents.find(a => a.id === agent.id);
        if (agentData && agentData.userId) {
          // Emit call update to the specific user
          io.to(`user-${agentData.userId}`).emit('call-updated', {
            call: updatedCall,
            type: 'call-metrics-updated'
          });
          
          // Also emit dashboard refresh event
          io.to(`user-${agentData.userId}`).emit('dashboard-refresh', {
            reason: 'call-updated',
            callId: existingCall.id
          });
        }
      }
    } else {
      console.log(`No valid update data found for call ${existingCall.id}`);
    }
  } else if (callId) {
    // Only create a new call record if we have a valid Vapi call ID
    console.log(`Creating new call record for call ${callId}, status: ${status}, isCallFinished: ${isCallFinished}`);
    
    // Create the call record with agent info and call details - correct phone number mapping
    const correctFromNumber = direction === 'inbound' ? fromNumber : (fromNumber || '+12183797501');
    const correctToNumber = direction === 'inbound' ? (toNumber || '+12183797501') : fromNumber;
    
    const newCallData = {
      fromNumber: correctFromNumber || 'unknown',
      toNumber: correctToNumber || 'unknown',
      agentId: agent.id,
      direction,
      startedAt: actualStartTime || new Date(),
      outcome: status || 'unknown',
      vapiCallId: callId || null,
      recordingUrl: recordingUrl || null
    } as any;
    
    // Only add metrics if the call is finished or we have valid metrics
    if (isCallFinished || hasValidMetrics) {
      console.log(`New call with finished status or valid metrics. Status: ${status}, Duration: ${duration}s, Cost: $${cost}`);
      
      if (duration > 0) {
        newCallData.duration = duration;
      }
      
      if (endReason) {
        newCallData.endedReason = endReason;
      }
      
      if (cost > 0) {
        newCallData.cost = cost;
      }
    }
    
    console.log(`Creating new call with data: ${JSON.stringify(newCallData)}`);
    const newCall = await storage.createCall(newCallData);
    console.log(`New call record created with ID: ${newCall.id}, status: ${status}, cost: $${cost}, duration: ${duration}s`);
  } else {
    console.log(`Skipping call creation - no valid Vapi call ID provided and no existing call found`);
  }
}

/**
 * Process an end-of-call report
 * @param data The webhook payload for an end-of-call report
 */
async function processEndOfCallReport(data: any) {
  try {
    console.log('Processing end-of-call report:', JSON.stringify(data, null, 2));
    
    // Check for the new format with data.message structure
    if (data.message) {
      console.log('Detected new Vapi webhook format with message wrapper');
      
      // New format - message object contains all data
      const message = data.message;
      
      // Extract the call details from different locations
      let callData = message.call || {};
      let duration = 0;
      let cost = 0;
      let endReason = null;
      let status = callData.status || 'completed';
      
      // Get assistant ID to identify the agent
      const assistantId = message.assistant?.id || callData.assistantId || '';
      
      // Extract duration from different possible fields - check root level first
      if (message.durationSeconds) {
        duration = Math.ceil(message.durationSeconds);
      } else if (message.durationMs) {
        duration = Math.ceil(message.durationMs / 1000);
      } else if (message.duration) {
        duration = message.duration;
      } else if (typeof message.durationMinutes === 'number') {
        duration = Math.ceil(message.durationMinutes * 60);
      }
      
      // Extract cost from new format - check root level first
      if (typeof message.cost === 'number') {
        cost = message.cost;
      } else if (message.costBreakdown && message.costBreakdown.total) {
        cost = message.costBreakdown.total;
      }
      
      // Extract end reason
      endReason = message.endedReason || null;
      
      // Extract recording URL from artifact
      let recordingUrl = null;
      if (message.artifact && message.artifact.recordingUrl) {
        recordingUrl = message.artifact.recordingUrl;
      }
      
      // Extract phone numbers with proper logic for inbound vs outbound
      let fromNumber = '';
      let toNumber = '';
      
      // For inbound calls: phoneNumber is the assistant's number, customer is the caller
      // For outbound calls: phoneNumber is the assistant's number, customer is the recipient
      if (message.phoneNumber && message.phoneNumber.number) {
        if (callData.type === 'inboundPhoneCall') {
          toNumber = message.phoneNumber.number; // Assistant's number (receiving the call)
        } else {
          fromNumber = message.phoneNumber.number; // Assistant's number (making the call)
        }
      }
      
      if (message.customer && message.customer.number) {
        if (callData.type === 'inboundPhoneCall') {
          fromNumber = message.customer.number; // Customer calling in
        } else {
          toNumber = message.customer.number; // Customer being called
        }
      }
      
      // Extract actual call start time from Vapi data
      let callStartTime = new Date();
      if (callData.startedAt) {
        callStartTime = new Date(callData.startedAt);
      } else if (callData.createdAt) {
        callStartTime = new Date(callData.createdAt);
      }
      
      // Process the extracted data
      console.log(`Call details from new format - Duration: ${duration}s, Cost: $${cost}, Status: ${status}, End Reason: ${endReason}`);
      console.log(`Phone numbers - From: ${fromNumber}, To: ${toNumber}, Type: ${callData.type}`);
      console.log(`Recording URL: ${recordingUrl}, Start Time: ${callStartTime.toISOString()}`);
      
      // Find the agent and update/create the call record
      await processCallData(
        assistantId, 
        callData.id || '', 
        fromNumber, 
        toNumber, 
        duration, 
        cost, 
        status, 
        endReason, 
        callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
        recordingUrl,
        callStartTime
      );
      
      return;
    }
    
    // Original format handling
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
    
    // Process the call data to update or create a call record
    await processCallData(
      assistantId,
      callId,
      fromNumber,
      toNumber,
      duration,
      cost,
      status,
      endReason,
      callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
      null // recording URL - not available in legacy format
    );
    
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
    
    // Check for new format with message wrapper
    if (data.message) {
      const message = data.message;
      const callData = message.call || {};
      const status = message.status || callData.status || 'unknown';
      const assistantId = message.assistant?.id || callData.assistantId || '';
      
      // Extract phone numbers with proper logic for inbound vs outbound
      let fromNumber = '';
      let toNumber = '';
      
      if (message.phoneNumber && message.phoneNumber.number) {
        if (callData.type === 'inboundPhoneCall') {
          toNumber = message.phoneNumber.number; // Assistant's number (receiving the call)
        } else {
          fromNumber = message.phoneNumber.number; // Assistant's number (making the call)
        }
      }
      
      if (message.customer && message.customer.number) {
        if (callData.type === 'inboundPhoneCall') {
          fromNumber = message.customer.number; // Customer calling in
        } else {
          toNumber = message.customer.number; // Customer being called
        }
      }
      
      // Extract actual call start time
      let callStartTime = new Date();
      if (callData.startedAt) {
        callStartTime = new Date(callData.startedAt);
      } else if (callData.createdAt) {
        callStartTime = new Date(callData.createdAt);
      }
      
      // Process the extracted data
      if (status === 'ended' || status === 'assistant-ended-call' || status === 'user-ended-call' || status === 'call-ended') {
        // Special handling for ended status - check if we have any metrics
        let duration = 0;
        let cost = 0;
        
        // Try to extract duration and cost if available
        if (message.durationSeconds) {
          duration = Math.ceil(message.durationSeconds);
        } else if (message.durationMs) {
          duration = Math.ceil(message.durationMs / 1000);
        } else if (typeof message.durationMinutes === 'number') {
          duration = Math.ceil(message.durationMinutes * 60);
        }
        
        if (typeof message.cost === 'number') {
          cost = message.cost;
        } else if (message.costBreakdown && message.costBreakdown.total) {
          cost = message.costBreakdown.total;
        }
        
        console.log(`Call termination detected - Status: ${status}, Duration: ${duration}s, Cost: $${cost}`);
        
        await processCallData(
          assistantId,
          callData.id || '',
          fromNumber,
          toNumber,
          duration,
          cost,
          'ended', // Always mark as ended for termination events
          message.endedReason || status, // Use the specific end reason
          callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
          null, // recording URL - not available in status update
          callStartTime
        );
      } else {
        // Just update the status for non-ended statuses
        await processCallData(
          assistantId,
          callData.id || '',
          fromNumber,
          toNumber,
          0,
          0,
          status,
          null,
          callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
          null, // recording URL - not available in status update
          callStartTime
        );
      }
      
      return;
    }
    
    // Original format
    const callData = data.call || data;
    const status = data.status || callData.status || 'unknown';
    const assistantId = callData.assistantId || callData.assistant?.id || '';
    const callId = callData.id || '';
    
    // Extract phone numbers
    let fromNumber = '';
    let toNumber = '';
    
    if (callData.phoneNumber && callData.phoneNumber.number) {
      fromNumber = callData.phoneNumber.number;
    } else if (callData.transport && callData.transport.from) {
      fromNumber = callData.transport.from;
    }
    
    if (callData.customer && callData.customer.number) {
      toNumber = callData.customer.number;
    } else if (callData.transport && callData.transport.to) {
      toNumber = callData.transport.to;
    }
    
    // Check for termination events in original format
    if (status === 'ended' || status === 'assistant-ended-call' || status === 'user-ended-call' || status === 'call-ended') {
      console.log(`Call termination detected in original format - Status: ${status}`);
      // Force process as end-of-call to ensure proper cleanup
      await processEndOfCallReport(data);
      return;
    }
    
    // Check for failed call status
    if (status === 'failed' || status === 'error') {
      console.log(`Call failure detected - Status: ${status}`);
      // Process as end-of-call with failure status
      await processEndOfCallReport(data);
      return;
    }
    
    await processCallData(
      assistantId,
      callId,
      fromNumber,
      toNumber,
      0,
      0,
      status,
      null,
      callData.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
      null // recording URL - not available in status update
    );
    
  } catch (error) {
    console.error('Error processing status update:', error);
  }
}

/**
 * Process a function call
 * @param data The webhook payload for a function call
 */
async function processFunctionCall(data: any) {
  // Function call handling would go here
  console.log('Processing function call:', JSON.stringify(data, null, 2));
}

/**
 * Handle Vapi webhook requests
 * @param req Express request
 * @param res Express response
 */
export async function handleVapiWebhook(req: Request, res: Response) {
  try {
    // Always return success quickly to Vapi
    res.status(200).json({ success: true });
    
    const data = req.body;
    
    // Log the webhook data for debugging
    console.log('Received Vapi webhook:', JSON.stringify(data, null, 2));
    
    // Determine webhook type
    let webhookType = 'unknown';
    
    // Check if data is in the expected format
    if (data) {
      // Check for new format with message wrapper
      if (data.message) {
        console.log('Found message wrapper, checking message type:', data.message.type);
        if (data.message.type === 'end-of-call-report') {
          webhookType = 'end-of-call-report';
        } else if (data.message.type === 'status-update') {
          webhookType = 'status-update';
        } else if (data.message.type === 'function-call') {
          webhookType = 'function-call';
        }
        // Also check for cost and other indicators in the message
        else if (data.message.cost !== undefined || data.message.durationSeconds !== undefined) {
          console.log('Found cost/duration data, treating as end-of-call-report');
          webhookType = 'end-of-call-report';
        }
        else if (data.message.status) {
          console.log('Found status in message, treating as status-update');
          webhookType = 'status-update';
        }
      } 
      // Check for legacy format without message wrapper
      else if (data.type) {
        webhookType = data.type;
      }
      // Check for other indicators if type is not present
      else if (data.call && data.status) {
        webhookType = 'status-update';
      } else if (data.call && data.cost) {
        webhookType = 'end-of-call-report';
      } else if (data.functionCall) {
        webhookType = 'function-call';
      }
    }
    
    console.log(`Webhook type detected: ${webhookType}`);
    
    // Create a log entry for this webhook
    const webhookLogData: InsertWebhookLog = {
      type: webhookType,
      payload: data,
      processed: false,
      error: ''
    };
    
    const webhookLog = await storage.createWebhookLog(webhookLogData);
    console.log(`Created webhook log entry with ID: ${webhookLog.id}`);
    
    // Process the webhook based on its type
    try {
      if (webhookType === 'end-of-call-report') {
        await processEndOfCallReport(data);
      } else if (webhookType === 'status-update') {
        await processStatusUpdate(data);
      } else if (webhookType === 'function-call') {
        await processFunctionCall(data);
      } else {
        console.warn(`Unknown webhook type: ${webhookType}`);
        
        // Mark the webhook log as processed with error
        await storage.updateWebhookLog(webhookLog.id, {
          processed: true,
          error: `Unknown webhook type: ${webhookType}`
        });
        
        return;
      }
      
      // Update the webhook log to mark it as processed
      await storage.updateWebhookLog(webhookLog.id, {
        processed: true,
        error: ''
      });
      
      console.log(`Webhook processed successfully`);
    } catch (processingError: any) {
      console.error(`Error processing webhook: ${processingError.message}`);
      
      // Mark the webhook log as processed with error
      await storage.updateWebhookLog(webhookLog.id, {
        processed: true,
        error: processingError.message
      });
    }
    
  } catch (error: any) {
    console.error('Error handling Vapi webhook:', error);
    
    // We already sent a 200 response, so no need to send an error response
  }
}