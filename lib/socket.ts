import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export const initSocket = (res: NextApiResponse) => {
  if (!res.socket?.server) {
    console.error('Socket server not available');
    return null;
  }

  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...');
    const io = new SocketIOServer(res.socket.server as any, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['polling', 'websocket'],
      allowEIO3: false,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e8,
      connectTimeout: 20000,
      allowUpgrades: true,
      pingTimeout: 20000,
      pingInterval: 10000,
      cookie: false,
      serveClient: false,
      perMessageDeflate: false,
      httpCompression: {
        threshold: 2048
      }
    });

    // Handle upgrade errors
    io.engine.on('upgrade_error', (err) => {
      console.error('Upgrade error:', err);
    });

    io.engine.on('connection_error', (err) => {
      console.error('Connection error:', err);
    });

    io.engine.on('close', (reason) => {
      console.log('Engine closed:', reason);
    });

    io.engine.on('connection', (socket) => {
      console.log('New engine connection:', socket.id);
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      console.log('Query params:', socket.handshake.query);
      console.log('Transport:', socket.conn.transport.name);

      // Handle connection errors
      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });

      socket.on('join-chat', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
      });

      socket.on('leave-chat', (userId: string) => {
        socket.leave(userId);
        console.log(`User ${userId} left their room`);
      });

      socket.on('send-message', async (data: { 
        senderId: string; 
        receiverId: string; 
        text: string;
        timestamp: Date;
      }) => {
        try {
          // Emit to both sender and receiver immediately
          socket.emit('new-message', data);
          io.to(data.receiverId).emit('new-message', data);
          console.log(`Message sent from ${data.senderId} to ${data.receiverId}`);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Send a ping every 10 seconds to keep the connection alive
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping');
          console.log('Sent ping to client:', socket.id);
        }
      }, 10000);

      socket.on('disconnect', () => {
        clearInterval(pingInterval);
      });

      // Handle client pings
      socket.on('ping', () => {
        console.log('Received ping from client:', socket.id);
        socket.emit('pong');
      });
    });

    (res.socket.server as any).io = io;
    return io;
  } else {
    console.log('Socket.IO server already running');
    return (res.socket.server as any).io;
  }
}; 