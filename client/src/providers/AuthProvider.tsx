import { ReactNode } from "react";
import { useToast } from "../hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { 
  AuthContext, 
  setupAuthQueryClient, 
  User, 
  LoginData, 
  RegisterData 
} from "../lib/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const auth = setupAuthQueryClient(queryClient);
  
  const {
    data: user,
    error,
    isLoading,
  } = auth.getUserQuery();

  const loginMutation = auth.loginMutation({
    onSuccess: (user: User) => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = auth.registerMutation({
    onSuccess: (user: User) => {
      toast({
        title: "Registration successful",
        description: "Welcome to AimAI!",
      });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = auth.logoutMutation({
    onSuccess: () => {
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

export { useAuth } from "../lib/auth";