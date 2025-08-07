import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Define the environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
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

  // OAuth
  OAUTH_CLIENT_ID: z.string(),
  OAUTH_APP_SECRET: z.string(),
  OAUTH_AUTH_URL: z.string().default('https://novita.ai/oauth/authorize'),
  OAUTH_TOKEN_EXCHANGE_URL: z.string().default('https://api-server.novita.ai/oauth/token'),
  OAUTH_REDIRECT_URI: z.string().default('http://localhost:5000/api/external-auth/callback'),
  OAUTH_SCOPE: z.string().default('openid+profile'),
  OAUTH_USERINFO_URL: z.string().default('https://api-server.novita.ai/oauth/userinfo'),

  // Frontend
  WEB_ORIGIN: z.string().default('http://localhost:3000'),

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
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('ERROR: Invalid environment variables:', parsedEnv.error.format());
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

export const oauthConfig = {
  clientId: config.OAUTH_CLIENT_ID,
  appSecret: config.OAUTH_APP_SECRET,
  authUrl: config.OAUTH_AUTH_URL,
  tokenExchangeUrl: config.OAUTH_TOKEN_EXCHANGE_URL,
  redirectUri: config.OAUTH_REDIRECT_URI,
  scope: config.OAUTH_SCOPE,
  userInfoUrl: config.OAUTH_USERINFO_URL,
};

export const frontendConfig = {
  webOrigin: config.WEB_ORIGIN,
}

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
