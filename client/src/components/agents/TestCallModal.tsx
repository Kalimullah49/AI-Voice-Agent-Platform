import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Phone } from 'lucide-react';

interface TestCallModalProps {
  open: boolean;
  onClose: () => void;
  assistantId?: string;
}

export function TestCallModal({ open, onClose, assistantId }: TestCallModalProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [callActive, setCallActive] = useState(false);
  
  // Function to destroy the Vapi widget
  const destroyVapiWidget = () => {
    if (window.vapiSDK) {
      window.vapiSDK.destroy();
      setCallActive(false);
    }
  };
  
  useEffect(() => {
    if (!open || !assistantId) return;
    
    // Only load the script if we have an assistant ID and the modal is open
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';
    script.id = 'vapi-test-script';
    script.defer = true;
    
    script.onload = () => {
      setScriptLoaded(true);
      // Initialize Vapi once the script is loaded
      if (window.vapiSDK) {
        // First fetch the Vapi token from our backend
        fetch('/api/vapi/token')
          .then(response => response.json())
          .then(data => {
            if (data.token) {
              window.vapiSDK.run({
                apiKey: data.token,
                assistant: assistantId,
                config: {
                  position: 'center', // Show the call button in the center
                  size: 'large',    // Use a large button
                  chatWidget: true,  // Enable chat widget
                  customText: 'Test Vapi Call' // Custom button text
                },
              });
              setCallActive(true);
            } else {
              console.error('Failed to get Vapi token:', data.message || 'Unknown error');
            }
          })
          .catch(error => {
            console.error('Error fetching Vapi token:', error);
          });
      }
    };
    
    document.body.appendChild(script);
    
    return () => {
      // Clean up the script tag when the component unmounts
      const existingScript = document.getElementById('vapi-test-script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      
      // Clean up Vapi instance
      destroyVapiWidget();
      
      setScriptLoaded(false);
    };
  }, [open, assistantId]);
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Test Vapi Call</DialogTitle>
          <DialogDescription>
            Test your agent in a real call using Vapi's web interface.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {!scriptLoaded ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p>Loading Vapi call interface...</p>
            </div>
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center">
              <div id="vapi-widget-container" className="flex items-center justify-center">
                {/* Vapi will render its widget here */}
                <div className="text-center">
                  <p>Click the call button to test your agent</p>
                  <div className="mt-4">
                    <Button className="gap-2 bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4" />
                      Start Test Call
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500 mt-4">
            <p>Note: This test call uses your Vapi.ai account and may incur charges based on your Vapi plan.</p>
          </div>
          
          {callActive && (
            <div className="flex justify-center w-full mt-4">
              <Button 
                variant="destructive" 
                onClick={destroyVapiWidget}
                className="gap-2"
              >
                End Call & Hide Widget
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add global type definition for Vapi SDK
declare global {
  interface Window {
    vapiSDK: {
      run: (config: {
        apiKey: string;
        assistant: string;
        config?: {
          position?: 'left' | 'right' | 'center';
          size?: 'small' | 'medium' | 'large';
          chatWidget?: boolean;
          customText?: string;
          [key: string]: any;
        };
      }) => any;
      destroy: () => void;
    };
  }
}