import React, { useEffect } from 'react';

interface WebCallScriptProps {
  assistantId: string;
}

export const WebCallScript: React.FC<WebCallScriptProps> = ({ assistantId }) => {
  useEffect(() => {
    // Add the script when component mounts
    const addScript = () => {
      // Clean up any existing script with the same ID
      const existingScript = document.getElementById('vapi-web-call-script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      
      // Create script element
      const script = document.createElement('script');
      script.id = 'vapi-web-call-script';
      script.type = 'text/javascript';
      
      // Set script content - this will initialize Vapi with the provided assistant ID
      script.innerHTML = `
        var vapiInstance = null;
        const assistant = "${assistantId}";
        const apiKey = "${process.env.VAPI_AI_TOKEN || ''}";
        const buttonConfig = {
          position: 'right',
          size: 'large',
          customText: 'Test Call'
        };

        (function (d, t) {
          var g = document.createElement(t),
            s = d.getElementsByTagName(t)[0];
          g.src =
            "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
          g.defer = true;
          g.async = true;
          s.parentNode.insertBefore(g, s);

          g.onload = function () {
            vapiInstance = window.vapiSDK.run({
              apiKey: apiKey,
              assistant: assistant,
              config: buttonConfig,
            });
          };
        })(document, "script");
      `;
      
      // Append the script to the body
      document.body.appendChild(script);
    };
    
    if (assistantId) {
      addScript();
    }
    
    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById('vapi-web-call-script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      
      // Clean up global variables
      if (window.vapiSDK) {
        try {
          window.vapiSDK.destroy();
        } catch (e) {
          console.error("Error cleaning up Vapi SDK:", e);
        }
      }
    };
  }, [assistantId]);
  
  // This component doesn't render anything visible
  return null;
};

// Add type declaration for the Vapi SDK
declare global {
  interface Window {
    vapiSDK: {
      run: (config: any) => any;
      destroy: () => void;
    };
  }
}