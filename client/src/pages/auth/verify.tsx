import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { verifyCodeSchema } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type VerifyFormData = {
  code: string;
};

export default function VerifyPage() {
  const [_, navigate] = useLocation();
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const verifyMutation = useMutation({
    mutationFn: async (data: VerifyFormData) => {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email verified successfully",
        description: "Redirecting to dashboard...",
      });
      
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resend code");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent",
        description: "Please check your email for the new code",
      });
      
      setCountdown(60);
      setCanResend(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: VerifyFormData) {
    verifyMutation.mutate(data);
  }

  function handleResendCode() {
    if (canResend) {
      resendCodeMutation.mutate();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              Enter the 6-digit code sent to your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456" 
                          {...field} 
                          className="text-center text-lg tracking-widest"
                          maxLength={6}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm w-full">
              Didn't receive a code?{" "}
              <button
                onClick={handleResendCode}
                disabled={!canResend || resendCodeMutation.isPending}
                className={`font-medium ${
                  canResend ? "text-primary hover:underline cursor-pointer" : "text-gray-400 cursor-not-allowed"
                }`}
              >
                {resendCodeMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </span>
                ) : canResend ? (
                  "Resend Code"
                ) : (
                  `Resend in ${countdown}s`
                )}
              </button>
            </div>
            <div className="text-center text-sm w-full">
              <button
                onClick={() => navigate("/auth/login")}
                className="font-medium text-gray-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}