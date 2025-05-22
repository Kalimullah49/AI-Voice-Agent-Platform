import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmailVerificationPage() {
  const [, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get token from URL query parameters
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (!token) {
          setVerificationStatus('error');
          setMessage("No verification token provided. Please check your email link.");
          return;
        }
        
        // Call the API to verify the token
        const response = await fetch(`/api/auth/verify?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setVerificationStatus('success');
          setMessage(data.message || "Your email has been verified successfully!");
          
          toast({
            title: "Email Verified",
            description: "You can now log in to your account.",
          });
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            setLocation("/auth");
          }, 3000);
        } else {
          setVerificationStatus('error');
          setMessage(data.message || "Failed to verify your email. The link may have expired or is invalid.");
          
          toast({
            title: "Verification Failed",
            description: data.message || "The verification link may have expired or is invalid.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationStatus('error');
        setMessage("An error occurred during verification. Please try again or contact support.");
        
        toast({
          title: "Verification Error",
          description: "An unexpected error occurred during verification.",
          variant: "destructive",
        });
      }
    };
    
    verifyToken();
  }, [setLocation, toast]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[420px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            Verifying your email address
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
          {verificationStatus === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-muted-foreground text-center">
                Verifying your email address...
              </p>
            </>
          )}
          
          {verificationStatus === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-xl font-medium">Verification Successful!</p>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
              </div>
            </>
          )}
          
          {verificationStatus === 'error' && (
            <>
              <AlertCircle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-xl font-medium">Verification Failed</p>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          {verificationStatus === 'error' && (
            <Button asChild>
              <Link href="/auth">Return to Login</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}