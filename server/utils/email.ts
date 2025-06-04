/**
 * Clean Email Service using Postmark - No verification codes
 */
import * as postmark from 'postmark';

// Get Postmark API token from environment variables
const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;

// Create a Postmark client if token exists
const client = POSTMARK_SERVER_TOKEN 
  ? new postmark.ServerClient(POSTMARK_SERVER_TOKEN)
  : null;

// Default sender email - using your verified sender address
const DEFAULT_FROM = 'contact@callsinmotion.com';

/**
 * Verify Postmark connection is properly set up
 */
export function isPostmarkConfigured(): boolean {
  return !!client;
}

/**
 * Send an email verification message - NO CODES
 */
export async function sendVerificationEmail(to: string, token: string, verifyUrl: string) {
  if (!client) {
    throw new Error('Postmark is not configured. Please check your environment variables.');
  }

  // Validate email address
  if (!to || typeof to !== 'string' || !to.includes('@') || to.trim().length === 0) {
    throw new Error(`Invalid email address: ${to}`);
  }

  const cleanEmail = to.trim();
  console.log(`Sending verification email to: ${cleanEmail}`);

  try {
    // Get the base URL from the environment or use a default
    const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    
    // Construct the full verification URL
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    // Send direct email without template or codes
    const response = await client.sendEmail({
      From: DEFAULT_FROM,
      To: cleanEmail,
      Subject: 'Verify Your Email - Mind AI',
      HtmlBody: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333; text-align: center;">Verify Your Email</h1>
          <p>Thank you for registering with Mind AI. Please verify your email by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            This email was sent by Mind AI. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
      TextBody: `
        Verify Your Email - Mind AI
        
        Thank you for registering with Mind AI. Please verify your email by visiting this link:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, you can safely ignore this email.
      `,
      MessageStream: 'outbound'
    });
    return response;
  } catch (error: any) {
    console.error('Failed to send verification email:', error);
    
    // Handle specific Postmark errors
    if (error.code === 406 || error.message?.includes('InactiveRecipientsError')) {
      throw new Error(`Email address ${cleanEmail} is inactive in Postmark. Please contact support or try a different email address.`);
    }
    
    if (error.code === 422) {
      throw new Error(`Invalid email format or blocked recipient: ${cleanEmail}`);
    }
    
    throw error;
  }
}

/**
 * Send a password reset email - NO CODES
 */
export async function sendPasswordResetEmail(to: string, token: string, resetUrl: string) {
  if (!client) {
    throw new Error('Postmark is not configured. Please check your environment variables.');
  }

  // Validate email address
  if (!to || typeof to !== 'string' || !to.includes('@') || to.trim().length === 0) {
    throw new Error(`Invalid email address: ${to}`);
  }

  const cleanEmail = to.trim();
  console.log(`Sending password reset email to: ${cleanEmail}`);

  try {
    // Send direct email without template or codes
    const response = await client.sendEmail({
      From: DEFAULT_FROM,
      To: cleanEmail,
      Subject: 'Reset Your Password - Mind AI',
      HtmlBody: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
          <p>You requested a password reset for your Mind AI account. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p>This reset link will expire in 1 hour for security.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            This email was sent by Mind AI. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
      TextBody: `
        Reset Your Password - Mind AI
        
        You requested a password reset for your Mind AI account. Please visit this link to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour for security.
        
        If you didn't request a password reset, you can safely ignore this email.
      `,
      MessageStream: 'outbound'
    });
    return response;
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    
    // Handle specific Postmark errors
    if (error.code === 406 || error.message?.includes('InactiveRecipientsError')) {
      throw new Error(`Email address ${cleanEmail} is inactive in Postmark. Please contact support or try a different email address.`);
    }
    
    if (error.code === 422) {
      throw new Error(`Invalid email format or blocked recipient: ${cleanEmail}`);
    }
    
    throw error;
  }
}

/**
 * Send a test email to verify Postmark configuration
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  if (!client) {
    console.error('Postmark is not configured. Please check your environment variables.');
    return false;
  }

  try {
    console.log(`Testing email to: ${to}`);
    await client.sendEmail({
      From: DEFAULT_FROM,
      To: to,
      Subject: 'Postmark Test',
      HtmlBody: '<strong>Hello</strong> from Postmark!',
      TextBody: 'Hello from Postmark!',
      MessageStream: 'outbound'
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send test email:', error);
    return false;
  }
}