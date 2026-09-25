import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  openLetter,
  LetterNotFoundError,
  LetterForbiddenError,
} from '@/lib/letters/letters.service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const letter = await openLetter(user.id, id);

    return NextResponse.json({
      success: true,
      letter,
    });
  } catch (error) {
    if (error instanceof LetterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof LetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error opening letter:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while opening letter' },
      { status: 500 }
    );
  }
}
