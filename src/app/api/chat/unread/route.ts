import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUnreadCount } from '@/lib/chat/chat.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await getUnreadCount(user.id);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching unread count' },
      { status: 500 }
    );
  }
}
