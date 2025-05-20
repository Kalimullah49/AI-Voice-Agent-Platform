import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixUsersTable() {
  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Check if the columns exist before trying to drop them
    const checkColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN (
          'is_email_verified', 
          'verification_token', 
          'verification_token_expiry', 
          'password_reset_token', 
          'password_reset_token_expiry'
        );
    `);

    if (checkColumnsResult.rows.length > 0) {
      console.log(`Found ${checkColumnsResult.rows.length} columns to drop.`);
      
      // Drop each column that exists
      for (const row of checkColumnsResult.rows) {
        const columnName = row.column_name;
        console.log(`Dropping column: ${columnName}`);
        await client.query(`ALTER TABLE users DROP COLUMN ${columnName};`);
      }
      
      console.log('Successfully dropped email verification columns from users table');
    } else {
      console.log('No columns to drop - table is already updated');
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('Database schema updated successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error updating database schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the function
fixUsersTable().catch(console.error);