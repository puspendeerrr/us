import { prisma } from '@/lib/prisma';
import { getPartner } from '@/lib/chat/chat.permissions';
import {
  LetterItem,
  LettersListResponse,
  LetterStatus,
  OpenWhenSummary,
} from './letters.types';
import {
  CreateLetterInput,
  UpdateLetterInput,
  LetterQueryParams,
} from './letters.validation';

export class LetterNotFoundError extends Error {
  constructor(message = 'Letter not found') {
    super(message);
    this.name = 'LetterNotFoundError';
  }
}

export class LetterForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'LetterForbiddenError';
  }
}

export class LetterValidationError extends Error {
  constructor(message = 'Validation error') {
    super(message);
    this.name = 'LetterValidationError';
  }
}

/**
 * Derives the letter status strictly using server time.
 */
export function deriveLetterStatus(
  unlockAt: Date,
  openedAt: Date | null,
  now: Date = new Date()
): LetterStatus {
  if (openedAt) return 'OPENED';
  if (now.getTime() >= unlockAt.getTime()) return 'READY';
  return 'LOCKED';
}

/**
 * Standard explicit select fields for letter queries.
 */
const LETTER_SELECT = {
  id: true,
  authorId: true,
  recipientId: true,
  title: true,
  content: true,
  unlockAt: true,
  openedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      displayName: true,
    },
  },
  recipient: {
    select: {
      displayName: true,
    },
  },
} as const;

/**
 * Formats a raw database letter into a safe LetterItem.
 * CRITICAL PRIVACY ENFORCEMENT:
 * Recipient NEVER receives letter content until openedAt is set.
 */
function formatLetter(
  letter: {
    id: string;
    authorId: string;
    recipientId: string;
    title: string;
    content: string;
    unlockAt: Date;
    openedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: { displayName: string };
    recipient: { displayName: string };
  },
  currentUserId: string,
  now: Date = new Date()
): LetterItem {
  const isAuthor = letter.authorId === currentUserId;
  const status = deriveLetterStatus(letter.unlockAt, letter.openedAt, now);

  // Author can always view their own authored letter.
  // Recipient can ONLY view content once openedAt exists.
  const canSeeContent = isAuthor || letter.openedAt !== null;

  return {
    id: letter.id,
    authorId: letter.authorId,
    authorName: letter.author.displayName,
    recipientId: letter.recipientId,
    recipientName: letter.recipient.displayName,
    title: letter.title,
    content: canSeeContent ? letter.content : null,
    unlockAt: letter.unlockAt.toISOString(),
    openedAt: letter.openedAt ? letter.openedAt.toISOString() : null,
    status,
    isMine: isAuthor,
    createdAt: letter.createdAt.toISOString(),
    updatedAt: letter.updatedAt.toISOString(),
  };
}

/**
 * Creates a new Open When Letter.
 * Validates partner relationship and future unlock date.
 */
export async function createLetter(
  authorId: string,
  input: CreateLetterInput
): Promise<LetterItem> {
  const partner = await getPartner(authorId);
  if (!partner) {
    throw new LetterValidationError('Partner account is not configured in this relationship');
  }

  // Validate recipient is the authenticated partner
  if (input.recipientId !== partner.id && input.recipientId !== 'partner') {
    throw new LetterValidationError('Invalid recipient: letters can only be addressed to your partner');
  }

  const unlockDate = typeof input.unlockAt === 'string' ? new Date(input.unlockAt) : input.unlockAt;
  if (isNaN(unlockDate.getTime())) {
    throw new LetterValidationError('Invalid unlock date');
  }

  // Enforce future unlock date (10s buffer for clock skew)
  if (unlockDate.getTime() <= Date.now() - 10000) {
    throw new LetterValidationError('Unlock date and time must be in the future');
  }

  const letter = await prisma.openWhenLetter.create({
    data: {
      authorId,
      recipientId: partner.id,
      title: input.title.trim(),
      content: input.content.trim(),
      unlockAt: unlockDate,
    },
    select: LETTER_SELECT,
  });

  return formatLetter(letter, authorId);
}

/**
 * Retrieves a single letter by ID with strict privacy filtering.
 */
export async function getLetter(userId: string, letterId: string): Promise<LetterItem | null> {
  const letter = await prisma.openWhenLetter.findUnique({
    where: { id: letterId },
    select: LETTER_SELECT,
  });

  if (!letter) return null;

  // Access control: User must be either author or recipient
  if (letter.authorId !== userId && letter.recipientId !== userId) {
    return null;
  }

  return formatLetter(letter, userId);
}

/**
 * Updates an existing letter.
 * STRICT IMMUTABILITY RULE: Letters can ONLY be edited before they are opened.
 */
export async function updateLetter(
  userId: string,
  letterId: string,
  input: UpdateLetterInput
): Promise<LetterItem> {
  const letter = await prisma.openWhenLetter.findUnique({
    where: { id: letterId },
    select: LETTER_SELECT,
  });

  if (!letter || (letter.authorId !== userId && letter.recipientId !== userId)) {
    throw new LetterNotFoundError('Letter not found');
  }

  if (letter.authorId !== userId) {
    throw new LetterForbiddenError('Forbidden: only the author can edit this letter');
  }

  if (letter.openedAt !== null) {
    throw new LetterForbiddenError('Forbidden: this letter has already been opened and cannot be modified');
  }

  const dataToUpdate: {
    title?: string;
    content?: string;
    unlockAt?: Date;
    recipientId?: string;
  } = {};

  if (input.title !== undefined) {
    dataToUpdate.title = input.title.trim();
  }
  if (input.content !== undefined) {
    dataToUpdate.content = input.content.trim();
  }
  if (input.recipientId !== undefined) {
    const partner = await getPartner(userId);
    if (!partner || (input.recipientId !== partner.id && input.recipientId !== 'partner')) {
      throw new LetterValidationError('Invalid recipient: letters can only be addressed to your partner');
    }
    dataToUpdate.recipientId = partner.id;
  }
  if (input.unlockAt !== undefined) {
    const newUnlock = typeof input.unlockAt === 'string' ? new Date(input.unlockAt) : input.unlockAt;
    if (isNaN(newUnlock.getTime())) {
      throw new LetterValidationError('Invalid unlock date');
    }
    if (newUnlock.getTime() <= Date.now() - 10000) {
      throw new LetterValidationError('Unlock date and time must be in the future');
    }
    dataToUpdate.unlockAt = newUnlock;
  }

  const updated = await prisma.openWhenLetter.update({
    where: { id: letterId },
    data: dataToUpdate,
    select: LETTER_SELECT,
  });

  return formatLetter(updated, userId);
}

/**
 * Deletes a letter before it is opened.
 * Once opened, letters become permanent shared memories.
 */
export async function deleteLetter(userId: string, letterId: string): Promise<boolean> {
  const letter = await prisma.openWhenLetter.findUnique({
    where: { id: letterId },
    select: {
      id: true,
      authorId: true,
      recipientId: true,
      openedAt: true,
    },
  });

  if (!letter || (letter.authorId !== userId && letter.recipientId !== userId)) {
    throw new LetterNotFoundError('Letter not found');
  }

  if (letter.authorId !== userId) {
    throw new LetterForbiddenError('Forbidden: only the author can delete this letter');
  }

  if (letter.openedAt !== null) {
    throw new LetterForbiddenError('Forbidden: opened letters cannot be deleted to preserve shared memories');
  }

  await prisma.openWhenLetter.delete({
    where: { id: letterId },
  });

  return true;
}

/**
 * Opens a letter when ready.
 * STRICT SERVER-TIME CHECK: Current server timestamp must be >= unlockAt.
 */
export async function openLetter(userId: string, letterId: string): Promise<LetterItem> {
  const letter = await prisma.openWhenLetter.findUnique({
    where: { id: letterId },
    select: LETTER_SELECT,
  });

  if (!letter || (letter.authorId !== userId && letter.recipientId !== userId)) {
    throw new LetterNotFoundError('Letter not found');
  }

  if (letter.recipientId !== userId) {
    throw new LetterForbiddenError('Forbidden: only the intended recipient can open this letter');
  }

  // If already opened, return the letter idempotently
  if (letter.openedAt !== null) {
    return formatLetter(letter, userId);
  }

  const now = new Date();
  if (now.getTime() < letter.unlockAt.getTime()) {
    throw new LetterForbiddenError(`Forbidden: letter is locked until ${letter.unlockAt.toISOString()}`);
  }

  const updated = await prisma.openWhenLetter.update({
    where: { id: letterId },
    data: {
      openedAt: now,
    },
    select: LETTER_SELECT,
  });

  return formatLetter(updated, userId, now);
}

/**
 * Lists letters for the current user with pagination and tab filtering.
 * Never searches locked content. Never returns locked content to recipient.
 */
export async function listLetters(
  userId: string,
  params: LetterQueryParams
): Promise<LettersListResponse> {
  const limit = Math.min(Math.max(params.limit || 20, 1), 50);

  const where: any = {};

  // Tab filtering
  if (params.tab === 'received') {
    where.recipientId = userId;
  } else if (params.tab === 'sent') {
    where.authorId = userId;
  } else {
    // 'all'
    where.OR = [{ authorId: userId }, { recipientId: userId }];
  }

  // Safe server search: strictly on title (NEVER content)
  if (params.search && params.search.trim()) {
    where.title = {
      contains: params.search.trim(),
      mode: 'insensitive',
    };
  }

  const cursorObj = params.cursor ? { id: params.cursor } : undefined;

  const [total, records] = await Promise.all([
    prisma.openWhenLetter.count({ where }),
    prisma.openWhenLetter.findMany({
      where,
      take: limit + 1,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: LETTER_SELECT,
    }),
  ]);

  const hasMore = records.length > limit;
  const itemsToReturn = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

  const now = new Date();
  const items = itemsToReturn.map((l) => formatLetter(l, userId, now));

  return {
    items,
    total,
    hasMore,
    nextCursor,
  };
}

/**
 * Returns safe dashboard summary information for Open When letters.
 * Zero content exposure.
 */
export async function getOpenWhenSummary(userId: string): Promise<OpenWhenSummary> {
  const now = new Date();

  const [readyCount, nextLocked, totalCount] = await Promise.all([
    // Letters received by user that are ready to open
    prisma.openWhenLetter.count({
      where: {
        recipientId: userId,
        openedAt: null,
        unlockAt: { lte: now },
      },
    }),
    // Next locked letter unlocking in the future for this recipient
    prisma.openWhenLetter.findFirst({
      where: {
        recipientId: userId,
        openedAt: null,
        unlockAt: { gt: now },
      },
      orderBy: { unlockAt: 'asc' },
      select: { unlockAt: true },
    }),
    // Any letters exist in the relationship
    prisma.openWhenLetter.count({
      where: {
        OR: [{ authorId: userId }, { recipientId: userId }],
      },
    }),
  ]);

  return {
    readyCount,
    nextUnlockAt: nextLocked ? nextLocked.unlockAt.toISOString() : null,
    hasLetters: totalCount > 0,
  };
}
