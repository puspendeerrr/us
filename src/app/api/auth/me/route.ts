import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve partner in the dual-user relationship
    const partner = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
      },
      select: {
        id: true,
        identifier: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        lastSeenAt: true,
      },
    });

    return NextResponse.json({
      user,
      partner: partner ?? null,
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
