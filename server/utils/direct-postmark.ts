/**
 * Direct Postmark API implementation for reliable email delivery
 */

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const POSTMARK_TOKEN = "e1d083a2-62f2-484a-9fea-12ee9e37c763";

interface DirectEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  response?: any;
}

async function sendDirectPostmarkEmail(
  to: string,
  subject: string,
  htmlBody: string,
  from: string = "contact@callsinmotion.com"
): Promise<DirectEmailResult> {
  try {
    const emailData = {
      "From": from,
      "To": to,
      "Subject": subject,
      "HtmlBody": htmlBody,
      "MessageStream": "outbound"
    };

    console.log("🚀 DIRECT POSTMARK REQUEST:", {
      url: POSTMARK_API_URL,
      to,
      subject,
      timestamp: new Date().toISOString()
    });

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(POSTMARK_API_URL, {
      method: 'POST',
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_TOKEN
      },
      body: JSON.stringify(emailData)
    });

    const responseData = await response.json();
    
    console.log("🚀 DIRECT POSTMARK RESPONSE:", {
      status: response.status,
      success: response.ok,
      messageId: responseData.MessageID,
      error: responseData.Message || responseData.ErrorCode,
      fullResponse: JSON.stringify(responseData, null, 2),
      timestamp: new Date().toISOString()
    });

    return {
      success: response.ok,
      messageId: responseData.MessageID,
      error: response.ok ? undefined : responseData.Message || 'Unknown error',
      response: responseData
    };
  } catch (error) {
    console.error("🚀 DIRECT POSTMARK ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function sendDirectVerificationEmail(
  email: string,
  verificationToken: string,
  baseUrl: string
): Promise<DirectEmailResult> {
  const verificationLink = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
  
  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Verify Your Email</h1>
      <p>Thanks for signing up with Mind AI! Please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationLink}</p>
      
      <p>This verification link will expire in 24 hours.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        This email was sent by Mind AI. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  return await sendDirectPostmarkEmail(email, "Verify your Mind AI account", htmlBody);
}

export async function sendDirectPasswordResetEmail(
  email: string,
  resetToken: string,
  baseUrl: string
): Promise<DirectEmailResult> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Password Reset</h1>
      <p>You have requested to reset your password for your Mind AI account.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetLink}</p>
      
      <p>This password reset link will expire in 1 hour.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        This email was sent by Mind AI. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  return await sendDirectPostmarkEmail(email, "Reset your Mind AI password", htmlBody);
}

export async function sendDirectWelcomeEmail(
  email: string,
  firstName?: string
): Promise<DirectEmailResult> {
  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Welcome to Mind AI!</h1>
      <p>Hello${firstName ? ` ${firstName}` : ''},</p>
      <p>Welcome to Mind AI, your AI-powered call center management platform!</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">Get Started</h2>
        <ul style="color: #666;">
          <li>Set up your first AI agent</li>
          <li>Configure your phone numbers</li>
          <li>Start managing your call center with AI</li>
        </ul>
      </div>
      
      <p>If you have any questions, our support team is here to help.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        This email was sent by Mind AI.
      </p>
    </div>
  `;

  return await sendDirectPostmarkEmail(email, "Welcome to Mind AI!", htmlBody);
}