import { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { loginUserSchema, registerUserSchema, emailVerificationSchema, users } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { sendVerificationEmailWithComprehensiveLogging } from "./utils/postmark-comprehensive";

const scryptAsync = promisify(scrypt);

// Password hashing functions
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Session interface for TypeScript
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log("Get user - session:", req.session?.userId);
  
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export function setupAuth(app: Express) {
  console.log("🔐 LOADING ENHANCED AUTH SYSTEM WITH COMPREHENSIVE LOGGING");
  console.log("🔐 Registration endpoint includes multi-tier fallback retry system");

  // Registration endpoint with comprehensive email logging
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log("=== REGISTRATION START ===");
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    try {
      console.log("Step 1: Validating request data...");
      
      if (!req.body.confirmPassword) {
        console.log("❌ Missing confirmPassword field");
        return res.status(400).json({ message: "Confirm password is required" });
      }

      if (req.body.password !== req.body.confirmPassword) {
        console.log("❌ Passwords do not match");
        return res.status(400).json({ message: "Passwords do not match" });
      }

      console.log("Step 2: Parsing and validating schema...");
      const validatedData = registerUserSchema.parse(req.body);
      console.log("✅ Schema validation successful");

      console.log("Step 3: Checking for existing user...");
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log("❌ Email already registered");
        return res.status(400).json({ message: "Email already registered" });
      }
      console.log("✅ Email is available");

      console.log("Step 4: Hashing password...");
      const hashedPassword = await hashPassword(validatedData.password);
      console.log("✅ Password hashed successfully");

      console.log("Step 5: Generating user ID and verification token...");
      const userId = uuidv4();
      const verificationToken = randomBytes(32).toString('hex');
      console.log(`✅ Generated userId: ${userId}`);
      console.log(`✅ Generated verification token: ${verificationToken.substring(0, 10)}...`);

      console.log("Step 6: Preparing to send verification email...");
      
      // Determine the correct base URL for verification links
      let baseUrl: string;
      if (process.env.REPLIT_DOMAINS) {
        // In Replit environment, always use the Replit domain
        baseUrl = `https://${process.env.REPLIT_DOMAINS}`;
      } else {
        // Fallback to request host detection for other environments
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${req.get('host')}`;
      }
      
      console.log(`Base URL: ${baseUrl}`);
      console.log(`Target email: ${validatedData.email}`);

      // Generate unique registration attempt ID for tracking
      const registrationAttemptId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Step 7: Starting comprehensive email delivery with database logging (ID: ${registrationAttemptId})`);
      
      const emailResult = await sendVerificationEmailWithComprehensiveLogging(
        validatedData.email, 
        verificationToken, 
        baseUrl, 
        userId,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress,
          registrationAttemptId
        }
      );
      
      console.log(`📧 Email delivery completed for ${validatedData.email}:`, {
        success: emailResult.success,
        attempts: emailResult.attempts,
        messageId: emailResult.messageId,
        error: emailResult.error
      });

      console.log("Step 8: Creating user account...");
      const user = await storage.createUser({
        id: userId,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "user",
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      console.log(`✅ User created successfully: ${user.id}`);

      // Remove password from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
      // Provide specific error messages based on email delivery failure type
      let userMessage = "Registration successful! Please check your email to verify your account before logging in.";
      let canRetryEmail = true;
      
      if (!emailResult.success) {
        if (emailResult.error?.includes("inactive")) {
          userMessage = "Registration successful! This email address cannot receive verification emails due to previous delivery issues. Please try a different email address or contact support.";
          canRetryEmail = false;
        } else if (emailResult.error?.includes("bounce")) {
          userMessage = "Registration successful! This email address has bounced previously. Please verify your email address or try a different one.";
          canRetryEmail = false;
        } else if (emailResult.error?.includes("spam")) {
          userMessage = "Registration successful! This email address has been flagged for spam issues. Please try a different email address.";
          canRetryEmail = false;
        } else {
          userMessage = "Registration successful! However, there was a temporary issue sending the verification email. You can request a new verification email from your account settings.";
          canRetryEmail = true;
        }
      }
      
      return res.status(201).json({
        ...userWithoutSensitiveData,
        message: userMessage,
        emailSent: emailResult.success,
        emailAttempts: emailResult.attempts,
        canRetryEmail: emailResult.success || canRetryEmail
      });
      
    } catch (error: any) {
      console.error("=== REGISTRATION ERROR ===");
      console.error(`Error occurred at: ${new Date().toISOString()}`);
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(500).json({ 
        message: error.message || "Registration failed", 
        timestamp: new Date().toISOString()
      });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email);
      
      if (!user || !(await comparePasswords(validatedData.password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ 
          message: "Please verify your email before logging in",
          requiresVerification: true 
        });
      }
      
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Manual verification endpoint
  app.post("/api/auth/manual-verify", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      await storage.verifyEmail(user.emailVerificationToken!);
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Manual verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const user = await storage.verifyEmail(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Get current user
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Password reset request
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      const resetToken = randomBytes(32).toString('hex');
      await storage.createPasswordResetToken(user.id, resetToken, 1);

      // Determine the correct base URL for password reset links
      let baseUrl: string;
      if (process.env.REPLIT_DOMAINS) {
        // In Replit environment, always use the Replit domain
        baseUrl = `https://${process.env.REPLIT_DOMAINS}`;
      } else {
        // Fallback to request host detection for other environments
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${req.get('host')}`;
      }
      
      const { sendPasswordResetEmail } = await import('./utils/postmark-comprehensive');
      await sendPasswordResetEmail(email, resetToken, baseUrl);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Password reset
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || !password || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      const user = await storage.verifyPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updatePassword(user.id, hashedPassword);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Test email endpoint
  app.post("/api/auth/test-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const testToken = randomBytes(16).toString('hex');
      const baseUrl = `https://${req.get('host')}`;
      
      const { sendVerificationEmail } = await import('./utils/postmark');
      const result = await sendVerificationEmail(email, testToken, baseUrl);
      
      res.json({ 
        message: result ? "Test email sent successfully" : "Failed to send test email",
        success: result
      });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Send verification email
  app.post("/api/auth/send-verification", async (req: Request, res: Response) => {
    console.log("🔥 SEND VERIFICATION REQUEST:", {
      body: req.body,
      headers: req.headers,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      const verificationToken = randomBytes(32).toString('hex');
      await storage.createVerificationToken(user.id, verificationToken, 24);

      // Generate proper base URL using same logic as registration
      let baseUrl: string;
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS}`;
      } else {
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${req.get('host')}`;
      }
      
      const { sendVerificationEmailWithComprehensiveLogging } = await import('./utils/postmark-comprehensive');
      const result = await sendVerificationEmailWithComprehensiveLogging(
        email, 
        verificationToken, 
        baseUrl, 
        user.id,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress,
          registrationAttemptId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      );

      if (result.success) {
        res.json({ message: "Verification email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("🔥 SEND VERIFICATION ERROR:", error);
      console.error("🔥 ERROR STACK:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("🔥 ERROR DETAILS:", {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        requestBody: req.body
      });
      res.status(500).json({ 
        message: "Failed to send verification email",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

async function sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
  try {
    const { sendEmail } = await import('./utils/postmark');
    await sendEmail({
      to: email,
      subject: "Welcome to Mind AI!",
      htmlBody: `
        <h1>Welcome to Mind AI${firstName ? `, ${firstName}` : ''}!</h1>
        <p>Thank you for joining our AI-powered call center platform.</p>
        <p>You can now start creating agents and managing your call campaigns.</p>
        <p>Best regards,<br>The Mind AI Team</p>
      `,
      textBody: `Welcome to Mind AI${firstName ? `, ${firstName}` : ''}! Thank you for joining our AI-powered call center platform.`
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}