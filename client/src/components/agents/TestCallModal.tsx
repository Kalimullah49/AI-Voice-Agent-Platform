import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

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
      
      // Create Vapi client with the API key
      const vapi = new Vapi(apiKey);
      vapiInstanceRef.current = vapi;
      
      // Start the call with the Vapi assistant ID
      await vapi.start(agent.vapiAssistantId);
      
      setStatus('connected');
    } catch (error) {
      console.error('Error starting Vapi call:', error);
      setStatus('error');
      setErrorMessage('Failed to start test call. Please make sure your Vapi credentials are valid.');
      toast({
        title: 'Call Error',
        description: 'Failed to connect to Vapi. Please check your API key and assistant ID.',
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