import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getVapiToken } from "@/lib/vapi-client";

// TypeScript declaration for global Vapi
declare global {
  interface Window {
    Vapi: any;
  }
}

interface TestCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
  apiKey: string;
}

export function TestCallModal({ isOpen, onClose, agent, apiKey }: TestCallModalProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const vapiInstanceRef = useRef<any>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (vapiInstanceRef.current) {
        try {
          if (typeof vapiInstanceRef.current.stop === 'function') {
            vapiInstanceRef.current.stop();
          }
        } catch (error) {
          console.error('Error stopping Vapi call:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && agent?.vapiAssistantId) {
      startCall();
    }
  }, [isOpen, agent]);

  const startCall = async () => {
    if (!agent.vapiAssistantId) {
      setStatus('error');
      setErrorMessage('This agent has not been deployed to Vapi yet. Please deploy it first.');
      return;
    }

    try {
      setStatus('connecting');
      
      // Get the Vapi token securely from the backend
      const tokenResponse = await getVapiToken();
      if (!tokenResponse.success || !tokenResponse.token) {
        throw new Error(tokenResponse.message || 'Failed to get Vapi token');
      }
      
      // Load the Vapi SDK script dynamically if needed
      const loadVapiScript = async () => {
        if (window.Vapi) return;
        
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.vapi.ai/web-sdk@latest/index.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Vapi SDK'));
          document.head.appendChild(script);
        });
      };
      
      // Ensure the Vapi SDK is loaded
      if (!window.Vapi) {
        await loadVapiScript();
      }
      
      // Use the global Vapi instance
      const VapiSDK = window.Vapi;
      if (!VapiSDK) {
        throw new Error('Vapi SDK failed to load');
      }
      
      // Create Vapi client with the securely obtained token
      const vapi = new VapiSDK(tokenResponse.token);
      vapiInstanceRef.current = vapi;
      
      // Set up call container if needed
      if (callContainerRef.current) {
        vapi.setCallContainer(callContainerRef.current);
      }
      
      // Start the call with the Vapi assistant ID
      await vapi.start(agent.vapiAssistantId);
      
      setStatus('connected');
    } catch (error) {
      console.error('Error starting Vapi call:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start test call');
      toast({
        title: 'Call Error',
        description: 'Failed to connect to Vapi. Please check your assistant ID and try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEndCall = () => {
    if (vapiInstanceRef.current) {
      try {
        if (typeof vapiInstanceRef.current.stop === 'function') {
          vapiInstanceRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping Vapi call:', error);
      }
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleEndCall()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test Call: {agent?.name}</DialogTitle>
          <DialogDescription>
            {status === 'connecting' && 'Connecting to your Vapi assistant...'}
            {status === 'connected' && 'Call connected! Speak into your microphone to interact with the agent.'}
            {status === 'error' && (errorMessage || 'An error occurred while connecting to Vapi.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-4 h-80 bg-gray-50 dark:bg-gray-900 rounded-md">
          <div
            ref={callContainerRef}
            className="w-full h-full flex items-center justify-center"
          >
            {status === 'connecting' && (
              <div className="animate-pulse text-gray-400">Connecting to agent...</div>
            )}
            {status === 'error' && (
              <div className="text-red-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errorMessage || 'Failed to connect'}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleEndCall}>End Call</Button>
          {status === 'error' && (
            <Button onClick={startCall}>Retry</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}