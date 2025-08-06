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

Below are the complete environment variable configurations with all values pre-populated from your project. Simply copy and paste these into your deployment platforms.

### 🔗 **IMPORTANT: Find Your Actual Deployment URLs**

Before deploying, you'll need to update the placeholder URLs with your actual deployment URLs:

#### **For Vercel Frontend URL:**
✅ **ALREADY UPDATED**: Your Vercel URL is `https://nova-frontend-zeta.vercel.app/` (as provided)

#### **For Render Backend URL:**
1. After deploying to Render, go to your [Render Dashboard](https://dashboard.render.com/)
2. Click on your backend service
3. Copy the URL shown (e.g., `https://nova-backend-xyz789.onrender.com`)

#### **Update These Placeholders:**
- ✅ **Vercel URL**: Already updated to `https://nova-frontend-zeta.vercel.app`
- ⏳ **Render URL**: Update `https://nova-backend-[your-service-name].onrender.com` with your actual Render URL

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

# Redis Configuration (Update with your production Redis instance)
REDIS_HOST=your_production_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_production_redis_password

# Novita AI Configuration (Pre-populated from your project)
NOVITA_API_KEY=sk_kEz6nAcYjVd5Nk3lQ3Y5SEJnvWICJI4wieGzBYQgGyc
NOVITA_API_BASE_URL=https://api.novita.ai/v3/openai

# OAuth Configuration (Current development values - update with production when received)
OAUTH_CLIENT_ID=2a743b89a0a645dc88635c85
OAUTH_APP_SECRET=15348a76f29b47f983e7bd78f18fa9c2
OAUTH_AUTH_URL=https://novita.ai/oauth/authorize
OAUTH_TOKEN_EXCHANGE_URL=https://api-server.novita.ai/oauth/token
OAUTH_REDIRECT_URI=https://nova-backend-[your-service-name].onrender.com/api/external-auth/callback
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
# Backend API Configuration (Update with your actual Render backend URL)
NEXT_PUBLIC_API_URL=https://nova-backend-[your-service-name].onrender.com
```

> **⚠️ REMAINING UPDATES NEEDED:**
> 1. ✅ **Vercel Frontend URL**: Already updated to `https://nova-frontend-zeta.vercel.app`
> 2. ⏳ **Render Backend URL**: Update `https://nova-backend-[your-service-name].onrender.com` with your actual Render service URL
> 3. ⏳ **Redis Configuration**: Update with your production Redis instance details  
> 4. ⏳ **OAuth Production Credentials**: Update when you receive production OAuth credentials from Novita

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

## Step 4: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)

2. Click "Add New..." → "Project"

3. Import your GitHub repository

4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: nova/frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Add Environment Variables:**
   
   📋 **Copy the Vercel environment variables from Step 2.5 above** - update the backend URL with your actual Render service URL.

6. Click "Deploy"

7. Wait for deployment to complete

8. Note your frontend URL: `https://your-app.vercel.app`

## Step 5: Update Backend Environment Variables

1. Go back to your Render service

2. Update these environment variables with your actual deployment URLs:
   ```bash
   # Frontend CORS configuration (ALREADY UPDATED in Step 2.5)
   CORS_ORIGIN=https://nova-frontend-zeta.vercel.app
   SOCKET_CORS_ORIGIN=https://nova-frontend-zeta.vercel.app
   WEB_ORIGIN=https://nova-frontend-zeta.vercel.app
   
   # OAuth redirect configuration (update with your Render URL)
   OAUTH_REDIRECT_URI=https://nova-backend-[your-service-name].onrender.com/api/external-auth/callback
   ```

4. Trigger a manual deploy to apply changes

## Step 6: Configure Production OAuth (When Ready)

### 🔑 **Setting Up Production OAuth Credentials**

When you receive production OAuth credentials from Novita, follow these steps:

#### 1. **Register Your Application with Novita**

Contact Novita support to register your production application and provide them with:

- **Application Name**: Nova Chat Application
- **Application Description**: AI-powered chat application with web search capabilities
- **Redirect URI**: `https://nova-backend-[your-service-name].onrender.com/api/external-auth/callback`
- **Application Type**: Web Application
- **Scopes Needed**: `openid profile`

#### 2. **Update Environment Variables in Render**

Once you receive your production credentials, update these environment variables in your Render backend service:

```bash
# Replace with your production OAuth credentials
OAUTH_CLIENT_ID=your_production_client_id_from_novita
OAUTH_APP_SECRET=your_production_app_secret_from_novita

# These URLs should remain the same unless Novita provides different endpoints
OAUTH_AUTH_URL=https://novita.ai/oauth/authorize
OAUTH_TOKEN_EXCHANGE_URL=https://api-server.novita.ai/oauth/token
OAUTH_USERINFO_URL=https://api-server.novita.ai/oauth/userinfo
OAUTH_SCOPE=openid+profile

# Update with your actual Render backend URL
OAUTH_REDIRECT_URI=https://your-backend.onrender.com/api/external-auth/callback
```

#### 3. **Verify OAuth Integration**

After updating the credentials:

1. **Test the OAuth Flow**:
   - Go to your deployed frontend
   - Click "Login with Novita"
   - Verify you're redirected to Novita's authorization page
   - Complete the authorization
   - Verify you're redirected back and logged in successfully

2. **Check Backend Logs**:
   - Monitor your Render backend logs during OAuth flow
   - Look for any authentication errors
   - Verify tokens are being exchanged successfully

#### 4. **Common OAuth Issues & Solutions**

**Issue**: "Invalid redirect URI"
- **Solution**: Ensure the redirect URI in Novita matches exactly: `https://your-backend.onrender.com/api/external-auth/callback`

**Issue**: "Invalid client credentials"
- **Solution**: Double-check `OAUTH_CLIENT_ID` and `OAUTH_APP_SECRET` in Render environment variables

**Issue**: "CORS errors during OAuth"
- **Solution**: Verify `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` match your Vercel frontend URL

**Issue**: "Token exchange fails"
- **Solution**: Check that `OAUTH_TOKEN_EXCHANGE_URL` is correct and accessible

#### 5. **OAuth Environment Variables Summary**

For quick reference, here are all OAuth-related environment variables:

```bash
# Core OAuth Configuration
OAUTH_CLIENT_ID=your_production_client_id
OAUTH_APP_SECRET=your_production_app_secret
OAUTH_REDIRECT_URI=https://your-backend.onrender.com/api/external-auth/callback

# OAuth Endpoints (provided by Novita)
OAUTH_AUTH_URL=https://novita.ai/oauth/authorize
OAUTH_TOKEN_EXCHANGE_URL=https://api-server.novita.ai/oauth/token
OAUTH_USERINFO_URL=https://api-server.novita.ai/oauth/userinfo
OAUTH_SCOPE=openid+profile

# Related CORS Configuration (UPDATED with your Vercel URL)
CORS_ORIGIN=https://nova-frontend-zeta.vercel.app
SOCKET_CORS_ORIGIN=https://nova-frontend-zeta.vercel.app
WEB_ORIGIN=https://nova-frontend-zeta.vercel.app
```

> **🔒 Security Note**: Never commit OAuth secrets to version control. Always use environment variables for sensitive credentials.

## Troubleshooting

### WebSocket Connection Issues
- Ensure CORS origins are correctly set
- Render supports WebSocket connections on all plans

### Database Connection Issues
- Verify Supabase credentials
- Check if database migrations were run successfully

### Redis Connection Issues
- Ensure Redis instance is accessible from Render
- Check firewall rules if using Redis Cloud

### File Upload Issues
- File attachments are stored in base64 in the database
- Ensure `MAX_FILE_SIZE` environment variable is set appropriately

## Production Considerations

1. **SSL/TLS**: Both Vercel and Render provide SSL certificates automatically

2. **Scaling**: 
   - Frontend on Vercel scales automatically
   - Backend on Render can be scaled by upgrading the plan

3. **Monitoring**:
   - Set up error tracking (Sentry, LogRocket)
   - Monitor API performance
   - Set up uptime monitoring

4. **Backups**:
   - Enable Supabase automatic backups
   - Export Redis data regularly

5. **Security**:
   - Regularly update dependencies
   - Use strong JWT secrets
   - Enable rate limiting
   - Set up CORS properly

## Environment Variables Summary

### Backend (Render)

#### Core Server Settings
- `NODE_ENV=production` - Application environment
- `PORT=5000` - Server port (Render will override this)
- `HOST=0.0.0.0` - Server host binding

#### CORS & Frontend Configuration
- `CORS_ORIGIN=https://your-app.vercel.app` - Frontend URL for CORS
- `SOCKET_CORS_ORIGIN=https://your-app.vercel.app` - Frontend URL for WebSocket CORS
- `WEB_ORIGIN=https://your-app.vercel.app` - Frontend origin URL

#### Database Configuration (Supabase)
- `SUPABASE_URL=your_supabase_url` - Supabase project URL
- `SUPABASE_ANON_KEY=your_supabase_anon_key` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key` - Supabase service role key
- `SUPABASE_DB_PASSWORD=your_supabase_db_password` - Database password (optional)

#### Redis Configuration
- `REDIS_HOST=your_redis_host` - Redis server hostname
- `REDIS_PORT=your_redis_port` - Redis server port (usually 6379)
- `REDIS_PASSWORD=your_redis_password` - Redis authentication password

#### AI Provider Configuration (Novita)
- `NOVITA_API_KEY=your_novita_api_key` - Novita AI API key
- `NOVITA_API_BASE_URL=https://api.novita.ai/v3/openai` - Novita API base URL

#### OAuth Configuration
- `OAUTH_CLIENT_ID=your_oauth_client_id` - OAuth client ID
- `OAUTH_APP_SECRET=your_oauth_app_secret` - OAuth app secret
- `OAUTH_AUTH_URL=https://novita.ai/oauth/authorize` - OAuth authorization URL
- `OAUTH_TOKEN_EXCHANGE_URL=https://api-server.novita.ai/oauth/token` - Token exchange URL
- `OAUTH_REDIRECT_URI=https://your-backend.onrender.com/api/external-auth/callback` - OAuth redirect URI
- `OAUTH_SCOPE=openid+profile` - OAuth scopes
- `OAUTH_USERINFO_URL=https://api-server.novita.ai/oauth/userinfo` - User info endpoint

#### JWT Configuration
- `JWT_ACCESS_SECRET=your_generated_access_secret` - JWT access token secret (generate with `openssl rand -hex 32`)
- `JWT_REFRESH_SECRET=your_generated_refresh_secret` - JWT refresh token secret (generate with `openssl rand -hex 32`)
- `JWT_ACCESS_EXPIRES_IN=15m` - Access token expiration time
- `JWT_REFRESH_EXPIRES_IN=7d` - Refresh token expiration time

#### Application Configuration
- `LOG_LEVEL=info` - Logging level (error, warn, info, debug)
- `MAX_FILE_SIZE=10485760` - Maximum file upload size in bytes (10MB)
- `UPLOAD_DIR=uploads` - Directory for file uploads
- `RATE_LIMIT_WINDOW=15` - Rate limiting window in minutes
- `RATE_LIMIT_MAX_REQUESTS=100` - Maximum requests per window

#### Optional Services
- `SERPER_API_KEY=your_serper_api_key` - Serper API key for web search functionality (optional)

### Frontend (Vercel)

#### Required Configuration
- `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com` - Backend API URL

#### Automatic Configuration
- `NODE_ENV=production` - Set automatically by Vercel

### Production Security Notes

1. **JWT Secrets**: Generate strong random secrets using:
   ```bash
   openssl rand -hex 32
   ```

2. **OAuth Configuration**: Update with production credentials when available

3. **CORS Origins**: Ensure all CORS environment variables match your actual frontend URL

4. **Database Security**: Use strong passwords and enable SSL connections where possible

5. **API Keys**: Rotate API keys regularly and store them securely

## 📋 **Quick Deployment Checklist**

Use this checklist to ensure you've completed all deployment steps:

### ✅ **Pre-Deployment**
- [ ] Supabase database setup and credentials noted
- [ ] Redis instance created and credentials noted  
- [ ] JWT secrets generated (`openssl rand -hex 32`)

### ✅ **Render Backend Deployment**
- [ ] GitHub repository connected to Render
- [ ] Environment variables copied from Step 2.5
- [ ] Actual backend URL noted and updated in OAuth redirect
- [ ] Build and deployment successful

### ✅ **Vercel Frontend Deployment**  
- [ ] GitHub repository connected to Vercel
- [ ] Frontend environment variable updated with backend URL
- [ ] Build and deployment successful
- [ ] Frontend URL noted

### ✅ **Final Configuration**
- [x] Backend CORS origins updated with actual Vercel URL (`https://nova-frontend-zeta.vercel.app`)
- [ ] OAuth redirect URI updated with actual Render URL
- [ ] Redis configuration updated with production details
- [ ] Test OAuth login flow end-to-end

### ✅ **Production OAuth (When Ready)**
- [ ] Novita contacted for production OAuth credentials
- [ ] Production OAuth credentials updated in Render
- [ ] OAuth flow tested with production credentials

## Support

For issues specific to:
- Vercel deployment: [Vercel Support](https://vercel.com/support)
- Render deployment: [Render Support](https://render.com/docs)
- Supabase: [Supabase Support](https://supabase.com/docs)
- Nova application: Create an issue in the GitHub repository
