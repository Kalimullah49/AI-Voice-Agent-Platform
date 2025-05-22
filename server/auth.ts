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
import { sendVerificationEmail, sendWelcomeEmail, isPostmarkConfigured } from "./utils/email";

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
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
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
      
      // Generate a verification token (24 chars random string)
      const verificationToken = randomBytes(24).toString('hex');
      
      // Create user with a UUID as ID
      const userId = uuidv4();
      const user = await storage.createUser({
        id: userId,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "user",
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      
      // Try to send verification email
      const isEmailConfigured = isPostmarkConfigured();
      if (isEmailConfigured) {
        try {
          // Get the base URL from the request
          const protocol = req.protocol;
          const host = req.get('host') || '';
          const baseUrl = `${protocol}://${host}`;
          
          await sendVerificationEmail(
            user.email,
            verificationToken,
            `${baseUrl}/auth/verify?token=${verificationToken}`
          );
          
          // Remove password from response
          const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
          
          // Return user with a message about verification
          return res.status(201).json({
            ...userWithoutSensitiveData,
            message: "Registration successful. Please check your email to verify your account."
          });
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
          
          // Registration is still successful, but email failed
          const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
          
          return res.status(201).json({
            ...userWithoutSensitiveData,
            message: "Registration successful, but we couldn't send a verification email. Please contact support."
          });
        }
      } else {
        // Postmark not configured - auto-verify the user for development
        if (process.env.NODE_ENV !== 'production') {
          await db.update(users)
            .set({ emailVerified: true })
            .where(eq(users.id, userId));
            
          console.log('Email verification bypassed in development mode');
        }
        
        // Remove password from response
        const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
        
        // Return user
        return res.status(201).json({
          ...userWithoutSensitiveData,
          message: "Registration successful. Verification email service not configured."
        });
      }
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
      
      // Check if email is verified (always check regardless of environment)
      if (user.emailVerified === false) {
        // Generate a new verification token
        const verificationToken = randomBytes(24).toString('hex');
        
        // Update user with new verification token
        await storage.createVerificationToken(user.id, verificationToken, 24);
        
        // Try to send verification email again if Postmark is configured
        if (isPostmarkConfigured()) {
          try {
            // Get the base URL from the request
            const protocol = req.protocol;
            const host = req.get('host') || '';
            const baseUrl = `${protocol}://${host}`;
            
            await sendVerificationEmail(
              user.email,
              verificationToken,
              `${baseUrl}/auth/verify?token=${verificationToken}`
            );
          } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
          }
        }
        
        return res.status(403).json({ 
          message: "Please verify your email before logging in. A new verification email has been sent.",
          verified: false
        });
      }
      
      // Set user in session
      req.session.userId = String(user.id);
      
      // Remove sensitive data from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
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
      if (isPostmarkConfigured()) {
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
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Remove sensitive data from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
      return res.status(200).json(userWithoutSensitiveData);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}