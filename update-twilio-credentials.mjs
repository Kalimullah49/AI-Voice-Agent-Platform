import { db } from './server/db.ts';
import { twilioAccounts } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function updateTwilioCredentials() {
  const newAccountSid = 'AC521beb2502864bd198c5281de65b454e';
  const newAuthToken = '03060fc8d6393a25b3fa6421e14f3557';
  
  console.log('🔧 Updating Twilio credentials in database...');
  console.log('New Account SID:', newAccountSid);
  console.log('New Auth Token length:', newAuthToken.length);
  
  try {
    const result = await db
      .update(twilioAccounts)
      .set({ 
        accountSid: newAccountSid,
        authToken: newAuthToken,
        accountName: 'Updated Twilio Account',
        updatedAt: new Date()
      })
      .where(eq(twilioAccounts.userId, '23902112-147d-44b3-9982-ca7dc052477c'))
      .returning();
      
    console.log('✅ Updated Twilio account:', result[0]);
    
    // Test the new credentials
    console.log('\n🧪 Testing new credentials...');
    const { default: twilio } = await import('twilio');
    const client = twilio(newAccountSid, newAuthToken);
    
    try {
      const account = await client.api.accounts(newAccountSid).fetch();
      console.log('✅ Authentication successful!');
      console.log('Account status:', account.status);
      console.log('Account type:', account.type);
      
      // Test available phone numbers
      console.log('\n📞 Testing available phone numbers...');
      const numbers = await client.availablePhoneNumbers('US').local.list({ limit: 3 });
      console.log(`✅ Found ${numbers.length} available numbers:`);
      numbers.forEach((num, index) => {
        console.log(`${index + 1}. ${num.phoneNumber} (${num.locality}, ${num.region})`);
      });
      
    } catch (error) {
      console.error('❌ Authentication test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error updating credentials:', error);
  }
  
  process.exit(0);
}

updateTwilioCredentials();