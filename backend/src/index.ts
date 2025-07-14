import { httpServer } from './app';
import { config } from './config';
import database from './database';
import { redisClient } from './utils/redis';

const PORT = config.PORT || 3001;
const HOST = config.HOST || 'localhost';

async function startServer() {
  try {
    // Test database connection
    await database.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Test Redis connection
    await redisClient.set('test', 'connected');
    const testValue = await redisClient.get('test');
    if (testValue === 'connected') {
      await redisClient.del('test');
      console.log('✅ Redis connected successfully');
    }

    // Start the server
    httpServer.listen(PORT, HOST, () => {
      console.log(`
🚀 Nova Backend Server is running!
📍 Server: http://${HOST}:${PORT}
🏥 Health: http://${HOST}:${PORT}/health
🔐 Auth:   http://${HOST}:${PORT}/api/auth
🌍 Environment: ${config.NODE_ENV}
⏰ Started at: ${new Date().toISOString()}
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close database connection
  await database.close();
  console.log('Database connection closed');

  // Close Redis connection
  await redisClient.disconnect();
  console.log('Redis connection closed');

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close database connection
  await database.close();
  console.log('Database connection closed');

  // Close Redis connection
  await redisClient.disconnect();
  console.log('Redis connection closed');

  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
