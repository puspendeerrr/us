import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/setup',
  '/api/auth/setup-status',
  '/api/voice/stream',
];
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/public'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('our_space_session')?.value;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // When visiting login page with leftover cookie, clear it
  if (pathname === '/login' && sessionToken) {
    const response = NextResponse.next();
    response.cookies.delete('our_space_session');
    return response;
  }

  // If user is not authenticated and attempts to access protected routes
  if (!sessionToken && !isPublicPath) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Otherwise redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.cookies.delete('our_space_session');
    redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return redirectRes;
  }

  const response = NextResponse.next();

  // Strict privacy: Prevent browser caching of any protected pages or authenticated API responses
  if (!isPublicPath) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
