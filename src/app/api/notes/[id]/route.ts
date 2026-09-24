import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateNoteSchema } from '@/lib/notes/notes.validation';
import {
  getNote,
  updateNote,
  deleteNote,
  NoteNotFoundError,
  NoteForbiddenError,
} from '@/lib/notes/notes.service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const note = await getNote(user.id, id);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching note' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateNoteSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid note update data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updated = await updateNote(user.id, id, result.data);

    return NextResponse.json({
      success: true,
      note: updated,
    });
  } catch (error) {
    if (error instanceof NoteNotFoundError) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    if (error instanceof NoteForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteNote(user.id, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof NoteNotFoundError) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    if (error instanceof NoteForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting note' },
      { status: 500 }
    );
  }
}
