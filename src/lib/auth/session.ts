import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'our_space_session';
export const SESSION_DURATION_DAYS = 30;

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
 * Creates a database session record for the given user.
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

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
 * Validates a session token against the database and returns the authenticated user if valid.
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
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

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => null);
    return null;
  }

  return session.user;
}

import { cache } from 'react';

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
 * Supports configurable COOKIE_DOMAIN for cross-subdomain architecture (e.g. .puspender.in)
 * and secure SameSite defaults.
 */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
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
    expires: expiresAt,
  });
}

/**
 * Invalidates the current session from both the database and the cookie.
 */
export async function invalidateCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  if (token) {
    await prisma.session.delete({ where: { sessionToken: token } }).catch(() => null);
    cookieStore.delete({
      name: SESSION_COOKIE_NAME,
      domain: cookieDomain,
      path: '/',
    });
  }
}
