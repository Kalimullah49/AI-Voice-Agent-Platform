import { db } from './db';
import { sql } from 'drizzle-orm';

async function addEmailVerificationFields() {
  try {
    console.log('Adding email verification fields to users table...');
    
    // Add emailVerified column (boolean)
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    `);
    console.log('Added email_verified column');
    
    // Add emailVerificationToken column (varchar)
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
    `);
    console.log('Added email_verification_token column');
    
    // Add emailVerificationTokenExpiry column (timestamp)
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMP;
    `);
    console.log('Added email_verification_token_expiry column');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
addEmailVerificationFields();