import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearAllUsers() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to clear all user data...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Clear all tables in reverse dependency order (only if they exist)
    const clearTable = async (tableName) => {
      try {
        console.log(`Clearing ${tableName}...`);
        await client.query(`DELETE FROM ${tableName}`);
      } catch (error) {
        if (error.code === '42P01') {
          console.log(`Table ${tableName} does not exist, skipping...`);
        } else {
          throw error;
        }
      }
    };
    
    await clearTable('webhook_logs');
    await clearTable('campaigns');
    await clearTable('contacts');
    await clearTable('contact_groups');
    await clearTable('calls');
    await clearTable('phone_numbers');
    await clearTable('agents');
    await clearTable('actions');
    await clearTable('twilio_accounts');
    await clearTable('sessions');
    
    console.log('Clearing users...');
    await client.query('DELETE FROM users');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Successfully cleared all user data from the database');
    
    // Get counts to verify
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const sessionCount = await client.query('SELECT COUNT(*) FROM sessions');
    const agentCount = await client.query('SELECT COUNT(*) FROM agents');
    
    console.log(`\nDatabase status:`);
    console.log(`- Users: ${userCount.rows[0].count}`);
    console.log(`- Sessions: ${sessionCount.rows[0].count}`);
    console.log(`- Agents: ${agentCount.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllUsers().catch(console.error);