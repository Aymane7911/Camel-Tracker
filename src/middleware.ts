// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedRoutes = ['/selection', '/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Auth routes (should redirect to selection if already logged in)
  const authRoutes = ['/auth/login', '/auth/register'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If accessing protected route without session
  if (isProtectedRoute && !sessionToken) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If accessing auth routes with valid session, redirect to selection
  if (isAuthRoute && sessionToken) {
    // Verify session is valid by checking with API
    try {
      const verifyResponse = await fetch(new URL('/api/auth/verify', request.url), {
        headers: {
          Cookie: `session=${sessionToken}`,
        },
      });

      if (verifyResponse.ok) {
        return NextResponse.redirect(new URL('/selection', request.url));
      }
    } catch (error) {
      // If verification fails, continue to auth page
      console.error('Session verification failed:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/selection/:path*',
    '/dashboard/:path*',
    '/auth/login',
    '/auth/register',
  ],
};