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
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [_, setLocation] = useLocation();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const { toast } = useToast();
  
  const loginSubmit = useMutation({
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
  });


  
  const form = useForm<LoginUser>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginUser) {
    loginSubmit.mutate(data, {
      onSuccess: (response: any) => {
        console.log("🎯 Login form success callback triggered:", response);
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        // Small delay to ensure state updates are processed
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      },
      onError: (error: any) => {
        console.log("❌ Login form error callback:", error);
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
            description: error.message || "Invalid credentials",
            variant: "destructive",
          });
        }
      }
    });
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
          disabled={loginSubmit.isPending}
        >
          {loginSubmit.isPending ? (
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


      </form>
    </Form>
  );
}