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
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
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