// Test script to verify Postmark email functionality
import postmark from 'postmark';

if (!process.env.POSTMARK_SERVER_TOKEN) {
  console.error("POSTMARK_SERVER_TOKEN not found in environment variables");
  process.exit(1);
}

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

async function testEmail() {
  try {
    console.log("Testing Postmark email service...");
    
    const result = await client.sendEmail({
      From: 'media@synergyhealthbh.com',
      To: 'test@example.com', // Replace with a real email for actual testing
      Subject: 'Mind AI - Email Service Test',
      HtmlBody: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333; text-align: center;">Mind AI Email Test</h1>
          <p>This is a test email to verify that the Postmark integration is working correctly.</p>
          <p>Email service is operational and ready for:</p>
          <ul>
            <li>Email verification</li>
            <li>Password reset requests</li>
            <li>Welcome messages</li>
          </ul>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Sent from Mind AI Platform
          </p>
        </div>
      `,
      TextBody: 'Mind AI Email Test - This is a test email to verify that the Postmark integration is working correctly.',
      MessageStream: 'outbound'
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", result.MessageID);
    console.log("Status:", result.ErrorCode === 0 ? "Delivered" : "Error");
    
  } catch (error) {
    console.error("❌ Email test failed:");
    console.error("Error:", error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
  }
}

testEmail();