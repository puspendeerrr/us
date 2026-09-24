import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/setup',
  '/api/auth/login',
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

  // Allow root / to be handled by app/page.tsx with database-backed routing

  // If user is already authenticated and visits login page, redirect to /home
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
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
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
