import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";

export default function VerifyPage() {
  const [, setLocation] = useLocation();
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [, params] = useRoute("/auth/verify");
  const { toast } = useToast();
  const { user } = useAuth();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token from the URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
          setIsSuccess(false);
          setMessage("No verification token provided.");
          setIsLoading(false);
          return;
        }

        // Call the verification endpoint
        const response = await fetch(`/api/auth/verify?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setIsSuccess(true);
          setMessage(data.message || "Email verified successfully!");
          
          // Show toast notification
          toast({
            title: "Email verified!",
            description: "Your email has been verified successfully.",
            variant: "default",
          });
          
          // Redirect to dashboard after a delay
          setTimeout(() => {
            setLocation("/dashboard");
          }, 3000);
        } else {
          setIsSuccess(false);
          setMessage(data.message || "Failed to verify your email. Please try again.");
          
          toast({
            title: "Verification failed",
            description: data.message || "Failed to verify your email. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Verification error:", error);
        setIsSuccess(false);
        setMessage("An error occurred during email verification. Please try again.");
        
        toast({
          title: "Verification error",
          description: "An error occurred during email verification. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [setLocation, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Email Verification</h1>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <LoaderCircle className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          ) : isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-xl font-medium">{message}</p>
              <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
              <p className="text-xl font-medium">Verification Failed</p>
              <p className="text-muted-foreground">{message}</p>
              <div className="pt-4">
                <Button asChild variant="default">
                  <Link href="/auth">
                    Return to Login
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}