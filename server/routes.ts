import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertAgentSchema, insertCallSchema, insertActionSchema, 
  insertPhoneNumberSchema, insertContactGroupSchema, insertContactSchema, 
  insertCampaignSchema, insertTwilioAccountSchema 
} from "@shared/schema";
import { z } from "zod";
import { testApiConnection, synthesizeSpeech, getAvailableVoices, createVapiAssistant, deleteVapiAssistant, VapiAssistantParams } from "./utils/vapi";
import twilio from 'twilio';
// Our custom auth middleware will be imported dynamically
import { DatabaseStorage } from "./database-storage";

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
      
      await storage.deleteTwilioAccount(accountId);
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
      const phoneNumberData = {
        number: purchasedNumber.phoneNumber,
        userId,
        twilioAccountId: accountId,
        twilioSid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName,
        active: true
      };
      
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
      const phoneNumbers = await storage.getPhoneNumbersByUserId(userId);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });
  
  // Release phone number back to Twilio
  app.delete("/api/phone-numbers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const phoneNumberId = parseInt(req.params.id);
      
      // Get the phone number
      const phoneNumber = await storage.getPhoneNumber(phoneNumberId);
      
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      // Verify the user owns this phone number
      if (phoneNumber.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to release this phone number" });
      }
      
      // Get the Twilio account
      const twilioAccount = await storage.getTwilioAccount(phoneNumber.twilioAccountId);
      
      if (!twilioAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Create Twilio client with user's credentials
      const client = twilio(twilioAccount.accountSid, twilioAccount.authToken);
      
      try {
        // Release the number from Twilio
        if (phoneNumber.twilioSid) {
          await client.incomingPhoneNumbers(phoneNumber.twilioSid).remove();
        }
        
        // Only delete from our database if Twilio release was successful
        await storage.deletePhoneNumber(phoneNumberId);
        
        res.status(200).json({ 
          message: "Phone number successfully released",
          releaseDate: new Date().toISOString()
        });
      } catch (twilioError) {
        console.error("Twilio error when releasing number:", twilioError);
        // Return a more informative error to the client
        res.status(500).json({ 
          message: "Could not release the phone number from Twilio. Please check your Twilio account status.",
          error: twilioError instanceof Error ? twilioError.message : "Unknown Twilio error"
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
      }
      
      // Update the phone number
      const updatedPhoneNumber = await storage.updatePhoneNumber(phoneNumberId, { agentId });
      
      res.json(updatedPhoneNumber);
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
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create campaign" });
      }
    }
  });

  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaignData = req.body;
      const campaign = await storage.updateCampaign(id, campaignData);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Dashboard metrics
  app.get("/api/metrics/dashboard", async (req, res) => {
    try {
      const calls = await storage.getAllCalls();
      
      // Calculate metrics
      const totalCalls = calls.length;
      const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
      const totalCost = calls.reduce((sum, call) => sum + call.cost, 0);
      
      const inboundCalls = calls.filter(call => call.direction === "inbound");
      const outboundCalls = calls.filter(call => call.direction === "outbound");
      
      const inboundCount = inboundCalls.length;
      const outboundCount = outboundCalls.length;
      
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const avgCost = totalCalls > 0 ? parseFloat((totalCost / totalCalls).toFixed(2)) : 0;
      
      const inboundAvgDuration = inboundCount > 0 ? Math.round(inboundCalls.reduce((sum, call) => sum + call.duration, 0) / inboundCount) : 0;
      const outboundAvgDuration = outboundCount > 0 ? Math.round(outboundCalls.reduce((sum, call) => sum + call.duration, 0) / outboundCount) : 0;
      
      const transferredCalls = calls.filter(call => call.outcome === "transferred").length;
      const inboundConversionRate = inboundCount > 0 ? parseFloat(((transferredCalls / inboundCount) * 100).toFixed(2)) : 0;
      const outboundConversionRate = outboundCount > 0 ? parseFloat(((outboundCalls.filter(call => call.outcome === "transferred").length / outboundCount) * 100).toFixed(2)) : 0;
      
      // Calculate hours saved (estimation)
      const hoursPerCall = 0.05; // 3 minutes per call that would be handled manually
      const totalHoursSaved = parseFloat((totalCalls * hoursPerCall).toFixed(2));
      
      // Call outcomes
      const customerEndedCalls = calls.filter(call => call.endedReason === "Customer Ended Call").length;
      const agentEndedCalls = calls.filter(call => call.endedReason === "Agent Ended Call").length;
      const transferredCallsCount = transferredCalls;
      
      // Get today's calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayInboundCalls = inboundCalls.filter(call => new Date(call.startedAt) >= today).length;
      const todayOutboundCalls = outboundCalls.filter(call => new Date(call.startedAt) >= today).length;
      
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
      
      res.json({
        summary: {
          totalCost: parseFloat(totalCost.toFixed(2)),
          totalHoursSaved: formatHoursSaved(totalHoursSaved),
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
          inbound: getDailyCallsDistribution(inboundCalls),
          outbound: getDailyCallsDistribution(outboundCalls)
        },
        durationVsCost: getDailyDurationAndCost(calls)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Helper function to get daily call distribution
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

  const httpServer = createServer(app);
  return httpServer;
}
