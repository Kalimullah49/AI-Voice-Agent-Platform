/**
 * Utility to sync call data from Vapi.ai API
 * Used to fetch missing call details like duration, cost, and recording URLs
 */

import { storage } from '../storage';

const VAPI_PRIVATE_KEY = "2291104d-93d4-4292-9d18-6f3af2e420e0";

export async function syncCallWithVapi(callId: string): Promise<{success: boolean, message: string, data?: any}> {
  try {
    console.log(`Syncing call ${callId} with Vapi API`);
    
    // Fetch call details from Vapi API
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch call ${callId} from Vapi: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `Failed to fetch call from Vapi: ${response.status} - ${errorText}`
      };
    }

    const vapiCallData = await response.json();
    console.log(`Fetched call data from Vapi: ${JSON.stringify(vapiCallData)}`);

    // Find the local call record
    const calls = await storage.getAllCalls();
    const localCall = calls.find(call => call.vapiCallId === callId);

    if (!localCall) {
      console.log(`No local call found for Vapi call ID: ${callId}`);
      return {
        success: false,
        message: `No local call record found for Vapi call ID: ${callId}`
      };
    }

    // Extract data from Vapi call
    const updateData: any = {};
    
    // Calculate duration
    if (vapiCallData.startedAt && vapiCallData.endedAt) {
      const startTime = new Date(vapiCallData.startedAt);
      const endTime = new Date(vapiCallData.endedAt);
      const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 1000);
      if (duration > 0) {
        updateData.duration = duration;
      }
    }

    // Extract cost
    if (vapiCallData.cost && vapiCallData.cost > 0) {
      updateData.cost = vapiCallData.cost;
    }

    // Extract recording URL
    if (vapiCallData.artifact && vapiCallData.artifact.recordingUrl) {
      updateData.recordingUrl = vapiCallData.artifact.recordingUrl;
    }

    // Extract end reason
    if (vapiCallData.endedReason) {
      updateData.endedReason = vapiCallData.endedReason;
    }

    // Update status
    if (vapiCallData.status) {
      updateData.outcome = vapiCallData.status;
    }

    // Update the local call record
    if (Object.keys(updateData).length > 0) {
      console.log(`Updating local call ${localCall.id} with data: ${JSON.stringify(updateData)}`);
      await storage.updateCall(localCall.id, updateData);
      
      return {
        success: true,
        message: `Successfully synced call ${callId}`,
        data: updateData
      };
    } else {
      return {
        success: true,
        message: `No updates needed for call ${callId}`,
        data: vapiCallData
      };
    }

  } catch (error) {
    console.error(`Error syncing call ${callId}:`, error);
    return {
      success: false,
      message: `Error syncing call: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function syncAllPendingCalls(): Promise<{success: boolean, message: string, synced: number}> {
  try {
    console.log('Syncing all pending calls...');
    
    // Get all calls that have vapi_call_id but missing duration/cost/recording
    const calls = await storage.getAllCalls();
    const pendingCalls = calls.filter(call => 
      call.vapiCallId && 
      (call.duration === 0 || call.cost === 0 || !call.recordingUrl)
    );

    console.log(`Found ${pendingCalls.length} calls that need syncing`);
    
    let syncedCount = 0;
    const errors: string[] = [];

    for (const call of pendingCalls) {
      try {
        const result = await syncCallWithVapi(call.vapiCallId);
        if (result.success) {
          syncedCount++;
          console.log(`✅ Synced call ${call.id} (${call.vapiCallId})`);
        } else {
          errors.push(`Call ${call.id}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`Call ${call.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      message: `Synced ${syncedCount} calls${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      synced: syncedCount
    };

  } catch (error) {
    console.error('Error in syncAllPendingCalls:', error);
    return {
      success: false,
      message: `Error syncing calls: ${error instanceof Error ? error.message : 'Unknown error'}`,
      synced: 0
    };
  }
}