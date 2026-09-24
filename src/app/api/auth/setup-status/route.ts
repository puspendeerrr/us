import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      isSetupComplete: userCount >= 2,
      userCount,
    });
  } catch (error) {
    console.error('Setup status error:', error);
    return NextResponse.json({ error: 'Failed to check setup status' }, { status: 500 });
  }
}
