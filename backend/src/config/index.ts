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

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_DB_PASSWORD: z.string().optional(),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().transform(Number),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Novita AI
  NOVITA_API_KEY: z.string(),
  NOVITA_API_BASE_URL: z.string().default('https://api.novita.ai/v3/openai'),

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

  // JWT
  JWT_ACCESS_SECRET: z.string().default('your-super-secret-jwt-access-key'),
  JWT_REFRESH_SECRET: z.string().default('your-super-secret-jwt-refresh-key'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;

// Export grouped configurations for easier access
export const supabaseConfig = {
  url: config.SUPABASE_URL,
  anonKey: config.SUPABASE_ANON_KEY,
  serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
  dbPassword: config.SUPABASE_DB_PASSWORD,
};

export const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
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

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiresIn: config.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

export default config;
