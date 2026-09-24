import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createVoiceMemorySchema,
  voiceQuerySchema,
  ALLOWED_AUDIO_MIME_TYPES,
  MAX_AUDIO_FILE_SIZE,
} from '@/lib/voice/voice.validation';
import { listVoiceMemories, createVoiceMemory } from '@/lib/voice/voice.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      search: searchParams.get('search') ?? undefined,
      filter: searchParams.get('filter') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const queryResult = voiceQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const firstIssue = queryResult.error.issues[0]?.message || 'Invalid query parameters';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const result = await listVoiceMemories(user.id, queryResult.data);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error listing voice memories:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching voice memories' },
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

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_AUDIO_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Audio file exceeds 25 MB maximum limit' },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Failed to process audio upload. File may exceed maximum allowed size.' },
        { status: 400 }
      );
    }

    const file = formData.get('audio') as File | null;
    const title = formData.get('title') as string | null;
    const description = (formData.get('description') as string | null) || undefined;
    const visibility = formData.get('visibility') as string | null;
    const durationSeconds = formData.get('durationSeconds') as string | null;
    const recordedAt = (formData.get('recordedAt') as string | null) || undefined;

    // Validate metadata
    const validationResult = createVoiceMemorySchema.safeParse({
      title: title ?? '',
      description: description ?? null,
      visibility,
      durationSeconds,
      recordedAt,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0]?.message || 'Invalid voice memory metadata';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Audio file exceeds 25 MB maximum limit' },
        { status: 400 }
      );
    }

    const mimeType = file.type.toLowerCase();
    const isAllowedMime = ALLOWED_AUDIO_MIME_TYPES.some((type) =>
      mimeType.startsWith(type) || type === mimeType
    );

    if (!isAllowedMime && !mimeType.includes('audio')) {
      return NextResponse.json(
        { error: `Unsupported audio format (${mimeType}). Supported formats: webm, ogg, mp4, mp3, wav, m4a, aac` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const voiceMemory = await createVoiceMemory(
      user.id,
      validationResult.data,
      buffer,
      mimeType || 'audio/webm'
    );

    return NextResponse.json(
      {
        success: true,
        voiceMemory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating voice memory:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving voice memory' },
      { status: 500 }
    );
  }
}
