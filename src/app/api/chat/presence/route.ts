import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partner = await prisma.user.findFirst({
    where: { id: { not: user.id } },
    select: {
      id: true,
      displayName: true,
      lastSeenAt: true,
    },
  });

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  let isOnline = false;
  try {
    const socketPort = process.env.PORT || process.env.SOCKET_PORT || 3001;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://127.0.0.1:${socketPort}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 800);
    const res = await fetch(`${socketUrl.replace(/\/$/, '')}/presence?userId=${partner.id}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      isOnline = Boolean(data.isOnline);
    }
  } catch {
    // If standalone socket server is not reachable, default to DB presence
  }

  return NextResponse.json({
    partner: {
      id: partner.id,
      displayName: partner.displayName,
      isOnline,
      lastSeenAt: partner.lastSeenAt,
    },
  });
}
