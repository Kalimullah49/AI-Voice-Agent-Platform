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

// Twilio credentials from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

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

    // Validate required Vapi IDs before making the call
    if (!execution.agent.vapiAssistantId) {
      throw new Error(`Agent "${execution.agent.name}" is missing Vapi Assistant ID. Please publish the agent first.`);
    }
    
    if (!execution.phoneNumber.vapiPhoneNumberId) {
      throw new Error(`Phone number ${execution.phoneNumber.number} is not registered with Vapi.ai. Please ensure it's properly configured.`);
    }

    console.log(`🔥 Making Vapi call with Assistant ID: ${execution.agent.vapiAssistantId}, Phone ID: ${execution.phoneNumber.vapiPhoneNumberId}`);
    
    // Make the call via Vapi.ai using the same format as the working single call
    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 2291104d-93d4-4292-9d18-6f3af2e420e0`,
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
      const agents = await storage.getAllAgentsByUserId(userId!);
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
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
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
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
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
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
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

  // Twilio accounts management - simplified for hardcoded credentials
  app.get("/api/twilio-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
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
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const accountId = parseInt(req.params.id);
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if account belongs to user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
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
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const accountData = insertTwilioAccountSchema.parse({
        ...req.body,
        userId
      });
      
      const account = await storage.createTwilioAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid Twilio account data", errors: error.errors });
      } else {
        console.error("Error creating Twilio account:", error);
        res.status(500).json({ message: "Failed to create Twilio account" });
      }
    }
  });

  app.patch("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const accountId = parseInt(req.params.id);
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if account belongs to user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertTwilioAccountSchema.partial().parse(req.body);
      const updatedAccount = await storage.updateTwilioAccount(accountId, updateData);
      
      res.json(updatedAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid Twilio account data", errors: error.errors });
      } else {
        console.error("Error updating Twilio account:", error);
        res.status(500).json({ message: "Failed to update Twilio account" });
      }
    }
  });

  app.delete("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const accountId = parseInt(req.params.id);
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if account belongs to user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteTwilioAccount(accountId);
      res.json({ message: "Twilio account deleted successfully" });
    } catch (error) {
      console.error("Error deleting Twilio account:", error);
      res.status(500).json({ message: "Failed to delete Twilio account" });
    }
  });

  app.post("/api/twilio-accounts/:id/set-default", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const accountId = parseInt(req.params.id);
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Check if account belongs to user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // First, set all other accounts for this user to not default
      const userAccounts = await storage.getTwilioAccountsByUserId(userId);
      for (const userAccount of userAccounts) {
        if (userAccount.id !== accountId) {
          await storage.updateTwilioAccount(userAccount.id, { isDefault: false });
        }
      }
      
      // Set this account as default
      const updatedAccount = await storage.updateTwilioAccount(accountId, { isDefault: true });
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error setting default Twilio account:", error);
      res.status(500).json({ message: "Failed to set default Twilio account" });
    }
  });

  // Twilio phone number management - using hardcoded credentials
  app.get("/api/twilio-phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Fetch available phone numbers from Twilio using hardcoded credentials
      const incomingNumbers = await twilioClient.incomingPhoneNumbers.list();
      
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
      const userId = req.session.userId!;
      const countryCode = (req.query.countryCode as string) || 'US';
      const areaCode = req.query.areaCode as string;
      
      // Get user's Twilio account credentials from database
      const twilioAccounts = await storage.getTwilioAccountsByUserId(userId);
      if (!twilioAccounts || twilioAccounts.length === 0) {
        return res.status(400).json({ message: "No Twilio account configured" });
      }
      
      const defaultAccount = twilioAccounts.find(acc => acc.isDefault) || twilioAccounts[0];
      
      console.log('🔍 Debugging Twilio request:');
      console.log('Account SID:', defaultAccount.accountSid);
      console.log('Auth Token length:', defaultAccount.authToken?.length);
      console.log('Country code:', countryCode);
      console.log('Area code:', areaCode);
      
      // Create Twilio client with user's actual credentials
      const userTwilioClient = twilio(defaultAccount.accountSid, defaultAccount.authToken);
      
      // Search parameters
      const searchParams: any = { limit: 10 };
      if (areaCode) {
        searchParams.areaCode = areaCode;
      }
      
      // Fetch available phone numbers from Twilio using user's credentials
      const availableNumbers = await userTwilioClient.availablePhoneNumbers(countryCode)
                                          .local
                                          .list(searchParams);
      
      console.log(`✅ Successfully fetched ${availableNumbers.length} available numbers`);
      
      res.json(availableNumbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region,
        isoCountry: number.isoCountry,
        capabilities: number.capabilities
      })));
    } catch (error) {
      console.error("❌ Error fetching available Twilio phone numbers:", error);
      console.error("Error details:", {
        message: (error as any).message,
        code: (error as any).code,
        status: (error as any).status,
        moreInfo: (error as any).moreInfo
      });
      res.status(500).json({ 
        message: "Failed to fetch available Twilio phone numbers",
        error: (error as any).message,
        code: (error as any).code
      });
    }
  });

  // Web test call endpoint - creates a test call using Vapi without Twilio
  app.post("/api/web-test-call", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { agentId, assistantId } = req.body;
      
      if (!assistantId) {
        return res.status(400).json({ message: "Assistant ID is required for web test call" });
      }
      
      console.log(`🎧 Creating web test call for agent ${agentId} with assistant ${assistantId}`);
      
      // Create a test call record in database
      const testCall = await storage.createCall({
        direction: "outbound",
        fromNumber: "+1-WEB-TEST",
        toNumber: "+1-WEB-TEST",
        agentId: agentId || null,
        duration: 0,
        cost: 0,
        vapiCallId: `web-test-${Date.now()}`
      });
      
      console.log(`✅ Created web test call record: ${testCall.id}`);
      
      res.json({
        success: true,
        callId: testCall.id,
        assistantId,
        message: "Web test call initiated successfully"
      });
      
    } catch (error) {
      console.error("❌ Error creating web test call:", error);
      res.status(500).json({ 
        message: "Failed to create web test call",
        error: (error as any).message
      });
    }
  });

  app.post("/api/purchase-twilio-phone-number", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { phoneNumber, friendlyName } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // Get user's Twilio account credentials from database
      const twilioAccounts = await storage.getTwilioAccountsByUserId(userId);
      if (!twilioAccounts || twilioAccounts.length === 0) {
        return res.status(400).json({ message: "No Twilio account configured" });
      }
      
      const defaultAccount = twilioAccounts.find(acc => acc.isDefault) || twilioAccounts[0];
      
      // Create Twilio client with user's actual credentials
      const userTwilioClient = twilio(defaultAccount.accountSid, defaultAccount.authToken);
      
      // Purchase phone number from Twilio using user's credentials
      const purchasedNumber = await userTwilioClient.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || `Mind AI Number ${new Date().toISOString()}`
      });
      
      // Store the phone number in our database
      const phoneNumberData: any = {
        number: purchasedNumber.phoneNumber,
        userId: userId!,
        twilioSid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName,
        active: true
      };
      
      // Register the phone number with Vapi.ai
      try {
        const { registerPhoneNumberWithVapiNumbers } = await import('./utils/vapiIntegration');
        const vapiResult = await registerPhoneNumberWithVapiNumbers(
          purchasedNumber.phoneNumber,
          defaultAccount.accountSid,
          purchasedNumber.friendlyName,
          defaultAccount.authToken
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
        error: error instanceof Error ? error.message : "Unknown error"
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
        if (!userId) {
          return res.status(401).json({ message: "User ID not found in session" });
        }
        const phoneNumbers = await storage.getPhoneNumbersByUserId(userId);
        res.json(phoneNumbers);
      }
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });
  
  // Import existing phone numbers from the hardcoded Twilio account
  app.post("/api/import-twilio-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Fetch all existing phone numbers from the hardcoded Twilio account
      const twilioNumbers = await twilioClient.incomingPhoneNumbers.list();
      console.log(`Found ${twilioNumbers.length} phone numbers in hardcoded Twilio account`);
      
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
        
        // Add to our database (no longer tied to user Twilio account)
        const newPhoneNumber = await storage.createPhoneNumber({
          number: twilioNumber.phoneNumber,
          userId,
          twilioSid: twilioNumber.sid,
          friendlyName: twilioNumber.friendlyName || `Imported ${twilioNumber.phoneNumber}`,
          active: true
        });
        
        importedNumbers.push(newPhoneNumber);
        
        // Register the number with Vapi.ai
        try {
          console.log(`Verifying ownership of ${twilioNumber.phoneNumber} in hardcoded Twilio account`);
          
          // Import the function directly instead of using require
          const { registerPhoneNumberWithVapiNumbers } = await import('./utils/vapiIntegration');
          
          // Log more details to help debug
          console.log(`Registering with Vapi.ai: Phone number ${twilioNumber.phoneNumber}, Twilio SID: ${twilioNumber.sid}`);
          
          const vapiResult = await registerPhoneNumberWithVapiNumbers(
            twilioNumber.phoneNumber,
            TWILIO_ACCOUNT_SID,
            twilioNumber.friendlyName || `Imported ${twilioNumber.phoneNumber}`,
            TWILIO_AUTH_TOKEN
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
      
      // Only attempt to release from Twilio if we have the necessary info
      if (phoneNumber.twilioSid) {
        try {
          // Release from Twilio using hardcoded credentials
          console.log(`Attempting to release Twilio number with SID: ${phoneNumber.twilioSid}`);
          
          // Use the hardcoded Twilio client to release the phone number
          await twilioClient.incomingPhoneNumbers(phoneNumber.twilioSid).remove();
          
          console.log(`Successfully released number ${phoneNumber.number} from Twilio account`);
          
          // Delete from Vapi.ai if registered
          if (phoneNumber.vapiPhoneNumberId) {
            try {
              const { deleteVapiPhoneNumber } = await import('./utils/vapiIntegration');
              const result = await deleteVapiPhoneNumber(phoneNumber.vapiPhoneNumberId);
              if (result.success) {
                console.log(`Successfully removed phone number ${phoneNumber.number} from Vapi.ai`);
              } else {
                console.warn(`Failed to remove phone number ${phoneNumber.number} from Vapi.ai: ${result.message}`);
              }
            } catch (vapiError) {
              console.error(`Error removing phone number from Vapi.ai:`, vapiError);
            }
          }
          
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
        // If no Twilio SID, just delete from database and Vapi.ai
        try {
          // Delete from Vapi.ai if registered
          if (phoneNumber.vapiPhoneNumberId) {
            const { deleteVapiPhoneNumber } = await import('./utils/vapiIntegration');
            const result = await deleteVapiPhoneNumber(phoneNumber.vapiPhoneNumberId);
            if (result.success) {
              console.log(`Successfully removed phone number ${phoneNumber.number} from Vapi.ai`);
            } else {
              console.warn(`Failed to remove phone number ${phoneNumber.number} from Vapi.ai: ${result.message}`);
            }
          }
          
          const success = await storage.deletePhoneNumber(phoneNumberId);
          
          if (success) {
            return res.status(200).json({ 
              message: "Phone number successfully removed from database",
              number: phoneNumber.number
            });
          } else {
            return res.status(500).json({ 
              message: "Failed to delete phone number from database" 
            });
          }
        } catch (deleteError) {
          console.error("Error deleting phone number:", deleteError);
          return res.status(500).json({ 
            message: "Failed to delete phone number", 
            error: deleteError instanceof Error ? deleteError.message : "Unknown error" 
          });
        }
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
        url: `https://${req.hostname}/api/webhook/vapi`
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
          provider: "11labs",
          voiceId: "EXAVITQu4vr4xnSDxMaL" // Use Bella voice as default (similar to Savannah)
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
    res.json({ 
      success: true,
      token: "49c87404-6985-4e57-9fe3-4bbe4cd5d7f5"
    });
  });

  // Endpoint to provide Vapi public key for web calls
  app.get("/api/vapi/public-key", isAuthenticated, (req, res) => {
    res.json({ 
      success: true,
      publicKey: "49c87404-6985-4e57-9fe3-4bbe4cd5d7f5"
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

      // Get the campaign to verify it exists
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
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

      // Get agent details with null safety
      if (!campaign.agentId) {
        return res.status(400).json({ message: "Campaign has no agent assigned" });
      }
      
      const agent = await storage.getAgent(campaign.agentId);
      if (!agent) {
        return res.status(400).json({ message: "Agent not found" });
      }

      // Check if agent has a valid Vapi assistant ID
      if (!agent.vapiAssistantId) {
        return res.status(400).json({ 
          message: "Agent is not deployed to Vapi.ai. Please publish the agent first." 
        });
      }

      // Get phone number for the agent with null safety
      const phoneNumbers = await storage.getPhoneNumbersByAgentId(campaign.agentId);
      if (!phoneNumbers || phoneNumbers.length === 0) {
        return res.status(400).json({ message: "No phone number assigned to agent" });
      }

      const phoneNumber = phoneNumbers[0];
      
      // Check if phone number has Vapi registration
      if (!phoneNumber.vapiPhoneNumberId) {
        return res.status(400).json({ 
          message: "Phone number is not registered with Vapi.ai. Please ensure the number is properly configured." 
        });
      }

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
  // Test endpoint for email verification
  app.get("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }
      
      // Import with ES module syntax
      const { sendTestEmail, isPostmarkConfigured } = await import('./utils/email');
      
      // Check if Postmark is configured
      if (!isPostmarkConfigured()) {
        return res.status(500).json({ 
          success: false,
          message: 'Postmark is not configured properly. Please check your environment variables.',
          postmarkConfigured: false
        });
      }
      
      // Send a test email
      const result = await sendTestEmail(email);
      
      return res.json({
        success: result,
        message: result ? 'Test email sent successfully' : 'Failed to send test email',
        email
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Error sending test email', 
        error: error.message || String(error)
      });
    }
  });

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
      
      // Use hardcoded VAPI configuration
      const VAPI_PRIVATE_KEY = '2291104d-93d4-4292-9d18-6f3af2e420e0';
      
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
  
  // Temporary public endpoint to view Postmark logs (for testing)
  app.get("/api/debug/postmark-logs-public", async (req: Request, res: Response) => {
    try {
      const { email, registrationAttemptId, limit } = req.query;
      
      if (email && typeof email === 'string') {
        const logs = await storage.getPostmarkLogsByEmail(email);
        res.json({
          email,
          totalLogs: logs.length,
          logs: logs.map(log => ({
            id: log.id,
            attemptNumber: log.attemptNumber,
            success: log.success,
            messageId: log.messageId,
            errorCode: log.errorCode,
            httpStatusCode: log.httpStatusCode,
            errorMessage: log.errorMessage,
            networkError: log.networkError,
            emailType: log.emailType,
            environment: log.environment,
            registrationAttemptId: log.registrationAttemptId,
            finalAttempt: log.finalAttempt,
            retryable: log.retryable,
            timestamp: log.timestamp,
            postmarkResponse: log.postmarkResponse,
            requestPayload: log.requestPayload
          }))
        });
      } else {
        const limitNum = limit ? parseInt(limit as string) : 10;
        const logs = await storage.getPostmarkLogs(limitNum);
        res.json({
          totalLogs: logs.length,
          logs: logs.map(log => ({
            id: log.id,
            email: log.email,
            attemptNumber: log.attemptNumber,
            success: log.success,
            messageId: log.messageId,
            errorCode: log.errorCode,
            httpStatusCode: log.httpStatusCode,
            errorMessage: log.errorMessage,
            registrationAttemptId: log.registrationAttemptId,
            timestamp: log.timestamp,
            postmarkResponse: log.postmarkResponse ? JSON.stringify(log.postmarkResponse) : null
          }))
        });
      }
    } catch (error) {
      console.error("Error fetching Postmark logs:", error);
      res.status(500).json({ message: "Failed to fetch Postmark logs" });
    }
  });

  // Comprehensive Postmark logging endpoints - shows EVERY API call and response
  app.get("/api/debug/postmark-logs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email, registrationAttemptId, limit } = req.query;
      
      if (email && typeof email === 'string') {
        // Get all Postmark logs for specific email
        const logs = await storage.getPostmarkLogsByEmail(email);
        res.json({
          email,
          totalLogs: logs.length,
          logs: logs.map(log => ({
            id: log.id,
            attemptNumber: log.attemptNumber,
            success: log.success,
            messageId: log.messageId,
            errorCode: log.errorCode,
            httpStatusCode: log.httpStatusCode,
            errorMessage: log.errorMessage,
            networkError: log.networkError,
            emailType: log.emailType,
            environment: log.environment,
            registrationAttemptId: log.registrationAttemptId,
            finalAttempt: log.finalAttempt,
            retryable: log.retryable,
            timestamp: log.timestamp,
            postmarkResponse: log.postmarkResponse,
            requestPayload: log.requestPayload
          }))
        });
      } else if (registrationAttemptId && typeof registrationAttemptId === 'string') {
        // Get all attempts for a specific registration
        const logs = await storage.getPostmarkLogsByRegistrationAttempt(registrationAttemptId);
        res.json({
          registrationAttemptId,
          totalAttempts: logs.length,
          logs: logs.map(log => ({
            id: log.id,
            email: log.email,
            attemptNumber: log.attemptNumber,
            success: log.success,
            messageId: log.messageId,
            errorCode: log.errorCode,
            httpStatusCode: log.httpStatusCode,
            errorMessage: log.errorMessage,
            networkError: log.networkError,
            timestamp: log.timestamp,
            postmarkResponse: log.postmarkResponse
          }))
        });
      } else {
        // Get recent Postmark logs
        const limitNum = limit ? parseInt(limit as string) : 100;
        const logs = await storage.getPostmarkLogs(limitNum);
        res.json({
          totalLogs: logs.length,
          logs: logs.map(log => ({
            id: log.id,
            email: log.email,
            attemptNumber: log.attemptNumber,
            success: log.success,
            messageId: log.messageId,
            errorCode: log.errorCode,
            httpStatusCode: log.httpStatusCode,
            errorMessage: log.errorMessage,
            registrationAttemptId: log.registrationAttemptId,
            timestamp: log.timestamp
          }))
        });
      }
    } catch (error) {
      console.error("Error fetching Postmark logs:", error);
      res.status(500).json({ message: "Failed to fetch Postmark logs" });
    }
  });

  // Email failure debugging endpoints
  app.get("/api/debug/email-failures", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email, limit } = req.query;
      
      if (email && typeof email === 'string') {
        // Get failures for specific email
        const failures = await storage.getEmailDeliveryLogs(email);
        res.json({
          email,
          failures,
          totalFailures: failures ? failures.length : 0
        });
      } else {
        // Get all recent email failures
        const users = await storage.getAllUsers();
        const failureData = [];
        
        const limitNum = limit ? parseInt(limit as string) : 50;
        let processed = 0;
        
        for (const user of users) {
          if (processed >= limitNum) break;
          
          if (user.emailDeliveryStatus === 'failed' && user.emailDeliveryLogs) {
            try {
              const logs = Array.isArray(user.emailDeliveryLogs) 
                ? user.emailDeliveryLogs 
                : JSON.parse(user.emailDeliveryLogs as string);
              
              failureData.push({
                userId: user.id,
                email: user.email,
                attempts: user.emailDeliveryAttempts || 0,
                lastAttempt: user.lastEmailAttempt,
                status: user.emailDeliveryStatus,
                logs: logs
              });
              processed++;
            } catch (parseError) {
              console.error('Error parsing email logs for user:', user.id, parseError);
            }
          }
        }
        
        res.json({
          totalFailures: failureData.length,
          failures: failureData
        });
      }
    } catch (error) {
      console.error("Error fetching email failure data:", error);
      res.status(500).json({ message: "Failed to fetch email failure data" });
    }
  });

  app.get("/api/debug/email-failures/:email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      
      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found for email" });
      }
      
      // Parse email delivery logs
      let detailedLogs = [];
      if (user.emailDeliveryLogs) {
        try {
          detailedLogs = Array.isArray(user.emailDeliveryLogs) 
            ? user.emailDeliveryLogs 
            : JSON.parse(user.emailDeliveryLogs as string);
        } catch (parseError) {
          console.error('Error parsing email logs:', parseError);
        }
      }
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          emailDeliveryStatus: user.emailDeliveryStatus,
          emailDeliveryAttempts: user.emailDeliveryAttempts,
          lastEmailAttempt: user.lastEmailAttempt,
          createdAt: user.createdAt
        },
        emailFailureAnalysis: {
          totalAttempts: user.emailDeliveryAttempts || 0,
          lastAttemptTime: user.lastEmailAttempt,
          currentStatus: user.emailDeliveryStatus,
          detailedLogs: detailedLogs,
          failurePatterns: analyzeEmailFailurePattern(detailedLogs)
        }
      });
    } catch (error) {
      console.error("Error fetching detailed email failure data:", error);
      res.status(500).json({ message: "Failed to fetch detailed email failure data" });
    }
  });

  app.post("/api/debug/retry-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Import email utilities
      const { sendVerificationEmailWithLogging } = await import('./utils/postmark');
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      console.log(`🔧 DEBUG: Manual retry for ${email} initiated by admin`);
      
      // Attempt to send verification email
      const result = await sendVerificationEmailWithLogging(
        email, 
        user.emailVerificationToken || '', 
        baseUrl, 
        user.id
      );
      
      // Update user record with new attempt
      const currentAttempts = (user.emailDeliveryAttempts || 0) + 1;
      const newStatus = result.success ? 'sent' : 'failed';
      
      // Create log entry for manual retry
      const manualRetryLog = {
        timestamp: new Date().toISOString(),
        type: 'manual_retry',
        success: result.success,
        attempts: 1,
        messageId: result.messageId || null,
        error: result.error || null,
        adminInitiated: true,
        email: email
      };
      
      // Update user record
      const existingLogs = Array.isArray(user.emailDeliveryLogs) 
        ? user.emailDeliveryLogs 
        : (user.emailDeliveryLogs ? JSON.parse(user.emailDeliveryLogs as string) : []);
      
      existingLogs.push(manualRetryLog);
      
      await storage.logEmailDelivery(user.id, manualRetryLog);
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Verification email sent successfully to ${email}` 
          : `Failed to send email to ${email}: ${result.error}`,
        result: {
          messageId: result.messageId,
          attempts: result.attempts,
          error: result.error,
          totalUserAttempts: currentAttempts
        }
      });
    } catch (error) {
      console.error("Error in manual email retry:", error);
      res.status(500).json({ 
        message: "Failed to retry email", 
        error: error.message 
      });
    }
  });

  return httpServer;
}

// Helper function to analyze email failure patterns
function analyzeEmailFailurePattern(logs: any[]) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return { pattern: 'no_logs', description: 'No email delivery logs found' };
  }
  
  const failures = logs.filter(log => !log.success);
  if (failures.length === 0) {
    return { pattern: 'no_failures', description: 'No failed attempts found' };
  }
  
  const errors = failures.map(f => f.error).filter(Boolean);
  const uniqueErrors = [...new Set(errors)];
  
  if (uniqueErrors.length === 1) {
    const error = uniqueErrors[0];
    if (error.includes('inactive')) {
      return { 
        pattern: 'inactive_recipient', 
        description: 'Email address is marked as inactive (bounced previously)',
        recommendation: 'Email address has been blocked by Postmark due to previous bounces or spam complaints'
      };
    } else if (error.includes('Invalid email')) {
      return { 
        pattern: 'invalid_email', 
        description: 'Email address format is invalid',
        recommendation: 'Check email address format and spelling'
      };
    } else if (error.includes('Rate limit')) {
      return { 
        pattern: 'rate_limited', 
        description: 'Too many emails sent too quickly',
        recommendation: 'Wait before retrying or upgrade Postmark plan'
      };
    } else if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
      return { 
        pattern: 'network_timeout', 
        description: 'Network connection timeout',
        recommendation: 'Check network connectivity and try again'
      };
    }
  }
  
  return { 
    pattern: 'mixed_errors', 
    description: `Multiple different errors encountered: ${uniqueErrors.join(', ')}`,
    recommendation: 'Review individual error messages for specific issues'
  };
}
