import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  getSessionRecord,
  invalidateCurrentSession,
  type SessionUser,
} from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export interface AuthenticatedContext {
  user: SessionUser;
  partner: SessionUser | null;
}

/**
 * Retrieves the current authenticated user and partner strictly server-side.
 * Enforces the strict privacy policy:
 * - On full page reload or app reopen (top-level document request):
 *   Invalidates the server-side session, clears the cookie, and forces login.
 * - Client-side in-app transitions (RSC requests):
 *   Preserves the active session for normal, fast navigation.
 */
export const getAuthenticatedContext = cache(async (): Promise<AuthenticatedContext> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect('/login');
  }

  const session = await getSessionRecord(token);
  if (!session) {
    redirect('/login');
  }

  // Verify expiration against PostgreSQL timestamp
  if (Date.now() >= session.expiresAt.getTime()) {
    await invalidateCurrentSession();
    redirect('/login');
  }

  // Detect full page reload or cold-start app reopen vs client-side route navigation
  const headerList = await headers();
  const isRsc = headerList.get('rsc') === '1';
  const secFetchDest = headerList.get('sec-fetch-dest');
  const accept = headerList.get('accept') || '';
  const isDocumentNavigation = secFetchDest === 'document' || (!isRsc && accept.includes('text/html'));
  const isImmediateLoginTransition = Date.now() - session.createdAt.getTime() < 4000;

  if (isDocumentNavigation && !isImmediateLoginTransition) {
    await invalidateCurrentSession();
    redirect('/login');
  }

  const user = session.user;
  const partner = await prisma.user.findFirst({
    where: { id: { not: user.id } },
    select: {
      id: true,
      identifier: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      lastSeenAt: true,
    },
  });

  return { user, partner };
});
