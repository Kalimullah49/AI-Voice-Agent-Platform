import { ReactNode } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';
import EmailVerification from '@/pages/email-verification';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, refetchUser } = useAuth();
  
  console.log("🛡️ ProtectedRoute check:", {
    user: user ? { id: user.id, email: user.email, emailVerified: user.emailVerified } : null,
    isLoading,
    willRedirect: !user && !isLoading
  });
  
  if (isLoading) {
    console.log("🛡️ ProtectedRoute: Showing loading spinner");
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    console.log("🛡️ ProtectedRoute: No user found, redirecting to /auth");
    return <Redirect to="/auth" />;
  }

  // Check if user exists but email is not verified
  if (user && user.emailVerified === false) {
    return (
      <EmailVerification 
        email={user.email} 
        onVerificationComplete={refetchUser}
      />
    );
  }
  
  return <>{children}</>;
}