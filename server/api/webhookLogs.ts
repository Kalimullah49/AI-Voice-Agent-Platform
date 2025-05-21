import { Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { sql } from 'drizzle-orm';

/**
 * Create webhook logs table if it doesn't exist
 */
export async function createWebhookLogsTable() {
  try {
    // Check if the webhook logs table exists
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'webhook_logs'
    `);
    
    if (tables.rows.length === 0) {
      // Table doesn't exist, create it
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id SERIAL PRIMARY KEY,
          type VARCHAR(100),
          payload JSONB,
          processed BOOLEAN DEFAULT FALSE,
          error TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created webhook_logs table');
      return true;
    } else {
      console.log('webhook_logs table already exists');
      return false;
    }
  } catch (error) {
    console.error('Error creating webhook_logs table:', error);
    return false;
  }
}

/**
 * Get webhook logs API endpoint
 */
export async function getWebhookLogs(req: Request, res: Response) {
  try {
    // First make sure the table exists
    await createWebhookLogsTable();
    
    // Get limit from query params with a default of 20
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Get webhook logs
    const logs = await storage.getWebhookLogs(limit);
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting webhook logs:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error getting webhook logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}