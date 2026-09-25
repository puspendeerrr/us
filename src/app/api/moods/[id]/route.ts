import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateMoodSchema } from '@/lib/moods/mood.validation';
import {
  getMoodEntry,
  updateMoodEntry,
  deleteMoodEntry,
  MoodNotFoundError,
  MoodForbiddenError,
} from '@/lib/moods/mood.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const item = await getMoodEntry(user.id, id);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    if (error instanceof MoodNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MoodForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching mood entry:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the mood entry.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = updateMoodSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const item = await updateMoodEntry(user.id, id, parseResult.data);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    if (error instanceof MoodNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MoodForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating mood entry:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the mood entry.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteMoodEntry(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MoodNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MoodForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting mood entry:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the mood entry.' },
      { status: 500 }
    );
  }
}
