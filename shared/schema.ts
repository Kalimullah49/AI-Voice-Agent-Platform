import { pgTable, text, serial, integer, boolean, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  role: text("role").default("agent").notNull(), // admin, manager, agent
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

// Agent model
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // outbound, inbound
  persona: text("persona"),
  toneStyle: text("tone_style"),
  initialMessage: text("initial_message"),
  companyBackground: text("company_background"),
  agentRules: text("agent_rules"),
  edgeCases: text("edge_cases"),
  script: text("script"),
  summarizerPrompt: text("summarizer_prompt"),
  responseIntelligenceLevel: text("response_intelligence_level"),
  active: boolean("active").default(false),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  type: true,
  persona: true,
  toneStyle: true,
  initialMessage: true,
  companyBackground: true,
  agentRules: true,
  edgeCases: true,
  script: true,
  summarizerPrompt: true,
  responseIntelligenceLevel: true,
  active: true,
});

// Call model
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  agentId: integer("agent_id").references(() => agents.id),
  direction: text("direction").notNull(), // inbound, outbound
  duration: integer("duration").notNull().default(0), // in seconds
  endedReason: text("ended_reason"), // Agent/Customer ended call
  outcome: text("outcome"), // transferred, no-outcome
  cost: real("cost").default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
});

export const insertCallSchema = createInsertSchema(calls).pick({
  fromNumber: true,
  toNumber: true,
  agentId: true,
  direction: true,
  duration: true,
  endedReason: true,
  outcome: true,
  cost: true,
});

// Action model
export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  endpoint: text("endpoint"),
  method: text("method"),
  waitMessage: text("wait_message"),
  defaultValues: text("default_values"),
  extractionSchema: text("extraction_schema"),
  apiKey: text("api_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActionSchema = createInsertSchema(actions).pick({
  name: true,
  description: true,
  type: true,
  endpoint: true,
  method: true,
  waitMessage: true,
  defaultValues: true,
  extractionSchema: true,
  apiKey: true,
});

// Phone number model
export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  agentId: integer("agent_id").references(() => agents.id),
  active: boolean("active").default(true),
});

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).pick({
  number: true,
  agentId: true,
  active: true,
});

// Contact group model
export const contactGroups = pgTable("contact_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactGroupSchema = createInsertSchema(contactGroups).pick({
  name: true,
});

// Contact model
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => contactGroups.id),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  zipCode: text("zip_code"),
  dnc: boolean("dnc").default(false), // Do Not Call flag
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  groupId: true,
  name: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  email: true,
  address: true,
  city: true,
  state: true,
  country: true,
  zipCode: true,
  dnc: true,
});

// Campaign model
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").default("draft").notNull(), // draft, active, paused, completed
  agentId: integer("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  status: true,
  agentId: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type InsertContactGroup = z.infer<typeof insertContactGroupSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
