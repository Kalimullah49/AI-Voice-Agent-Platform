#!/usr/bin/env node
/**
 * Fix Recording for All Assistants
 * This script ensures all existing Vapi assistants have recording enabled
 */

import { DatabaseStorage } from './server/database-storage.js';
import fetch from 'node-fetch';

const VAPI_PRIVATE_KEY = '2291104d-93d4-4292-9d18-6f3af2e420e0';
const VAPI_API_BASE_URL = 'https://api.vapi.ai';

async function fixRecordingForAllAssistants() {
  console.log('🎵 Starting recording fix for all assistants...');
  
  try {
    const storage = new DatabaseStorage();
    
    // Get all agents
    const agents = await storage.getAllAgents();
    console.log(`Found ${agents.length} agents to check`);
    
    for (const agent of agents) {
      if (agent.vapiAssistantId) {
        console.log(`\n🔧 Checking agent ${agent.id} (${agent.name}) with Vapi ID: ${agent.vapiAssistantId}`);
        
        // Get current assistant configuration
        const getResponse = await fetch(`${VAPI_API_BASE_URL}/assistant/${agent.vapiAssistantId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!getResponse.ok) {
          console.error(`❌ Failed to get assistant ${agent.vapiAssistantId}`);
          continue;
        }
        
        const currentConfig = await getResponse.json();
        
        // Check if recording is already enabled
        if (currentConfig.recordingEnabled === true) {
          console.log(`✅ Recording already enabled for ${agent.name}`);
          continue;
        }
        
        console.log(`🔄 Enabling recording for ${agent.name}...`);
        
        // Update the assistant to enable recording
        const updateParams = {
          recordingEnabled: true,
          voicemailDetectionEnabled: true,
          endCallFunctionEnabled: true,
          transcriber: {
            provider: "deepgram",
            model: "nova-2-general",
            language: "en"
          }
        };
        
        const updateResponse = await fetch(`${VAPI_API_BASE_URL}/assistant/${agent.vapiAssistantId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateParams)
        });
        
        if (updateResponse.ok) {
          console.log(`✅ Successfully enabled recording for ${agent.name}`);
        } else {
          const errorData = await updateResponse.json();
          console.error(`❌ Failed to update ${agent.name}:`, errorData);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`⚠️  Agent ${agent.id} (${agent.name}) has no Vapi assistant ID`);
      }
    }
    
    console.log('\n🎉 Recording fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing recording:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixRecordingForAllAssistants();