import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateImportantDateSchema } from '@/lib/dates/dates.validation';
import {
  getImportantDate,
  updateImportantDate,
  deleteImportantDate,
  ImportantDateNotFoundError,
  ImportantDateForbiddenError,
  ImportantDateValidationError,
} from '@/lib/dates/dates.service';

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
    const date = await getImportantDate(user.id, id);

    if (!date) {
      return NextResponse.json({ error: 'Important date not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      date,
    });
  } catch (error) {
    if (error instanceof ImportantDateForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching important date:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching date' },
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
    const result = updateImportantDateSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid date update data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updated = await updateImportantDate(user.id, id, result.data);

    return NextResponse.json({
      success: true,
      date: updated,
    });
  } catch (error) {
    if (error instanceof ImportantDateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ImportantDateForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ImportantDateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating important date:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating date' },
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
    await deleteImportantDate(user.id, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof ImportantDateNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ImportantDateForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting important date:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting date' },
      { status: 500 }
    );
  }
}
