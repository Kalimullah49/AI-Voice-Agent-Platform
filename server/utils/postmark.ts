import * as postmark from 'postmark';

if (!process.env.POSTMARK_SERVER_TOKEN) {
  throw new Error("POSTMARK_SERVER_TOKEN environment variable must be set");
}

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await client.sendEmail({
      From: params.from || 'toby@ashgrove.ai',
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.htmlBody,
      TextBody: params.textBody || params.htmlBody.replace(/<[^>]*>/g, ''),
      MessageStream: 'outbound'
    });
    return true;
  } catch (error) {
    console.error('Postmark email error:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string, baseUrl: string): Promise<boolean> {
  const verificationUrl = `${baseUrl}/verify?token=${token}`;
  
  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Verify Your Email</h1>
      <p>Thanks for signing up with Mind AI! Please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
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
  `;

  return await sendEmail({
    to: email,
    subject: 'Verify your Mind AI account',
    htmlBody
  });
}

export async function sendPasswordResetEmail(email: string, token: string, baseUrl: string): Promise<boolean> {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
      <p>You requested a password reset for your Mind AI account. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
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
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset your Mind AI password',
    htmlBody
  });
}