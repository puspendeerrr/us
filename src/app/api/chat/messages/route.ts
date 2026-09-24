import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sendMessageSchema, chatHistoryQuerySchema } from '@/lib/chat/chat.validation';
import { getChatHistory, sendMessage, ChatNotFoundError, ChatForbiddenError } from '@/lib/chat/chat.service';
import { broadcastToCoupleRoom } from '@/lib/chat/chat.broadcast';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const queryResult = chatHistoryQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await getChatHistory(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching chat history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid message data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const message = await sendMessage(user.id, result.data);

    // Broadcast in real-time if socket server is active
    await broadcastToCoupleRoom(user.id, 'message:new', message);

    return NextResponse.json(
      {
        success: true,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ChatNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ChatForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while sending message' },
      { status: 500 }
    );
  }
}
