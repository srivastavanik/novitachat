import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config, corsConfig, socketCorsConfig, oauthConfig } from './config';

// Import routes
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import externalAuthRoutes from './routes/external-auth.routes';
import modelsRoutes from './routes/models.routes';

// Initialize express app
const app: Application = express();

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: socketCorsConfig
});

// Middleware
app.use(helmet());
app.use(cors(corsConfig));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nova-backend',
    version: '1.0.0'
  });
});

// Debug endpoint to check OAuth config
app.get('/debug/oauth-config', (req: Request, res: Response) => {
  res.json({
    hasClientId: !!oauthConfig.clientId,
    hasAppSecret: !!oauthConfig.appSecret,
    clientIdLength: oauthConfig.clientId?.length || 0,
    authUrl: oauthConfig.authUrl,
    redirectUri: oauthConfig.redirectUri,
    scope: oauthConfig.scope,
    envVars: {
      OAUTH_CLIENT_ID: !!process.env.OAUTH_CLIENT_ID,
      OAUTH_APP_SECRET: !!process.env.OAUTH_APP_SECRET,
      OAUTH_CLIENT_ID_VALUE: process.env.OAUTH_CLIENT_ID,
      OAUTH_APP_SECRET_VALUE: process.env.OAUTH_APP_SECRET ? 'SET' : 'NOT SET'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/external-auth', externalAuthRoutes);
app.use('/api/models', modelsRoutes);

// Import chat controller for WebSocket handling
import { chatController } from './controllers/chat.controller';
import { JWTService } from './utils/jwt';

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = JWTService.verifyAccessToken(token);
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'User:', socket.data.userId);

  // Join user-specific room
  socket.join(`user:${socket.data.userId}`);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle streaming chat
  socket.on('chat:stream', async (data) => {
    await chatController.handleStreamingChat(socket, {
      ...data,
      userId: socket.data.userId
    });
  });

  // Join conversation room for real-time updates
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error('❌ Error Details:', {
    status,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    env: config.NODE_ENV
  });

  res.status(status).json({
    error: message,
    ...(config.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.toString() 
    })
  });
});

export { app, httpServer, io };
