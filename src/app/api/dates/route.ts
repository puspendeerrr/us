import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createImportantDateSchema,
  datesQuerySchema,
} from '@/lib/dates/dates.validation';
import {
  listImportantDates,
  createImportantDate,
  ImportantDateValidationError,
  ImportantDateForbiddenError,
} from '@/lib/dates/dates.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      tab: searchParams.get('tab') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    };

    const queryResult = datesQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listImportantDates(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ImportantDateForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error listing important dates:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching dates' },
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
    const result = createImportantDateSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid date input';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const date = await createImportantDate(user.id, result.data);

    return NextResponse.json(
      {
        success: true,
        date,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ImportantDateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ImportantDateForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating important date:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating date' },
      { status: 500 }
    );
  }
}
