# Nova Deployment Guide

## Environment Variables Configuration

### Frontend (Vercel)

Add these environment variables in your Vercel project settings:

```env
# Backend API URL (your deployed backend URL)
NEXT_PUBLIC_API_URL=https://your-backend-url.com

# Example for Render:
# NEXT_PUBLIC_API_URL=https://nova-backend.onrender.com

# Example for Railway:
# NEXT_PUBLIC_API_URL=https://nova-backend.up.railway.app
```

### Backend (Render/Railway/etc)

Add these environment variables in your backend hosting service:

```env
# Database
DATABASE_URL=your_supabase_connection_string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT Secrets (generate secure random strings)
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret

# Redis (optional - for refresh token storage)
REDIS_URL=redis://your-redis-url

# Novita AI
NOVITA_API_KEY=your_novita_api_key

# OAuth (for Novita login)
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_APP_SECRET=your_oauth_app_secret
OAUTH_REDIRECT_URI=https://your-backend-url.com/api/external-auth/callback

# Search
SERPER_API_KEY=your_serper_api_key

# CORS - Add your frontend URLs
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

# Node Environment
NODE_ENV=production
PORT=3001
```

## CORS Configuration

The backend is configured to use the `ALLOWED_ORIGINS` environment variable for CORS. Make sure to:

1. Include your Vercel frontend URL in `ALLOWED_ORIGINS`
2. Separate multiple origins with commas
3. Don't include trailing slashes

Example:
```
ALLOWED_ORIGINS=https://nova-frontend.vercel.app,https://nova.ai,http://localhost:3000
```

## Authentication Options

Nova now supports two authentication methods:

### 1. OAuth with Novita Account
- Uses the external OAuth provider
- Requires `OAUTH_CLIENT_ID` and `OAUTH_APP_SECRET` to be configured
- Redirect URI must match what's configured in your OAuth provider

### 2. Email/Password Authentication
- Uses Supabase authentication
- Users can register with email/password on the signup page
- Same credentials work for login

## Deployment Steps

### 1. Deploy Backend
1. Push your code to GitHub
2. Connect your repo to Render/Railway
3. Add all environment variables
4. Deploy

### 2. Deploy Frontend
1. Push your code to GitHub
2. Import project to Vercel
3. Add `NEXT_PUBLIC_API_URL` environment variable pointing to your backend
4. Deploy

### 3. Test Authentication
1. Try OAuth login with "Continue with Novita"
2. Try email/password login with "Continue with Email"
3. Verify both methods work

## Troubleshooting

### CORS Errors
- Check that your frontend URL is in `ALLOWED_ORIGINS`
- Ensure no trailing slashes in URLs
- Verify the backend is running and accessible

### OAuth Login Failed
- Verify `OAUTH_CLIENT_ID` and `OAUTH_APP_SECRET` are correct
- Check that `OAUTH_REDIRECT_URI` matches your OAuth provider settings
- Ensure the backend URL in frontend env is correct

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check Supabase service is running
- Ensure `SUPABASE_SERVICE_KEY` has proper permissions

### 404 Errors on API Calls
- Check `NEXT_PUBLIC_API_URL` doesn't have trailing slash
- Verify backend routes are correctly configured
- Ensure backend is deployed and running
