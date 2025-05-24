import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

export default function UserMenu() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full" disabled><User className="h-5 w-5" /></Button>;
  }

  if (!user) {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => window.location.href = "/api/login"}
        className="flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        <span>Log in</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={user.profileImageUrl || undefined} 
              alt={user.firstName || "User"} 
            />
            <AvatarFallback>
              {user.firstName?.[0] || user.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-0.5 leading-none">
            <p className="font-medium text-sm">
              {user.firstName || user.email || "User"}
            </p>
            {user.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include"
              });
              window.location.href = "/auth";
            } catch (error) {
              console.error("Logout error:", error);
              window.location.href = "/auth";
            }
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}