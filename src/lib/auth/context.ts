import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, type SessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export interface AuthenticatedContext {
  user: SessionUser;
  partner: SessionUser | null;
}

/**
 * Retrieves the current authenticated user and partner strictly server-side.
 * If not authenticated, redirects directly to /login.
 * Wrapped with React.cache to guarantee zero duplicate queries across layouts and pages per request.
 */
export const getAuthenticatedContext = cache(async (): Promise<AuthenticatedContext> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

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
