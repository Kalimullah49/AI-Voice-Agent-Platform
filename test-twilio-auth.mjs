import twilio from 'twilio';

async function testTwilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('Testing Twilio authentication...');
  console.log('Account SID:', accountSid);
  console.log('Auth Token length:', authToken?.length);
  
  try {
    const client = twilio(accountSid, authToken);
    
    // Test with a simple account fetch
    const account = await client.api.accounts(accountSid).fetch();
    console.log('✅ Authentication successful!');
    console.log('Account status:', account.status);
    console.log('Account type:', account.type);
    
    // Test available phone numbers
    console.log('\nTesting available phone numbers...');
    const numbers = await client.availablePhoneNumbers('US').local.list({ limit: 3 });
    console.log(`✅ Found ${numbers.length} available numbers`);
    
  } catch (error) {
    console.error('❌ Twilio authentication failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Status:', error.status);
  }
  
  process.exit(0);
}

testTwilioAuth();