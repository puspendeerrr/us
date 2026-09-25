import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createLetterSchema,
  letterQuerySchema,
} from '@/lib/letters/letters.validation';
import {
  listLetters,
  createLetter,
  LetterValidationError,
} from '@/lib/letters/letters.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      tab: searchParams.get('tab') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    };

    const queryResult = letterQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listLetters(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing letters:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching letters' },
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
    const result = createLetterSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid letter data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const letter = await createLetter(user.id, result.data);

    return NextResponse.json(
      {
        success: true,
        letter,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof LetterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating letter:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating letter' },
      { status: 500 }
    );
  }
}
