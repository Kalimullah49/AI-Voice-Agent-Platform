import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [_, setLocation] = useLocation();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
          setStatus("error");
          setMessage("Invalid verification link - no token provided.");
          return;
        }

        // Call the verification API
        const response = await fetch(`/api/auth/verify?token=${token}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            setLocation("/");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Email verification failed.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
        console.error("Verification error:", error);
      }
    };

    verifyEmail();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4">
              {status === "loading" && (
                <div className="bg-blue-100">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              )}
              {status === "error" && (
                <div className="bg-red-100">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {status === "loading" && "Verifying Email..."}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "success" && (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    Your email has been successfully verified! You will be redirected to your dashboard in a few seconds.
                  </p>
                </div>
                <Button onClick={() => setLocation("/")} className="w-full">
                  Go to Dashboard Now
                </Button>
              </div>
            )}
            
            {status === "error" && (
              <div className="text-center space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    The verification link may be invalid or expired. Please try requesting a new verification email.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button onClick={() => setLocation("/auth")} className="w-full">
                    Back to Login
                  </Button>
                  <Button onClick={() => setLocation("/auth")} variant="outline" className="w-full">
                    Request New Verification Email
                  </Button>
                </div>
              </div>
            )}
            
            {status === "loading" && (
              <div className="text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Please wait while we verify your email address...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}