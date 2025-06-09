// Simple re-export wrapper for backward compatibility
export { 
  sendEmailWithComprehensiveLogging as sendEmailWithPostmarkRetry,
  sendVerificationEmailWithComprehensiveLogging as sendVerificationEmailWithLogging,
  sendVerificationEmailWithComprehensiveLogging as sendVerificationEmail,
  sendEmailWithComprehensiveLogging as sendPasswordResetEmail
} from './postmark-comprehensive';