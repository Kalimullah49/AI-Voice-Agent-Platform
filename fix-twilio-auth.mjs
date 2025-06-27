import { db } from './server/db.ts';
import { twilioAccounts } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function updateTwilioAuth() {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  
  console.log('🔧 Updating Twilio credentials...');
  console.log('Account SID:', accountSid);
  console.log('Auth Token length:', authToken?.length);
  
  try {
    const result = await db
      .update(twilioAccounts)
      .set({ 
        authToken: authToken,
        accountSid: accountSid,
        updatedAt: new Date()
      })
      .where(eq(twilioAccounts.userId, '23902112-147d-44b3-9982-ca7dc052477c'))
      .returning();
      
    console.log('✅ Updated Twilio account:', result);
    
    // Verify the update
    const updatedAccount = await db
      .select()
      .from(twilioAccounts)
      .where(eq(twilioAccounts.userId, '23902112-147d-44b3-9982-ca7dc052477c'));
      
    console.log('🔍 Verification - Updated account:', {
      id: updatedAccount[0]?.id,
      accountSid: updatedAccount[0]?.accountSid,
      authTokenLength: updatedAccount[0]?.authToken?.length,
      isDefault: updatedAccount[0]?.isDefault
    });
    
  } catch (error) {
    console.error('❌ Error updating Twilio credentials:', error);
  }
  
  process.exit(0);
}

updateTwilioAuth();