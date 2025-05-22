import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, LoginUser, RegisterUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterUser>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Suppress 401 errors since we use them for auth checking
    queryFn: async ({ queryKey }) => {
      try {
        const response = await fetch(queryKey[0] as string);
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        return await response.json();
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    },
  });

  const loginMutation = useMutation<User, Error, LoginUser>({
    mutationFn: async (credentials: LoginUser) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const error = await res.json();
        // Special handling for email verification required error
        if (res.status === 403 && error.message && error.message.includes("verify")) {
          throw new Error(error.message);
        }
        throw new Error(error.message || "Failed to log in");
      }
      
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Logged in successfully",
        description: "Welcome back!",
      });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      // Check if error is related to email verification
      if (error.message && error.message.includes("verify")) {
        toast({
          title: "Email verification required",
          description: error.message,
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

  const registerMutation = useMutation<User, Error, RegisterUser>({
    mutationFn: async (credentials: RegisterUser) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to register");
      }
      
      return await res.json();
    },
    onSuccess: (response: any) => {
      // Check if the response indicates email verification is required
      if (response.emailVerified === false || (response.message && response.message.includes("verification"))) {
        toast({
          title: "Account created successfully",
          description: "Please check your email for a verification link.",
        });
        // Don't set user data until verified
      } else {
        // User is already verified, set data
        queryClient.setQueryData(["/api/auth/user"], response);
        toast({
          title: "Account created successfully",
          description: "Welcome to AimAI!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error("Failed to log out");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out successfully",
      });
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}