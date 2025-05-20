import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixPhoneNumbersTable() {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if phone_numbers table exists
      const phoneNumbersCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'phone_numbers'
        );
      `);
      
      if (phoneNumbersCheckResult.rows[0].exists) {
        console.log('Checking phone_numbers table columns...');
        
        // Check if user_id column exists
        const userIdColumnResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'phone_numbers' AND column_name = 'user_id'
          );
        `);
        
        if (!userIdColumnResult.rows[0].exists) {
          console.log('Adding user_id column to phone_numbers table...');
          
          await client.query(`
            ALTER TABLE phone_numbers 
            ADD COLUMN user_id VARCHAR REFERENCES users(id);
          `);
        } else {
          console.log('user_id column already exists in phone_numbers table.');
        }
      } else {
        console.log('The phone_numbers table does not exist. Creating it...');
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS phone_numbers (
            id SERIAL PRIMARY KEY,
            number TEXT NOT NULL UNIQUE,
            agent_id INTEGER REFERENCES agents(id),
            active BOOLEAN DEFAULT TRUE,
            user_id VARCHAR REFERENCES users(id),
            twilio_account_id INTEGER REFERENCES twilio_accounts(id),
            twilio_sid TEXT,
            friendly_name TEXT
          );
        `);
      }

      await client.query('COMMIT');
      console.log('Phone numbers table fixes complete!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error fixing phone_numbers table:', err);
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

fixPhoneNumbersTable();