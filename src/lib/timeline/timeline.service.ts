import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type {
  TimelineEventDetail,
  TimelineQueryParams,
  TimelineListResponse,
  CreateTimelineEventInput,
  UpdateTimelineEventInput,
} from './timeline.types';

export class TimelineNotFoundError extends Error {
  constructor(message = 'Timeline event not found.') {
    super(message);
    this.name = 'TimelineNotFoundError';
  }
}

export class TimelineForbiddenError extends Error {
  constructor(message = 'You do not have permission to access timeline events.') {
    super(message);
    this.name = 'TimelineForbiddenError';
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

function toTimelineEventDetail(entry: any, currentUserId: string): TimelineEventDetail {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    date: entry.date instanceof Date ? entry.date.toISOString() : new Date(entry.date).toISOString(),
    category: entry.category,
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
 * Creates a shared Timeline event for the couple.
 */
export async function createTimelineEvent(
  userId: string,
  input: CreateTimelineEventInput
): Promise<TimelineEventDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new TimelineForbiddenError();
  }

  const parsedDate = new Date(input.date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date provided.');
  }

  const created = await prisma.timelineEvent.create({
    data: {
      title: input.title,
      description: input.description && input.description.trim().length > 0 ? input.description.trim() : null,
      date: parsedDate,
      category: input.category,
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

  return toTimelineEventDetail(created, userId);
}

/**
 * Fetches a single Timeline event by ID.
 */
export async function getTimelineEvent(
  userId: string,
  id: string
): Promise<TimelineEventDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new TimelineForbiddenError();
  }

  const coupleUserIds = await getCoupleUserIds();

  const entry = await prisma.timelineEvent.findUnique({
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
    throw new TimelineNotFoundError();
  }

  return toTimelineEventDetail(entry, userId);
}

/**
 * Updates a shared Timeline event. Both partners in the couple can edit shared events.
 */
export async function updateTimelineEvent(
  userId: string,
  id: string,
  input: UpdateTimelineEventInput
): Promise<TimelineEventDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new TimelineForbiddenError();
  }

  const coupleUserIds = await getCoupleUserIds();

  const existing = await prisma.timelineEvent.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });

  if (!existing || !coupleUserIds.includes(existing.createdById)) {
    throw new TimelineNotFoundError();
  }

  const updateData: Prisma.TimelineEventUpdateInput = {};

  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description && input.description.trim().length > 0 ? input.description.trim() : null;
  }
  if (input.date !== undefined) {
    const parsedDate = new Date(input.date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided.');
    }
    updateData.date = parsedDate;
  }
  if (input.category !== undefined) {
    updateData.category = input.category;
  }

  const updated = await prisma.timelineEvent.update({
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

  return toTimelineEventDetail(updated, userId);
}

/**
 * Deletes a shared Timeline event. Both partners in the couple can delete shared events.
 */
export async function deleteTimelineEvent(
  userId: string,
  id: string
): Promise<boolean> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new TimelineForbiddenError();
  }

  const coupleUserIds = await getCoupleUserIds();

  const existing = await prisma.timelineEvent.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });

  if (!existing || !coupleUserIds.includes(existing.createdById)) {
    throw new TimelineNotFoundError();
  }

  await prisma.timelineEvent.delete({
    where: { id },
  });

  return true;
}

/**
 * Lists shared Timeline events with category filtering, search, and deterministic sorting.
 */
export async function listTimelineEvents(
  userId: string,
  params: TimelineQueryParams
): Promise<TimelineListResponse> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new TimelineForbiddenError();
  }

  const coupleUserIds = await getCoupleUserIds();

  const andConditions: Prisma.TimelineEventWhereInput[] = [
    {
      createdById: { in: coupleUserIds },
    },
  ];

  if (params.category) {
    andConditions.push({ category: params.category });
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    andConditions.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.TimelineEventWhereInput = {
    AND: andConditions,
  };

  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const sortDirection = params.order === 'asc' ? 'asc' : 'desc';

  const [total, events] = await Promise.all([
    prisma.timelineEvent.count({ where }),
    prisma.timelineEvent.findMany({
      where,
      orderBy: [
        { date: sortDirection },
        { createdAt: sortDirection },
        { id: sortDirection },
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
    items: events.map((e) => toTimelineEventDetail(e, userId)),
    total,
  };
}

/**
 * Returns the latest shared Timeline event for the couple, used in Home Dashboard widget.
 */
export async function getLatestTimelineEvent(
  userId: string
): Promise<{ title: string; eventDate: string; category?: string | null } | null> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) return null;

  const coupleUserIds = await getCoupleUserIds();

  const latest = await prisma.timelineEvent.findFirst({
    where: {
      createdById: { in: coupleUserIds },
    },
    orderBy: [
      { date: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      title: true,
      date: true,
      category: true,
    },
  });

  if (!latest) return null;

  const dateObj = new Date(latest.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    title: latest.title,
    eventDate: formattedDate,
    category: latest.category,
  };
}
