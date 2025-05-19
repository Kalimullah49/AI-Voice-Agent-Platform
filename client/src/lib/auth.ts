import { createContext, useContext } from "react";
import { 
  useQuery, 
  useMutation,
  UseMutationResult,
  QueryClient
} from "@tanstack/react-query";

// Define the User type for our authentication context
export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date | null;
}

// Define the types for login and registration data
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string | null;
  lastName?: string | null;
}

// Create our authentication context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
}

// Create the authentication context
export const AuthContext = createContext<AuthContextType | null>(null);

// Create a hook for using the authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Function to fetch the current user
export async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/user");
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
}

// Function to log in a user
export async function loginUser(credentials: LoginData): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to log in");
  }
  
  return await response.json();
}

// Function to register a new user
export async function registerUser(data: RegisterData): Promise<User> {
  // Remove confirmPassword before sending to API
  const { confirmPassword, ...userData } = data;
  
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to register");
  }
  
  return await response.json();
}

// Function to log out the current user
export async function logoutUser(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });
  
  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}

// Set up query client for auth state
export function setupAuthQueryClient(queryClient: QueryClient) {
  return {
    getUserQuery: () => {
      return useQuery({
        queryKey: ["/api/auth/user"],
        queryFn: fetchUser,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
      });
    },
    
    loginMutation: (options?: any) => {
      return useMutation({
        mutationFn: loginUser,
        onSuccess: (user) => {
          queryClient.setQueryData(["/api/auth/user"], user);
          if (options?.onSuccess) options.onSuccess(user);
        },
        ...options,
      });
    },
    
    registerMutation: (options?: any) => {
      return useMutation({
        mutationFn: registerUser,
        onSuccess: (user) => {
          queryClient.setQueryData(["/api/auth/user"], user);
          if (options?.onSuccess) options.onSuccess(user);
        },
        ...options,
      });
    },
    
    logoutMutation: (options?: any) => {
      return useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
          queryClient.setQueryData(["/api/auth/user"], null);
          if (options?.onSuccess) options.onSuccess();
        },
        ...options,
      });
    },
  };
}