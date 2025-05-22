import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { 
  insertUserSchema, insertAgentSchema, insertCallSchema, insertActionSchema, 
  insertPhoneNumberSchema, insertContactGroupSchema, insertContactSchema, 
  insertCampaignSchema, insertTwilioAccountSchema 
} from "@shared/schema";
import { z } from "zod";
import { testApiConnection, synthesizeSpeech, getAvailableVoices, createVapiAssistant, deleteVapiAssistant, VapiAssistantParams, registerPhoneNumberWithVapi, deleteVapiPhoneNumber } from "./utils/vapi";
import { assignPhoneToAgent } from './utils/vapiIntegration';
import twilio from 'twilio';
// Our custom auth middleware will be imported dynamically
import { DatabaseStorage } from "./database-storage";

// Campaign execution queue management for concurrent calls across multiple users
interface CampaignExecution {
  campaignId: number;
  userId: string;
  contacts: any[];
  agent: any;
  phoneNumber: any;
  concurrentCalls: number;
  currentIndex: number;
  activeCalls: Set<string>;
}

const activeCampaigns = new Map<number, CampaignExecution>();

// Execute campaign calls with proper concurrency control for SaaS multi-tenancy
async function executeCampaignCalls(campaign: any, contacts: any[], agent: any, phoneNumber: any, userId: string) {
  const execution: CampaignExecution = {
    campaignId: campaign.id,
    userId,
    contacts,
    agent,
    phoneNumber,
    concurrentCalls: campaign.concurrentCalls || 1,
    currentIndex: 0,
    activeCalls: new Set()
  };

  activeCampaigns.set(campaign.id, execution);
  
  console.log(`🚀 Starting campaign ${campaign.name} (ID: ${campaign.id}) for user ${userId}`);
  console.log(`📞 Total contacts: ${contacts.length}, Concurrent calls: ${execution.concurrentCalls}`);

  // Start initial batch of concurrent calls
  for (let i = 0; i < Math.min(execution.concurrentCalls, contacts.length); i++) {
    makeNextCall(execution);
  }
}

async function makeNextCall(execution: CampaignExecution) {
  if (execution.currentIndex >= execution.contacts.length) {
    // Check if all calls are complete
    if (execution.activeCalls.size === 0) {
      console.log(`✅ Campaign ${execution.campaignId} completed for user ${execution.userId}`);
      await storage.updateCampaign(execution.campaignId, { status: 'completed' });
      activeCampaigns.delete(execution.campaignId);
    }
    return;
  }

  const contact = execution.contacts[execution.currentIndex];
  execution.currentIndex++;

  try {
    console.log(`📞 Call ${execution.currentIndex}/${execution.contacts.length}: ${contact.firstName} ${contact.lastName} -> ${contact.phoneNumber}`);

    // Make the call via Vapi.ai using the same format as the working single call
    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: execution.agent.vapiAssistantId,
        phoneNumberId: execution.phoneNumber.vapiPhoneNumberId,
        customer: {
          number: contact.phoneNumber
        }
      })
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      throw new Error(`Vapi API error ${vapiResponse.status}: ${errorText}`);
    }

    const callData = await vapiResponse.json();
    const callId = callData.id;
    
    execution.activeCalls.add(callId);

    // Create call record in database
    await storage.createCall({
      fromNumber: execution.phoneNumber.number,
      toNumber: contact.phoneNumber,
      direction: 'outbound',
      agentId: execution.agent.id,
      duration: 0,
      cost: 0,
      outcome: 'in-progress'
    });

    console.log(`✅ Call initiated: ${callId} to ${contact.firstName} ${contact.lastName}`);

    // The webhook will handle call completion and trigger the next call
    // For now, simulate call progression
    setTimeout(() => {
      execution.activeCalls.delete(callId);
      // Start next call when this one completes
      makeNextCall(execution);
    }, 5000); // Give time for the call to establish

  } catch (error) {
    console.error(`❌ Failed to call ${contact.firstName} ${contact.lastName} (${contact.phoneNumber}):`, error);
    // Continue with next call even if this one fails
    setTimeout(() => makeNextCall(execution), 1000);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a database storage instance for our routes
  const dbStorage = new DatabaseStorage();
  
  // Setup custom authentication
  const { setupAuth, isAuthenticated } = await import('./auth');
  setupAuth(app);

  // API Configuration routes
  app.post("/api/config/llm", async (req, res) => {
    try {
      const { provider, apiKey, model } = req.body;
      // Store API configuration securely
      // In production, use environment variables or secrets manager
      res.status(200).json({ message: "LLM configuration updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update LLM configuration" });
    }
  });

  app.post("/api/config/voice", async (req, res) => {
    try {
      const { provider, apiKey, options } = req.body;
      // Store API configuration securely
      res.status(200).json({ message: "Voice configuration updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update voice configuration" });
    }
  });
  
  // Clear all data
  app.post("/api/clear-all-data", async (req, res) => {
    try {
      await storage.clearAllData();
      res.status(200).json({ message: "All data has been cleared successfully" });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ message: "Failed to clear data" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  // The auth/user endpoint was moved to auth.ts

  // Agent routes
  app.get("/api/agents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Get all agents and filter by user ID
      const agents = await storage.getAllAgentsByUserId(userId);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Check if this agent belongs to the current user
      if (agent.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this agent" });
      }
      
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Add the user ID to the agent data
      const agentData = insertAgentSchema.parse({
        ...req.body,
        userId
      });
      
      const agent = await storage.createAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid agent data", errors: error.errors });
      } else {
        console.error("Error creating agent:", error);
        res.status(500).json({ message: "Failed to create agent" });
      }
    }
  });

  app.patch("/api/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      
      // First check if the agent exists and belongs to this user
      const existingAgent = await storage.getAgent(id);
      if (!existingAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Check if this agent belongs to the current user
      if (existingAgent.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this agent" });
      }
      
      const agentData = req.body;
      const agent = await storage.updateAgent(id, agentData);
      
      res.json(agent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });
  
  // Delete an agent
  app.delete("/api/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      
      // First check if the agent exists and belongs to this user
      const existingAgent = await storage.getAgent(id);
      if (!existingAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Check if this agent belongs to the current user
      if (existingAgent.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this agent" });
      }
      
      // If the agent has a Vapi assistant ID, delete it from Vapi.ai first
      if (existingAgent.vapiAssistantId) {
        try {
          console.log(`Attempting to delete Vapi assistant: ${existingAgent.vapiAssistantId}`);
          const vapiDeleteResult = await deleteVapiAssistant(existingAgent.vapiAssistantId);
          
          if (vapiDeleteResult.success) {
            console.log(`Successfully deleted Vapi assistant: ${existingAgent.vapiAssistantId}`);
          } else {
            console.warn(`Failed to delete Vapi assistant: ${existingAgent.vapiAssistantId}. Error: ${vapiDeleteResult.message}`);
            // Continue with agent deletion even if Vapi assistant deletion fails
          }
        } catch (vapiError) {
          console.error("Error deleting Vapi assistant:", vapiError);
          // Continue with agent deletion even if Vapi assistant deletion fails
        }
      }
      
      // Delete the agent from our database
      const success = await storage.deleteAgent(id);
      
      if (success) {
        res.status(200).json({ success: true, message: "Agent deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete agent" });
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Call routes
  app.get("/api/calls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Get all agents for this user
      const userAgents = await storage.getAllAgentsByUserId(userId);
      const userAgentIds = userAgents.map(agent => agent.id);
      
      // Get all calls and filter to only include calls for this user's agents
      const allCalls = await storage.getAllCalls();
      const userCalls = allCalls.filter(call => 
        call.agentId === null || userAgentIds.includes(call.agentId)
      );
      
      res.json(userCalls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Endpoint to clear call records for a fresh start with webhook data
  app.post("/api/calls/clear", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Get user's agents
      const userAgents = await storage.getAllAgentsByUserId(userId);
      const userAgentIds = userAgents.map(agent => agent.id);
      
      // Get all calls
      const allCalls = await storage.getAllCalls();
      
      // Filter to just the user's calls
      const userCalls = allCalls.filter(call => 
        call.agentId && userAgentIds.includes(call.agentId)
      );
      
      // Delete each call
      let deletedCount = 0;
      for (const call of userCalls) {
        await storage.deleteCall(call.id);
        deletedCount++;
      }
      
      return res.json({
        success: true,
        message: `Successfully cleared ${deletedCount} call records`,
        count: deletedCount
      });
    } catch (error) {
      console.error("Error clearing calls:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to clear call records" 
      });
    }
  });
  
  app.get("/api/calls/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const call = await storage.getCall(id);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Get all agents for this user to check permissions
      const userAgents = await storage.getAllAgentsByUserId(userId);
      const userAgentIds = userAgents.map(agent => agent.id);
      
      // Check if this call belongs to one of the user's agents
      if (call.agentId !== null && !userAgentIds.includes(call.agentId)) {
        return res.status(403).json({ message: "You don't have permission to access this call" });
      }
      
      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  app.post("/api/calls", async (req, res) => {
    try {
      const callData = insertCallSchema.parse(req.body);
      const call = await storage.createCall(callData);
      res.status(201).json(call);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid call data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create call" });
      }
    }
  });

  // Action routes
  app.get("/api/actions", async (req, res) => {
    try {
      const actions = await storage.getAllActions();
      res.json(actions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch actions" });
    }
  });

  app.get("/api/actions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const action = await storage.getAction(id);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      res.json(action);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch action" });
    }
  });

  app.post("/api/actions", async (req, res) => {
    try {
      const actionData = insertActionSchema.parse(req.body);
      const action = await storage.createAction(actionData);
      res.status(201).json(action);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid action data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create action" });
      }
    }
  });

  // Twilio account management
  app.get("/api/twilio-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accounts = await storage.getTwilioAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching Twilio accounts:", error);
      res.status(500).json({ message: "Failed to fetch Twilio accounts" });
    }
  });

  app.get("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if this account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this account" });
      }
      
      res.json(account);
    } catch (error) {
      console.error("Error fetching Twilio account:", error);
      res.status(500).json({ message: "Failed to fetch Twilio account" });
    }
  });

  app.post("/api/twilio-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Add the user ID to the account data
      const accountData = insertTwilioAccountSchema.parse({
        ...req.body,
        userId
      });
      
      // Verify the Twilio credentials before saving
      try {
        const client = twilio(accountData.accountSid, accountData.authToken);
        // Try to fetch account details to verify credentials
        await client.api.accounts(accountData.accountSid).fetch();
      } catch (twilioError) {
        return res.status(400).json({ 
          message: "Invalid Twilio credentials", 
          error: twilioError.message 
        });
      }
      
      const account = await storage.createTwilioAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid account data", errors: error.errors });
      } else {
        console.error("Error creating Twilio account:", error);
        res.status(500).json({ message: "Failed to create Twilio account" });
      }
    }
  });

  app.patch("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const existingAccount = await storage.getTwilioAccount(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if this account belongs to the current user
      if (existingAccount.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to modify this account" });
      }
      
      // If updating credentials, verify they work
      if (req.body.accountSid || req.body.authToken) {
        try {
          const accountSid = req.body.accountSid || existingAccount.accountSid;
          const authToken = req.body.authToken || existingAccount.authToken;
          
          const client = twilio(accountSid, authToken);
          // Try to fetch account details to verify credentials
          await client.api.accounts(accountSid).fetch();
        } catch (twilioError) {
          return res.status(400).json({ 
            message: "Invalid Twilio credentials", 
            error: twilioError.message 
          });
        }
      }
      
      const updatedAccount = await storage.updateTwilioAccount(accountId, req.body);
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating Twilio account:", error);
      res.status(500).json({ message: "Failed to update Twilio account" });
    }
  });

  app.delete("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const existingAccount = await storage.getTwilioAccount(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if this account belongs to the current user
      if (existingAccount.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this account" });
      }
      
      // Get all phone numbers associated with this Twilio account
      const associatedPhoneNumbers = await storage.getPhoneNumbersByTwilioAccountId(accountId);
      
      console.log(`Found ${associatedPhoneNumbers.length} phone numbers associated with Twilio account ${existingAccount.accountName || existingAccount.accountSid}`);
      
      // Delete each phone number from Vapi.ai and our database
      for (const phoneNumber of associatedPhoneNumbers) {
        try {
          // Delete from Vapi.ai if registered
          if (phoneNumber.vapiPhoneNumberId) {
            const result = await deleteVapiPhoneNumber(phoneNumber.vapiPhoneNumberId);
            if (result.success) {
              console.log(`Successfully removed phone number ${phoneNumber.number} from Vapi.ai`);
            } else {
              console.warn(`Failed to remove phone number ${phoneNumber.number} from Vapi.ai: ${result.message}`);
            }
          }
          
          // Delete the phone number from our database
          await storage.deletePhoneNumber(phoneNumber.id);
          console.log(`Deleted phone number ${phoneNumber.number} from database`);
        } catch (error) {
          console.error(`Error processing phone number ${phoneNumber.number}:`, error);
          // Continue with other phone numbers even if one fails
        }
      }
      
      // Now delete the Twilio account
      await storage.deleteTwilioAccount(accountId);
      console.log(`Successfully deleted Twilio account ${existingAccount.accountName || existingAccount.accountSid}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Twilio account:", error);
      res.status(500).json({ message: "Failed to delete Twilio account" });
    }
  });

  app.post("/api/twilio-accounts/:id/set-default", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const result = await storage.setDefaultTwilioAccount(accountId, userId);
      
      if (!result) {
        return res.status(404).json({ message: "Failed to set account as default" });
      }
      
      res.json({ message: "Default account updated successfully" });
    } catch (error) {
      console.error("Error setting default Twilio account:", error);
      res.status(500).json({ message: "Failed to set default Twilio account" });
    }
  });

  // Twilio phone number management
  app.get("/api/twilio-phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accountId = parseInt(req.query.accountId as string);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if this account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this account" });
      }
      
      // Create Twilio client with user's credentials
      const client = twilio(account.accountSid, account.authToken);
      
      // Fetch available phone numbers from Twilio
      const incomingNumbers = await client.incomingPhoneNumbers.list();
      
      res.json(incomingNumbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        capabilities: number.capabilities,
        dateCreated: number.dateCreated,
        accountSid: number.accountSid
      })));
    } catch (error) {
      console.error("Error fetching Twilio phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch Twilio phone numbers" });
    }
  });

  app.get("/api/available-twilio-phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const accountId = parseInt(req.query.accountId as string);
      const countryCode = (req.query.countryCode as string) || 'US';
      const areaCode = req.query.areaCode as string;
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if this account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this account" });
      }
      
      // Create Twilio client with user's credentials
      const client = twilio(account.accountSid, account.authToken);
      
      // Search parameters
      const searchParams: any = {};
      if (areaCode) {
        searchParams.areaCode = areaCode;
      }
      
      // Fetch available phone numbers from Twilio
      const availableNumbers = await client.availablePhoneNumbers(countryCode)
                                          .local
                                          .list(searchParams);
      
      res.json(availableNumbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region,
        isoCountry: number.isoCountry,
        capabilities: number.capabilities
      })));
    } catch (error) {
      console.error("Error fetching available Twilio phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch available Twilio phone numbers" });
    }
  });

  app.post("/api/purchase-twilio-phone-number", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const { accountId, phoneNumber, friendlyName } = req.body;
      
      if (!accountId || !phoneNumber) {
        return res.status(400).json({ message: "Account ID and phone number are required" });
      }
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if this account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to use this account" });
      }
      
      // Create Twilio client with user's credentials
      const client = twilio(account.accountSid, account.authToken);
      
      // Purchase phone number from Twilio
      const purchasedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || `AimAI Number ${new Date().toISOString()}`
      });
      
      // Store the phone number in our database
      const phoneNumberData: any = {
        number: purchasedNumber.phoneNumber,
        userId,
        twilioAccountId: accountId,
        twilioSid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName,
        active: true
      };
      
      // Register the phone number with Vapi.ai
      try {
        const { registerPhoneNumberWithVapiNumbers } = await import('./utils/vapiIntegration');
        const vapiResult = await registerPhoneNumberWithVapiNumbers(
          purchasedNumber.phoneNumber,
          account.accountSid,
          purchasedNumber.friendlyName,
          account.authToken // Pass the user's own Twilio auth token for verification
        );
        
        if (vapiResult.success && vapiResult.phoneNumberId) {
          console.log(`Successfully registered ${purchasedNumber.phoneNumber} with Vapi.ai (ID: ${vapiResult.phoneNumberId})`);
          phoneNumberData.vapiPhoneNumberId = vapiResult.phoneNumberId;
        } else {
          console.warn(`Failed to register phone number with Vapi.ai: ${vapiResult.message}`);
        }
      } catch (vapiError) {
        console.error('Error registering phone number with Vapi.ai:', vapiError);
        // Continue despite the error - we'll try again when assigning to an agent
      }
      
      const savedNumber = await storage.createPhoneNumber(phoneNumberData);
      
      res.status(201).json(savedNumber);
    } catch (error) {
      console.error("Error purchasing Twilio phone number:", error);
      res.status(500).json({ 
        message: "Failed to purchase Twilio phone number", 
        error: error.message 
      });
    }
  });

  // Phone number routes
  app.get("/api/phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const agentId = req.query.agentId ? parseInt(req.query.agentId as string) : undefined;
      
      // If agentId is specified, fetch phone numbers by agent
      if (agentId) {
        const phoneNumbers = await storage.getPhoneNumbersByAgentId(agentId);
        console.log(`Fetched ${phoneNumbers.length} phone numbers for agent ID ${agentId}`);
        res.json(phoneNumbers);
      } else {
        // Otherwise fetch all phone numbers for the user
        const phoneNumbers = await storage.getPhoneNumbersByUserId(userId);
        res.json(phoneNumbers);
      }
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });
  
  // Import existing phone numbers from a connected Twilio account
  app.post("/api/import-twilio-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const { accountId } = req.body;
      
      if (!accountId) {
        return res.status(400).json({ message: "Twilio account ID is required" });
      }
      
      // Get the Twilio account
      const twilioAccount = await storage.getTwilioAccount(accountId);
      
      if (!twilioAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (twilioAccount.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this Twilio account" });
      }
      
      // Create Twilio client
      const client = twilio(twilioAccount.accountSid, twilioAccount.authToken);
      
      // Fetch all existing phone numbers from the Twilio account
      const twilioNumbers = await client.incomingPhoneNumbers.list();
      console.log(`Found ${twilioNumbers.length} phone numbers in Twilio account ${twilioAccount.accountName || twilioAccount.accountSid}`);
      
      // Get existing phone numbers in our database for this user to avoid duplicates
      const existingNumbers = await storage.getPhoneNumbersByUserId(userId);
      const existingNumberValues = existingNumbers.map(num => num.number);
      
      // Import new numbers not already in our database
      const importedNumbers = [];
      const skippedNumbers = [];
      const vapiRegistrationResults = [];
      
      for (const twilioNumber of twilioNumbers) {
        // Skip if the number is already in our database
        if (existingNumberValues.includes(twilioNumber.phoneNumber)) {
          skippedNumbers.push({
            number: twilioNumber.phoneNumber,
            reason: "Already exists in database"
          });
          continue;
        }
        
        // Add to our database
        const newPhoneNumber = await storage.createPhoneNumber({
          number: twilioNumber.phoneNumber,
          userId,
          twilioAccountId: accountId,
          twilioSid: twilioNumber.sid,
          friendlyName: twilioNumber.friendlyName || `Imported ${twilioNumber.phoneNumber}`,
          active: true
        });
        
        importedNumbers.push(newPhoneNumber);
        
        // Register the number with Vapi.ai
        try {
          // Try to verify that this phone number actually belongs to this Twilio account
          // by using the Twilio API to check
          console.log(`Verifying ownership of ${twilioNumber.phoneNumber} in Twilio account ${twilioAccount.accountSid}`);
          
          // Import the function directly instead of using require
          const { registerPhoneNumberWithVapiNumbers } = await import('./utils/vapiIntegration');
          
          // Log more details to help debug
          console.log(`Registering with Vapi.ai: Phone number ${twilioNumber.phoneNumber}, Twilio SID: ${twilioNumber.sid}, Account SID: ${twilioAccount.accountSid}`);
          
          const vapiResult = await registerPhoneNumberWithVapiNumbers(
            twilioNumber.phoneNumber,
            twilioAccount.accountSid,
            twilioNumber.friendlyName || `Imported ${twilioNumber.phoneNumber}`,
            twilioAccount.authToken // Pass the user's own Twilio auth token for verification
          );
          
          if (vapiResult.success) {
            console.log(`Successfully registered ${twilioNumber.phoneNumber} with Vapi.ai (ID: ${vapiResult.phoneNumberId})`);
            
            // Update the phone number with Vapi ID if available
            if (vapiResult.phoneNumberId) {
              await storage.updatePhoneNumber(newPhoneNumber.id, {
                vapiPhoneNumberId: vapiResult.phoneNumberId
              });
            }
            
            vapiRegistrationResults.push({
              number: twilioNumber.phoneNumber,
              success: true,
              vapiPhoneNumberId: vapiResult.phoneNumberId
            });
          } else {
            console.warn(`Failed to register ${twilioNumber.phoneNumber} with Vapi.ai: ${vapiResult.message}`);
            vapiRegistrationResults.push({
              number: twilioNumber.phoneNumber,
              success: false,
              error: vapiResult.message
            });
          }
        } catch (vapiError) {
          console.error(`Error registering ${twilioNumber.phoneNumber} with Vapi.ai:`, vapiError);
          vapiRegistrationResults.push({
            number: twilioNumber.phoneNumber,
            success: false,
            error: vapiError instanceof Error ? vapiError.message : "Unknown error"
          });
        }
      }
      
      res.json({
        message: `Successfully imported ${importedNumbers.length} phone numbers`,
        imported: importedNumbers,
        skipped: skippedNumbers,
        vapiRegistration: vapiRegistrationResults
      });
    } catch (error) {
      console.error("Error importing phone numbers from Twilio:", error);
      res.status(500).json({ 
        message: "Failed to import phone numbers from Twilio", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Release phone number from Twilio and then delete from database
  app.delete("/api/phone-numbers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const phoneNumberId = parseInt(req.params.id);
      
      if (isNaN(phoneNumberId)) {
        return res.status(400).json({ message: "Invalid phone number ID" });
      }
      
      // Get the phone number
      const phoneNumber = await storage.getPhoneNumber(phoneNumberId);
      
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      // Verify the user owns this phone number
      if (phoneNumber.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to release this phone number" });
      }
      
      // Get the associated Twilio account
      const twilioAccountId = phoneNumber.twilioAccountId;
      
      if (!twilioAccountId) {
        return res.status(400).json({ message: "Phone number does not have an associated Twilio account" });
      }
      
      const twilioAccount = await storage.getTwilioAccount(twilioAccountId);
      
      if (!twilioAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Only attempt to release from Twilio if we have all the necessary info
      if (phoneNumber.twilioSid && twilioAccount.accountSid && twilioAccount.authToken) {
        try {
          // Create Twilio client
          const client = twilio(
            twilioAccount.accountSid, 
            twilioAccount.authToken,
            { 
              logLevel: 'debug',
              accountSid: twilioAccount.accountSid 
            }
          );
          
          // Request to release the number from Twilio using HTTP DELETE request
          // This follows the official Twilio API documentation for releasing phone numbers
          console.log(`Attempting to release Twilio number with SID: ${phoneNumber.twilioSid}`);
          
          // Create authorization string for Basic Auth
          const auth = Buffer.from(`${twilioAccount.accountSid}:${twilioAccount.authToken}`).toString('base64');
          
          // Make direct HTTP request to Twilio API
          const twilioDeletionUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccount.accountSid}/IncomingPhoneNumbers/${phoneNumber.twilioSid}.json`;
          console.log(`Making Twilio API request to: ${twilioDeletionUrl}`);
          
          const response = await fetch(twilioDeletionUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
          }
          
          console.log(`Successfully released number ${phoneNumber.number} from Twilio account ${twilioAccount.accountName || twilioAccount.accountSid}`);
          
          // Now delete from our database ONLY after successfully releasing from Twilio
          const success = await storage.deletePhoneNumber(phoneNumberId);
          
          if (success) {
            console.log(`Successfully deleted phone number ${phoneNumber.number} from database`);
            return res.status(200).json({ 
              message: "Phone number successfully released from Twilio and removed from database",
              number: phoneNumber.number
            });
          } else {
            return res.status(500).json({ 
              message: "Phone number was released from Twilio but failed to delete from database" 
            });
          }
        } catch (twilioError) {
          console.error("Error releasing phone number from Twilio:", twilioError);
          return res.status(400).json({ 
            message: "Failed to release phone number from Twilio", 
            error: twilioError instanceof Error ? twilioError.message : "Unknown error" 
          });
        }
      } else {
        return res.status(400).json({ 
          message: "Missing required Twilio information to release this number", 
          details: "The phone number needs to have a Twilio SID and associated Twilio account credentials" 
        });
      }
    } catch (error) {
      console.error("Error releasing phone number:", error);
      res.status(500).json({ 
        message: "Failed to release phone number", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Using Vapi integration functions for phone assignment
  
  // Assign phone number to an agent
  app.patch("/api/phone-numbers/:id/assign", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const phoneNumberId = parseInt(req.params.id);
      const { agentId } = req.body;
      
      // Get the phone number
      const phoneNumber = await storage.getPhoneNumber(phoneNumberId);
      
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      // Verify the user owns this phone number
      if (phoneNumber.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to modify this phone number" });
      }
      
      // If assigning to an agent, verify the agent belongs to the user
      if (agentId) {
        const agent = await storage.getAgent(agentId);
        if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
        }
        if (agent.userId !== userId) {
          return res.status(403).json({ message: "You don't have permission to use this agent" });
        }
        
        // Use the assign phone number to agent function to handle Vapi integration
        const result = await assignPhoneToAgent(phoneNumberId, agentId);
        
        if (!result.success) {
          return res.status(500).json({ message: result.message });
        }
        
        return res.json(result.phoneNumber);
      } else {
        // Just remove the agent assignment
        const updatedPhoneNumber = await storage.updatePhoneNumber(phoneNumberId, { agentId: null });
        res.json(updatedPhoneNumber);
      }
    } catch (error) {
      console.error("Error assigning phone number:", error);
      res.status(500).json({ message: "Failed to assign phone number" });
    }
  });
  
  // Vapi.ai API Routes
  app.get("/api/vapi/test-connection", async (req, res) => {
    try {
      const isConnected = await testApiConnection();
      if (isConnected) {
        res.json({ success: true, message: "Successfully connected to Vapi.ai API" });
      } else {
        res.status(401).json({ success: false, message: "Failed to connect to Vapi.ai API. Please check your token." });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "An error occurred while testing the API connection" });
    }
  });
  
  // Create a Vapi.ai assistant - requires authentication
  app.post("/api/vapi/assistants", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const assistantParams = req.body as VapiAssistantParams;
      
      if (!assistantParams || !assistantParams.name) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid assistant data. Name is required." 
        });
      }
      
      // Ensure metadata includes the current user ID
      if (!assistantParams.metadata) {
        assistantParams.metadata = {};
      }
      
      // Add webhook configuration to receive call events
      assistantParams.server = {
        url: `${req.protocol}://${req.hostname}/api/webhook/vapi`
      };
      
      // Ensure the agentId is associated with the current user if specified
      if (assistantParams.metadata.agentId) {
        const agent = await storage.getAgent(parseInt(assistantParams.metadata.agentId));
        
        if (!agent) {
          return res.status(404).json({
            success: false,
            message: "Agent not found"
          });
        }
        
        // Check if this agent belongs to the current user
        // Only perform this check if both agent.userId and userId are present
        if (agent.userId && userId && agent.userId !== userId) {
          return res.status(403).json({
            success: false, 
            message: "You don't have permission to update this agent"
          });
        }
      }
      
      // Set the userId in metadata to track ownership
      assistantParams.metadata.userId = userId;
      
      // Remove empty forwardingPhoneNumber if present to avoid Vapi API validation errors
      if (assistantParams.forwardingPhoneNumber === "") {
        delete assistantParams.forwardingPhoneNumber;
      }
      
      // Ensure some required fields have default values if not provided
      if (!assistantParams.model) {
        assistantParams.model = {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant that answers clearly and politely."
            }
          ]
        };
      }
      
      if (!assistantParams.voice) {
        assistantParams.voice = {
          provider: "elevenlabs",
          voiceId: "Rachel" // Use a default voice if none provided
        };
      }
      
      // Create or update the assistant via Vapi API
      const result = await createVapiAssistant(assistantParams);
      
      if (result.success) {
        const action = result.updated ? "updated" : "created";
        console.log(`Successfully ${action} Vapi assistant: ${result.assistant?.id}`);
        
        // If agent ID is provided, update the agent with the Vapi assistant ID
        if (assistantParams.metadata.agentId) {
          const agentId = parseInt(assistantParams.metadata.agentId);
          
          // Update the agent with the Vapi assistant ID
          await storage.updateAgent(agentId, {
            vapiAssistantId: result.assistant.id
          });
          
          console.log(`Updated agent ${agentId} with Vapi assistant ID: ${result.assistant.id}`);
        }
        
        res.status(201).json({
          success: true,
          assistant: result.assistant,
          updated: result.updated,
          message: `Successfully ${action} Vapi assistant`
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || "Failed to create Vapi assistant"
        });
      }
    } catch (error) {
      console.error("Error creating Vapi assistant:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred while creating the Vapi assistant"
      });
    }
  });
  
  // Secure endpoint to provide Vapi token to authenticated clients
  app.get("/api/vapi/token", isAuthenticated, (req, res) => {
    if (!process.env.VAPI_AI_TOKEN) {
      return res.status(500).json({ 
        success: false,
        message: "Vapi.ai token is not configured on the server" 
      });
    }
    
    res.json({ 
      success: true,
      token: process.env.VAPI_AI_TOKEN
    });
  });
  
  app.get("/api/vapi/voices", async (req, res) => {
    try {
      const result = await getAvailableVoices();
      
      if (result.success) {
        res.json({
          success: true,
          voices: result.voices
        });
      } else {
        // Return a 200 response with failure details instead of 404
        // This makes it easier for the client to handle and display the error message
        res.json({
          success: false,
          message: result.message || "No voices found. Please check your ElevenLabs API key.",
          voices: []
        });
      }
    } catch (error) {
      console.error("Error in /api/vapi/voices endpoint:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error while fetching available voices", 
        voices: [] 
      });
    }
  });
  
  app.post("/api/vapi/synthesize", async (req, res) => {
    try {
      const { text, voiceId, speed, temperature, textGuidance, voiceGuidance, backgroundNoise } = req.body;
      
      if (!text) {
        return res.status(400).json({ success: false, message: "Text is required" });
      }
      
      // Call the updated synthesizeSpeech function
      const result = await synthesizeSpeech({
        text,
        voiceId,
        speed: typeof speed === 'string' ? parseFloat(speed) : speed,
        temperature: typeof temperature === 'string' ? parseFloat(temperature) : temperature,
        textGuidance: typeof textGuidance === 'string' ? parseFloat(textGuidance) : textGuidance,
        voiceGuidance: typeof voiceGuidance === 'string' ? parseFloat(voiceGuidance) : voiceGuidance,
        backgroundNoise
      });
      
      if (result.success && result.audioUrl) {
        res.json({ success: true, audioUrl: result.audioUrl });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.message || "Failed to synthesize speech" 
        });
      }
    } catch (error) {
      console.error("Error in voice synthesis:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "An error occurred during speech synthesis" 
      });
    }
  });

  app.post("/api/phone-numbers", async (req, res) => {
    try {
      const phoneNumberData = insertPhoneNumberSchema.parse(req.body);
      const phoneNumber = await storage.createPhoneNumber(phoneNumberData);
      res.status(201).json(phoneNumber);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid phone number data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create phone number" });
      }
    }
  });

  // Contact group routes
  app.get("/api/contact-groups", async (req, res) => {
    try {
      const contactGroups = await storage.getAllContactGroups();
      res.json(contactGroups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact groups" });
    }
  });

  app.post("/api/contact-groups", async (req, res) => {
    try {
      const contactGroupData = insertContactGroupSchema.parse(req.body);
      const contactGroup = await storage.createContactGroup(contactGroupData);
      res.status(201).json(contactGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact group data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contact group" });
      }
    }
  });
  
  app.delete("/api/contact-groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteContactGroup(id);
      if (!success) {
        return res.status(404).json({ message: "Contact group not found" });
      }
      res.status(200).json({ message: "Contact group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact group" });
    }
  });

  // Contact routes
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contact" });
      }
    }
  });
  
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteContact(id);
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.status(200).json({ message: "Contact deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });
  
  // CSV upload route for contacts
  app.post("/api/contacts/csv-upload", async (req, res) => {
    try {
      const { contacts, groupId } = req.body;
      
      if (!Array.isArray(contacts) || !groupId) {
        return res.status(400).json({ message: "Invalid data. Expected contacts array and groupId" });
      }
      
      const createdContacts = [];
      
      for (const contactData of contacts) {
        // Add groupId to each contact
        contactData.groupId = groupId;
        
        try {
          const validatedData = insertContactSchema.parse(contactData);
          const contact = await storage.createContact(validatedData);
          createdContacts.push(contact);
        } catch (err) {
          console.error("Error creating contact:", err);
          // Continue with other contacts even if one fails
        }
      }
      
      res.status(201).json({ 
        message: `Successfully created ${createdContacts.length} contacts`,
        contacts: createdContacts
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to upload CSV" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
      } else {
        console.error("Error creating campaign:", error);
        res.status(500).json({ message: "Failed to create campaign" });
      }
    }
  });

  app.patch("/api/campaigns/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const campaignData = req.body;
      const campaign = await storage.updateCampaign(id, campaignData);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user?.claims?.sub || (req as any).session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get the campaign to verify ownership
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Verify the user owns this campaign
      if (campaign.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this campaign" });
      }

      // Delete the campaign
      const success = await storage.deleteCampaign(id);
      if (!success) {
        return res.status(404).json({ message: "Campaign not found or could not be deleted" });
      }

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Campaign execution endpoint
  app.post("/api/campaigns/:id/start", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const userId = req.session.userId;

      // Get campaign details
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Get campaign contacts
      const contacts = await storage.getContactsByGroupId(campaign.contactGroupId);
      if (!contacts || contacts.length === 0) {
        return res.status(400).json({ message: "No contacts found in campaign group" });
      }

      // Get agent details
      const agent = await storage.getAgent(campaign.agentId);
      if (!agent) {
        return res.status(400).json({ message: "Agent not found" });
      }

      // Get phone number for the agent
      const phoneNumbers = await storage.getPhoneNumbersByAgentId(campaign.agentId);
      if (!phoneNumbers || phoneNumbers.length === 0) {
        return res.status(400).json({ message: "No phone number assigned to agent" });
      }

      const phoneNumber = phoneNumbers[0];
      const fromNumber = phoneNumber.number;

      // Update campaign status to active
      await storage.updateCampaign(campaignId, { status: 'active' });

      // Start campaign execution with concurrency control
      executeCampaignCalls(campaign, contacts, agent, phoneNumber, userId);

      res.json({ 
        success: true, 
        message: `Campaign started with ${contacts.length} contacts`,
        totalContacts: contacts.length,
        concurrentCalls: campaign.concurrentCalls || 1
      });

    } catch (error) {
      console.error("Error starting campaign:", error);
      res.status(500).json({ message: "Failed to start campaign" });
    }
  });

  // Dashboard metrics
  app.get("/api/metrics/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // First get all user's agents
      const agents = await storage.getAllAgentsByUserId(userId);
      const agentIds = agents.map(agent => agent.id);
      
      // Get all calls for these agents
      const allCalls = await storage.getAllCalls();
      const calls = allCalls.filter(call => 
        call.agentId && agentIds.includes(call.agentId)
      );
      
      // Initialize nullsafe variables
      const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const totalCost = calls.reduce((sum, call) => {
        const callCost = call.cost === null ? 0 : (call.cost || 0);
        return sum + callCost;
      }, 0);
      
      // Filter by direction
      const inboundCalls = calls.filter(call => call.direction === "inbound");
      const outboundCalls = calls.filter(call => call.direction === "outbound");
      
      // Count metrics
      const totalCalls = calls.length;
      const inboundCount = inboundCalls.length;
      const outboundCount = outboundCalls.length;
      
      // Calculate averages only for calls with actual duration (> 0)
      const callsWithDuration = calls.filter(call => call.duration > 0);
      const avgDuration = callsWithDuration.length > 0 ? 
        Math.round(totalDuration / callsWithDuration.length) : 0;
      const avgCost = callsWithDuration.length > 0 ? 
        parseFloat((totalCost / callsWithDuration.length).toFixed(2)) : 0;
      
      const inboundCallsWithDuration = inboundCalls.filter(call => call.duration > 0);
      const inboundAvgDuration = inboundCallsWithDuration.length > 0 ? 
        Math.round(inboundCallsWithDuration.reduce((sum, call) => sum + call.duration, 0) / inboundCallsWithDuration.length) : 0;
      
      const outboundCallsWithDuration = outboundCalls.filter(call => call.duration > 0);
      const outboundAvgDuration = outboundCallsWithDuration.length > 0 ? 
        Math.round(outboundCallsWithDuration.reduce((sum, call) => sum + call.duration, 0) / outboundCallsWithDuration.length) : 0;
      
      // Calculate conversion rates
      const transferredCalls = calls.filter(call => call.outcome === "transferred").length;
      const inboundConversionRate = inboundCount > 0 ? 
        parseFloat(((transferredCalls / inboundCount) * 100).toFixed(0)) : 0;
      
      const outboundConversionRate = outboundCount > 0 ? 
        parseFloat(((outboundCalls.filter(call => call.outcome === "transferred").length / outboundCount) * 100).toFixed(0)) : 0;
      
      // Calculate hours saved (estimation based on automation)
      const hoursPerCall = 0.05; // 3 minutes per call that would be handled manually
      const totalHoursSaved = parseFloat((totalCalls * hoursPerCall).toFixed(2));
      
      // Call outcomes - using actual end reasons from your calls
      const customerEndedCalls = calls.filter(call => 
        call.endedReason && (
          call.endedReason.toLowerCase().includes("customer") ||
          call.endedReason === "customer-ended-call" ||
          call.endedReason === "customer-busy"
        )
      ).length;
      
      const agentEndedCalls = calls.filter(call => 
        call.endedReason && (
          call.endedReason.toLowerCase().includes("assistant") ||
          call.endedReason === "assistant-ended-call" ||
          call.endedReason === "silence-timed-out"
        )
      ).length;
      const transferredCallsCount = transferredCalls;
      
      // Get today's calls - use startedAt which is the actual field
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayInboundCalls = inboundCalls.filter(call => 
        call.startedAt && new Date(call.startedAt) >= today
      ).length;
      
      const todayOutboundCalls = outboundCalls.filter(call => 
        call.startedAt && new Date(call.startedAt) >= today
      ).length;
      
      // Format duration for display (MM:SS)
      const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };
      
      // Format hours saved (Xh Ym)
      const formatHoursSaved = (hours: number) => {
        const hrs = Math.floor(hours);
        const mins = Math.round((hours - hrs) * 60);
        return `${hrs}h ${mins}m`;
      };
      
      // Get day of week distribution for calls
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const inboundByDay = Array(7).fill(0);
      const outboundByDay = Array(7).fill(0);
      
      // Count calls by day of week
      for (const call of inboundCalls) {
        if (call.startedAt) {
          const day = new Date(call.startedAt).getDay(); // 0-6
          inboundByDay[day]++;
        }
      }
      
      for (const call of outboundCalls) {
        if (call.startedAt) {
          const day = new Date(call.startedAt).getDay(); // 0-6
          outboundByDay[day]++;
        }
      }
      
      res.json({
        summary: {
          totalCost: parseFloat(totalCost.toFixed(2)),
          totalHours: formatHoursSaved(totalHoursSaved),
          avgCostPerCall: avgCost,
          avgCallDuration: formatDuration(avgDuration)
        },
        inboundCalls: {
          todayCount: todayInboundCalls,
          totalCalls: inboundCount,
          avgDuration: formatDuration(inboundAvgDuration),
          conversionRate: inboundConversionRate
        },
        outboundCalls: {
          todayCount: todayOutboundCalls,
          totalCalls: outboundCount,
          avgDuration: formatDuration(outboundAvgDuration),
          conversionRate: outboundConversionRate
        },
        callOutcomes: {
          customerEnded: customerEndedCalls,
          agentEnded: agentEndedCalls,
          transferred: transferredCallsCount
        },
        // Daily call distribution for charts
        callsDaily: {
          inbound: { 
            labels: days, 
            values: inboundByDay
          },
          outbound: { 
            labels: days, 
            values: outboundByDay
          }
        },
        durationVsCost: getDailyDurationAndCost(calls)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Helper function to get daily call distribution
  // Now using real data from webhook
  function getDailyCallsDistribution(calls: any[]) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const distribution = days.map(day => 0);
    
    calls.forEach(call => {
      const dayOfWeek = new Date(call.startedAt).getDay();
      distribution[dayOfWeek]++;
    });
    
    return {
      labels: days,
      values: distribution
    };
  }
  
  // Helper function to get daily duration and cost
  // Now using real data from webhook 
  function getDailyDurationAndCost(calls: any[]) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const duration = days.map(day => 0);
    const cost = days.map(day => 0);
    
    calls.forEach(call => {
      const dayOfWeek = new Date(call.startedAt).getDay();
      // Adjust for Sunday (0) to be at the end
      const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      duration[index] += call.duration;
      cost[index] += call.cost;
    });
    
    // Convert seconds to minutes for better visualization
    const durationInMinutes = duration.map(seconds => Math.round(seconds / 60));
    
    return {
      labels: days,
      duration: durationInMinutes,
      cost: cost.map(c => parseFloat(c.toFixed(2)))
    };
  }

  // Create a Vapi call endpoint for outbound calls
  // Webhook endpoint for Vapi.ai events (end-of-call reports, status updates, function calls)
  app.post("/api/webhook/vapi", async (req: Request, res: Response) => {
    try {
      // Import the webhook handler
      const { handleVapiWebhook } = await import('./utils/vapiWebhook');
      // Process the webhook
      return handleVapiWebhook(req, res);
    } catch (error) {
      console.error("Error handling Vapi webhook:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // API endpoint to create webhook logs table and get webhook logs
  app.get("/api/webhook/logs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Import the webhook logs handler
      const { getWebhookLogs, createWebhookLogsTable } = await import('./api/webhookLogs');
      
      // First create the table if it doesn't exist
      await createWebhookLogsTable();
      
      // Then get webhook logs
      return getWebhookLogs(req, res);
    } catch (error) {
      console.error("Error getting webhook logs:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/vapi/call", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { agentId, fromNumber, toNumber } = req.body;
      
      if (!agentId || !fromNumber || !toNumber) {
        return res.status(400).json({ 
          message: "Missing required fields: agentId, fromNumber, or toNumber" 
        });
      }
      
      // Get the agent to find the Vapi assistant ID
      const agent = await storage.getAgent(parseInt(agentId));
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Make sure agent has a Vapi assistant ID
      if (!agent.vapiAssistantId) {
        return res.status(400).json({ 
          message: "This agent doesn't have a Vapi assistant ID. Please update the agent first." 
        });
      }
      
      // Get the phone number details to get its Vapi ID
      // Find the phone number in our database by the phone number string
      const phoneNumbers = await storage.getAllPhoneNumbers();
      const phoneNumber = phoneNumbers.find(pn => pn.number === fromNumber);
      
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found in database" });
      }
      
      if (!phoneNumber.vapiPhoneNumberId) {
        return res.status(400).json({ 
          message: "This phone number doesn't have a Vapi ID. Please make sure it's properly registered with Vapi.ai." 
        });
      }
      
      // Get VAPI configuration
      const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
      if (!VAPI_PRIVATE_KEY) {
        return res.status(500).json({ 
          message: "VAPI_PRIVATE_KEY is missing. Please set this environment variable." 
        });
      }
      
      console.log(`Initiating outbound call from ${fromNumber} to ${toNumber} with agent ${agent.name} (${agent.vapiAssistantId})`);
      
      // Try an outbound call with the Vapi API
      console.log(`Using the format you shared in the example...`);
      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: agent.vapiAssistantId,
          phoneNumberId: phoneNumber.vapiPhoneNumberId,
          customer: {
            number: toNumber
          }
        })
      });
      
      if (!response.ok) {
        let errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          console.error("Vapi.ai call API error:", errorData);
          return res.status(response.status).json({ 
            message: `Failed to initiate call: ${errorData.message || errorData.error || response.statusText}` 
          });
        } catch (e) {
          console.error("Vapi.ai call API error:", errorText);
          return res.status(response.status).json({ 
            message: `Failed to initiate call: ${response.statusText}` 
          });
        }
      }
      
      const data = await response.json();
      console.log("Call initiated successfully:", data);
      
      // Create a call record in our database
      await storage.createCall({
        fromNumber: fromNumber,
        toNumber: toNumber,
        agentId: parseInt(agentId),
        direction: "outbound",
        duration: 0, // This will be updated when the call ends
        startedAt: new Date(),
      });
      
      res.json({ 
        success: true, 
        message: "Call initiated successfully", 
        callId: data.id
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json({ 
        message: "Failed to initiate call", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Setup Socket.IO for real-time updates
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Store the io instance globally for use in other parts of the application
  (global as any).io = io;
  
  io.on('connection', (socket) => {
    console.log('Client connected for real-time updates:', socket.id);
    
    // Join user to their own room for user-specific updates
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room for real-time updates`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return httpServer;
}
