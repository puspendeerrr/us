import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  listNoteRevisions,
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
    const revisions = await listNoteRevisions(user.id, id);

    return NextResponse.json({
      success: true,
      revisions,
    });
  } catch (error) {
    if (error instanceof NoteNotFoundError) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    if (error instanceof NoteForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching note revisions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching revisions' },
      { status: 500 }
    );
  }
}
