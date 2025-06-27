
// API Provider configurations
export type APIConfig = {
  provider: string;
  apiKey: string;
  model?: string;
  options?: Record<string, any>;
};

export type AgentAPIConfig = {
  llm: APIConfig;
  voice: APIConfig;
};


import { pgTable, text, serial, integer, boolean, timestamp, varchar, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User model with custom authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // UUID
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),  // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user").notNull(), // admin, manager, user
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  emailVerificationTokenExpiry: timestamp("email_verification_token_expiry"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetTokenExpiry: timestamp("password_reset_token_expiry"),
  emailDeliveryAttempts: integer("email_delivery_attempts").default(0),
  emailDeliveryLogs: jsonb("email_delivery_logs").default([]),
  lastEmailAttempt: timestamp("last_email_attempt"),
  emailDeliveryStatus: varchar("email_delivery_status").default("pending"), // pending, sent, failed, bounced
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  emailVerified: true,
  emailVerificationToken: true,
  emailVerificationTokenExpiry: true,
});

export const registerUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(32, "Invalid verification token"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid reset token"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
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
  userId: varchar("user_id").references(() => users.id), // Reference to user who created the agent
  vapiAssistantId: text("vapi_assistant_id"), // Reference to the Vapi.ai assistant ID
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
  userId: true,
  vapiAssistantId: true,
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

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
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

// Twilio account model for users to store their own Twilio credentials
export const twilioAccounts = pgTable("twilio_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accountName: text("account_name").notNull(), // User-friendly name for the account
  accountSid: text("account_sid").notNull(),
  authToken: text("auth_token").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTwilioAccountSchema = createInsertSchema(twilioAccounts).pick({
  userId: true,
  accountName: true,
  accountSid: true,
  authToken: true,
  isDefault: true,
});

// Phone number model - simplified for hardcoded Twilio credentials
export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  agentId: integer("agent_id").references(() => agents.id),
  active: boolean("active").default(true),
  userId: varchar("user_id").references(() => users.id).notNull(), // User who owns this number
  twilioSid: text("twilio_sid"), // Store the Twilio SID for the phone number
  friendlyName: text("friendly_name"),
  vapiPhoneNumberId: text("vapi_phone_number_id"), // Store the Vapi.ai phone number ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  contactGroupId: integer("contact_group_id").references(() => contactGroups.id),
  concurrentCalls: integer("concurrent_calls").default(1),
  phoneNumberId: integer("phone_number_id").references(() => phoneNumbers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  status: true,
  agentId: true,
  contactGroupId: true,
  concurrentCalls: true,
  phoneNumberId: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;


export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;

export type TwilioAccount = typeof twilioAccounts.$inferSelect;
export type InsertTwilioAccount = z.infer<typeof insertTwilioAccountSchema>;

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type InsertContactGroup = z.infer<typeof insertContactGroupSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

// Webhook logs for debugging
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }),
  payload: jsonb("payload"),
  processed: boolean("processed").default(false),
  error: text("error").notNull().default(''),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).pick({
  type: true,
  payload: true,
  processed: true,
  error: true
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

// Comprehensive email logging table - logs EVERY Postmark API call and response
export const postmarkLogs = pgTable("postmark_logs", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  userId: varchar("user_id"), // Can be null if user creation failed
  attemptNumber: integer("attempt_number").notNull(), // Which retry attempt (1, 2, 3, etc.)
  success: boolean("success").notNull(), // Whether this specific attempt succeeded
  messageId: varchar("message_id"), // Postmark MessageID if successful
  postmarkResponse: jsonb("postmark_response").notNull(), // Full Postmark API response
  requestPayload: jsonb("request_payload").notNull(), // What we sent to Postmark
  errorCode: varchar("error_code"), // Postmark error code (300, 406, 422, etc.)
  httpStatusCode: integer("http_status_code"), // HTTP status code
  errorMessage: text("error_message"), // Error message from Postmark
  networkError: varchar("network_error"), // Network errors (ETIMEDOUT, ECONNRESET, etc.)
  postmarkSubmittedAt: timestamp("postmark_submitted_at"), // When Postmark accepted the email
  emailType: varchar("email_type").notNull().default("verification"), // verification, password_reset, welcome
  environment: varchar("environment").notNull().default("production"), // development, production
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  registrationAttemptId: varchar("registration_attempt_id"), // Link multiple email attempts to same registration
  finalAttempt: boolean("final_attempt").default(false), // Whether this was the last retry
  retryable: boolean("retryable").default(false), // Whether the error was retryable
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Email failure tracking table for comprehensive debugging
export const emailFailureLogs = pgTable("email_failure_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  email: varchar("email").notNull(),
  userId: varchar("user_id"),
  totalAttempts: integer("total_attempts").default(0),
  finalError: text("final_error"),
  failureReason: varchar("failure_reason"),
  postmarkErrorCode: integer("postmark_error_code"),
  httpStatusCode: integer("http_status_code"),
  networkError: varchar("network_error"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  emailType: varchar("email_type"), // verification, password_reset, welcome
  detailedLog: jsonb("detailed_log"),
  registrationAborted: boolean("registration_aborted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailFailureLogSchema = createInsertSchema(emailFailureLogs, {
  email: z.string().email(),
  totalAttempts: z.number().min(0),
  failureReason: z.string().optional(),
  emailType: z.enum(["verification", "password_reset", "welcome"]).optional(),
});

export const insertPostmarkLogSchema = createInsertSchema(postmarkLogs, {
  email: z.string().email(),
  attemptNumber: z.number().min(1),
  success: z.boolean(),
  emailType: z.enum(["verification", "password_reset", "welcome"]).optional(),
  environment: z.enum(["development", "production"]).optional(),
});

export type PostmarkLog = typeof postmarkLogs.$inferSelect;
export type InsertPostmarkLog = z.infer<typeof insertPostmarkLogSchema>;

export type EmailFailureLog = typeof emailFailureLogs.$inferSelect;
export type InsertEmailFailureLog = z.infer<typeof insertEmailFailureLogSchema>;
