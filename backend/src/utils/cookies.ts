import { Request } from 'express';

/**
 * Parse cookies from request headers
 */
export function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        const name = parts[0].trim();
        const value = decodeURIComponent(parts[1].trim());
        cookies[name] = value;
      }
    });
  }

  return cookies;
}

/**
 * Get a specific cookie value from request
 */
export function getCookie(req: Request, name: string): string | undefined {
  const cookies = parseCookies(req);
  return cookies[name];
} 