import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateTimelineEventSchema } from '@/lib/timeline/timeline.validation';
import {
  getTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
  TimelineNotFoundError,
  TimelineForbiddenError,
} from '@/lib/timeline/timeline.service';

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
    const item = await getTimelineEvent(user.id, id);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    if (error instanceof TimelineNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TimelineForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching timeline event:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the timeline event.' },
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

    const parseResult = updateTimelineEventSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const item = await updateTimelineEvent(user.id, id, parseResult.data);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    if (error instanceof TimelineNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TimelineForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating timeline event:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the timeline event.' },
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
    await deleteTimelineEvent(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TimelineNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TimelineForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting timeline event:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the timeline event.' },
      { status: 500 }
    );
  }
}
