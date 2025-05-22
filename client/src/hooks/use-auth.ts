import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define the type for login credentials
type LoginCredentials = {
  email: string;
  password: string;
};

// Define the type for registration data
type RegisterData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string | null;
  lastName?: string | null;
};

export function useAuth() {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Get the current authenticated user
  const { 
    data: user, 
    isLoading, 
    refetch 
  } = useQuery<User | undefined>({
    queryKey: ["/api/auth/user"],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retryDelay: 500,
    gcTime: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (Unauthorized)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // If verification is required, don't auto-login
      if (data.emailVerified === false) {
        toast({
          title: "Registration successful",
          description: "Please check your email to verify your account.",
        });
      } else {
        // Otherwise, set the user data directly
        queryClient.setQueryData(["/api/auth/user"], data);
        toast({
          title: "Registration successful",
          description: "Welcome to AimAI!",
        });
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  // Function to handle register with callbacks
  const register = (
    data: RegisterData, 
    options?: { 
      onSuccess?: (response: any) => void;
      onError?: (error: Error) => void; 
    }
  ) => {
    registerMutation.mutate(data, {
      onSuccess: (response) => {
        options?.onSuccess?.(response);
      },
      onError: (error: Error) => {
        options?.onError?.(error);
      }
    });
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login: loginMutation.mutate,
    register,
    logout: logoutMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    refetchUser: refetch,
  };
}