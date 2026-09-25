import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createBucketItemSchema,
  bucketListQuerySchema,
} from '@/lib/bucket-list/bucket-list.validation';
import {
  listBucketItems,
  createBucketItem,
  BucketItemForbiddenError,
  BucketItemValidationError,
} from '@/lib/bucket-list/bucket-list.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      status: searchParams.get('status') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    };

    const queryResult = bucketListQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listBucketItems(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof BucketItemForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error listing bucket items:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching bucket list' },
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
    const result = createBucketItemSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid bucket item input';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const item = await createBucketItem(user.id, result.data);

    return NextResponse.json(
      {
        success: true,
        item,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BucketItemValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof BucketItemForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error creating bucket item:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating bucket item' },
      { status: 500 }
    );
  }
}
