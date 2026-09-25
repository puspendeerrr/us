import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createMoodSchema,
  moodQuerySchema,
} from '@/lib/moods/mood.validation';
import {
  listMoodEntries,
  createMoodEntry,
  MoodForbiddenError,
} from '@/lib/moods/mood.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      date: searchParams.get('date') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      mood: searchParams.get('mood') ?? undefined,
      visibility: searchParams.get('visibility') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    };

    const queryResult = moodQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listMoodEntries(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof MoodForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error listing mood entries:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching mood entries.' },
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

    const parseResult = createMoodSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const item = await createMoodEntry(user.id, parseResult.data);
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof MoodForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating mood entry:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred while saving mood entry.' },
      { status: 500 }
    );
  }
}
