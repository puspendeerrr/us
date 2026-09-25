import { NextResponse } from 'next/server';
import { invalidateCurrentSession } from '@/lib/auth/session';

export async function POST() {
  try {
    await invalidateCurrentSession();
    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}
