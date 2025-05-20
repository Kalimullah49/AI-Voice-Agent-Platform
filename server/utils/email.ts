import * as postmark from 'postmark';
import crypto from 'crypto';

// Constants
const FROM_EMAIL = 'no-reply@aimai.com';
const APP_NAME = 'AimAI';
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://aimai.com' 
  : process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000';

// Initialize Postmark client
const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN || '');

/**
 * Generate a verification token
 * @returns The verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a password reset token
 * @returns The password reset token
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send a verification email
 * @param email The recipient's email
 * @param token The verification token
 * @returns Success status
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  try {
    const verificationLink = `${BASE_URL}/verify-email?token=${token}`;
    
    const response = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: `Verify your email for ${APP_NAME}`,
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ${APP_NAME}!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <a href="${verificationLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Verify Email
          </a>
          <p>If you didn't create an account with us, you can ignore this email.</p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${verificationLink}</p>
          <p>Thank you,<br>The ${APP_NAME} Team</p>
        </div>
      `,
      TextBody: `
        Welcome to ${APP_NAME}!
        
        Thank you for registering. Please verify your email address by clicking the link below:
        
        ${verificationLink}
        
        If you didn't create an account with us, you can ignore this email.
        
        Thank you,
        The ${APP_NAME} Team
      `
    });
    
    return response.ErrorCode === 0;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send a password reset email
 * @param email The recipient's email
 * @param token The password reset token
 * @returns Success status
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  try {
    const resetLink = `${BASE_URL}/reset-password?token=${token}`;
    
    const response = await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: `Reset your ${APP_NAME} password`,
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Reset Password
          </a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetLink}</p>
          <p>This link will expire in 1 hour.</p>
          <p>Thank you,<br>The ${APP_NAME} Team</p>
        </div>
      `,
      TextBody: `
        Reset Your Password
        
        We received a request to reset your password. If you didn't make this request, you can ignore this email.
        
        To reset your password, click the link below:
        
        ${resetLink}
        
        This link will expire in 1 hour.
        
        Thank you,
        The ${APP_NAME} Team
      `
    });
    
    return response.ErrorCode === 0;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}