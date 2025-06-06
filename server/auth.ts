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
import { sendVerificationEmail, sendPasswordResetEmail } from "./utils/postmark";

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
    try {
      // Make sure confirmPassword is in the request body
      if (!req.body.confirmPassword) {
        return res.status(400).json({ 
          message: "Confirm password is required" 
        });
      }
      
      // Validate request body
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Simple registration without verification
      
      // Create user with a UUID as ID - auto-verified
      const userId = uuidv4();
      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      
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
      
      // Send verification email with retry mechanism
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      console.log("Attempting to send verification email to:", user.email);
      console.log("Base URL:", baseUrl);
      console.log("Verification token:", verificationToken);
      
      // Import the enhanced email function
      const { sendVerificationEmailWithLogging } = await import('./utils/postmark');
      
      const emailResult = await sendVerificationEmailWithLogging(user.email, verificationToken, baseUrl, user.id);
      
      // Log the email delivery attempt to database
      await storage.logEmailDelivery(user.id, {
        timestamp: new Date().toISOString(),
        type: 'verification',
        attempts: emailResult.attempts,
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error,
        email: user.email
      });
      
      if (!emailResult.success) {
        console.error(`Failed to send verification email to ${user.email} after ${emailResult.attempts} attempts:`, emailResult.error);
      } else {
        console.log(`Verification email sent successfully to ${user.email} on attempt ${emailResult.attempts}. MessageID: ${emailResult.messageId}`);
      }
      
      // Don't auto-login - user must verify email first
      // Remove password from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
      return res.status(201).json({
        ...userWithoutSensitiveData,
        message: "Registration successful! Please check your email to verify your account before logging in."
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors
        });
      }
      return res.status(400).json({ 
        message: error instanceof Error ? error.message : "Registration failed" 
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