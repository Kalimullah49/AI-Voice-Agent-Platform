import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertAgentSchema, insertCallSchema, insertActionSchema, 
  insertTwilioAccountSchema, insertPhoneNumberSchema, VapiAssistantParams,
  insertContactGroupSchema, insertContactSchema, insertCampaignSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { isAuthenticated } from "./auth";
import { formatZodError } from "zod-validation-error";
import twilio from "twilio";
import { 
  createVapiAssistant, 
  deleteVapiAssistant,
  testApiConnection 
} from "./utils/vapi";
import { format } from "date-fns";

// Get dashboard metrics
function getDailyCallsDistribution(calls: any[]) {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  // Initialize data with zeros for the last 7 days
  const data = Array(7).fill(0).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return { 
      date: format(date, 'MMM dd'),
      calls: 0
    };
  }).reverse();
  
  // Count calls for each day
  calls.forEach(call => {
    const callDate = new Date(call.startedAt);
    if (callDate >= lastWeek) {
      const dayIndex = 6 - Math.floor((new Date().getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        data[dayIndex].calls++;
      }
    }
  });
  
  return data;
}

// Get daily duration and cost
function getDailyDurationAndCost(calls: any[]) {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  // Initialize data with zeros for the last 7 days
  const data = Array(7).fill(0).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return { 
      date: format(date, 'MMM dd'),
      duration: 0,
      cost: 0
    };
  }).reverse();
  
  // Sum duration and cost for each day
  calls.forEach(call => {
    const callDate = new Date(call.startedAt);
    if (callDate >= lastWeek) {
      const dayIndex = 6 - Math.floor((new Date().getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        data[dayIndex].duration += call.duration || 0;
        data[dayIndex].cost += call.cost || 0;
      }
    }
  });
  
  return data;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure a database connection
  try {
    // Simple test to check if database is accessible
    await storage.getAllUsers();
    console.log("Connected to database successfully");
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
  
  // Auth API routes are set up in auth.ts
  
  // Agent routes
  app.get("/api/agents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const agents = await storage.getAllAgentsByUserId(userId);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });
  
  app.get("/api/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const agentId = parseInt(req.params.id);
      
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Verify the agent belongs to the current user
      if (agent.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to view this agent" });
      }
      
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });
  
  app.post("/api/agents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // Validate input
      try {
        insertAgentSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid agent data",
            errors: formatZodError(error)
          });
        }
      }
      
      // Create agent
      const agent = await storage.createAgent({
        ...req.body,
        userId
      });
      
      res.status(201).json(agent);
    } catch (error) {
      console.error("Error creating agent:", error);
      res.status(500).json({ message: "Failed to create agent" });
    }
  });
  
  app.patch("/api/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const agentId = parseInt(req.params.id);
      
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Verify the agent belongs to the current user
      if (agent.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to modify this agent" });
      }
      
      // Update agent
      const updatedAgent = await storage.updateAgent(agentId, req.body);
      
      res.json(updatedAgent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });
  
  app.delete("/api/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const agentId = parseInt(req.params.id);
      
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Verify the agent belongs to the current user
      if (agent.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this agent" });
      }
      
      // First, delete from Vapi if there's an assistant ID
      if (agent.vapiAssistantId) {
        try {
          await deleteVapiAssistant(agent.vapiAssistantId);
          console.log(`Deleted Vapi assistant: ${agent.vapiAssistantId}`);
        } catch (vapiError) {
          console.error("Error deleting Vapi assistant:", vapiError);
          // Continue anyway - we still want to delete the agent from our database
        }
      }
      
      // Delete agent
      await storage.deleteAgent(agentId);
      
      res.status(200).json({ message: "Agent deleted successfully" });
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });
  
  // Call routes
  app.get("/api/calls", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const calls = await storage.getAllCalls();
      
      // Only return calls for this user's agents
      const userAgents = await storage.getAllAgentsByUserId(userId);
      const userAgentIds = userAgents.map(agent => agent.id);
      
      const filteredCalls = calls.filter(call => 
        call.agentId !== null && userAgentIds.includes(call.agentId)
      );
      
      res.json(filteredCalls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });
  
  app.get("/api/calls/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const callId = parseInt(req.params.id);
      
      const call = await storage.getCall(callId);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      // Verify the call is associated with one of the user's agents
      if (call.agentId) {
        const agent = await storage.getAgent(call.agentId);
        
        if (!agent || agent.userId !== userId) {
          return res.status(403).json({ message: "You don't have permission to view this call" });
        }
      } else {
        return res.status(403).json({ message: "Call not associated with any agent" });
      }
      
      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });
  
  // Twilio Account routes
  app.get("/api/twilio-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const accounts = await storage.getTwilioAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching Twilio accounts:", error);
      res.status(500).json({ message: "Failed to fetch Twilio accounts" });
    }
  });
  
  app.get("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const accountId = parseInt(req.params.id);
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to view this Twilio account" });
      }
      
      res.json(account);
    } catch (error) {
      console.error("Error fetching Twilio account:", error);
      res.status(500).json({ message: "Failed to fetch Twilio account" });
    }
  });
  
  app.post("/api/twilio-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // Validate input
      try {
        insertTwilioAccountSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid Twilio account data",
            errors: formatZodError(error)
          });
        }
      }
      
      // Test the Twilio credentials
      try {
        const client = twilio(req.body.accountSid, req.body.authToken);
        const account = await client.api.accounts(req.body.accountSid).fetch();
        
        if (!account) {
          return res.status(400).json({ message: "Invalid Twilio credentials" });
        }
      } catch (twilioError) {
        return res.status(400).json({ 
          message: "Invalid Twilio credentials", 
          error: twilioError instanceof Error ? twilioError.message : "Unknown error" 
        });
      }
      
      // Check if this is the first account for this user
      const existingAccounts = await storage.getTwilioAccountsByUserId(userId);
      const isDefault = existingAccounts.length === 0;
      
      // Create Twilio account
      const account = await storage.createTwilioAccount({
        ...req.body,
        userId,
        isDefault
      });
      
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating Twilio account:", error);
      res.status(500).json({ message: "Failed to create Twilio account" });
    }
  });
  
  app.patch("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const accountId = parseInt(req.params.id);
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to modify this Twilio account" });
      }
      
      // If updating credentials, test them
      if (req.body.accountSid || req.body.authToken) {
        try {
          const accountSid = req.body.accountSid || account.accountSid;
          const authToken = req.body.authToken || account.authToken;
          
          const client = twilio(accountSid, authToken);
          const twilioAccount = await client.api.accounts(accountSid).fetch();
          
          if (!twilioAccount) {
            return res.status(400).json({ message: "Invalid Twilio credentials" });
          }
        } catch (twilioError) {
          return res.status(400).json({ 
            message: "Invalid Twilio credentials",
            error: twilioError instanceof Error ? twilioError.message : "Unknown error"
          });
        }
      }
      
      // Update account
      const updatedAccount = await storage.updateTwilioAccount(accountId, req.body);
      
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating Twilio account:", error);
      res.status(500).json({ message: "Failed to update Twilio account" });
    }
  });
  
  app.delete("/api/twilio-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const accountId = parseInt(req.params.id);
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this Twilio account" });
      }
      
      // Check if the account has associated phone numbers
      const phoneNumbers = await storage.getPhoneNumbersByUserId(userId);
      const associatedNumbers = phoneNumbers.filter(number => number.twilioAccountId === accountId);
      
      if (associatedNumbers.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete Twilio account with associated phone numbers", 
          phoneNumbers: associatedNumbers 
        });
      }
      
      // Delete account
      await storage.deleteTwilioAccount(accountId);
      
      // If this was the default account, set another account as default
      if (account.isDefault) {
        const remainingAccounts = await storage.getTwilioAccountsByUserId(userId);
        
        if (remainingAccounts.length > 0) {
          await storage.setDefaultTwilioAccount(remainingAccounts[0].id, userId);
        }
      }
      
      res.status(200).json({ message: "Twilio account deleted successfully" });
    } catch (error) {
      console.error("Error deleting Twilio account:", error);
      res.status(500).json({ message: "Failed to delete Twilio account" });
    }
  });
  
  app.post("/api/twilio-accounts/:id/set-default", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const accountId = parseInt(req.params.id);
      
      const account = await storage.getTwilioAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (account.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to modify this Twilio account" });
      }
      
      // Set as default
      await storage.setDefaultTwilioAccount(accountId, userId);
      
      res.status(200).json({ message: "Twilio account set as default successfully" });
    } catch (error) {
      console.error("Error setting default Twilio account:", error);
      res.status(500).json({ message: "Failed to set default Twilio account" });
    }
  });
  
  // Phone number routes
  app.get("/api/twilio-phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all phone numbers for the current user
      const userId = req.session.userId || "";
      const phoneNumbers = await storage.getPhoneNumbersByUserId(userId);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });
  
  app.get("/api/available-twilio-phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const { accountId, areaCode, countryCode = 'US' } = req.query;
      
      if (!accountId) {
        return res.status(400).json({ message: "Twilio account ID is required" });
      }
      
      const twilioAccount = await storage.getTwilioAccount(parseInt(accountId as string));
      
      if (!twilioAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (twilioAccount.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to use this Twilio account" });
      }
      
      // Create Twilio client
      const client = twilio(twilioAccount.accountSid, twilioAccount.authToken);
      
      // Search for available numbers
      try {
        let numbers;
        if (areaCode) {
          numbers = await client.availablePhoneNumbers(countryCode)
            .local
            .list({ areaCode: areaCode as string, limit: 20 });
        } else {
          numbers = await client.availablePhoneNumbers(countryCode)
            .local
            .list({ limit: 20 });
        }
        
        // Format response
        const availableNumbers = numbers.map(number => ({
          phoneNumber: number.phoneNumber,
          friendlyName: number.friendlyName,
          region: number.region,
          rateCenter: number.rateCenter,
          locality: number.locality,
          isoCountry: number.isoCountry
        }));
        
        res.json(availableNumbers);
      } catch (error) {
        console.error("Error searching for available phone numbers:", error);
        res.status(500).json({ 
          message: "Failed to search for available phone numbers",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error searching for available phone numbers:", error);
      res.status(500).json({ message: "Failed to search for available phone numbers" });
    }
  });
  
  app.post("/api/purchase-twilio-phone-number", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const { accountId, phoneNumber } = req.body;
      
      if (!accountId || !phoneNumber) {
        return res.status(400).json({ message: "Twilio account ID and phone number are required" });
      }
      
      const twilioAccount = await storage.getTwilioAccount(accountId);
      
      if (!twilioAccount) {
        return res.status(404).json({ message: "Twilio account not found" });
      }
      
      // Verify the account belongs to the current user
      if (twilioAccount.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to use this Twilio account" });
      }
      
      // Create Twilio client
      const client = twilio(twilioAccount.accountSid, twilioAccount.authToken);
      
      // Purchase the number
      try {
        const incomingPhoneNumber = await client.incomingPhoneNumbers.create({
          phoneNumber,
          friendlyName: `AimAI Number ${phoneNumber}`
        });
        
        // Save to our database
        const newPhoneNumber = await storage.createPhoneNumber({
          number: phoneNumber,
          userId,
          twilioAccountId: accountId,
          twilioSid: incomingPhoneNumber.sid,
          friendlyName: incomingPhoneNumber.friendlyName,
          active: true
        });
        
        res.status(201).json(newPhoneNumber);
      } catch (error) {
        console.error("Error purchasing phone number:", error);
        res.status(500).json({ 
          message: "Failed to purchase phone number",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error purchasing phone number:", error);
      res.status(500).json({ message: "Failed to purchase phone number" });
    }
  });
  
  app.get("/api/phone-numbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const phoneNumbers = await storage.getPhoneNumbersByUserId(userId);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Delete phone number from database
  app.delete("/api/phone-numbers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
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
        return res.status(403).json({ message: "You don't have permission to remove this phone number" });
      }
      
      // Simply delete from our database
      const success = await storage.deletePhoneNumber(phoneNumberId);
      
      if (success) {
        console.log(`Successfully deleted phone number ${phoneNumber.number} from database`);
        return res.status(200).json({ 
          message: "Phone number successfully removed",
          number: phoneNumber.number
        });
      } else {
        return res.status(500).json({ message: "Failed to delete phone number from database" });
      }
    } catch (error) {
      console.error("Error removing phone number:", error);
      res.status(500).json({ 
        message: "Failed to remove phone number", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Assign phone number to an agent
  app.patch("/api/phone-numbers/:id/assign", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
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
  app.post("/api/vapi/assistants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
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
      
      assistantParams.metadata.userId = userId;
      
      // Create the assistant
      const assistant = await createVapiAssistant(assistantParams);
      
      res.status(201).json({ 
        success: true, 
        assistant,
        message: "Assistant created successfully" 
      });
    } catch (error) {
      console.error("Error creating Vapi assistant:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create Vapi assistant",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Dashboard metrics
  app.get("/api/metrics/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // Get all agents for this user
      const agents = await storage.getAllAgentsByUserId(userId);
      
      // Get all calls for these agents
      let allCalls: any[] = [];
      
      for (const agent of agents) {
        const agentCalls = await storage.getCallsByAgentId(agent.id);
        allCalls = [...allCalls, ...agentCalls];
      }
      
      // Calculate metrics
      const totalCalls = allCalls.length;
      const totalAgents = agents.length;
      
      // Calculate total duration
      const totalDurationSeconds = allCalls.reduce((acc, call) => {
        return acc + (call.duration || 0);
      }, 0);
      
      // Calculate total cost
      const totalCost = allCalls.reduce((acc, call) => {
        return acc + (call.cost || 0);
      }, 0);
      
      // Calculate average call duration
      const avgDuration = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
      
      // Get daily calls distribution
      const dailyCalls = getDailyCallsDistribution(allCalls);
      
      // Get daily duration and cost
      const dailyMetrics = getDailyDurationAndCost(allCalls);
      
      // Return metrics
      res.json({
        totalCalls,
        totalAgents,
        totalDurationSeconds,
        totalCost,
        avgDuration,
        dailyCalls,
        dailyMetrics
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });
  
  // Contact Group Routes
  app.get("/api/contact-groups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // TODO: Filter by user ID once we add that to the schema
      const contactGroups = await storage.getAllContactGroups();
      
      res.json(contactGroups);
    } catch (error) {
      console.error("Error fetching contact groups:", error);
      res.status(500).json({ message: "Failed to fetch contact groups" });
    }
  });
  
  app.post("/api/contact-groups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // Validate input
      try {
        insertContactGroupSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid contact group data",
            errors: formatZodError(error)
          });
        }
      }
      
      // Create contact group
      const contactGroup = await storage.createContactGroup({
        ...req.body,
        // TODO: Add userId once added to schema
      });
      
      res.status(201).json(contactGroup);
    } catch (error) {
      console.error("Error creating contact group:", error);
      res.status(500).json({ message: "Failed to create contact group" });
    }
  });
  
  app.delete("/api/contact-groups/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const contactGroupId = parseInt(req.params.id);
      
      const contactGroup = await storage.getContactGroup(contactGroupId);
      
      if (!contactGroup) {
        return res.status(404).json({ message: "Contact group not found" });
      }
      
      // TODO: Verify the contact group belongs to the current user once we add userId to schema
      
      // Delete contact group
      await storage.deleteContactGroup(contactGroupId);
      
      res.status(200).json({ message: "Contact group deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact group:", error);
      res.status(500).json({ message: "Failed to delete contact group" });
    }
  });
  
  // Contact Routes
  app.get("/api/contacts/group/:groupId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const groupId = parseInt(req.params.groupId);
      
      const contactGroup = await storage.getContactGroup(groupId);
      
      if (!contactGroup) {
        return res.status(404).json({ message: "Contact group not found" });
      }
      
      // TODO: Verify the contact group belongs to the current user once we add userId to schema
      
      const contacts = await storage.getContactsByGroupId(groupId);
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  app.post("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // Validate input
      try {
        insertContactSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid contact data",
            errors: formatZodError(error)
          });
        }
      }
      
      // If a group ID is provided, verify it exists
      if (req.body.groupId) {
        const contactGroup = await storage.getContactGroup(req.body.groupId);
        
        if (!contactGroup) {
          return res.status(404).json({ message: "Contact group not found" });
        }
        
        // TODO: Verify the contact group belongs to the current user once we add userId to schema
      }
      
      // Create contact
      const contact = await storage.createContact({
        ...req.body,
        // TODO: Add userId once added to schema
      });
      
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });
  
  app.delete("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      const contactId = parseInt(req.params.id);
      
      const contact = await storage.getContact(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // TODO: Verify the contact belongs to the current user once we add userId to schema
      
      // Delete contact
      await storage.deleteContact(contactId);
      
      res.status(200).json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });
  
  // Campaign Routes
  app.get("/api/campaigns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // TODO: Filter by user ID once we add that to the schema
      const campaigns = await storage.getAllCampaigns();
      
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });
  
  app.post("/api/campaigns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || "";
      
      // Validate input
      try {
        insertCampaignSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Invalid campaign data",
            errors: formatZodError(error)
          });
        }
      }
      
      // If an agent ID is provided, verify it exists and belongs to the user
      if (req.body.agentId) {
        const agent = await storage.getAgent(req.body.agentId);
        
        if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
        }
        
        if (agent.userId !== userId) {
          return res.status(403).json({ message: "You don't have permission to use this agent" });
        }
      }
      
      // Create campaign
      const campaign = await storage.createCampaign({
        ...req.body,
        // TODO: Add userId once added to schema
      });
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}