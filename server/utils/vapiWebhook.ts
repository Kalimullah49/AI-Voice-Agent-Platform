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

/**
 * Process an end-of-call report
 * @param data The webhook payload for an end-of-call report
 */
async function processEndOfCallReport(data: any) {
  try {
    console.log('Processing end-of-call report:', JSON.stringify(data, null, 2));
    
    if (!data.call) {
      console.error('Invalid end-of-call report: missing call data');
      return;
    }
    
    const callData = data.call;
    
    // Extract call details
    const callId = callData.id;
    const phoneNumberId = callData.phoneNumberId;
    const assistantId = callData.assistantId;
    const startTime = new Date(callData.createdAt);
    const endTime = new Date(callData.updatedAt);
    const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 1000); // duration in seconds
    const cost = callData.cost || 0;
    const status = callData.status;
    const endReason = callData.endReason || null;
    const fromNumber = callData.from || (callData.transport?.from) || '';
    const toNumber = callData.to || (callData.customer?.number) || '';
    
    console.log(`Call ${callId} ended with duration ${duration}s, cost $${cost}, status: ${status}`);
    
    // Find the agent associated with this assistantId
    const agents = await storage.getAllAgents();
    const agent = agents.find(agent => agent.vapiAssistantId === assistantId);
    
    if (!agent) {
      console.warn(`No agent found for assistant ID ${assistantId}`);
      return;
    }
    
    // Try to find existing call in our database
    const calls = await storage.getAllCalls();
    const existingCall = calls.find(call => 
      (call.fromNumber === fromNumber && call.toNumber === toNumber) || 
      (call.fromNumber === toNumber && call.toNumber === fromNumber)
    );
    
    if (existingCall) {
      // Update existing call record
      console.log(`Updating existing call record for call ${existingCall.id}`);
      
      await storage.updateCall(existingCall.id, {
        duration,
        endedReason: endReason,
        cost,
        outcome: status
      });
    } else {
      // Create a new call record
      console.log(`Creating new call record for call ${callId}`);
      
      await storage.createCall({
        fromNumber,
        toNumber,
        agentId: agent.id,
        duration,
        endedReason: endReason,
        cost,
        outcome: status,
        direction: fromNumber === toNumber ? 'outbound' : 'inbound'
      });
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
    
    // Validate the webhook data
    if (!data || !data.type) {
      console.error('Invalid webhook payload: missing type');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    
    // Process webhook based on type
    switch (data.type) {
      case 'end-of-call-report':
        await processEndOfCallReport(data);
        break;
        
      case 'status-update':
        await processStatusUpdate(data);
        break;
        
      case 'function-call':
        await processFunctionCall(data);
        break;
        
      default:
        console.log(`Unhandled webhook type: ${data.type}`);
    }
    
    // Always return success to acknowledge receipt
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling Vapi webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}