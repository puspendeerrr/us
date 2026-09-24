import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteMessage, ChatNotFoundError, ChatForbiddenError } from '@/lib/chat/chat.service';
import { broadcastToCoupleRoom } from '@/lib/chat/chat.broadcast';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const updatedMessage = await deleteMessage(user.id, id);

    await broadcastToCoupleRoom(user.id, 'message:deleted', updatedMessage);

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    if (error instanceof ChatNotFoundError) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (error instanceof ChatForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting message' },
      { status: 500 }
    );
  }
}
