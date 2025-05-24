/**
 * Email Service using Postmark
 */
import * as postmark from 'postmark';

// Get Postmark API token from environment variables
const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;

// Create a Postmark client if token exists
const client = POSTMARK_SERVER_TOKEN 
  ? new postmark.ServerClient(POSTMARK_SERVER_TOKEN)
  : null;

// Email template IDs - these would be set up in your Postmark account
// You can replace these with your actual template IDs or use dynamic templates
const TEMPLATES = {
  VERIFICATION: 'email-verification',
  WELCOME: 'welcome-user',
  PASSWORD_RESET: 'password-reset'
};

// Default sender email - using your verified sender address
const DEFAULT_FROM = 'toby@ashgrove.ai';

/**
 * Verify Postmark connection is properly set up
 */
export function isPostmarkConfigured(): boolean {
  return !!client;
}

/**
 * Send an email verification message
 */
export async function sendVerificationEmail(to: string, token: string, verifyUrl: string) {
  if (!client) {
    throw new Error('Postmark is not configured. Please check your environment variables.');
  }

  try {
    // Get the base URL from the environment or use a default
    const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    
    // Construct the full verification URL
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    // First try to send with template if it exists
    try {
      const response = await client.sendEmailWithTemplate({
        From: DEFAULT_FROM,
        To: to,
        TemplateAlias: TEMPLATES.VERIFICATION,
        TemplateModel: {
          name: to.split('@')[0], // Use part before @ as the name if real name not available
          action_url: verificationUrl,
          verification_code: token.substring(0, 6), // First 6 chars as a readable code option
          support_email: DEFAULT_FROM
        }
      });
      return response;
    } catch (templateError) {
      console.log("Template error, falling back to direct email:", templateError);
      
      // Fallback to direct email sending if template fails
      const response = await client.sendEmail({
        From: DEFAULT_FROM,
        To: to,
        Subject: 'Verify Your Email - Mind AI',
        HtmlBody: `
          <h1>Verify Your Email</h1>
          <p>Thank you for registering with Mind AI. Please verify your email by clicking the link below:</p>
          <p><a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
          <p>Or enter this code: <strong>${token.substring(0, 6)}</strong></p>
          <p>This link will expire in 24 hours.</p>
        `,
        TextBody: `
          Verify Your Email - Mind AI
          
          Thank you for registering with Mind AI. Please verify your email by visiting this link:
          ${verificationUrl}
          
          Or enter this code: ${token.substring(0, 6)}
          
          This link will expire in 24 hours.
        `,
        MessageStream: 'outbound'
      });
      return response;
    }
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

/**
 * Send a welcome email after verification
 */
export async function sendWelcomeEmail(to: string, firstName?: string) {
  if (!client) {
    throw new Error('Postmark is not configured. Please check your environment variables.');
  }

  try {
    const name = firstName || to.split('@')[0];
    
    const response = await client.sendEmailWithTemplate({
      From: DEFAULT_FROM,
      To: to,
      TemplateAlias: TEMPLATES.WELCOME,
      TemplateModel: {
        name: name,
        login_url: process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/auth`,
        support_email: DEFAULT_FROM
      }
    });

    return response;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
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