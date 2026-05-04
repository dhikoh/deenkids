import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
}
// Fallback must match backend's default (auth.module.ts)
const JWT_SECRET = new TextEncoder().encode(jwtSecret || 'adably-super-secret-key-2026');

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // _at = JS-accessible access token set by login page
  // _rt = JS-accessible refresh token set by login page
  // (HttpOnly cookies from api.adably.id are NOT available on adably.id due to cross-origin)
  const token = request.cookies.get('_at')?.value;
  const refreshToken = request.cookies.get('_rt')?.value;

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      // No tokens — redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const isValid = await verifyToken(token);
    if (!isValid) {
      // Token expired or invalid — strict logout
      const loginUrl = new URL('/login', request.url);
      // Optional: Clear cookies here so the client knows they are logged out.
      // We do this by creating a response that redirects and deletes cookies.
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('_at');
      return response;
    }
  }

  // Redirect authenticated users away from /login
  if (request.nextUrl.pathname === '/login') {
    if (token) {
      const isValid = await verifyToken(token);
      if (isValid) {
        const adminUrl = new URL('/admin', request.url);
        return NextResponse.redirect(adminUrl);
      }
      // Token invalid — clear and let them see login
      const response = NextResponse.next();
      response.cookies.delete('_at');
      response.cookies.delete('_rt');
      return response;
    }
    // No _at but _rt exists — try silent refresh before showing login
    if (refreshToken) {
      const refreshResult = await attemptSilentRefresh(refreshToken, request);
      if (refreshResult) {
        // Refresh succeeded — redirect to admin instead of showing login
        const adminUrl = new URL('/admin', request.url);
        const response = NextResponse.redirect(adminUrl);
        // Copy the new cookies from the refresh result
        for (const cookie of refreshResult.cookies.getAll()) {
          response.cookies.set(cookie.name, cookie.value, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });
        }
        return response;
      }
    }
  }

  return NextResponse.next();
}

/**
 * Attempt silent refresh by sending _rt token to backend via POST body.
 * On success, sets new _at and _rt cookies and allows the request to proceed.
 */
async function attemptSilentRefresh(refreshToken: string, request: NextRequest): Promise<NextResponse | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      if (data.accessToken) {
        const response = NextResponse.next();
        // Set new _at cookie (JS-accessible, 2 hours)
        response.cookies.set('_at', data.accessToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 2 * 60 * 60, // 2 hours — consistent with client-side refresh in api.ts
          path: '/',
        });
        // Set new _rt cookie (JS-accessible, 7 days)
        if (data.refreshToken) {
          response.cookies.set('_rt', data.refreshToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
          });
        }
        return response;
      }
    }
  } catch {
    // Refresh failed — fall through
  }
  return null;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
