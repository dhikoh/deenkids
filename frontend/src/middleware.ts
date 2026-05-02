import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret || 'dev-only-unsafe-secret');

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // _at = JS-accessible token set by login page; access_token = HttpOnly from backend
  const token = request.cookies.get('_at')?.value || request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      // No token at all — redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verify JWT signature + expiry
    const isValid = await verifyToken(token);
    if (!isValid) {
      // Token expired or invalid — try silent refresh if refresh_token exists
      if (refreshToken) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
          const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: `refresh_token=${refreshToken}`,
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            // Set new cookies from refresh response
            const response = NextResponse.next();
            if (data.accessToken) {
              response.cookies.set('access_token', data.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60, // 15 minutes
              });
            }
            // Extract new refresh_token from Set-Cookie header
            const setCookies = refreshRes.headers.getSetCookie?.() || [];
            for (const cookie of setCookies) {
              if (cookie.startsWith('refresh_token=')) {
                const value = cookie.split('=')[1]?.split(';')[0];
                if (value) {
                  response.cookies.set('refresh_token', value, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60, // 7 days
                  });
                }
              }
            }
            return response;
          }
        } catch {
          // Refresh failed — fall through to redirect
        }
      }

      // Both tokens invalid — redirect to login
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('_at');
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }
  }

  // Redirect authenticated users away from /login
  if (request.nextUrl.pathname === '/login' && token) {
    const isValid = await verifyToken(token);
    if (isValid) {
      const adminUrl = new URL('/admin', request.url);
      return NextResponse.redirect(adminUrl);
    }
    // Token invalid — clear and let them see login
    const response = NextResponse.next();
    response.cookies.delete('_at');
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
