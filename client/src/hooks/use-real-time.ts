import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';

export function useRealTime() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if user is authenticated by trying to fetch user data
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const user = await response.json();
          if (user?.id) {
            return user;
          }
        }
      } catch (error) {
        console.log('No user authenticated yet');
      }
      return null;
    };

    const initializeSocket = async () => {
      const user = await checkAuth();
      if (!user) return;

      // Create socket connection
      const socket = io('/', {
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to real-time server');
        setIsConnected(true);
        // Join user's room for personalized updates
        socket.emit('join-user-room', user.id);
      });

      // Listen for call updates
      socket.on('call-updated', (data) => {
        console.log('Received call update:', data);
        
        // Invalidate and refetch call-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
        queryClient.invalidateQueries({ queryKey: ['/api/metrics/dashboard'] });
      });

      // Listen for dashboard refresh events
      socket.on('dashboard-refresh', (data) => {
        console.log('Dashboard refresh requested:', data);
        
        // Refresh all dashboard-related data
        queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
        queryClient.invalidateQueries({ queryKey: ['/api/metrics/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from real-time server');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Real-time connection error:', error);
        setIsConnected(false);
      });
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected
  };
}