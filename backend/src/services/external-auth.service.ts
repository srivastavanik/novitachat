import { oauthConfig } from '../config';

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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// OAuth operations
export const buildAuthUrl = (state?: string): string => {
  const params = new URLSearchParams({
    client_id: oauthConfig.clientId,
    scope: oauthConfig.scope,
    redirect_uri: oauthConfig.redirectUri,
    response_type: "code",
    state: state || "",
    utm_source: "nova",
  });

  return `${oauthConfig.authUrl}?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<TokenResponse> => {
  const tokenUrl = oauthConfig.tokenExchangeUrl;

  // Security: Endpoint URL logged without sensitive data for debugging purposes
  console.log('Token exchange initiated for endpoint:', tokenUrl.replace(/^(https?:\/\/[^/]+).*/, '$1/[REDACTED]'));
  
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
