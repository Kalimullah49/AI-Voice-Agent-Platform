// Simple re-export wrapper for backward compatibility
export { 
  sendEmailWithComprehensiveLogging as sendEmailWithPostmarkRetry,
  sendVerificationEmailWithComprehensiveLogging as sendVerificationEmailWithLogging,
  sendVerificationEmailWithComprehensiveLogging as sendVerificationEmail,
  sendPasswordResetEmailWithComprehensiveLogging as sendPasswordResetEmail
} from './postmark-comprehensive';