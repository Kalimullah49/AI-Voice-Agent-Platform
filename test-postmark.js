// Test Postmark configuration and email delivery
import postmark from 'postmark';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.POSTMARK_SERVER_TOKEN) {
  console.error('❌ POSTMARK_SERVER_TOKEN not found in environment');
  process.exit(1);
}

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

async function testPostmarkConfig() {
  console.log('🔍 Testing Postmark configuration...');
  
  try {
    // Test 1: Get account info
    console.log('\n1. Testing server configuration...');
    const serverInfo = await client.getServer();
    console.log('✅ Server info retrieved:', {
      id: serverInfo.ID,
      name: serverInfo.Name,
      color: serverInfo.Color,
      inboundAddress: serverInfo.InboundAddress
    });
    
    // Test 2: Check recent bounces for debugging
    console.log('\n2. Checking recent bounces...');
    const bounces = await client.getBounces({ count: 50 });
    console.log('Total bounces found:', bounces.TotalCount);
    
    // Check specifically for fiverworker1357@gmail.com
    const targetBounce = bounces.Bounces.find(b => b.Email === 'fiverworker1357@gmail.com');
    if (targetBounce) {
      console.log('🔍 Found bounce for fiverworker1357@gmail.com:', {
        email: targetBounce.Email,
        type: targetBounce.Type,
        description: targetBounce.Description,
        bouncedAt: targetBounce.BouncedAt,
        inactive: targetBounce.Inactive
      });
    } else {
      console.log('✅ No bounce found for fiverworker1357@gmail.com');
    }
    
    // Show recent bounces
    console.log('Recent bounces:', bounces.Bounces.slice(0, 5).map(b => ({
      email: b.Email,
      type: b.Type,
      description: b.Description,
      bouncedAt: b.BouncedAt
    })));
    
    // Test 3: Test email to fiverworker1357@gmail.com specifically
    console.log('\n3. Testing email delivery to fiverworker1357@gmail.com...');
    const fiverTestEmail = {
      From: 'contact@callsinmotion.com',
      To: 'fiverworker1357@gmail.com',
      Subject: 'Mind AI Email Verification Test',
      HtmlBody: '<h1>Test Email</h1><p>This is a test to verify email delivery to your address.</p>',
      MessageStream: 'outbound'
    };
    
    try {
      const fiverResponse = await client.sendEmail(fiverTestEmail);
      console.log('✅ Email sent successfully to fiverworker1357@gmail.com:', {
        messageId: fiverResponse.MessageID,
        to: fiverResponse.To,
        submittedAt: fiverResponse.SubmittedAt
      });
    } catch (error) {
      console.error('❌ Failed to send email to fiverworker1357@gmail.com:', {
        message: error.message,
        code: error.code,
        postmarkApiErrorCode: error.postmarkApiErrorCode,
        httpStatusCode: error.httpStatusCode
      });
    }

    // Test 4: Test email to a known good address
    console.log('\n4. Testing email delivery to control address...');
    const testEmail = {
      From: 'contact@callsinmotion.com',
      To: 'hammadraza12304+test@gmail.com',
      Subject: 'Postmark Configuration Test',
      HtmlBody: '<h1>Test Email</h1><p>This is a test to verify Postmark configuration.</p>',
      MessageStream: 'outbound'
    };
    
    const response = await client.sendEmail(testEmail);
    console.log('✅ Test email sent successfully:', {
      messageId: response.MessageID,
      to: response.To,
      submittedAt: response.SubmittedAt
    });
    
  } catch (error) {
    console.error('❌ Postmark test failed:', {
      message: error.message,
      code: error.code,
      postmarkApiErrorCode: error.postmarkApiErrorCode,
      httpStatusCode: error.httpStatusCode
    });
  }
}

testPostmarkConfig();