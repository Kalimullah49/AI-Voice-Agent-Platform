import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, CheckCircle, Clock } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  onVerificationComplete?: () => void;
}

export default function EmailVerification({ email, onVerificationComplete }: EmailVerificationProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    try {
      setIsSending(true);
      const response = await apiRequest("POST", "/api/auth/send-verification", { email });
      
      if (response.ok) {
        toast({
          title: "Verification email sent",
          description: "Please check your inbox for the verification link.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to send verification email");
      }
    } catch (error) {
      toast({
        title: "Failed to send verification email",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-4">
                <Clock className="w-4 h-4" />
                <span>Check your email and click the verification link</span>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Next steps:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Check your email inbox</li>
                      <li>Click the verification link</li>
                      <li>Return here to access your dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleResendVerification}
                disabled={isSending}
                variant="outline"
                className="w-full"
              >
                {isSending ? "Sending..." : "Resend Verification Email"}
              </Button>
              
              <div className="text-center">
                <Button
                  onClick={onVerificationComplete}
                  variant="ghost"
                  className="text-sm"
                >
                  I've verified my email
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              <p>Didn't receive the email? Check your spam folder or try resending.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}