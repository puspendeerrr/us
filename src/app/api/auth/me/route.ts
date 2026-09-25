import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res;
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

    const res = NextResponse.json({
      user,
      partner: partner ?? null,
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
