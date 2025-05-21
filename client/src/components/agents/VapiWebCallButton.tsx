import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VapiWebCallButtonProps {
  assistantId: string;
}

export function VapiWebCallButton({ assistantId }: VapiWebCallButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const startWebCall = async () => {
    if (!assistantId) {
      toast({
        title: "Missing Assistant ID",
        description: "This agent doesn't have a Vapi assistant ID yet.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Fetch the token from our backend
      const tokenResponse = await fetch('/api/vapi/token');
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.message || "Failed to get Vapi token");
      }
      
      // Remove any existing Vapi scripts
      const existingScripts = document.querySelectorAll('script[src*="vapi"]');
      existingScripts.forEach(script => script.remove());
      
      // Create and inject the Vapi web call script
      const script = document.createElement('script');
      script.textContent = `
        var vapiInstance = null;
        const assistant = "${assistantId}";
        const apiKey = "${tokenData.token}";
        
        (function (d, t) {
          var g = document.createElement(t),
            s = d.getElementsByTagName(t)[0];
          g.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
          g.defer = true;
          g.async = true;
          s.parentNode.insertBefore(g, s);
          
          g.onload = function () {
            vapiInstance = window.vapiSDK.run({
              apiKey: apiKey,
              assistant: assistant,
              config: {
                position: 'right',
                size: 'large',
                customText: 'Test Call'
              }
            });
          };
        })(document, "script");
      `;
      
      document.body.appendChild(script);
      
      toast({
        title: "Web Call Button Added",
        description: "Look for the call button at the bottom right of the screen."
      });
    } catch (error) {
      console.error("Error setting up web call:", error);
      toast({
        title: "Web Call Error",
        description: error instanceof Error ? error.message : "Failed to initialize web call button",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="default" 
      onClick={startWebCall}
      disabled={isLoading || !assistantId}
    >
      <PhoneCall className="h-4 w-4 mr-2" />
      {isLoading ? "Loading..." : "Start Web Call"}
    </Button>
  );
}