import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getPlaybackUrl, VoiceNotFoundError, VoiceForbiddenError } from '@/lib/voice/voice.service';

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
    const playbackUrl = await getPlaybackUrl(user.id, id);

    return NextResponse.json({
      success: true,
      playbackUrl,
    });
  } catch (error) {
    if (error instanceof VoiceNotFoundError) {
      return NextResponse.json({ error: 'Voice memory not found' }, { status: 404 });
    }
    if (error instanceof VoiceForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error generating playback URL:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating playback URL' },
      { status: 500 }
    );
  }
}
