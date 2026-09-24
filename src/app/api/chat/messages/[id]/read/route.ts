import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { markMessagesRead } from '@/lib/chat/chat.service';
import { broadcastToCoupleRoom } from '@/lib/chat/chat.broadcast';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await markMessagesRead(user.id, [id]);

    if (result.count > 0) {
      await broadcastToCoupleRoom(user.id, 'message:read_receipt', {
        readerId: user.id,
        messageIds: [id],
        readAt: result.readAt,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error marking message read:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while marking message as read' },
      { status: 500 }
    );
  }
}
