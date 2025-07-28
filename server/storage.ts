import { 
  users, type User, type InsertUser,
  agents, type Agent, type InsertAgent,
  calls, type Call, type InsertCall,
  actions, type Action, type InsertAction,
  phoneNumbers, type PhoneNumber, type InsertPhoneNumber,
  twilioAccounts, type TwilioAccount, type InsertTwilioAccount,
  contactGroups, type ContactGroup, type InsertContactGroup,
  contacts, type Contact, type InsertContact,
  campaigns, type Campaign, type InsertCampaign,
  type EmailFailureLog, type InsertEmailFailureLog,
  type PostmarkLog, type InsertPostmarkLog
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  verifyEmail(token: string): Promise<User | undefined>;
  createVerificationToken(userId: string, token: string, expiryHours?: number): Promise<boolean>;
  createPasswordResetToken(userId: string, token: string, expiryHours?: number): Promise<boolean>;
  verifyPasswordResetToken(token: string): Promise<User | undefined>;
  updatePassword(userId: string, hashedPassword: string): Promise<boolean>;
  
  // Agent operations
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
  getAllAgents(): Promise<Agent[]>;
  getAllAgentsByUserId(userId: string): Promise<Agent[]>;
  
  // Call operations
  getCall(id: number): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  getAllCalls(): Promise<Call[]>;
  getCallsByAgentId(agentId: number): Promise<Call[]>;
  deleteCall(id: number): Promise<boolean>;
  deleteCall(id: number): Promise<boolean>;
  
  // Action operations
  getAction(id: number): Promise<Action | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  getAllActions(): Promise<Action[]>;
  
  // Twilio account operations
  getTwilioAccount(id: number): Promise<TwilioAccount | undefined>;
  createTwilioAccount(account: InsertTwilioAccount): Promise<TwilioAccount>;
  updateTwilioAccount(id: number, account: Partial<InsertTwilioAccount>): Promise<TwilioAccount | undefined>;
  deleteTwilioAccount(id: number): Promise<boolean>;
  getAllTwilioAccounts(): Promise<TwilioAccount[]>;
  getTwilioAccountsByUserId(userId: string): Promise<TwilioAccount[]>;
  
  // Phone number operations (simplified for hardcoded Twilio credentials)
  getPhoneNumber(id: number): Promise<PhoneNumber | undefined>;
  createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber>;
  updatePhoneNumber(id: number, phoneNumber: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined>;
  deletePhoneNumber(id: number): Promise<boolean>;
  getAllPhoneNumbers(): Promise<PhoneNumber[]>;
  getPhoneNumbersByUserId(userId: string): Promise<PhoneNumber[]>;
  getPhoneNumbersByAgentId(agentId: number): Promise<PhoneNumber[]>;
  
  // Contact group operations
  getContactGroup(id: number): Promise<ContactGroup | undefined>;
  createContactGroup(contactGroup: InsertContactGroup): Promise<ContactGroup>;
  getAllContactGroups(): Promise<ContactGroup[]>;
  getContactGroupsByUserId(userId: string): Promise<ContactGroup[]>;
  deleteContactGroup(id: number): Promise<boolean>;
  
  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  getAllContacts(): Promise<Contact[]>;
  getContactsByGroupId(groupId: number): Promise<Contact[]>;
  deleteContact(id: number): Promise<boolean>;
  
  // Campaign operations
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  getAllCampaigns(): Promise<Campaign[]>;
  getCampaignsByUserId(userId: string): Promise<Campaign[]>;
  deleteCampaign(id: number): Promise<boolean>;
  
  // Email failure logging operations
  createEmailFailureLog(failureData: InsertEmailFailureLog): Promise<EmailFailureLog>;
  getEmailFailureLogs(limit?: number): Promise<EmailFailureLog[]>;
  getEmailFailureLogsByEmail(email: string): Promise<EmailFailureLog[]>;
  getEmailFailureLogsByUserId(userId: string): Promise<EmailFailureLog[]>;
  
  // Postmark logging operations - logs EVERY API call and response
  createPostmarkLog(logData: InsertPostmarkLog): Promise<PostmarkLog>;
  getPostmarkLogs(limit?: number): Promise<PostmarkLog[]>;
  getPostmarkLogsByEmail(email: string): Promise<PostmarkLog[]>;
  getPostmarkLogsByRegistrationAttempt(registrationAttemptId: string): Promise<PostmarkLog[]>;
  getPostmarkLogsByUserId(userId: string): Promise<PostmarkLog[]>;
  
  // Clear all data
  clearAllData(): Promise<void>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private agents: Map<number, Agent>;
  private calls: Map<number, Call>;
  private actions: Map<number, Action>;
  private phoneNumbers: Map<number, PhoneNumber>;
  private contactGroups: Map<number, ContactGroup>;
  private contacts: Map<number, Contact>;
  private campaigns: Map<number, Campaign>;
  
  private userId: number;
  private agentId: number;
  private callId: number;
  private actionId: number;
  private phoneNumberId: number;
  private contactGroupId: number;
  private contactId: number;
  private campaignId: number;
  
  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.calls = new Map();
    this.actions = new Map();
    this.phoneNumbers = new Map();
    this.contactGroups = new Map();
    this.contacts = new Map();
    this.campaigns = new Map();
    
    this.userId = 1;
    this.agentId = 1;
    this.callId = 1;
    this.actionId = 1;
    this.phoneNumberId = 1;
    this.contactGroupId = 1;
    this.contactId = 1;
    this.campaignId = 1;
  }
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async upsertUser(userData: InsertUser): Promise<User> {
    const timestamp = new Date();
    const existingUser = this.users.get(userData.id);
    
    if (existingUser) {
      // Update existing user
      const updatedUser: User = { 
        ...existingUser, 
        ...userData,
        updatedAt: timestamp
      };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      // Create new user
      const newUser: User = {
        ...userData,
        createdAt: timestamp,
        updatedAt: null,
        role: userData.role || "user"
      } as User;
      this.users.set(userData.id, newUser);
      return newUser;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Agent operations
  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }
  
  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.agentId++;
    const agent: Agent = { 
      ...insertAgent, 
      id,
      persona: insertAgent.persona ?? null,
      toneStyle: insertAgent.toneStyle ?? null,
      initialMessage: insertAgent.initialMessage ?? null,
      companyBackground: insertAgent.companyBackground ?? null,
      agentRules: insertAgent.agentRules ?? null,
      vapiAssistantId: insertAgent.vapiAssistantId ?? null,
      edgeCases: insertAgent.edgeCases ?? null,
      script: insertAgent.script ?? null,
      faqs: insertAgent.faqs ?? null, // Added FAQs field
      summarizerPrompt: insertAgent.summarizerPrompt ?? null,
      responseIntelligenceLevel: insertAgent.responseIntelligenceLevel ?? null,
      active: insertAgent.active ?? null,
      userId: insertAgent.userId ?? null
    };
    this.agents.set(id, agent);
    return agent;
  }
  
  async updateAgent(id: number, agentUpdate: Partial<InsertAgent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent: Agent = { ...agent, ...agentUpdate };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }
  
  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }
  
  async getAllAgentsByUserId(userId: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(agent => agent.userId === userId);
  }
  
  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }
  
  // Call operations
  async getCall(id: number): Promise<Call | undefined> {
    return this.calls.get(id);
  }
  
  async createCall(insertCall: InsertCall): Promise<Call> {
    const id = this.callId++;
    const call: Call = { 
      ...insertCall, 
      id, 
      startedAt: insertCall.startedAt || new Date(),
      agentId: insertCall.agentId ?? null,
      duration: insertCall.duration ?? 0,
      endedReason: insertCall.endedReason ?? null,
      outcome: insertCall.outcome ?? null,
      cost: insertCall.cost ?? null,
      vapiCallId: insertCall.vapiCallId ?? null,
      recordingUrl: insertCall.recordingUrl ?? null,
      direction: insertCall.direction ?? 'outbound'
    };
    this.calls.set(id, call);
    return call;
  }
  
  async getAllCalls(): Promise<Call[]> {
    return Array.from(this.calls.values());
  }
  
  async getCallsByAgentId(agentId: number): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(call => call.agentId === agentId);
  }

  async deleteCall(id: number): Promise<boolean> {
    return this.calls.delete(id);
  }
  
  // Action operations
  async getAction(id: number): Promise<Action | undefined> {
    return this.actions.get(id);
  }
  
  async createAction(insertAction: InsertAction): Promise<Action> {
    const id = this.actionId++;
    const createdAt = new Date();
    const action: Action = { 
      ...insertAction, 
      id, 
      createdAt,
      description: insertAction.description ?? null,
      endpoint: insertAction.endpoint ?? null,
      method: insertAction.method ?? null,
      waitMessage: insertAction.waitMessage ?? null,
      defaultValues: insertAction.defaultValues ?? null,
      extractionSchema: insertAction.extractionSchema ?? null,
      apiKey: insertAction.apiKey ?? null
    };
    this.actions.set(id, action);
    return action;
  }
  
  async getAllActions(): Promise<Action[]> {
    return Array.from(this.actions.values());
  }
  
  // Phone number operations
  async getPhoneNumber(id: number): Promise<PhoneNumber | undefined> {
    return this.phoneNumbers.get(id);
  }
  
  async createPhoneNumber(insertPhoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const id = this.phoneNumberId++;
    const phoneNumber: PhoneNumber = { 
      ...insertPhoneNumber, 
      id,
      createdAt: insertPhoneNumber.createdAt ?? new Date(),
      updatedAt: insertPhoneNumber.updatedAt ?? null,
      active: insertPhoneNumber.active ?? null,
      agentId: insertPhoneNumber.agentId ?? null,
      twilioSid: insertPhoneNumber.twilioSid ?? null,
      friendlyName: insertPhoneNumber.friendlyName ?? null,
      vapiPhoneNumberId: insertPhoneNumber.vapiPhoneNumberId ?? null
    };
    this.phoneNumbers.set(id, phoneNumber);
    return phoneNumber;
  }
  
  async getAllPhoneNumbers(): Promise<PhoneNumber[]> {
    return Array.from(this.phoneNumbers.values());
  }
  
  async updatePhoneNumber(id: number, phoneNumberUpdate: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined> {
    const phoneNumber = this.phoneNumbers.get(id);
    if (!phoneNumber) return undefined;
    
    const updatedPhoneNumber: PhoneNumber = { ...phoneNumber, ...phoneNumberUpdate };
    this.phoneNumbers.set(id, updatedPhoneNumber);
    return updatedPhoneNumber;
  }
  
  async deletePhoneNumber(id: number): Promise<boolean> {
    return this.phoneNumbers.delete(id);
  }
  
  async getPhoneNumbersByUserId(userId: string): Promise<PhoneNumber[]> {
    return Array.from(this.phoneNumbers.values()).filter(phoneNumber => phoneNumber.userId === userId);
  }
  
  // getPhoneNumbersByTwilioAccountId removed - no longer needed with hardcoded credentials
  
  // Contact group operations
  async getContactGroup(id: number): Promise<ContactGroup | undefined> {
    return this.contactGroups.get(id);
  }
  
  async createContactGroup(insertContactGroup: InsertContactGroup): Promise<ContactGroup> {
    const id = this.contactGroupId++;
    const createdAt = new Date();
    const contactGroup: ContactGroup = { ...insertContactGroup, id, createdAt };
    this.contactGroups.set(id, contactGroup);
    return contactGroup;
  }
  
  async getAllContactGroups(): Promise<ContactGroup[]> {
    return Array.from(this.contactGroups.values());
  }
  
  async getContactGroupsByUserId(userId: string): Promise<ContactGroup[]> {
    return Array.from(this.contactGroups.values()).filter(group => group.userId === userId);
  }
  
  async deleteContactGroup(id: number): Promise<boolean> {
    const group = this.contactGroups.get(id);
    if (!group) {
      return false;
    }
    
    // Delete all contacts in this group first
    const contactsInGroup = await this.getContactsByGroupId(id);
    for (const contact of contactsInGroup) {
      await this.deleteContact(contact.id);
    }
    
    // Delete the group itself
    this.contactGroups.delete(id);
    return true;
  }
  
  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }
  
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.contactId++;
    const createdAt = new Date();
    const contact: Contact = { 
      ...insertContact, 
      id, 
      createdAt,
      email: insertContact.email ?? null,
      firstName: insertContact.firstName ?? null,
      lastName: insertContact.lastName ?? null,
      groupId: insertContact.groupId ?? null,
      address: insertContact.address ?? null,
      city: insertContact.city ?? null,
      state: insertContact.state ?? null,
      zipCode: insertContact.zipCode ?? null,
      country: insertContact.country ?? null,
      dnc: insertContact.dnc ?? null
    };
    this.contacts.set(id, contact);
    return contact;
  }
  
  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }
  
  async getContactsByGroupId(groupId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(contact => contact.groupId === groupId);
  }
  
  async deleteContact(id: number): Promise<boolean> {
    const contact = this.contacts.get(id);
    if (!contact) {
      return false;
    }
    
    this.contacts.delete(id);
    return true;
  }
  
  // Campaign operations
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }
  
  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = this.campaignId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const campaign: Campaign = { 
      ...insertCampaign, 
      id, 
      createdAt, 
      updatedAt,
      status: insertCampaign.status ?? "draft",
      agentId: insertCampaign.agentId ?? null,
      contactGroupId: insertCampaign.contactGroupId ?? null,
      concurrentCalls: insertCampaign.concurrentCalls ?? null,
      phoneNumberId: insertCampaign.phoneNumberId ?? null
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }
  
  async updateCampaign(id: number, campaignUpdate: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updatedAt = new Date();
    const updatedCampaign: Campaign = { ...campaign, ...campaignUpdate, updatedAt };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }
  
  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }
  
  async getCampaignsByUserId(userId: string): Promise<Campaign[]> {
    // For memory storage, we need to filter campaigns by agents owned by the user
    const userAgents = await this.getAllAgentsByUserId(userId);
    const userAgentIds = userAgents.map(agent => agent.id);
    
    return Array.from(this.campaigns.values()).filter(campaign => 
      campaign.agentId && userAgentIds.includes(campaign.agentId)
    );
  }
  
  async clearAllData(): Promise<void> {
    // Clear all data collections
    this.users.clear();
    this.agents.clear();
    this.calls.clear();
    this.actions.clear();
    this.phoneNumbers.clear();
    this.contactGroups.clear();
    this.contacts.clear();
    this.campaigns.clear();
    
    // Reset IDs
    this.userId = 1;
    this.agentId = 1;
    this.callId = 1;
    this.actionId = 1;
    this.phoneNumberId = 1;
    this.contactGroupId = 1;
    this.contactId = 1;
    this.campaignId = 1;
  }
}

// Import the DatabaseStorage implementation
import { DatabaseStorage } from './database-storage';

// Use the DatabaseStorage implementation
export const storage = new DatabaseStorage();
