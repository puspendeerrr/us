import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateVoiceMemorySchema } from '@/lib/voice/voice.validation';
import {
  getVoiceMemory,
  updateVoiceMemory,
  deleteVoiceMemory,
  VoiceNotFoundError,
  VoiceForbiddenError,
} from '@/lib/voice/voice.service';

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
    const memory = await getVoiceMemory(user.id, id);

    if (!memory) {
      return NextResponse.json({ error: 'Voice memory not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      voiceMemory: memory,
    });
  } catch (error) {
    console.error('Error fetching voice memory:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching voice memory' },
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
    const result = updateVoiceMemorySchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid update data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const updated = await updateVoiceMemory(user.id, id, result.data);

    return NextResponse.json({
      success: true,
      voiceMemory: updated,
    });
  } catch (error) {
    if (error instanceof VoiceNotFoundError) {
      return NextResponse.json({ error: 'Voice memory not found' }, { status: 404 });
    }
    if (error instanceof VoiceForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating voice memory:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating voice memory' },
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
    await deleteVoiceMemory(user.id, id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof VoiceNotFoundError) {
      return NextResponse.json({ error: 'Voice memory not found' }, { status: 404 });
    }
    if (error instanceof VoiceForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting voice memory:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting voice memory' },
      { status: 500 }
    );
  }
}
