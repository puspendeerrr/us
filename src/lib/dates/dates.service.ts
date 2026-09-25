import { prisma } from '@/lib/prisma';
import { isCoupleMember } from '@/lib/chat/chat.permissions';
import {
  ImportantDateItem,
  ImportantDatesListResponse,
  DateCategory,
} from './dates.types';
import {
  CreateImportantDateInput,
  UpdateImportantDateInput,
  DatesQueryParams,
} from './dates.validation';
import { computeDateOccurrences } from './dates.utils';

export class ImportantDateNotFoundError extends Error {
  constructor(message = 'Important date not found') {
    super(message);
    this.name = 'ImportantDateNotFoundError';
  }
}

export class ImportantDateForbiddenError extends Error {
  constructor(message = 'You do not have permission to access relationship dates') {
    super(message);
    this.name = 'ImportantDateForbiddenError';
  }
}

export class ImportantDateValidationError extends Error {
  constructor(message = 'Validation error') {
    super(message);
    this.name = 'ImportantDateValidationError';
  }
}

const DATE_SELECT = {
  id: true,
  title: true,
  description: true,
  date: true,
  category: true,
  recursAnnually: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      displayName: true,
    },
  },
} as const;

function formatImportantDate(
  record: {
    id: string;
    title: string;
    description: string | null;
    date: Date;
    category: DateCategory;
    recursAnnually: boolean;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: {
      id: string;
      displayName: string;
    };
  },
  now: Date = new Date()
): ImportantDateItem {
  const computed = computeDateOccurrences(record.date, record.recursAnnually, now);

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    date: record.date.toISOString(),
    originalDate: computed.originalDate,
    recursAnnually: record.recursAnnually,
    createdById: record.createdById,
    createdBy: record.createdBy,
    nextOccurrence: computed.nextOccurrence,
    daysUntil: computed.daysUntil,
    isToday: computed.isToday,
    isPast: computed.isPast,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Creates a new shared Important Date.
 */
export async function createImportantDate(
  userId: string,
  input: CreateImportantDateInput
): Promise<ImportantDateItem> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ImportantDateForbiddenError('User is not authorized for this relationship');
  }

  const parsedDate = typeof input.date === 'string' ? new Date(input.date) : input.date;
  if (isNaN(parsedDate.getTime())) {
    throw new ImportantDateValidationError('Invalid date');
  }

  const record = await prisma.importantDate.create({
    data: {
      title: input.title.trim(),
      description: input.description ? input.description.trim() : null,
      date: parsedDate,
      category: input.category,
      recursAnnually: input.recursAnnually ?? false,
      createdById: userId,
    },
    select: DATE_SELECT,
  });

  return formatImportantDate(record);
}

/**
 * Retrieves a single Important Date by ID.
 */
export async function getImportantDate(
  userId: string,
  id: string
): Promise<ImportantDateItem | null> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ImportantDateForbiddenError();
  }

  const record = await prisma.importantDate.findUnique({
    where: { id },
    select: DATE_SELECT,
  });

  if (!record) return null;

  return formatImportantDate(record);
}

/**
 * Updates an Important Date.
 * Both partners can edit shared dates.
 * Original createdById and createdAt remain immutable.
 */
export async function updateImportantDate(
  userId: string,
  id: string,
  input: UpdateImportantDateInput
): Promise<ImportantDateItem> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ImportantDateForbiddenError();
  }

  const existing = await prisma.importantDate.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new ImportantDateNotFoundError();
  }

  const dataToUpdate: {
    title?: string;
    description?: string | null;
    date?: Date;
    category?: DateCategory;
    recursAnnually?: boolean;
  } = {};

  if (input.title !== undefined) {
    dataToUpdate.title = input.title.trim();
  }
  if (input.description !== undefined) {
    dataToUpdate.description = input.description ? input.description.trim() : null;
  }
  if (input.category !== undefined) {
    dataToUpdate.category = input.category;
  }
  if (input.recursAnnually !== undefined) {
    dataToUpdate.recursAnnually = input.recursAnnually;
  }
  if (input.date !== undefined) {
    const parsedDate = typeof input.date === 'string' ? new Date(input.date) : input.date;
    if (isNaN(parsedDate.getTime())) {
      throw new ImportantDateValidationError('Invalid date format');
    }
    dataToUpdate.date = parsedDate;
  }

  const updated = await prisma.importantDate.update({
    where: { id },
    data: dataToUpdate,
    select: DATE_SELECT,
  });

  return formatImportantDate(updated);
}

/**
 * Deletes an Important Date.
 * Both partners can delete shared dates.
 */
export async function deleteImportantDate(
  userId: string,
  id: string
): Promise<boolean> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ImportantDateForbiddenError();
  }

  const existing = await prisma.importantDate.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new ImportantDateNotFoundError();
  }

  await prisma.importantDate.delete({
    where: { id },
  });

  return true;
}

/**
 * Lists Important Dates with PostgreSQL search, category filtering, tab filtering, and deterministic sorting.
 */
export async function listImportantDates(
  userId: string,
  params: DatesQueryParams
): Promise<ImportantDatesListResponse> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ImportantDateForbiddenError();
  }

  const where: any = {};

  // Server-side PostgreSQL search across title and description
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Category filter
  if (params.category) {
    where.category = params.category;
  }

  // Recurring filter at DB level if tab is 'recurring'
  if (params.tab === 'recurring') {
    where.recursAnnually = true;
  }

  const records = await prisma.importantDate.findMany({
    where,
    select: DATE_SELECT,
  });

  const now = new Date();
  let items = records.map((r) => formatImportantDate(r, now));

  // Tab filtering for runtime computed states
  if (params.tab === 'today') {
    items = items.filter((item) => item.isToday);
  } else if (params.tab === 'upcoming') {
    items = items.filter((item) => !item.isPast);
  } else if (params.tab === 'past') {
    items = items.filter((item) => item.isPast);
  }

  // Deterministic sorting:
  // 1. Upcoming and Today items first (ordered by nextOccurrence ASC)
  // 2. Past non-recurring items placed afterwards (ordered by date DESC)
  // 3. ID ASC as secondary tie-breaker
  items.sort((a, b) => {
    if (!a.isPast && !b.isPast) {
      const timeA = a.nextOccurrence ? new Date(a.nextOccurrence).getTime() : 0;
      const timeB = b.nextOccurrence ? new Date(b.nextOccurrence).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    }
    if (!a.isPast && b.isPast) return -1;
    if (a.isPast && !b.isPast) return 1;

    // Both are past: sort by most recent original date first
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return a.id.localeCompare(b.id);
  });

  const total = items.length;
  const limit = Math.min(Math.max(params.limit || 50, 1), 100);
  const paginatedItems = items.slice(0, limit);

  return {
    items: paginatedItems,
    total,
  };
}

/**
 * Returns the nearest upcoming or today Important Date for the relationship.
 * Used exclusively by the Home Dashboard widget.
 */
export async function getNearestImportantDate(userId?: string): Promise<{
  title: string;
  date: string;
  daysRemaining: number;
} | null> {
  const records = await prisma.importantDate.findMany({
    select: DATE_SELECT,
  });

  if (records.length === 0) return null;

  const now = new Date();
  const upcomingItems = records
    .map((r) => formatImportantDate(r, now))
    .filter((item) => !item.isPast);

  if (upcomingItems.length === 0) return null;

  // Sort by nextOccurrence ASC
  upcomingItems.sort((a, b) => {
    const timeA = a.nextOccurrence ? new Date(a.nextOccurrence).getTime() : 0;
    const timeB = b.nextOccurrence ? new Date(b.nextOccurrence).getTime() : 0;
    return timeA - timeB;
  });

  const nearest = upcomingItems[0];
  let dateText = '';
  if (nearest.isToday) {
    dateText = 'Today';
  } else if (nearest.daysUntil === 1) {
    dateText = 'Tomorrow';
  } else {
    dateText = `In ${nearest.daysUntil} days`;
  }

  return {
    title: nearest.title,
    date: dateText,
    daysRemaining: nearest.daysUntil,
  };
}
