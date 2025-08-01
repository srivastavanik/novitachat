import { oauthConfig } from '../config';
import { JWTService } from '../utils/jwt';
import { redisClient } from '../utils/redis';

// Types
export interface ExternalUserInfo {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  balance?: number;
  access_api?: boolean;
  [key: string]: any;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface SessionUser {
  id: string;
  externalId: string;
  username: string;
  email: string;
  name?: string;
  balance?: number;
  accessApi?: boolean;
  isExternalAuth: boolean;
  role: 'user';
  [key: string]: any;
}

export interface SessionData {
  user: SessionUser;
  externalTokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  };
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

// OAuth operations
export const buildAuthUrl = (state?: string): string => {
  const params = new URLSearchParams({
    client_id: oauthConfig.clientId,
    scope: oauthConfig.scope,
    redirect_uri: oauthConfig.redirectUri,
    response_type: "code",
    state: state || "",
  });

  return `${oauthConfig.authUrl}?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<TokenResponse> => {
  const tokenUrl = oauthConfig.authUrl.replace('/oauth/authorize', '/oauth/token');

  console.log('Token exchange endpoint:', { tokenUrl });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.appSecret,
      code,
      redirect_uri: oauthConfig.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<TokenResponse>;
};

export const getUserInfo = async (accessToken: string): Promise<ExternalUserInfo> => {
  const response = await fetch(oauthConfig.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ExternalUserInfo>;
};

// User data transformation
export const transformExternalUser = (userInfo: ExternalUserInfo): SessionUser => {
  return {
    id: userInfo.sub,
    externalId: userInfo.sub,
    username: userInfo.preferred_username || `user_${userInfo.sub}`,
    email: userInfo.email || `${userInfo.sub}@external.user`,
    name: userInfo.name || userInfo.preferred_username,
    balance: userInfo.balance,
    accessApi: userInfo.access_api,
    isExternalAuth: true,
    role: 'user' as const,
    ...userInfo,
  };
};

// Token expiration calculation
export const calculateTokenExpiration = (expiresIn?: number): number => {
  return expiresIn 
    ? Date.now() + expiresIn * 1000
    : Date.now() + 7 * 24 * 60 * 60 * 1000; // Default 7 days
};

// Session management
export const createSession = async (
  userInfo: ExternalUserInfo, 
  tokenResponse: TokenResponse
): Promise<{ sessionData: SessionData; sessionId: string }> => {
  const sessionId = `session_${userInfo.sub}_${Date.now()}`;
  const expiresAt = calculateTokenExpiration(tokenResponse.expires_in);
  
  const sessionData: SessionData = {
    user: transformExternalUser(userInfo),
    externalTokens: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt
    },
    createdAt: new Date().toISOString()
  };

  // Store session data in Redis (24 hours)
  await redisClient.set(
    `session:${sessionId}`,
    JSON.stringify(sessionData),
    60 * 60 * 24
  );

  console.log('External auth session created:', { 
    sessionId,
    userId: userInfo.sub,
    username: userInfo.preferred_username,
    expiresAt: new Date(expiresAt).toISOString()
  });

  return { sessionData, sessionId };
};

// JWT token generation
export const generateAuthTokens = (userInfo: ExternalUserInfo): { accessToken: string; refreshToken: string } => {
  const jwtPayload = {
    userId: userInfo.sub,
    email: userInfo.email || `${userInfo.sub}@external.user`,
    role: 'user' as const
  };

  const accessToken = JWTService.generateAccessToken(jwtPayload);
  const refreshToken = JWTService.generateRefreshToken(jwtPayload);

  return { accessToken, refreshToken };
};

// Store authentication data
export const storeAuthData = async (
  userInfo: ExternalUserInfo,
  tokenResponse: TokenResponse,
  refreshToken: string
): Promise<void> => {
  const expiresAt = calculateTokenExpiration(tokenResponse.expires_in);

  await Promise.all([
    // Store refresh token mapping (30 days)
    redisClient.set(
      `refresh_token:${userInfo.sub}`,
      refreshToken,
      30 * 24 * 60 * 60
    ),
    // Store external tokens for API access
    redisClient.set(
      `external_tokens:${userInfo.sub}`,
      JSON.stringify({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt
      }),
      tokenResponse.expires_in || 7 * 24 * 60 * 60
    )
  ]);
};

// Complete authentication flow
export const completeAuthentication = async (
  userInfo: ExternalUserInfo,
  tokenResponse: TokenResponse
): Promise<AuthTokens> => {
  // Generate JWT tokens
  const { accessToken, refreshToken } = generateAuthTokens(userInfo);
  
  // Create session
  const { sessionId } = await createSession(userInfo, tokenResponse);
  
  // Store authentication data
  await storeAuthData(userInfo, tokenResponse, refreshToken);

  return {
    accessToken,
    refreshToken,
    sessionId
  };
};

// Session retrieval
export const getSessionData = async (sessionId: string): Promise<SessionData | null> => {
  const sessionData = await redisClient.get(`session:${sessionId}`);
  
  if (!sessionData) {
    return null;
  }

  return JSON.parse(sessionData) as SessionData;
};

// Session cleanup
export const cleanupUserSession = async (sessionId: string): Promise<void> => {
  // Get session to find user ID
  const sessionData = await redisClient.get(`session:${sessionId}`);
  if (sessionData) {
    const session = JSON.parse(sessionData) as SessionData;
    const userId = session.user.id;
    
    // Clean up all related Redis keys
    await Promise.all([
      redisClient.del(`session:${sessionId}`),
      redisClient.del(`refresh_token:${userId}`),
      redisClient.del(`external_tokens:${userId}`)
    ]);
  }
}; 