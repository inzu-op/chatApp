import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!(res.socket as any).server.io) {
    console.log('Initializing Socket.IO server...');
    const io = new SocketIOServer((res.socket as any).server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling', 'websocket'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-chat', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined chat`);
      });

      socket.on('leave-chat', (userId: string) => {
        socket.leave(userId);
        console.log(`User ${userId} left chat`);
      });

      socket.on('send-message', (data) => {
        const { senderId, receiverId, text, timestamp } = data;
        io.to(receiverId).emit('new-message', {
          senderId,
          receiverId,
          text,
          timestamp,
        });
      });

      socket.on('typing', (data) => {
        const { userId, receiverId } = data;
        io.to(receiverId).emit('typing', { userId });
      });

      socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, reason);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });

    (res.socket as any).server.io = io;
  } else {
    console.log('Socket.IO server already running');
  }

  res.end();
};

export default ioHandler; 