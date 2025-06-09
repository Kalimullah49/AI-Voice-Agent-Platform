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

// Database logging function for Postmark attempts
async function logPostmarkAttemptToDatabase(logData: any): Promise<void> {
  try {
    const { storage } = await import('../storage');
    
    // Enhanced logging with all step details
    const enhancedLogData = {
      email: logData.email,
      userId: logData.userId || null,
      attemptNumber: logData.attemptNumber,
      success: logData.success,
      messageId: logData.messageId || null,
      postmarkResponse: logData.postmarkResponse,
      requestPayload: logData.requestPayload,
      errorCode: logData.errorCode || null,
      httpStatusCode: logData.httpStatusCode || null,
      errorMessage: logData.errorMessage || null,
      networkError: logData.networkError || null,
      postmarkSubmittedAt: logData.postmarkSubmittedAt || null,
      emailType: logData.emailType,
      environment: logData.environment,
      userAgent: logData.userAgent || null,
      ipAddress: logData.ipAddress || null,
      registrationAttemptId: logData.registrationAttemptId || null,
      finalAttempt: logData.finalAttempt,
      retryable: logData.retryable
    };
    
    await storage.createPostmarkLog(enhancedLogData);
    
    console.log(`🔥 DATABASE LOG: Saved Postmark attempt ${logData.attemptNumber} for ${logData.email}`);
    console.log(`🔥 DATABASE LOG DETAILS:`, JSON.stringify({
      email: logData.email,
      attempt: logData.attemptNumber,
      success: logData.success,
      messageId: logData.messageId,
      registrationId: logData.registrationAttemptId
    }, null, 2));
  } catch (error) {
    console.error('🔥 DATABASE LOG ERROR: Failed to save Postmark log to database:', error);
    console.error('🔥 DATABASE LOG ERROR DETAILS:', error);
  }
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

export async function sendEmailWithComprehensiveLogging(
  params: EmailParams, 
  options: {
    userId?: string;
    emailType?: 'verification' | 'password_reset' | 'welcome';
    registrationAttemptId?: string;
    userAgent?: string;
    ipAddress?: string;
  } = {}
): Promise<{ success: boolean; messageId?: string; error?: string; attempts: number; postmarkResponse?: any; detailedError?: any }> {
  const maxRetries = 8; // 8 retries as requested
  const baseDelayMs = 1000;
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
  
  const environment = process.env.NODE_ENV || 'production';
  
  console.log(`🔥 POSTMARK COMPREHENSIVE: Starting email to ${params.to} with ${maxRetries} retries`);
  console.log(`🔥 REGISTRATION ID: ${options.registrationAttemptId}`);
  console.log(`🔥 EMAIL PAYLOAD BEING SENT:`, JSON.stringify(emailPayload, null, 2));
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    const isFinalAttempt = attempt === maxRetries;
    
    try {
      console.log(`🔥 ATTEMPT ${attempt}/${maxRetries} for ${params.to}`);
      console.log(`🔥 POSTMARK REQUEST:`, JSON.stringify(emailPayload, null, 2));
      
      const startTime = Date.now();
      const response = await client.sendEmail(emailPayload);
      const responseTime = Date.now() - startTime;
      
      console.log(`🔥 SUCCESS attempt ${attempt}:`, {
        MessageID: response.MessageID,
        To: response.To,
        SubmittedAt: response.SubmittedAt,
        responseTime
      });
      
      // Log successful attempt to database
      await logPostmarkAttemptToDatabase({
        email: params.to,
        userId: options.userId,
        attemptNumber: attempt,
        success: true,
        messageId: response.MessageID,
        postmarkResponse: {
          MessageID: response.MessageID,
          To: response.To,
          SubmittedAt: response.SubmittedAt,
          ErrorCode: response.ErrorCode,
          Message: response.Message,
          responseTime
        },
        requestPayload: emailPayload,
        emailType: options.emailType || 'verification',
        environment,
        userAgent: options.userAgent,
        ipAddress: options.ipAddress,
        registrationAttemptId: options.registrationAttemptId,
        finalAttempt: isFinalAttempt,
        retryable: false,
        postmarkSubmittedAt: response.SubmittedAt ? new Date(response.SubmittedAt) : undefined
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
          Message: response.Message,
          responseTime
        }
      };
      
    } catch (error: any) {
      lastError = error;
      const isRetryable = isRetryableError(error);
      
      console.error(`🔥 FAILURE attempt ${attempt}/${maxRetries} for ${params.to}:`, {
        message: error.message,
        code: error.code,
        errorCode: error.errorCode,
        httpStatusCode: error.httpStatusCode,
        postmarkApiErrorCode: error.postmarkApiErrorCode,
        retryable: isRetryable,
        finalAttempt: isFinalAttempt
      });
      
      // Log failed attempt to database
      await logPostmarkAttemptToDatabase({
        email: params.to,
        userId: options.userId,
        attemptNumber: attempt,
        success: false,
        postmarkResponse: {
          error: error.message,
          code: error.code,
          errorCode: error.errorCode,
          httpStatusCode: error.httpStatusCode,
          postmarkApiErrorCode: error.postmarkApiErrorCode,
          fullError: error
        },
        requestPayload: emailPayload,
        errorCode: error.postmarkApiErrorCode?.toString(),
        httpStatusCode: error.httpStatusCode,
        errorMessage: error.message,
        networkError: error.code,
        emailType: options.emailType || 'verification',
        environment,
        userAgent: options.userAgent,
        ipAddress: options.ipAddress,
        registrationAttemptId: options.registrationAttemptId,
        finalAttempt: isFinalAttempt,
        retryable: isRetryable
      });
      
      if (!isRetryable || isFinalAttempt) {
        console.error(`🔥 STOPPING: Non-retryable error or max retries reached for ${params.to}`);
        break;
      }
      
      // Exponential backoff with jitter
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`🔥 RETRY: Waiting ${Math.round(delayMs)}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // All attempts failed - comprehensive error reporting
  let errorMessage = lastError?.message || 'Unknown error';
  if (lastError?.postmarkApiErrorCode) {
    switch (lastError.postmarkApiErrorCode) {
      case 300:
        errorMessage = 'Invalid email address format';
        break;
      case 406:
        errorMessage = 'Inactive recipient - email address bounced previously or blocked by Postmark';
        break;
      case 422:
        errorMessage = 'Invalid JSON payload or missing required fields';
        break;
      case 429:
        errorMessage = 'Rate limit exceeded - too many emails sent';
        break;
      case 500:
        errorMessage = 'Postmark server internal error';
        break;
      case 503:
        errorMessage = 'Postmark service temporarily unavailable';
        break;
      default:
        errorMessage = `Postmark API error ${lastError.postmarkApiErrorCode}: ${lastError.message}`;
    }
  }
  
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
      networkCode: lastError?.code
    },
    networkDetails: {
      timeout: lastError?.code === 'ETIMEDOUT',
      connectionReset: lastError?.code === 'ECONNRESET',
      dnsError: lastError?.code === 'ENOTFOUND'
    },
    emailPayload: {
      from: emailPayload.From,
      subject: emailPayload.Subject,
      messageStream: emailPayload.MessageStream
    },
    registrationContext: {
      userId: options.userId,
      registrationAttemptId: options.registrationAttemptId,
      emailType: options.emailType,
      environment
    }
  };
  
  console.error(`🔥 FINAL FAILURE - ${params.to}:`);
  console.error(`🔥 Total Attempts: ${attempts}/${maxRetries}`);
  console.error(`🔥 Final Error: ${errorMessage}`);
  console.error(`🔥 Postmark Error Code: ${lastError?.postmarkApiErrorCode || 'None'}`);
  console.error(`🔥 HTTP Status: ${lastError?.httpStatusCode || 'None'}`);
  console.error(`🔥 Network Error: ${lastError?.code || 'None'}`);
  console.error("🔥 COMPREHENSIVE FAILURE LOG:", JSON.stringify(detailedErrorLog, null, 2));
  
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

export async function sendVerificationEmailWithComprehensiveLogging(
  email: string, 
  token: string, 
  baseUrl: string, 
  userId?: string,
  options: {
    userAgent?: string;
    ipAddress?: string;
    registrationAttemptId?: string;
  } = {}
): Promise<{ success: boolean; messageId?: string; error?: string; attempts: number; detailedError?: any; postmarkResponse?: any }> {
  
  const registrationAttemptId = options.registrationAttemptId || `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🔥 VERIFICATION EMAIL: Starting for ${email} (Registration: ${registrationAttemptId})`);
  
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
  
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

  const result = await sendEmailWithComprehensiveLogging({
    to: email,
    subject: 'Verify your Mind AI account',
    htmlBody
  }, {
    userId,
    emailType: 'verification',
    registrationAttemptId,
    userAgent: options.userAgent,
    ipAddress: options.ipAddress
  });

  console.log(`🔥 VERIFICATION EMAIL RESULT: ${result.success ? 'SUCCESS' : 'FAILED'} for ${email} after ${result.attempts} attempts`);
  
  return result;
}

// Password reset email function for backward compatibility
export async function sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
  try {
    const result = await sendEmailWithComprehensiveLogging({
      to: email,
      subject: "Reset Your Mind AI Password",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You've requested to reset your password for your Mind AI account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/auth/reset-password?token=${resetToken}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${baseUrl}/auth/reset-password?token=${resetToken}</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this reset, you can safely ignore this email.</p>
        </div>
      `,
      textBody: `
        Reset Your Password
        
        You've requested to reset your password for your Mind AI account.
        
        Visit this link to reset your password: ${baseUrl}/auth/reset-password?token=${resetToken}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this reset, you can safely ignore this email.
      `
    });
    
    return result.success;
  } catch (error) {
    console.error('Password reset email error:', error);
    return false;
  }
}

// Generic sendEmail function for backward compatibility
export async function sendEmail(params: {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
}): Promise<boolean> {
  try {
    const emailParams: EmailParams = {
      to: params.to,
      subject: params.subject,
      htmlBody: params.htmlBody || '',
      textBody: params.textBody
    };
    const result = await sendEmailWithComprehensiveLogging(emailParams);
    return result.success;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}