import { Button } from "@/components/ui/button";
import { SiReplit } from "react-icons/si";

export default function ReplitLoginButton() {
  const handleReplitLogin = () => {
    // Navigate directly to the Replit auth endpoint
    window.location.href = "/api/login";
  };

  return (
    <Button 
      variant="outline" 
      className="w-full flex items-center justify-center gap-2 text-black hover:text-black hover:bg-gray-100 border border-gray-300" 
      onClick={handleReplitLogin}
    >
      <SiReplit className="h-4 w-4" />
      <span>Continue with Replit</span>
    </Button>
  );
}