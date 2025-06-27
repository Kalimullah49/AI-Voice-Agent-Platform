import { db } from './server/db.ts';
import { twilioAccounts } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function debugTwilioCredentials() {
  console.log('🔍 Debugging Twilio credentials...');
  
  try {
    const accounts = await db
      .select()
      .from(twilioAccounts)
      .where(eq(twilioAccounts.userId, '23902112-147d-44b3-9982-ca7dc052477c'));
    
    console.log('Found accounts:', accounts.length);
    
    for (const account of accounts) {
      console.log('Account:', {
        id: account.id,
        accountName: account.accountName,
        accountSid: account.accountSid,
        authTokenLength: account.authToken?.length,
        authTokenStart: account.authToken?.substring(0, 8) + '...',
        isDefault: account.isDefault
      });
    }
    
    // Test environment variables
    console.log('\n🔍 Environment variables:');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN length:', process.env.TWILIO_AUTH_TOKEN?.length);
    console.log('TWILIO_AUTH_TOKEN start:', process.env.TWILIO_AUTH_TOKEN?.substring(0, 8) + '...');
    
  } catch (error) {
    console.error('❌ Error debugging credentials:', error);
  }
  
  process.exit(0);
}

debugTwilioCredentials();