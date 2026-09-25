import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateLetterSchema } from '@/lib/letters/letters.validation';
import {
  getLetter,
  updateLetter,
  deleteLetter,
  LetterNotFoundError,
  LetterForbiddenError,
  LetterValidationError,
} from '@/lib/letters/letters.service';

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
    const letter = await getLetter(user.id, id);

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      letter,
    });
  } catch (error) {
    console.error('Error fetching letter:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching letter' },
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
    const result = updateLetterSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid letter update data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updated = await updateLetter(user.id, id, result.data);

    return NextResponse.json({
      success: true,
      letter: updated,
    });
  } catch (error) {
    if (error instanceof LetterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof LetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof LetterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating letter:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating letter' },
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
    await deleteLetter(user.id, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof LetterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof LetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting letter:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting letter' },
      { status: 500 }
    );
  }
}
