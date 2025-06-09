import * as postmark from 'postmark';

if (!process.env.POSTMARK_SERVER_TOKEN) {
  throw new Error("POSTMARK_SERVER_TOKEN environment variable must be set");
}

// Configure Postmark client with timeout
const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN, {
  timeout: 30000, // 30 second timeout
});

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
}

export async function sendEmailWithPostmarkRetry(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string; attempts: number; postmarkResponse?: any; detailedError?: any }> {
  const maxRetries = 5;
  const baseDelayMs = 1000; // 1 second
  let attempts = 0;
  let lastError: any = null;
  
  const emailPayload = {
    From: params.from || 'contact@callsinmotion.com',
    To: params.to,
    Subject: params.subject,
    HtmlBody: params.htmlBody,
    TextBody: params.textBody || params.htmlBody.replace(/<[^>]*>/g, ''),
    MessageStream: 'outbound'
  };
  
  console.log(`Sending email to ${params.to} using Postmark API with ${maxRetries} retry attempts`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${params.to}`);
      
      const response = await client.sendEmail(emailPayload);
      
      console.log(`Email sent successfully on attempt ${attempt}. Postmark response:`, {
        MessageID: response.MessageID,
        To: response.To,
        SubmittedAt: response.SubmittedAt,
        ErrorCode: response.ErrorCode,
        Message: response.Message
      });
      
      return {
        success: true,
        messageId: response.MessageID,
        attempts,
        postmarkResponse: {
          MessageID: response.MessageID,
          To: response.To,
          SubmittedAt: response.SubmittedAt,
          ErrorCode: response.ErrorCode,
          Message: response.Message
        }
      };
      
    } catch (error: any) {
      lastError = error;
      
      console.error(`Attempt ${attempt}/${maxRetries} failed for ${params.to}:`, {
        message: error.message,
        code: error.code,
        errorCode: error.errorCode,
        httpStatusCode: error.httpStatusCode,
        postmarkApiErrorCode: error.postmarkApiErrorCode
      });
      
      // Check if this is a retryable error
      const isRetryable = isRetryableError(error);
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`Non-retryable error or max retries reached for ${params.to}`);
        break;
      }
      
      // Exponential backoff with jitter
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Retrying in ${Math.round(delayMs)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // All attempts failed
  let errorMessage = lastError?.message || 'Unknown error';
  if (lastError?.postmarkApiErrorCode) {
    switch (lastError.postmarkApiErrorCode) {
      case 300:
        errorMessage = 'Invalid email address';
        break;
      case 406:
        errorMessage = 'Inactive recipient - email address bounced previously';
        break;
      case 422:
        errorMessage = 'Invalid JSON or missing required fields';
        break;
      case 429:
        errorMessage = 'Rate limit exceeded';
        break;
      case 500:
        errorMessage = 'Postmark server error';
        break;
      case 503:
        errorMessage = 'Service temporarily unavailable';
        break;
      default:
        errorMessage = `Postmark API error ${lastError.postmarkApiErrorCode}: ${lastError.message}`;
    }
  }
  
  // Enhanced error logging with comprehensive details
  const detailedErrorLog = {
    timestamp: new Date().toISOString(),
    emailAddress: params.to,
    totalAttempts: attempts,
    finalErrorMessage: errorMessage,
    originalError: lastError?.message,
    postmarkDetails: {
      apiErrorCode: lastError?.postmarkApiErrorCode,
      httpStatusCode: lastError?.httpStatusCode,
      errorCode: lastError?.errorCode,
      code: lastError?.code
    },
    networkDetails: {
      timeout: lastError?.code === 'ETIMEDOUT',
      connectionReset: lastError?.code === 'ECONNRESET',
      notFound: lastError?.code === 'ENOTFOUND'
    },
    emailPayload: {
      from: params.from || 'contact@callsinmotion.com',
      subject: params.subject,
      messageStream: 'outbound'
    }
  };
  
  console.error(`📧 EMAIL DELIVERY FAILURE - ${params.to}:`);
  console.error(`Attempts: ${attempts}/${5}`);
  console.error(`Final Error: ${errorMessage}`);
  console.error(`Postmark Error Code: ${lastError?.postmarkApiErrorCode || 'None'}`);
  console.error(`HTTP Status: ${lastError?.httpStatusCode || 'None'}`);
  console.error(`Network Error: ${lastError?.code || 'None'}`);
  console.error("📋 DETAILED EMAIL FAILURE LOG:", JSON.stringify(detailedErrorLog, null, 2));
  
  return {
    success: false,
    error: errorMessage,
    attempts,
    detailedError: detailedErrorLog,
    postmarkResponse: {
      errorCode: lastError?.postmarkApiErrorCode,
      httpStatusCode: lastError?.httpStatusCode,
      message: lastError?.message,
      networkError: lastError?.code,
      fullError: lastError
    }
  };
}

function isRetryableError(error: any): boolean {
  // Permanent failures that should not be retried
  const nonRetryableCodes = [300, 406, 422]; // Invalid email, bounced, malformed request
  
  if (error.postmarkApiErrorCode && nonRetryableCodes.includes(error.postmarkApiErrorCode)) {
    return false;
  }
  
  // Network/temporary errors that should be retried
  const retryableCodes = [429, 500, 503]; // Rate limit, server error, service unavailable
  if (error.postmarkApiErrorCode && retryableCodes.includes(error.postmarkApiErrorCode)) {
    return true;
  }
  
  // Network timeouts and connection errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  
  // HTTP 5xx errors are generally retryable
  if (error.httpStatusCode >= 500) {
    return true;
  }
  
  // Default to non-retryable for unknown errors
  return false;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const result = await sendEmailWithPostmarkRetry(params);
  return result.success;
}

export async function sendVerificationEmailWithLogging(email: string, token: string, baseUrl: string, userId?: string): Promise<{ success: boolean; messageId?: string; error?: string; attempts: number; detailedError?: any; postmarkResponse?: any }> {
  console.log('sendVerificationEmailWithLogging called with:', { email, token: token.substring(0, 10) + '...', baseUrl, userId });
  
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
  console.log('Generated verification URL:', verificationUrl);
  
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

  const result = await sendEmailWithPostmarkRetry({
    to: email,
    subject: 'Verify your Mind AI account',
    htmlBody
  });

  // Log the email attempt
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'verification',
    attempts: result.attempts,
    success: result.success,
    messageId: result.messageId,
    error: result.error,
    email: email
  };

  console.log('Email delivery log:', logEntry);
  
  return result;
}

export async function sendVerificationEmail(email: string, token: string, baseUrl: string): Promise<boolean> {
  const result = await sendVerificationEmailWithLogging(email, token, baseUrl);
  return result.success;
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