import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./database-storage";
import { loginUserSchema, registerUserSchema } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

// Password hashing functions
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Session interface
declare module "express-session" {
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
  // Configure session with better settings for development
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to false for development
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax'
      },
    })
  );

  // Registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user - auto-verified
      const userId = uuidv4();
      const user = await storage.createUser({
        id: userId,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "user",
        emailVerified: true, // Auto-verify all users
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null
      });

      // Automatically log the user in after registration
      req.session.userId = userId;
      console.log('Registration successful, user logged in:', userId);
      
      // Remove password from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
      return res.status(201).json({
        ...userWithoutSensitiveData,
        message: "Registration successful! You are now logged in."
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);
      
      // Get user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check password
      const passwordMatch = await comparePasswords(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set user in session
      req.session.userId = String(user.id);
      console.log('Session set for user:', req.session.userId);
      
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
      return res.status(500).json({ message: "Login failed" });
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
      return res.status(200).json({ message: "Logged out successfully" });
    });
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
      
      // Remove sensitive data from response
      const { password, emailVerificationToken, ...userWithoutSensitiveData } = user;
      
      return res.status(200).json(userWithoutSensitiveData);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}