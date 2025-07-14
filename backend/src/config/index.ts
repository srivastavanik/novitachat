import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define the environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  HOST: z.string().default('localhost'),

  // Database
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().transform(Number),
  REDIS_PASSWORD: z.string().optional().default(''),

  // JWT
  JWT_SECRET: z.string(),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // Novita AI
  NOVITA_API_KEY: z.string(),
  NOVITA_API_BASE_URL: z.string().default('https://api.novita.ai/v3'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_DIR: z.string().default('uploads'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('15'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;

// Export grouped configurations for easier access
export const dbConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
};

export const jwtConfig = {
  secret: config.JWT_SECRET,
  accessTokenExpiry: config.JWT_ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiry: config.JWT_REFRESH_TOKEN_EXPIRY,
};

export const novitaConfig = {
  apiKey: config.NOVITA_API_KEY,
  baseURL: config.NOVITA_API_BASE_URL,
};

export const corsConfig = {
  origin: config.CORS_ORIGIN.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
};

export const socketCorsConfig = {
  origin: config.SOCKET_CORS_ORIGIN.split(','),
  credentials: true,
};

export default config;
