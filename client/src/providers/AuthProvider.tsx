import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types for our auth functions
type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string | null;
  lastName?: string | null;
};

// Define the Authentication Context Type
type AuthContextType = {
  user: User | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (credentials: LoginCredentials, options?: any) => void;
  register: (data: RegisterData, options?: any) => void;
  logout: (options?: any) => void;
  isLoginPending: boolean;
  isRegisterPending: boolean;
  isLogoutPending: boolean;
  refetchUser: () => void;
};

// Create Authentication Context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Get the current authenticated user
  const { 
    data: user, 
    isLoading, 
    refetch,
    error: queryError
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (Unauthorized) - this means user is not logged in
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 1; // Reduce retry attempts
    },
    gcTime: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes - longer cache time
    refetchInterval: 1000 * 60 * 10, // Refresh session every 10 minutes if user is active
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
      console.log("🎯 Login mutation success, setting user data:", data);
      queryClient.setQueryData(["/api/auth/user"], data);
      // Force a refetch to ensure the query cache is updated
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
          description: "Welcome to Mind AI!",
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

  // Function to handle login with callbacks
  const login = (
    credentials: LoginCredentials,
    options?: {
      onSuccess?: (response: any) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    loginMutation.mutate(credentials, {
      onSuccess: (response) => {
        options?.onSuccess?.(response);
      },
      onError: (error: Error) => {
        options?.onError?.(error);
      }
    });
  };

  // Function to handle logout with callbacks
  const logout = (
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        options?.onSuccess?.();
      },
      onError: (error: Error) => {
        options?.onError?.(error);
      }
    });
  };

  // Debug authentication state
  useEffect(() => {
    console.log("🔍 AuthProvider state update:", {
      user: user ? { id: user.id, email: user.email, emailVerified: user.emailVerified } : null,
      isLoading,
      isAuthenticated: !!user,
      queryError: queryError?.message
    });
  }, [user, isLoading, queryError]);

  // Provide auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        isLoginPending: loginMutation.isPending,
        isRegisterPending: registerMutation.isPending,
        isLogoutPending: logoutMutation.isPending,
        refetchUser: refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Auth hook for components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.error("useAuth called outside of AuthProvider context");
    // Return a safe default instead of throwing to prevent crashes during hot reload
    return {
      user: undefined,
      isLoading: true,
      isAuthenticated: false,
      error: "AuthProvider not found",
      login: () => {},
      register: () => {},
      logout: () => {},
      isLoginPending: false,
      isRegisterPending: false,
      isLogoutPending: false,
      refetchUser: () => {},
    };
  }
  return context;
}