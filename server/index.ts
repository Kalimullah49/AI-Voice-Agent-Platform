import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

const app = express();

// Log server token for debugging - PRODUCTION CHECK
console.log(`🚨🚨🚨 PRODUCTION STARTUP TOKEN CHECK 🚨🚨🚨`);
console.log(`🚨 POSTMARK_SERVER_TOKEN: ${process.env.POSTMARK_SERVER_TOKEN?.substring(0, 8)}...`);
console.log(`🚨 TOKEN LENGTH: ${process.env.POSTMARK_SERVER_TOKEN?.length || 0}`);
console.log(`🚨 TOKEN FIRST 12: ${process.env.POSTMARK_SERVER_TOKEN?.substring(0, 12)}...`);
console.log(`🚨 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🚨 DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
console.log(`🚨 REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS || 'not set'}`);
console.log(`🚨 STARTUP TIME: ${new Date().toISOString()}`);
console.log(`🚨🚨🚨 END PRODUCTION STARTUP CHECK 🚨🚨🚨`);

// Configure CORS to allow cookies from frontend
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup custom authentication
  setupAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
