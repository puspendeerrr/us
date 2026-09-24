import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { toggleReactionSchema } from '@/lib/chat/chat.validation';
import { toggleReaction, ChatNotFoundError, ChatForbiddenError } from '@/lib/chat/chat.service';
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
    const body = await request.json();
    const result = toggleReactionSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid reaction type';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updatedMessage = await toggleReaction(user.id, id, result.data.reaction);

    await broadcastToCoupleRoom(user.id, 'message:reaction_updated', updatedMessage);

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
    console.error('Error toggling reaction:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while toggling reaction' },
      { status: 500 }
    );
  }
}
