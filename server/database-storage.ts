import { eq, and, isNull } from 'drizzle-orm';
import {
  User, Agent, Call, Action, PhoneNumber, ContactGroup, Contact, Campaign, TwilioAccount,
  InsertUser, InsertAgent, InsertCall, InsertAction, InsertPhoneNumber, InsertTwilioAccount,
  InsertContactGroup, InsertContact, InsertCampaign,
  users, agents, calls, actions, phoneNumbers, contactGroups, contacts, campaigns, twilioAccounts,
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results[0];
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return user;
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
  
  async getAllAgentsByUserId(userId: string): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.userId, userId));
  }
  
  async deleteAgent(id: number): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id));
    return result !== undefined;
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
  
  // Twilio account operations
  async getTwilioAccount(id: number): Promise<TwilioAccount | undefined> {
    const results = await db.select().from(twilioAccounts).where(eq(twilioAccounts.id, id));
    return results[0];
  }
  
  async createTwilioAccount(account: InsertTwilioAccount): Promise<TwilioAccount> {
    // If this is the first account for this user, set it as default
    const userAccounts = await this.getTwilioAccountsByUserId(account.userId);
    const isDefault = userAccounts.length === 0 ? true : account.isDefault || false;
    
    // If setting this account as default, unset other defaults for this user
    if (isDefault) {
      await db
        .update(twilioAccounts)
        .set({ isDefault: false })
        .where(eq(twilioAccounts.userId, account.userId));
    }
    
    const [newAccount] = await db
      .insert(twilioAccounts)
      .values({
        ...account,
        isDefault,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newAccount;
  }

  async updateTwilioAccount(id: number, account: Partial<InsertTwilioAccount>): Promise<TwilioAccount | undefined> {
    // If setting this account as default, unset other defaults for this user
    const existingAccount = await this.getTwilioAccount(id);
    if (!existingAccount) return undefined;
    
    if (account.isDefault) {
      await db
        .update(twilioAccounts)
        .set({ isDefault: false })
        .where(eq(twilioAccounts.userId, existingAccount.userId));
    }
    
    const [updatedAccount] = await db
      .update(twilioAccounts)
      .set({
        ...account,
        updatedAt: new Date()
      })
      .where(eq(twilioAccounts.id, id))
      .returning();
    
    return updatedAccount;
  }
  
  async deleteTwilioAccount(id: number): Promise<boolean> {
    const account = await this.getTwilioAccount(id);
    if (!account) return false;
    
    await db.delete(twilioAccounts).where(eq(twilioAccounts.id, id));
    
    // If this was the default account, set another account as default if available
    if (account.isDefault) {
      const accounts = await this.getTwilioAccountsByUserId(account.userId);
      if (accounts.length > 0) {
        await db
          .update(twilioAccounts)
          .set({ isDefault: true })
          .where(eq(twilioAccounts.id, accounts[0].id));
      }
    }
    
    return true;
  }
  
  async getAllTwilioAccounts(): Promise<TwilioAccount[]> {
    return await db.select().from(twilioAccounts);
  }
  
  async getTwilioAccountsByUserId(userId: string): Promise<TwilioAccount[]> {
    return await db
      .select()
      .from(twilioAccounts)
      .where(eq(twilioAccounts.userId, userId));
  }
  
  async getDefaultTwilioAccount(userId: string): Promise<TwilioAccount | undefined> {
    const results = await db
      .select()
      .from(twilioAccounts)
      .where(and(
        eq(twilioAccounts.userId, userId),
        eq(twilioAccounts.isDefault, true)
      ));
    
    return results[0];
  }
  
  async setDefaultTwilioAccount(id: number, userId: string): Promise<boolean> {
    const account = await this.getTwilioAccount(id);
    if (!account || account.userId !== userId) return false;
    
    // Unset all other accounts as default
    await db
      .update(twilioAccounts)
      .set({ isDefault: false })
      .where(eq(twilioAccounts.userId, userId));
    
    // Set this account as default
    await db
      .update(twilioAccounts)
      .set({ isDefault: true })
      .where(eq(twilioAccounts.id, id));
    
    return true;
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
  
  async updatePhoneNumber(id: number, data: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined> {
    const [updatedPhoneNumber] = await db
      .update(phoneNumbers)
      .set(data)
      .where(eq(phoneNumbers.id, id))
      .returning();
    return updatedPhoneNumber;
  }
  
  async deletePhoneNumber(id: number): Promise<boolean> {
    const result = await db.delete(phoneNumbers).where(eq(phoneNumbers.id, id));
    return result !== undefined;
  }
  
  async getPhoneNumbersByUserId(userId: string): Promise<PhoneNumber[]> {
    return await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.userId, userId));
  }
  
  async getPhoneNumbersByTwilioAccountId(twilioAccountId: number): Promise<PhoneNumber[]> {
    return await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.twilioAccountId, twilioAccountId));
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