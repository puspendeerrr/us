import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { relationshipSettingsSchema } from '@/lib/relationship/relationship.validation';
import {
  getRelationshipSettings,
  updateRelationshipSettings,
} from '@/lib/relationship/relationship.service';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getRelationshipSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching relationship settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationship settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = relationshipSettingsSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid relationship settings';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updated = await updateRelationshipSettings(result.data);

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (error) {
    console.error('Error updating relationship settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving relationship settings' },
      { status: 500 }
    );
  }
}
