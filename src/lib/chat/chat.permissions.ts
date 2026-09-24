import { prisma } from '@/lib/prisma';

/**
 * Returns the deterministic Socket.IO room ID for the two partners.
 * Deterministic: sorted user IDs joined by underscore.
 */
export function getDeterministicRoomId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `couple_${sorted[0]}_${sorted[1]}`;
}

/**
 * Checks whether a user is an authenticated partner in this relationship.
 */
export async function isCoupleMember(userId: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return !!user;
}

/**
 * Retrieves the other partner in the two-person relationship.
 */
export async function getPartner(currentUserId: string): Promise<{
  id: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: Date;
} | null> {
  const partner = await prisma.user.findFirst({
    where: {
      id: { not: currentUserId },
    },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      lastSeenAt: true,
    },
  });
  return partner;
}

/**
 * Checks whether a user has permission to mutate (delete) a message.
 * Strictly author-only.
 */
export function canMutateMessage(userId: string, message: { senderId: string }): boolean {
  if (!userId || !message) return false;
  return message.senderId === userId;
}
