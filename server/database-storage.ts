import { eq } from 'drizzle-orm';
import {
  User, Agent, Call, Action, PhoneNumber, ContactGroup, Contact, Campaign,
  InsertUser, InsertAgent, InsertCall, InsertAction, InsertPhoneNumber,
  InsertContactGroup, InsertContact, InsertCampaign,
  users, agents, calls, actions, phoneNumbers, contactGroups, contacts, campaigns,
} from "@shared/schema";
import { IStorage } from './storage';
import { db } from './db';

// PostgreSQL storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0];
  }
  
  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ 
        ...userData,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date()
        }
      })
      .returning();
      
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Agent operations
  async getAgent(id: number): Promise<Agent | undefined> {
    const results = await db.select().from(agents).where(eq(agents.id, id));
    return results[0];
  }
  
  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db.insert(agents).values(agent).returning();
    return newAgent;
  }
  
  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [updatedAgent] = await db
      .update(agents)
      .set(agent)
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent;
  }
  
  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }
  
  // Call operations
  async getCall(id: number): Promise<Call | undefined> {
    const results = await db.select().from(calls).where(eq(calls.id, id));
    return results[0];
  }
  
  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }
  
  async getAllCalls(): Promise<Call[]> {
    return await db.select().from(calls);
  }
  
  async getCallsByAgentId(agentId: number): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.agentId, agentId));
  }
  
  // Action operations
  async getAction(id: number): Promise<Action | undefined> {
    const results = await db.select().from(actions).where(eq(actions.id, id));
    return results[0];
  }
  
  async createAction(action: InsertAction): Promise<Action> {
    const [newAction] = await db.insert(actions).values(action).returning();
    return newAction;
  }
  
  async getAllActions(): Promise<Action[]> {
    return await db.select().from(actions);
  }
  
  // Phone number operations
  async getPhoneNumber(id: number): Promise<PhoneNumber | undefined> {
    const results = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id));
    return results[0];
  }
  
  async createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const [newPhoneNumber] = await db.insert(phoneNumbers).values(phoneNumber).returning();
    return newPhoneNumber;
  }
  
  async getAllPhoneNumbers(): Promise<PhoneNumber[]> {
    return await db.select().from(phoneNumbers);
  }
  
  // Contact group operations
  async getContactGroup(id: number): Promise<ContactGroup | undefined> {
    const results = await db.select().from(contactGroups).where(eq(contactGroups.id, id));
    return results[0];
  }
  
  async createContactGroup(contactGroup: InsertContactGroup): Promise<ContactGroup> {
    const [newContactGroup] = await db.insert(contactGroups).values(contactGroup).returning();
    return newContactGroup;
  }
  
  async getAllContactGroups(): Promise<ContactGroup[]> {
    return await db.select().from(contactGroups);
  }
  
  async deleteContactGroup(id: number): Promise<boolean> {
    const result = await db.delete(contactGroups).where(eq(contactGroups.id, id));
    return result !== undefined;
  }
  
  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    const results = await db.select().from(contacts).where(eq(contacts.id, id));
    return results[0];
  }
  
  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }
  
  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }
  
  async getContactsByGroupId(groupId: number): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.groupId, groupId));
  }
  
  async deleteContact(id: number): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return result !== undefined;
  }
  
  // Campaign operations
  async getCampaign(id: number): Promise<Campaign | undefined> {
    const results = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return results[0];
  }
  
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }
  
  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set(campaign)
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }
  
  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns);
  }
  
  // Clear all data
  async clearAllData(): Promise<void> {
    await db.delete(calls);
    await db.delete(contacts);
    await db.delete(contactGroups);
    await db.delete(phoneNumbers);
    await db.delete(campaigns);
    await db.delete(actions);
    await db.delete(agents);
    // Don't delete users during clear all data
  }
}