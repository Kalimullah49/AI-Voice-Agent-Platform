import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginUserSchema, LoginUser } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { Eye, EyeOff, Loader2, Mail, TestTube } from "lucide-react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [_, setLocation] = useLocation();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [showTestSection, setShowTestSection] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const { toast } = useToast();
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to log in");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      if (error.message.includes("verify your email")) {
        const email = form.getValues("email");
        setUnverifiedEmail(email);
        toast({
          title: "Email verification required",
          description: "Please verify your email address before logging in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/auth/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send test email");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test email sent successfully",
        description: `Environment: ${data.environment} | Message ID: ${data.messageId?.substring(0, 8)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test email failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<LoginUser>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginUser) {
    loginMutation.mutate(data);
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    try {
      await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: unverifiedEmail })
      });
      toast({
        title: "Email Sent",
        description: "Verification email has been resent. Please check your inbox.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"} 
                    {...field} 
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button 
          type="submit" 
          className="w-full" 
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
        
        {unverifiedEmail && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 mb-2">
              Email verification required for: <strong>{unverifiedEmail}</strong>
            </p>
            <Button 
              onClick={handleResendVerification}
              variant="outline" 
              size="sm"
              className="w-full"
            >
              Resend Verification Email
            </Button>
          </div>
        )}

        {/* Test Email Section */}
        <div className="mt-6 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTestSection(!showTestSection)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <TestTube className="mr-1 h-3 w-3" />
            {showTestSection ? "Hide" : "Show"} Email Test
          </Button>
          
          {showTestSection && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Mail className="mr-2 h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Test Email Delivery</span>
              </div>
              <p className="text-xs text-blue-600 mb-3">
                Send a test verification email to any address to verify Postmark configuration in both development and production environments.
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter test email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={() => testEmail && testEmailMutation.mutate(testEmail)}
                  disabled={!testEmail || testEmailMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {testEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Sending Test Email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-3 w-3" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}