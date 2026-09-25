import { prisma } from '@/lib/prisma';
import { isCoupleMember } from '@/lib/chat/chat.permissions';
import {
  BucketCategory,
  BucketItemDetail,
  BucketListResponse,
  BucketProgress,
} from './bucket-list.types';
import {
  CreateBucketItemInput,
  UpdateBucketItemInput,
  BucketListQueryParams,
} from './bucket-list.validation';

export class BucketItemNotFoundError extends Error {
  constructor(message = 'Bucket item not found') {
    super(message);
    this.name = 'BucketItemNotFoundError';
  }
}

export class BucketItemForbiddenError extends Error {
  constructor(message = 'You do not have permission to access relationship bucket list') {
    super(message);
    this.name = 'BucketItemForbiddenError';
  }
}

export class BucketItemValidationError extends Error {
  constructor(message = 'Validation error') {
    super(message);
    this.name = 'BucketItemValidationError';
  }
}

const BUCKET_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  isCompleted: true,
  completedAt: true,
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

function formatBucketItem(record: {
  id: string;
  title: string;
  description: string | null;
  category: BucketCategory;
  isCompleted: boolean;
  completedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    displayName: string;
  };
}): BucketItemDetail {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    isCompleted: record.isCompleted,
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    createdById: record.createdById,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Creates a new shared Bucket List item.
 */
export async function createBucketItem(
  userId: string,
  input: CreateBucketItemInput
): Promise<BucketItemDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new BucketItemForbiddenError();
  }

  const record = await prisma.bucketItem.create({
    data: {
      title: input.title.trim(),
      description: input.description ? input.description.trim() : null,
      category: input.category,
      isCompleted: false,
      completedAt: null,
      createdById: userId,
    },
    select: BUCKET_SELECT,
  });

  return formatBucketItem(record);
}

/**
 * Retrieves a single Bucket List item by ID.
 */
export async function getBucketItem(
  userId: string,
  id: string
): Promise<BucketItemDetail | null> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new BucketItemForbiddenError();
  }

  const record = await prisma.bucketItem.findUnique({
    where: { id },
    select: BUCKET_SELECT,
  });

  if (!record) return null;

  return formatBucketItem(record);
}

/**
 * Updates a Bucket List item (title, description, category, completion).
 * Strictly controls completedAt using authoritative server timestamp.
 */
export async function updateBucketItem(
  userId: string,
  id: string,
  input: UpdateBucketItemInput
): Promise<BucketItemDetail> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new BucketItemForbiddenError();
  }

  const existing = await prisma.bucketItem.findUnique({
    where: { id },
    select: { id: true, isCompleted: true },
  });

  if (!existing) {
    throw new BucketItemNotFoundError();
  }

  const dataToUpdate: {
    title?: string;
    description?: string | null;
    category?: BucketCategory;
    isCompleted?: boolean;
    completedAt?: Date | null;
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
  if (input.isCompleted !== undefined) {
    dataToUpdate.isCompleted = input.isCompleted;
    if (input.isCompleted) {
      // Authoritative server timestamp
      dataToUpdate.completedAt = new Date();
    } else {
      dataToUpdate.completedAt = null;
    }
  }

  const updated = await prisma.bucketItem.update({
    where: { id },
    data: dataToUpdate,
    select: BUCKET_SELECT,
  });

  return formatBucketItem(updated);
}

/**
 * Deletes a shared Bucket List item.
 */
export async function deleteBucketItem(
  userId: string,
  id: string
): Promise<boolean> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new BucketItemForbiddenError();
  }

  const existing = await prisma.bucketItem.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new BucketItemNotFoundError();
  }

  await prisma.bucketItem.delete({
    where: { id },
  });

  return true;
}

/**
 * Lists bucket list items with server-side PostgreSQL search, status/category filters, and deterministic sorting.
 */
export async function listBucketItems(
  userId: string,
  params: BucketListQueryParams
): Promise<BucketListResponse> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new BucketItemForbiddenError();
  }

  const where: any = {};

  // Status filtering
  if (params.status === 'active') {
    where.isCompleted = false;
  } else if (params.status === 'completed') {
    where.isCompleted = true;
  }

  // Category filtering
  if (params.category) {
    where.category = params.category;
  }

  // Server-side PostgreSQL search across title and description
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const limit = Math.min(Math.max(params.limit || 50, 1), 100);

  // Run queries in parallel
  const [records, totalFiltered, totalAll, completedAll] = await Promise.all([
    prisma.bucketItem.findMany({
      where,
      select: BUCKET_SELECT,
      orderBy: [
        { isCompleted: 'asc' }, // Incomplete first
        { completedAt: 'desc' }, // Recently completed next
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit,
    }),
    prisma.bucketItem.count({ where }),
    prisma.bucketItem.count(),
    prisma.bucketItem.count({ where: { isCompleted: true } }),
  ]);

  const percentage =
    totalAll > 0 ? Math.round((completedAll / totalAll) * 10000) / 100 : 0;

  return {
    items: records.map(formatBucketItem),
    total: totalFiltered,
    progress: {
      totalCount: totalAll,
      completedCount: completedAll,
      percentage,
    },
  };
}

/**
 * Efficient progress calculation for Home Dashboard widget.
 * Avoids fetching full records.
 */
export async function getBucketDashboardProgress(userId?: string): Promise<{
  completedCount: number;
  totalCount: number;
  percentage: number;
} | null> {
  const [totalCount, completedCount] = await Promise.all([
    prisma.bucketItem.count(),
    prisma.bucketItem.count({ where: { isCompleted: true } }),
  ]);

  if (totalCount === 0) return null;

  const percentage = Math.round((completedCount / totalCount) * 10000) / 100;

  return {
    totalCount,
    completedCount,
    percentage,
  };
}
