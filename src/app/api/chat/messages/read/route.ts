import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { markMessagesRead } from '@/lib/chat/chat.service';
import { broadcastToCoupleRoom } from '@/lib/chat/chat.broadcast';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const messageIds = Array.isArray(body?.messageIds) ? body.messageIds : undefined;

    const result = await markMessagesRead(user.id, messageIds);

    if (result.count > 0) {
      await broadcastToCoupleRoom(user.id, 'message:read_receipt', {
        readerId: user.id,
        messageIds,
        readAt: result.readAt,
        count: result.count,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error marking messages read:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while marking messages as read' },
      { status: 500 }
    );
  }
}
