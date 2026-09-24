import { prisma } from '@/lib/prisma';
import { NoteVisibility, Prisma } from '@prisma/client';
import crypto from 'crypto';
import {
  VoiceMemoryItem,
  VoiceListResponse,
  formatDuration,
} from './voice.types';
import {
  CreateVoiceInput,
  UpdateVoiceInput,
  VoiceQuery,
  MIME_TO_EXTENSION,
} from './voice.validation';
import { canViewVoiceMemory, canMutateVoiceMemory } from './voice.permissions';
import { getStorageProvider } from '@/lib/storage';

export class VoiceNotFoundError extends Error {
  constructor(message = 'Voice memory not found') {
    super(message);
    this.name = 'VoiceNotFoundError';
  }
}

export class VoiceForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'VoiceForbiddenError';
  }
}

const OWNER_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  role: true,
};

type PrismaVoiceWithRelations = Prisma.VoiceMemoryGetPayload<{
  include: { owner: { select: typeof OWNER_SELECT } };
}>;

function formatVoiceItem(
  memory: PrismaVoiceWithRelations,
  currentUserId: string
): VoiceMemoryItem {
  return {
    id: memory.id,
    title: memory.title,
    description: memory.description,
    visibility: memory.visibility,
    ownerId: memory.ownerId,
    owner: memory.owner,
    mimeType: memory.mimeType,
    sizeBytes: memory.sizeBytes,
    durationSeconds: memory.durationSeconds,
    formattedDuration: formatDuration(memory.durationSeconds),
    recordedAt: memory.recordedAt.toISOString(),
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
    isMine: memory.ownerId === currentUserId,
  };
}

/**
 * Lists voice memories visible to the authenticated user with strict database-level privacy filtering.
 */
export async function listVoiceMemories(
  userId: string,
  query: VoiceQuery
): Promise<VoiceListResponse> {
  const { search, filter = 'all', page = 1, limit = 12 } = query;

  // Strict base privacy guarantee: user can only see their own memories OR shared memories
  const basePrivacyCondition: Prisma.VoiceMemoryWhereInput = {
    OR: [{ ownerId: userId }, { visibility: NoteVisibility.SHARED }],
  };

  const andConditions: Prisma.VoiceMemoryWhereInput[] = [basePrivacyCondition];

  if (filter === 'shared') {
    andConditions.push({ visibility: NoteVisibility.SHARED });
  } else if (filter === 'private') {
    andConditions.push({ ownerId: userId, visibility: NoteVisibility.PRIVATE });
  } else if (filter === 'mine') {
    andConditions.push({ ownerId: userId });
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    andConditions.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.VoiceMemoryWhereInput = {
    AND: andConditions,
  };

  const skip = (page - 1) * limit;

  const [total, memories] = await Promise.all([
    prisma.voiceMemory.count({ where }),
    prisma.voiceMemory.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      include: {
        owner: { select: OWNER_SELECT },
      },
    }),
  ]);

  const items = memories.map((m) => formatVoiceItem(m as PrismaVoiceWithRelations, userId));
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves a single voice memory by ID.
 * Returns null if the memory does not exist or caller is unauthorized (preventing existence leakage).
 */
export async function getVoiceMemory(
  userId: string,
  id: string
): Promise<VoiceMemoryItem | null> {
  const memory = await prisma.voiceMemory.findUnique({
    where: { id },
    include: {
      owner: { select: OWNER_SELECT },
    },
  });

  if (!memory) return null;
  if (!canViewVoiceMemory(userId, memory)) return null;

  return formatVoiceItem(memory as PrismaVoiceWithRelations, userId);
}

/**
 * Uploads audio binary to storage provider and writes metadata to PostgreSQL.
 * If database persistence fails, the uploaded storage file is immediately cleaned up.
 */
export async function createVoiceMemory(
  userId: string,
  metadata: CreateVoiceInput,
  fileBuffer: Buffer,
  mimeType: string
): Promise<VoiceMemoryItem> {
  const storage = getStorageProvider();

  // Generate an unguessable storage key
  const ext = MIME_TO_EXTENSION[mimeType] || 'webm';
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const storageKey = `voice-memories/${userId}/${Date.now()}-${randomSuffix}.${ext}`;

  // Step 1: Upload to storage
  await storage.upload(storageKey, fileBuffer, mimeType);

  // Step 2: Persist metadata in PostgreSQL with cleanup rollback on failure
  try {
    const memory = await prisma.voiceMemory.create({
      data: {
        title: metadata.title,
        description: metadata.description || null,
        visibility: metadata.visibility,
        ownerId: userId,
        storageKey,
        mimeType,
        sizeBytes: fileBuffer.length,
        durationSeconds: metadata.durationSeconds,
        recordedAt: metadata.recordedAt ? new Date(metadata.recordedAt) : new Date(),
      },
      include: {
        owner: { select: OWNER_SELECT },
      },
    });

    return formatVoiceItem(memory as PrismaVoiceWithRelations, userId);
  } catch (dbError) {
    console.error('Database write failed after storage upload. Cleaning up file:', storageKey, dbError);
    // Cleanup storage object to prevent orphan files
    await storage.delete(storageKey).catch((cleanupErr) => {
      console.error('Failed to clean up storage object during rollback:', cleanupErr);
    });
    throw dbError;
  }
}

/**
 * Updates voice memory metadata (owner only).
 */
export async function updateVoiceMemory(
  userId: string,
  id: string,
  input: UpdateVoiceInput
): Promise<VoiceMemoryItem> {
  const existing = await prisma.voiceMemory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new VoiceNotFoundError();
  }

  if (!canViewVoiceMemory(userId, existing)) {
    throw new VoiceNotFoundError();
  }

  if (!canMutateVoiceMemory(userId, existing)) {
    throw new VoiceForbiddenError('Only the recording author may edit this voice memory');
  }

  const updated = await prisma.voiceMemory.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    },
    include: {
      owner: { select: OWNER_SELECT },
    },
  });

  return formatVoiceItem(updated as PrismaVoiceWithRelations, userId);
}

/**
 * Deletes voice memory from PostgreSQL and removes the audio file from storage.
 */
export async function deleteVoiceMemory(
  userId: string,
  id: string
): Promise<void> {
  const existing = await prisma.voiceMemory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new VoiceNotFoundError();
  }

  if (!canViewVoiceMemory(userId, existing)) {
    throw new VoiceNotFoundError();
  }

  if (!canMutateVoiceMemory(userId, existing)) {
    throw new VoiceForbiddenError('Only the recording author may delete this voice memory');
  }

  // Delete DB record first
  await prisma.voiceMemory.delete({
    where: { id },
  });

  // Delete storage object
  const storage = getStorageProvider();
  await storage.delete(existing.storageKey).catch((err) => {
    console.error('Failed to delete storage file:', existing.storageKey, err);
  });
}

/**
 * Generates a short-lived signed playback URL for the authorized user.
 */
export async function getPlaybackUrl(
  userId: string,
  id: string
): Promise<string> {
  const memory = await prisma.voiceMemory.findUnique({
    where: { id },
    select: { id: true, ownerId: true, visibility: true, storageKey: true },
  });

  if (!memory) {
    throw new VoiceNotFoundError();
  }

  if (!canViewVoiceMemory(userId, memory)) {
    throw new VoiceNotFoundError();
  }

  const storage = getStorageProvider();
  return await storage.getSignedPlaybackUrl(memory.storageKey, 300);
}

/**
 * Retrieves the latest shared voice memory for the Home dashboard.
 * Returns null if none exists.
 */
export async function getLatestSharedVoiceMemory(): Promise<VoiceMemoryItem | null> {
  const memory = await prisma.voiceMemory.findFirst({
    where: {
      visibility: NoteVisibility.SHARED,
    },
    orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      owner: { select: OWNER_SELECT },
    },
  });

  if (!memory) return null;
  return formatVoiceItem(memory as PrismaVoiceWithRelations, memory.ownerId);
}
