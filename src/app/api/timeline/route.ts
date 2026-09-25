import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createTimelineEventSchema,
  timelineQuerySchema,
} from '@/lib/timeline/timeline.validation';
import {
  listTimelineEvents,
  createTimelineEvent,
  TimelineForbiddenError,
} from '@/lib/timeline/timeline.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      order: searchParams.get('order') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    };

    const queryResult = timelineQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listTimelineEvents(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof TimelineForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error listing timeline events:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching timeline events.' },
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = createTimelineEventSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const item = await createTimelineEvent(user.id, parseResult.data);
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof TimelineForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating timeline event:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred while creating timeline event.' },
      { status: 500 }
    );
  }
}
