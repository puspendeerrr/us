import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createNoteSchema, notesQuerySchema } from '@/lib/notes/notes.validation';
import { listNotes, createNote } from '@/lib/notes/notes.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      search: searchParams.get('search') ?? undefined,
      filter: searchParams.get('filter') ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const queryResult = notesQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listNotes(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing notes:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching notes' },
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
    const result = createNoteSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid note data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const note = await createNote(user.id, result.data);

    return NextResponse.json(
      {
        success: true,
        note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating note' },
      { status: 500 }
    );
  }
}
