import { NextResponse } from 'next/server';
import { invalidateCurrentSession } from '@/lib/auth/session';

export async function POST() {
  try {
    await invalidateCurrentSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}
