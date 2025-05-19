import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAgentSchema, insertCallSchema, insertActionSchema, insertPhoneNumberSchema, insertContactGroupSchema, insertContactSchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";
import { testApiConnection, synthesizeSpeech, getAvailableVoices, createVapiAssistant, VapiAssistantParams } from "./utils/vapi";
import { isAuthenticated } from "./replitAuth";
import { DatabaseStorage } from "./database-storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a database storage instance for our routes
  const dbStorage = new DatabaseStorage();
  
  // Auth user route
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await dbStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Agent routes
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const agentData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid agent data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create agent" });
      }
    }
  });

  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agentData = req.body;
      const agent = await storage.updateAgent(id, agentData);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  // Call routes
  app.get("/api/calls", async (req, res) => {
    try {
      const calls = await storage.getAllCalls();
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.get("/api/calls/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const call = await storage.getCall(id);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      res.json(call);
    } catch (error) {
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

  // Phone number routes
  app.get("/api/phone-numbers", async (req, res) => {
    try {
      const phoneNumbers = await storage.getAllPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch phone numbers" });
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
  
  // Create a Vapi.ai assistant
  app.post("/api/vapi/assistants", async (req, res) => {
    try {
      const assistantParams = req.body as VapiAssistantParams;
      
      if (!assistantParams || !assistantParams.name) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid assistant data. Name is required." 
        });
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
          voiceId: assistantParams.voiceId || "Rachel"
        };
      }
      
      // Create or update the assistant via Vapi API
      const result = await createVapiAssistant(assistantParams);
      
      if (result.success) {
        const action = result.updated ? "updated" : "created";
        console.log(`Successfully ${action} Vapi assistant: ${result.assistant?.id}`);
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
