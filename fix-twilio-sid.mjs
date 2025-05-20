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
        
        // Check if twilio_sid column exists
        const twilioSidColumnResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'phone_numbers' AND column_name = 'twilio_sid'
          );
        `);
        
        if (!twilioSidColumnResult.rows[0].exists) {
          console.log('Adding twilio_sid column to phone_numbers table...');
          
          await client.query(`
            ALTER TABLE phone_numbers 
            ADD COLUMN twilio_sid TEXT;
          `);
        } else {
          console.log('twilio_sid column already exists in phone_numbers table.');
        }
        
        // Check if friendly_name column exists
        const friendlyNameColumnResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'phone_numbers' AND column_name = 'friendly_name'
          );
        `);
        
        if (!friendlyNameColumnResult.rows[0].exists) {
          console.log('Adding friendly_name column to phone_numbers table...');
          
          await client.query(`
            ALTER TABLE phone_numbers 
            ADD COLUMN friendly_name TEXT;
          `);
        } else {
          console.log('friendly_name column already exists in phone_numbers table.');
        }
      } else {
        console.log('The phone_numbers table does not exist. Cannot add columns.');
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