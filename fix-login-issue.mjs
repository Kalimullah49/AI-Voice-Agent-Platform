import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixLoginIssue() {
  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Check if the users table exists and has the correct structure
    const userTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!userTableCheck.rows[0].exists) {
      console.log('Users table does not exist');
      return;
    }

    // Check if users have passwords
    const passwordCheck = await client.query(`
      SELECT COUNT(*) FROM users WHERE password IS NULL OR password = '';
    `);

    console.log(`Found ${passwordCheck.rows[0].count} users with missing passwords`);

    if (parseInt(passwordCheck.rows[0].count) > 0) {
      // Set a default password for users that don't have one
      // This is a temporary fix - users should reset their passwords
      const defaultPassword = '$2a$10$lKKn8jTpmlvzqmj8r3b6O.IChFHdS5dYKBFjdxwLKoQaNVk3jxwPa'; // hashed version of "ChangeMe123!"
      await client.query(`
        UPDATE users 
        SET password = $1
        WHERE password IS NULL OR password = '';
      `, [defaultPassword]);
      console.log('Updated users with default password');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Login issues fixed successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error fixing login issues:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the function
fixLoginIssue().catch(console.error);