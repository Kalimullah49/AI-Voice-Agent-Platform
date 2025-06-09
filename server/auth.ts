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

// Extend Express Session
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('Auth check - session:', req.session?.userId);
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
}

export function setupAuth(app: Express) {
  console.log("🔐 LOADING ENHANCED AUTH SYSTEM WITH COMPREHENSIVE LOGGING");
  console.log("🔐 Registration endpoint includes multi-tier fallback retry system");
  
  // Configure session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to false for development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax' // Add sameSite for better compatibility
      },
    })
  );

  // Registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log("=== REGISTRATION START ===");
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    let userId: string;
    let verificationToken: string;
    let validatedData: any;
    let emailResult: any;
    
    try {
      console.log("Step 1: Validating request data...");
      
      // Make sure confirmPassword is in the request body
      if (!req.body.confirmPassword) {
        console.error("❌ Missing confirmPassword field");
        return res.status(400).json({ 
          message: "Confirm password is required" 
        });
      }
      
      // Validate request body
      console.log("Step 2: Parsing and validating schema...");
      validatedData = registerUserSchema.parse(req.body);
      console.log("✅ Schema validation successful");
      
      // Check if user already exists
      console.log("Step 3: Checking for existing user...");
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.error(`❌ User already exists: ${validatedData.email}`);
        return res.status(400).json({ message: "Email already in use" });
      }
      console.log("✅ Email is available");
      
      // Hash password
      console.log("Step 4: Hashing password...");
      const hashedPassword = await hashPassword(validatedData.password);
      console.log("✅ Password hashed successfully");
      
      // Generate user ID and verification token first
      console.log("Step 5: Generating user ID and verification token...");
      userId = uuidv4();
      verificationToken = randomBytes(32).toString('hex');
      console.log(`✅ Generated userId: ${userId}`);
      console.log(`✅ Generated verification token: ${verificationToken.substring(0, 10)}...`);
      
      // Send verification email BEFORE creating user account
      console.log("Step 6: Preparing to send verification email...");
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      console.log(`Base URL: ${baseUrl}`);
      console.log(`Target email: ${validatedData.email}`);
      
      // Import the enhanced email function
      console.log("Step 7: Importing email module...");
      const { sendVerificationEmailWithLogging } = await import('./utils/postmark');
      console.log("✅ Email module imported successfully");
      
      // Test email delivery first with temporary user ID
      console.log("Step 8: Attempting to send verification email...");
      emailResult = await sendVerificationEmailWithLogging(validatedData.email, verificationToken, baseUrl, userId);
      console.log("Email result:", JSON.stringify(emailResult, null, 2));
      
      if (!emailResult.success) {
        console.error("❌ Primary email sending failed, attempting fallback retry system...");
        
        // FALLBACK RETRY SYSTEM - Try again with different approach
        console.log("Step 8b: Fallback retry system activated...");
        
        try {
          // Wait a moment and try again
          console.log("Waiting 2 seconds before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Generate unique registration attempt ID for tracking all email attempts
          const registrationAttemptId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`Starting comprehensive email delivery with database logging (ID: ${registrationAttemptId})`);
          
          emailResult = await sendVerificationEmailWithComprehensiveLogging(
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
          
          console.log(`Email delivery completed for ${validatedData.email}:`, {
            success: emailResult.success,
            attempts: emailResult.attempts,
            messageId: emailResult.messageId,
            error: emailResult.error
          });
            
            // If still failed, log detailed failure and abort registration
            if (!emailResult.success) {
              console.error("❌ ALL EMAIL ATTEMPTS FAILED - Aborting registration");
              
              // Create comprehensive failure log
              const failureLog = {
                timestamp: new Date().toISOString(),
                email: validatedData.email,
                userId: userId,
                totalAttempts: emailResult.attempts || 0,
                finalError: emailResult.error || 'Unknown error',
                postmarkResponse: emailResult.postmarkResponse || null,
                registrationAborted: true,
                failureReason: 'Email delivery failed after all retry attempts',
                userAgent: req.headers['user-agent'] || 'Unknown',
                ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
              };
              
              console.error("📋 DETAILED FAILURE LOG:", JSON.stringify(failureLog, null, 2));
              
              // Log to dedicated email failure tracking table
              try {
                const emailFailureData = {
                  email: validatedData.email,
                  userId: userId,
                  totalAttempts: emailResult.attempts || 0,
                  finalError: emailResult.error || 'Unknown error',
                  failureReason: 'Email delivery failed after all retry attempts',
                  postmarkErrorCode: emailResult.postmarkResponse?.errorCode || null,
                  httpStatusCode: emailResult.postmarkResponse?.httpStatusCode || null,
                  networkError: emailResult.postmarkResponse?.networkError || null,
                  userAgent: req.headers['user-agent'] || null,
                  ipAddress: req.ip || req.connection.remoteAddress || null,
                  emailType: 'verification' as 'verification',
                  detailedLog: emailResult.detailedError || failureLog,
                  registrationAborted: true
                };
                
                await storage.createEmailFailureLog(emailFailureData);
                console.log("✅ Email failure details logged to dedicated tracking table");
                
                // Also log to user record for immediate access
                await storage.logEmailDelivery(userId, failureLog);
                console.log("✅ Failure summary logged to user record");
              } catch (dbError) {
                console.error("❌ Failed to log failure details:", dbError);
              }
              
              return res.status(500).json({ 
                message: "Failed to send verification email after multiple attempts. Please check your email address and try again.",
                emailError: "All retry attempts exhausted",
                failureId: userId // Allow user to reference this specific failure
              });
            }
          }
        } catch (fallbackError: any) {
          console.error("❌ Fallback retry system threw error:", fallbackError);
          
          // Create comprehensive failure log for fallback system errors
          const fallbackFailureLog = {
            timestamp: new Date().toISOString(),
            email: validatedData.email,
            userId: userId,
            totalAttempts: 0,
            finalError: fallbackError.message || 'Fallback system error',
            postmarkResponse: null,
            registrationAborted: true,
            failureReason: 'Fallback retry system threw exception',
            systemError: {
              name: fallbackError.name,
              message: fallbackError.message,
              stack: fallbackError.stack
            },
            userAgent: req.headers['user-agent'] || 'Unknown',
            ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
          };
          
          console.error("📋 FALLBACK SYSTEM FAILURE LOG:", JSON.stringify(fallbackFailureLog, null, 2));
          
          // Log fallback failure to dedicated tracking table
          try {
            const fallbackEmailFailureData = {
              email: validatedData.email,
              userId: userId,
              totalAttempts: 0,
              finalError: fallbackError.message || 'Fallback system error',
              failureReason: 'Fallback retry system threw exception',
              userAgent: req.headers['user-agent'] || null,
              ipAddress: req.ip || req.connection.remoteAddress || null,
              emailType: 'verification' as 'verification',
              detailedLog: fallbackFailureLog,
              registrationAborted: true
            };
            
            await storage.createEmailFailureLog(fallbackEmailFailureData);
            console.log("✅ Fallback failure details logged to dedicated tracking table");
            
            // Also log to user record
            await storage.logEmailDelivery(userId, fallbackFailureLog);
            console.log("✅ Fallback failure summary logged to user record");
          } catch (dbError) {
            console.error("❌ Failed to log fallback failure details:", dbError);
          }
          
          // Abort registration if fallback also fails
          return res.status(500).json({ 
            message: "Failed to send verification email. Please check your email address and try again.",
            emailError: `Fallback system error: ${fallbackError.message || 'Unknown error'}`,
            failureId: userId
          });
        }
      }
      
      console.log("Step 9: Creating user account - email verified successful...");
      console.log(`Email success status: ${emailResult.success}`);
      
      // Only create user account if email was sent successfully
      const user = await storage.createUser({
        id: userId,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "user",
        emailVerified: false, // Require email verification
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      console.log(`✅ User created successfully: ${user.id}`);
      
      // Log the email delivery attempt to database
      console.log("Step 10: Logging email delivery to database...");
      await storage.logEmailDelivery(user.id, {
        timestamp: new Date().toISOString(),
        type: 'verification',
        attempts: emailResult.attempts,
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error,
        email: user.email
      });
      console.log("✅ Email delivery logged to database");
      
      const processingTime = Date.now() - startTime;
      console.log(`=== REGISTRATION COMPLETE ===`);
      console.log(`Total processing time: ${processingTime}ms`);
      console.log(`Email status: ${emailResult.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`User created: ${user.id}`);
      
      if (emailResult.success) {
        console.log(`✅ Verification email sent successfully to ${user.email} on attempt ${emailResult.attempts}. MessageID: ${emailResult.messageId}`);
      } else {
        console.log(`❌ Verification email failed for ${user.email} after ${emailResult.attempts} attempts. Error: ${emailResult.error}`);
      }
      
      // Don't auto-login - user must verify email first
      // Remove password from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
      return res.status(201).json({
        ...userWithoutSensitiveData,
        message: emailResult.success 
          ? "Registration successful! Please check your email to verify your account before logging in."
          : "Registration successful! However, there was an issue sending the verification email. Please contact support.",
        emailSent: emailResult.success,
        emailAttempts: emailResult.attempts
      });
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error("=== REGISTRATION ERROR ===");
      console.error(`Error occurred at: ${new Date().toISOString()}`);
      console.error(`Processing time before error: ${processingTime}ms`);
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
        message: error instanceof Error ? error.message : "Registration failed",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Compare passwords
      const passwordMatch = await comparePasswords(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if email is verified before allowing login
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email address before logging in. Check your inbox for a verification link.",
          emailVerified: false,
          email: user.email
        });
      }
      
      // Set user in session only if email is verified
      req.session.userId = String(user.id);
      console.log('Session set for user:', req.session.userId);
      
      // Remove sensitive data from response
      const { password, emailVerificationToken, passwordResetToken, ...userWithoutSensitiveData } = user;
      
      // Return user
      return res.status(200).json(userWithoutSensitiveData);
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors
        });
      }
      return res.status(400).json({ 
        message: error instanceof Error ? error.message : "Login failed" 
      });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Manual verification endpoint (for development)
  app.post("/api/auth/manual-verify", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user to verified
      await db.update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, user.id));
      
      return res.status(200).json({ 
        message: "Email manually verified for development purposes",
        verified: true
      });
    } catch (error) {
      console.error("Manual verification error:", error);
      return res.status(500).json({ message: "Failed to manually verify email" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      // Validate token with schema
      try {
        emailVerificationSchema.parse({ token });
      } catch (validationError) {
        return res.status(400).json({ message: "Invalid verification token format" });
      }
      
      // Verify email using the token
      const user = await storage.verifyEmail(token);
      
      if (!user) {
        return res.status(400).json({ 
          message: "Invalid or expired verification token" 
        });
      }
      
      // Send welcome email if Postmark is configured
      if (process.env.POSTMARK_SERVER_TOKEN) {
        try {
          await sendWelcomeEmail(user.email, user.firstName || undefined);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Continue anyway, this is not critical
        }
      }
      
      // Automatically log the user in after verification
      req.session.userId = user.id;
      
      // Return success response (frontend will handle redirect)
      return res.status(200).json({ 
        message: "Email verification successful! You are now logged in.",
        verified: true
      });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      console.log('Get user - session:', req.session?.userId);
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Email not verified", 
          emailVerified: false,
          email: user.email
        });
      }
      
      // Remove sensitive data from response
      const { password, emailVerificationToken, passwordResetToken, ...userWithoutSensitiveData } = user;
      
      return res.status(200).json(userWithoutSensitiveData);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Request password reset endpoint
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, always return success even if user doesn't exist
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      
      // Save reset token to database
      await storage.createPasswordResetToken(user.id, resetToken, 1); // 1 hour expiry
      
      // Send password reset email  
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      console.log("Password reset - Base URL:", baseUrl);
      console.log("Password reset - Reset URL:", resetUrl);
      const emailSent = await sendPasswordResetEmail(user.email, resetToken, baseUrl);
      
      if (!emailSent) {
        console.error("Failed to send password reset email");
        return res.status(500).json({ message: "Failed to send password reset email" });
      }
      
      return res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Verify reset token
      const user = await storage.verifyPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update password and clear reset token
      await storage.updatePassword(user.id, hashedPassword);
      
      return res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });



  // Test email endpoint for debugging
  app.post("/api/auth/test-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log("Testing email to:", email);
      
      // Test email functionality by sending a verification email
      const testToken = randomBytes(16).toString('hex');
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      try {
        await sendVerificationEmail(email, testToken, baseUrl);
        return res.status(200).json({ 
          message: "Test email sent successfully",
          success: true 
        });
      } catch (error) {
        return res.status(500).json({ 
          message: "Failed to send test email",
          success: false 
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to send test email",
        success: false 
      });
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
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      
      try {
        await sendVerificationEmail(email, testToken, baseUrl);
        return res.status(200).json({ message: "Test email sent successfully" });
      } catch (error) {
        return res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      return res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Send verification email endpoint
  app.post("/api/auth/send-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }
      
      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      
      // Save verification token to database
      await storage.createVerificationToken(user.id, verificationToken, 24); // 24 hours expiry
      
      // Validate email before sending
      if (!user.email || !user.email.includes('@')) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Send verification email
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const emailSent = await sendVerificationEmail(user.email, verificationToken, baseUrl);
      
      if (!emailSent) {
        console.error("Failed to send verification email");
        return res.status(500).json({ message: "Failed to send verification email" });
      }
      
      return res.status(200).json({ 
        message: "Verification email sent successfully" 
      });
    } catch (error) {
      console.error("Send verification email error:", error);
      return res.status(500).json({ message: "Failed to send verification email" });
    }
  });
}

// Send welcome email function
async function sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
  const { sendEmail } = await import("./utils/postmark");
  
  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Welcome to Mind AI!</h1>
      <p>Hi ${firstName || 'there'},</p>
      <p>Your email has been verified successfully! You can now access all features of your Mind AI platform.</p>
      <p>Get started by creating your first AI agent and setting up your call center automation.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        Welcome to Mind AI - Your AI-powered call center solution
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Mind AI!',
    htmlBody
  });
}