import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type {
  MoodEntryDetail,
  MoodQueryParams,
  MoodListResponse,
  CreateMoodInput,
  UpdateMoodInput,
} from './mood.types';

export class MoodNotFoundError extends Error {
  constructor(message = 'Mood entry not found.') {
    super(message);
    this.name = 'MoodNotFoundError';
  }
}

export class MoodForbiddenError extends Error {
  constructor(message = 'You do not have permission to access this mood entry.') {
    super(message);
    this.name = 'MoodForbiddenError';
  }
}

/**
 * Returns all configured couple user IDs.
 */
async function getCoupleUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Ensures user belongs to the configured two-person couple.
 */
async function isCoupleMember(userId: string): Promise<boolean> {
  const coupleUserIds = await getCoupleUserIds();
  return coupleUserIds.includes(userId);
}

function toMoodEntryDetail(entry: any, currentUserId: string): MoodEntryDetail {
  return {
    id: entry.id,
    mood: entry.mood,
    note: entry.note,
    date: entry.date instanceof Date ? entry.date.toISOString() : new Date(entry.date).toISOString(),
    visibility: entry.visibility,
    createdById: entry.createdById,
    createdBy: {
      id: entry.createdBy.id,
      displayName: entry.createdBy.displayName,
      identifier: entry.createdBy.identifier,
    },
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : new Date(entry.createdAt).toISOString(),
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : new Date(entry.updatedAt).toISOString(),
    isOwn: entry.createdById === currentUserId,
  };
}

/**
 * Creates a new Mood entry for the authenticated user.
 */
export async function createMoodEntry(
  userId: string,
  input: CreateMoodInput
): Promise<MoodEntryDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new MoodForbiddenError();
  }

  const parsedDate = new Date(input.date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date provided.');
  }

  const created = await prisma.moodEntry.create({
    data: {
      mood: input.mood,
      note: input.note || null,
      date: parsedDate,
      visibility: input.visibility,
      createdById: userId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          displayName: true,
          identifier: true,
        },
      },
    },
  });

  return toMoodEntryDetail(created, userId);
}

/**
 * Fetches a single Mood entry by ID with strict privacy enforcement.
 * If the entry is PRIVATE and does not belong to the requesting user,
 * it returns MoodNotFoundError to avoid leaking the existence of the entry.
 */
export async function getMoodEntry(
  userId: string,
  id: string
): Promise<MoodEntryDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new MoodForbiddenError();
  }

  const coupleUserIds = await getCoupleUserIds();

  const entry = await prisma.moodEntry.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          displayName: true,
          identifier: true,
        },
      },
    },
  });

  if (!entry || !coupleUserIds.includes(entry.createdById)) {
    throw new MoodNotFoundError();
  }

  // Strict privacy rule: if entry is private and not authored by requesting user, hide it completely
  if (entry.visibility === 'PRIVATE' && entry.createdById !== userId) {
    throw new MoodNotFoundError();
  }

  return toMoodEntryDetail(entry, userId);
}

/**
 * Updates an existing Mood entry. Only the author may edit their own entry.
 */
export async function updateMoodEntry(
  userId: string,
  id: string,
  input: UpdateMoodInput
): Promise<MoodEntryDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new MoodForbiddenError();
  }

  const existing = await prisma.moodEntry.findUnique({
    where: { id },
    select: { id: true, createdById: true, visibility: true },
  });

  if (!existing) {
    throw new MoodNotFoundError();
  }

  // If private and belongs to someone else, 404 to avoid leaking existence
  if (existing.visibility === 'PRIVATE' && existing.createdById !== userId) {
    throw new MoodNotFoundError();
  }

  // Author-only editing rule
  if (existing.createdById !== userId) {
    throw new MoodForbiddenError('You can only edit your own mood entries.');
  }

  const updateData: Prisma.MoodEntryUpdateInput = {};

  if (input.mood !== undefined) {
    updateData.mood = input.mood;
  }
  if (input.note !== undefined) {
    updateData.note = input.note || null;
  }
  if (input.date !== undefined) {
    const parsedDate = new Date(input.date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided.');
    }
    updateData.date = parsedDate;
  }
  if (input.visibility !== undefined) {
    updateData.visibility = input.visibility;
  }

  const updated = await prisma.moodEntry.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: {
          id: true,
          displayName: true,
          identifier: true,
        },
      },
    },
  });

  return toMoodEntryDetail(updated, userId);
}

/**
 * Deletes a Mood entry. Only the author may delete their own entry.
 */
export async function deleteMoodEntry(
  userId: string,
  id: string
): Promise<boolean> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new MoodForbiddenError();
  }

  const existing = await prisma.moodEntry.findUnique({
    where: { id },
    select: { id: true, createdById: true, visibility: true },
  });

  if (!existing) {
    throw new MoodNotFoundError();
  }

  // If private and belongs to someone else, 404
  if (existing.visibility === 'PRIVATE' && existing.createdById !== userId) {
    throw new MoodNotFoundError();
  }

  // Author-only deletion rule
  if (existing.createdById !== userId) {
    throw new MoodForbiddenError('You can only delete your own mood entries.');
  }

  await prisma.moodEntry.delete({
    where: { id },
  });

  return true;
}

/**
 * Lists Mood entries with MANDATORY DATABASE-LEVEL PRIVACY GUARANTEE:
 * Returns:
 * 1. Current user's own entries (both SHARED and PRIVATE)
 * 2. Partner's SHARED entries
 * NEVER returns or leaks partner's PRIVATE entries.
 */
export async function listMoodEntries(
  userId: string,
  params: MoodQueryParams
): Promise<MoodListResponse> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new MoodForbiddenError();
  }

  const coupleUserIds = await getCoupleUserIds();

  // Core Privacy Clause: restricted to couple users, and either own entry or SHARED entry
  const andConditions: Prisma.MoodEntryWhereInput[] = [
    {
      createdById: { in: coupleUserIds },
    },
    {
      OR: [
        { createdById: userId },
        { visibility: 'SHARED' },
      ],
    },
  ];

  // Specific mood filter
  if (params.mood) {
    andConditions.push({ mood: params.mood });
  }

  // Visibility filter
  if (params.visibility === 'PRIVATE') {
    // Current user can only filter their OWN private entries
    andConditions.push({
      createdById: userId,
      visibility: 'PRIVATE',
    });
  } else if (params.visibility === 'SHARED') {
    andConditions.push({
      visibility: 'SHARED',
    });
  }

  // Date filtering
  if (params.date) {
    const target = new Date(params.date);
    if (!isNaN(target.getTime())) {
      const startOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999));
      andConditions.push({
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      });
    }
  } else if (params.startDate || params.endDate) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (params.startDate) {
      const s = new Date(params.startDate);
      if (!isNaN(s.getTime())) dateRange.gte = s;
    }
    if (params.endDate) {
      const e = new Date(params.endDate);
      if (!isNaN(e.getTime())) dateRange.lte = e;
    }
    if (dateRange.gte || dateRange.lte) {
      andConditions.push({ date: dateRange });
    }
  }

  // Search across note text (strictly within authorized visible entries)
  if (params.search && params.search.trim()) {
    andConditions.push({
      note: {
        contains: params.search.trim(),
        mode: 'insensitive',
      },
    });
  }

  const where: Prisma.MoodEntryWhereInput = {
    AND: andConditions,
  };

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const [total, entries] = await Promise.all([
    prisma.moodEntry.count({ where }),
    prisma.moodEntry.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit,
      skip: offset,
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            identifier: true,
          },
        },
      },
    }),
  ]);

  return {
    items: entries.map((e) => toMoodEntryDetail(e, userId)),
    total,
  };
}

/**
 * Returns the current authenticated user's latest mood entry logged for today.
 * Strictly queries `createdById: userId` — 100% immune to partner private leakage.
 */
export async function getCurrentUserTodayMood(
  userId: string
): Promise<{ mood: string; note?: string | null } | null> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) return null;

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const entry = await prisma.moodEntry.findFirst({
    where: {
      createdById: userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
    select: {
      mood: true,
      note: true,
    },
  });

  if (!entry) return null;

  return {
    mood: entry.mood,
    note: entry.note,
  };
}
