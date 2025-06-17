import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

export const useSocket = (userId: string) => {
  const socketRef = useRef<Socket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId) return;

    console.log('Initializing socket connection for user:', userId);

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true,
      query: { userId },
      withCredentials: true,
      upgrade: true,
      rememberUpgrade: true,
      extraHeaders: {
        'Access-Control-Allow-Origin': '*'
      }
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully');
      console.log('Transport:', socket.io.engine.transport.name);
      
      // Join user's room
      socket.emit('join-chat', userId);
      
      // Start ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      pingIntervalRef.current = setInterval(() => {
        if (socket.connected) {
          const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
          if (timeSinceLastPong > 15000) { // If no pong received for 15 seconds
            console.log('No pong received, reconnecting...');
            socket.disconnect().connect();
          } else {
            socket.emit('ping');
            console.log('Sent ping to server');
          }
        }
      }, 5000); // Send ping every 5 seconds
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      toast.error('Failed to connect to chat server');
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error('Chat connection error');
    });

    socket.on('pong', () => {
      lastPongTimeRef.current = Date.now();
      console.log('Received pong from server');
    });

    // Cleanup on unmount
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (socket.connected) {
        socket.emit('leave-chat', userId);
        socket.disconnect();
      }
    };
  }, [userId]);

  const sendMessage = useCallback((data: { 
    senderId: string; 
    receiverId: string; 
    text: string;
    timestamp: Date;
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', data);
    } else {
      console.error('Socket not connected');
      toast.error('Not connected to chat server');
    }
  }, []);

  const onNewMessage = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('new-message', callback);
    }
  }, []);

  return { sendMessage, onNewMessage };
}; 