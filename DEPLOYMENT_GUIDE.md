# Nova Deployment Guide

This guide covers deploying Nova with the frontend on Vercel and the backend on Render.

## Prerequisites

1. **Accounts Required:**
   - [Vercel Account](https://vercel.com/signup)
   - [Render Account](https://render.com/register)
   - [Supabase Account](https://supabase.com) (for database)
   - [Redis Cloud Account](https://redis.com/try-free/) or similar Redis provider

2. **Required API Keys:**
   - Novita AI API Key (from your Novita account)
   - Supabase project credentials
   - Redis connection details
   - Strong JWT secrets (can be generated during setup)

## Step 1: Set up Supabase Database

1. Create a new Supabase project
2. Go to SQL Editor and run the database setup scripts in order:
   ```sql
   -- Run nova/backend/src/database/schema.sql
   -- Then run each migration file in nova/backend/src/database/migrations/
   ```
3. Note down:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Set up Redis

1. Create a Redis instance (Redis Cloud, Upstash, or Railway)
2. Note down:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`

## Step 2.5: Copy-Paste Ready Environment Variables

Below are the complete environment variable configurations with **ALL VALUES UPDATED** from your actual deployment.

### ✅ **YOUR ACTUAL DEPLOYMENT URLS**
- **Frontend**: `https://nova-frontend-zeta.vercel.app`
- **Backend**: `https://nova-backend-2usm.onrender.com`
- **Redis**: `redis-15633.fcrce190.us-east-1-1.ec2.redns.redis-cloud.com:15633`

### 🔗 **IMPORTANT: Find Your Actual Deployment URLs**

#### **For Vercel Frontend URL:**
✅ **ALREADY UPDATED**: Your Vercel URL is `https://nova-frontend-zeta.vercel.app/`

#### **For Render Backend URL:**
✅ **ALREADY UPDATED**: Your Render backend URL is `https://nova-backend-2usm.onrender.com`

### 🚀 **RENDER BACKEND ENVIRONMENT VARIABLES** (Copy-Paste Ready)

```bash
# Core Server Settings
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Vercel Frontend URL (UPDATED with your actual domain)
CORS_ORIGIN=https://nova-frontend-zeta.vercel.app
SOCKET_CORS_ORIGIN=https://nova-frontend-zeta.vercel.app
WEB_ORIGIN=https://nova-frontend-zeta.vercel.app

# Supabase Database Configuration (Pre-populated from your project)
SUPABASE_URL=https://jiqwpdnelzhdwthcuqav.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcXdwZG5lbHpoZHd0aGN1cWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTYzOTAsImV4cCI6MjA2ODA5MjM5MH0.bpS0SlrH13SXrq6tEOfaLSZ8CfyL8IZ50Zt2ktC0YoE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcXdwZG5lbHpoZHd0aGN1cWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxNjM5MCwiZXhwIjoyMDY4MDkyMzkwfQ.CWXC5LMmPZrt0GqVQwCvA8rkFmmSYWpUSsgt9PmSJv0
SUPABASE_DB_PASSWORD=N0v@Ch@t25

# Redis Configuration (UPDATED with your production Redis instance)
REDIS_HOST=redis-15633.fcrce190.us-east-1-1.ec2.redns.redis-cloud.com
REDIS_PORT=15633
REDIS_PASSWORD=d8xc27XbrdNnSiOCBFKc3GMep3FYbEh0

# Novita AI Configuration (Pre-populated from your project)
NOVITA_API_KEY=sk_kEz6nAcYjVd5Nk3lQ3Y5SEJnvWICJI4wieGzBYQgGyc
NOVITA_API_BASE_URL=https://api.novita.ai/v3/openai

# OAuth Configuration (Current development values - update with production when received)
OAUTH_CLIENT_ID=2a743b89a0a645dc88635c85
OAUTH_APP_SECRET=15348a76f29b47f983e7bd78f18fa9c2
OAUTH_AUTH_URL=https://novita.ai/oauth/authorize
OAUTH_TOKEN_EXCHANGE_URL=https://api-server.novita.ai/oauth/token
OAUTH_REDIRECT_URI=https://nova-backend-2usm.onrender.com/api/external-auth/callback
OAUTH_SCOPE=openid+profile
OAUTH_USERINFO_URL=https://api-server.novita.ai/oauth/userinfo

# JWT Authentication (Production-ready secrets generated)
JWT_ACCESS_SECRET=1e2b1fa24632f36cc2130cb792a26a269f7d1efff1639a71c076f1346283a94c
JWT_REFRESH_SECRET=8b336553e17d477cc662ffb8a3412987fdc250fe4ba47b67b66e09d5244a9660
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
LOG_LEVEL=info
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Search API (Pre-populated from your project)
SERPER_API_KEY=bcab8c3c0d97018ce8e931110e296b64ecb5f269
```

### 🌐 **VERCEL FRONTEND ENVIRONMENT VARIABLES** (Copy-Paste Ready)

```bash
# Backend API Configuration (UPDATED with your actual Render backend URL)
NEXT_PUBLIC_API_URL=https://nova-backend-2usm.onrender.com
```

## Step 3: Deploy Backend to Render

1. Fork or push the Nova repository to your GitHub account

2. Go to [Render Dashboard](https://dashboard.render.com/)

3. Click "New +" → "Web Service"

4. Connect your GitHub repository and select the Nova repo

5. Configure the service:
   - **Name**: nova-backend
   - **Root Directory**: nova/backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

6. **Add Environment Variables:**
   
   📋 **Copy the complete environment variables from Step 2.5 above** - all values are pre-populated from your project configuration.

7. Click "Create Web Service"

8. Wait for the build and deployment to complete

9. Note your backend URL: `https://your-service.onrender.com`

## Troubleshooting

### ✅ **FIXED: TypeScript Build Errors**

**Issue**: `Could not find a declaration file for module 'compression'` or similar TypeScript errors

**Solution Applied**: Moved all TypeScript type packages from `devDependencies` to `dependencies` in `package.json`:
```json
{
  "dependencies": {
    "@types/compression": "^1.8.1",
    "@types/morgan": "^1.9.10",
    "@types/pg": "^8.15.4"
  }
}
```

**Why**: Render doesn't install `devDependencies` in production builds, so TypeScript types must be in main dependencies.

### Other Common Issues

#### Build Command Issues
- Ensure build command is: `npm install && npm run build`
- Ensure start command is: `npm start`
- Root directory should be: `nova/backend`

#### WebSocket Connection Issues
- Ensure CORS origins are correctly set
- Render supports WebSocket connections on all plans

#### Database Connection Issues
- Verify Supabase credentials
- Check if database migrations were run successfully

#### Redis Connection Issues
- Ensure Redis instance is accessible from Render
- Check firewall rules if using Redis Cloud

## Support

For issues specific to:
- Render deployment: [Render Support](https://render.com/docs)
- Vercel deployment: [Vercel Support](https://vercel.com/support)
- Supabase: [Supabase Support](https://supabase.com/docs)
- Nova application: Create an issue in the GitHub repository