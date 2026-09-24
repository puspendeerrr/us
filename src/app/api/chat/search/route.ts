import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { chatSearchQuerySchema } from '@/lib/chat/chat.validation';
import { searchMessages } from '@/lib/chat/chat.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      q: searchParams.get('q') ?? '',
      limit: searchParams.get('limit') ?? undefined,
    };

    const queryResult = chatSearchQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid search query';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const messages = await searchMessages(user.id, queryResult.data.q, queryResult.data.limit);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error searching chat messages:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while searching messages' },
      { status: 500 }
    );
  }
}
