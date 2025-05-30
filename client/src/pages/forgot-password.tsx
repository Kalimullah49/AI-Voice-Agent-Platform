import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setSent(true);
      toast({
        title: "Success",
        description: "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      // If email sending fails, try the development endpoint
      try {
        const response = await apiRequest("POST", "/api/auth/manual-reset-token", { email });
        const data = await response.json();
        setResetUrl(data.resetUrl);
        setSent(true);
        toast({
          title: "Development Mode",
          description: "Email sending failed, but a reset link has been generated for testing.",
        });
      } catch (devError) {
        toast({
          title: "Error",
          description: "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{resetUrl ? "Reset Password" : "Check Your Email"}</CardTitle>
            <CardDescription>
              {resetUrl 
                ? "Use the link below to reset your password:"
                : "We've sent a password reset link to your email address. Please check your inbox and follow the instructions."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resetUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-2">Development Reset Link:</p>
                  <Button asChild className="w-full" size="sm">
                    <Link href={resetUrl.replace(window.location.origin, "")}>
                      Reset Your Password
                    </Link>
                  </Button>
                </div>
              )}
              <Button asChild className="w-full" variant={resetUrl ? "outline" : "default"}>
                <Link href="/auth">Back to Login</Link>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setResetUrl("");
                }}
              >
                Didn't receive an email? Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center">
              <Link href="/auth" className="text-sm text-blue-600 hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}