import { ReactNode } from "react";
import { AuthProvider } from "@/providers/AuthProvider";

interface AuthWrapperProps {
  children: ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  return <AuthProvider>{children}</AuthProvider>;
}