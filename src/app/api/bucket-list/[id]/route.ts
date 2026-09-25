import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateBucketItemSchema } from '@/lib/bucket-list/bucket-list.validation';
import {
  getBucketItem,
  updateBucketItem,
  deleteBucketItem,
  BucketItemNotFoundError,
  BucketItemForbiddenError,
  BucketItemValidationError,
} from '@/lib/bucket-list/bucket-list.service';

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
    const item = await getBucketItem(user.id, id);

    if (!item) {
      return NextResponse.json({ error: 'Bucket item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    if (error instanceof BucketItemForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching bucket item:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching bucket item' },
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
    const result = updateBucketItemSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid update data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updated = await updateBucketItem(user.id, id, result.data);

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (error) {
    if (error instanceof BucketItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof BucketItemForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof BucketItemValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating bucket item:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating bucket item' },
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
    await deleteBucketItem(user.id, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof BucketItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof BucketItemForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting bucket item:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting bucket item' },
      { status: 500 }
    );
  }
}
