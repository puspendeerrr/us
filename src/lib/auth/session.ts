import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'our_space_session';
// Privacy-first session lifetime: 2 hours max lifetime instead of 30 days
export const SESSION_DURATION_HOURS = 2;

export interface SessionUser {
  id: string;
  identifier: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  lastSeenAt: Date;
}

/**
 * Generates a high-entropy cryptographically secure random session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Creates a database session record for the given user with privacy-oriented expiration.
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Fetches the full session database record.
 */
export async function getSessionRecord(token: string) {
  return await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: {
          id: true,
          identifier: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          lastSeenAt: true,
        },
      },
    },
  });
}

/**
 * Validates a session token against the database and returns the authenticated user if valid.
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const session = await getSessionRecord(token);

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => null);
    return null;
  }

  return session.user;
}

/**
 * Retrieves the currently authenticated user from the HTTP-only cookie.
 * Always derived server-side. Wrapped with React.cache to eliminate duplicate lookups per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return validateSessionToken(token);
});

/**
 * Sets the session cookie in HTTP-only mode.
 * Privacy-focused: Does not set a 30-day persistent expiration, allowing browsers/PWAs
 * to discard the session cookie when the application is closed.
 */
export async function setSessionCookie(token: string, expiresAt?: Date): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  const sameSite = (process.env.COOKIE_SAME_SITE as 'lax' | 'none' | 'strict') || 'lax';

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSite,
    domain: cookieDomain,
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 3600,
  });
}

/**
 * Invalidates a specific session by token directly from the database and terminates Socket.IO connections.
 */
export async function invalidateSessionToken(token: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: { userId: true },
  }).catch(() => null);

  await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => null);

  if (session?.userId) {
    try {
      const { disconnectUserSockets } = await import('@/server/socket-server');
      disconnectUserSockets(session.userId);
    } catch {
      // In case socket server is standalone
    }
  }
}

/**
 * Invalidates the current session from both the database and the cookie, disconnecting active sockets.
 * Fully idempotent.
 */
export async function invalidateCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  if (token) {
    await invalidateSessionToken(token);
  }

  try {
    cookieStore.delete({
      name: SESSION_COOKIE_NAME,
      domain: cookieDomain,
      path: '/',
    });
  } catch {
    // In Server Components, cookies cannot be mutated directly;
    // session is deleted in PostgreSQL and cookie is cleared on proxy/route handlers.
  }
}
