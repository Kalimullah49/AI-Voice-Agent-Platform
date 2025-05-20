import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if twilio_accounts table exists
      const tableCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'twilio_accounts'
        );
      `);
      
      if (!tableCheckResult.rows[0].exists) {
        console.log('Creating twilio_accounts table...');
        
        // Create twilio_accounts table
        await client.query(`
          CREATE TABLE IF NOT EXISTS twilio_accounts (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR REFERENCES users(id) NOT NULL,
            account_name TEXT NOT NULL,
            account_sid TEXT NOT NULL,
            auth_token TEXT NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
      } else {
        console.log('twilio_accounts table already exists.');
      }

      // Check if phone_numbers table exists
      const phoneNumbersCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'phone_numbers'
        );
      `);
      
      if (!phoneNumbersCheckResult.rows[0].exists) {
        console.log('Creating phone_numbers table...');
        
        // Create phone_numbers table
        await client.query(`
          CREATE TABLE IF NOT EXISTS phone_numbers (
            id SERIAL PRIMARY KEY,
            number TEXT NOT NULL UNIQUE,
            agent_id INTEGER REFERENCES agents(id),
            active BOOLEAN DEFAULT TRUE,
            user_id VARCHAR REFERENCES users(id),
            twilio_sid TEXT,
            friendly_name TEXT,
            twilio_account_id INTEGER
          );
        `);
      } else {
        // Check if twilio_account_id column exists
        const columnCheckResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'phone_numbers' AND column_name = 'twilio_account_id'
          );
        `);
        
        if (!columnCheckResult.rows[0].exists) {
          console.log('Adding twilio_account_id column to phone_numbers table...');
          
          await client.query(`
            ALTER TABLE phone_numbers 
            ADD COLUMN twilio_account_id INTEGER;
          `);
        } else {
          console.log('twilio_account_id column already exists in phone_numbers table.');
        }
      }

      await client.query('COMMIT');
      console.log('Tables setup complete!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error setting up tables:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

setupTables();