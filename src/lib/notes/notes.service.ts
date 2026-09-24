import { prisma } from '@/lib/prisma';
import { NoteVisibility, Prisma } from '@prisma/client';
import {
  NoteListItem,
  NoteDetail,
  NoteRevisionItem,
  NotesListResponse,
  TagItem,
} from './notes.types';
import { CreateNoteInput, UpdateNoteInput, NotesQuery } from './notes.validation';
import { sanitizeNoteContent, extractPlainTextSnippet } from './notes.sanitize';
import { canViewNote, canMutateNote, canViewRevisions } from './notes.permissions';

export class NoteNotFoundError extends Error {
  constructor(message = 'Note not found') {
    super(message);
    this.name = 'NoteNotFoundError';
  }
}

export class NoteForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'NoteForbiddenError';
  }
}

/**
 * Normalizes an array of tags: trims, lowercases, removes duplicates and empties.
 */
export function normalizeTags(rawTags: string[] = []): string[] {
  const set = new Set<string>();
  for (const tag of rawTags) {
    const cleaned = tag.trim().toLowerCase();
    if (cleaned.length > 0 && cleaned.length <= 30) {
      set.add(cleaned);
    }
  }
  return Array.from(set);
}

const AUTHOR_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  role: true,
};

/**
 * Lists notes visible to the authenticated user with strict database-level privacy enforcement.
 */
export async function listNotes(
  userId: string,
  query: NotesQuery
): Promise<NotesListResponse> {
  const { search, filter = 'all', tag, page = 1, limit = 20 } = query;

  // Strict base privacy guarantee: user can only see their own notes OR shared notes
  const basePrivacyCondition: Prisma.NoteWhereInput = {
    OR: [{ ownerId: userId }, { visibility: NoteVisibility.SHARED }],
  };

  const andConditions: Prisma.NoteWhereInput[] = [basePrivacyCondition];

  // Specific filter application
  if (filter === 'shared') {
    andConditions.push({ visibility: NoteVisibility.SHARED });
  } else if (filter === 'private') {
    andConditions.push({
      ownerId: userId,
      visibility: NoteVisibility.PRIVATE,
    });
  } else if (filter === 'pinned') {
    andConditions.push({ pinned: true });
  }

  // Tag filter
  if (tag) {
    const normalizedTag = tag.trim().toLowerCase();
    andConditions.push({
      tags: {
        some: {
          name: normalizedTag,
        },
      },
    });
  }

  // Search filter across title, content, or tag names
  if (search && search.trim().length > 0) {
    const term = search.trim();
    andConditions.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        {
          tags: {
            some: {
              name: { contains: term.toLowerCase(), mode: 'insensitive' },
            },
          },
        },
      ],
    });
  }

  const where: Prisma.NoteWhereInput = {
    AND: andConditions,
  };

  const skip = (page - 1) * limit;

  const [total, notes] = await Promise.all([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        owner: { select: AUTHOR_SELECT },
        tags: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items: NoteListItem[] = notes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    snippet: extractPlainTextSnippet(note.content),
    visibility: note.visibility,
    pinned: note.pinned,
    ownerId: note.ownerId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    tags: note.tags,
    owner: note.owner,
  }));

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
 * Retrieves a single note by ID.
 * Returns null if the note does not exist or the user is not authorized to view it,
 * preventing existence leakage of private notes.
 */
export async function getNote(
  userId: string,
  noteId: string
): Promise<NoteDetail | null> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      owner: { select: AUTHOR_SELECT },
      tags: { select: { id: true, name: true } },
      _count: { select: { revisions: true } },
    },
  });

  if (!note) {
    return null;
  }

  if (!canViewNote(userId, note)) {
    return null;
  }

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    snippet: extractPlainTextSnippet(note.content),
    visibility: note.visibility,
    pinned: note.pinned,
    ownerId: note.ownerId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    tags: note.tags,
    owner: note.owner,
    revisionCount: note._count.revisions,
  };
}

/**
 * Creates a new note, associates tags, and generates the initial revision.
 */
export async function createNote(
  userId: string,
  input: CreateNoteInput
): Promise<NoteDetail> {
  const sanitizedContent = sanitizeNoteContent(input.content || '');
  const tagsList = normalizeTags(input.tags);

  return await prisma.$transaction(async (tx) => {
    // Connect or create normalized tags
    const tagConnectOrCreate = tagsList.map((tagName) => ({
      where: { name: tagName },
      create: { name: tagName },
    }));

    const note = await tx.note.create({
      data: {
        title: input.title,
        content: sanitizedContent,
        visibility: input.visibility,
        pinned: input.pinned ?? false,
        ownerId: userId,
        tags: {
          connectOrCreate: tagConnectOrCreate,
        },
      },
      include: {
        owner: { select: AUTHOR_SELECT },
        tags: { select: { id: true, name: true } },
      },
    });

    // Create initial revision
    await tx.noteRevision.create({
      data: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        visibility: note.visibility,
        authorId: userId,
      },
    });

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      snippet: extractPlainTextSnippet(note.content),
      visibility: note.visibility,
      pinned: note.pinned,
      ownerId: note.ownerId,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      tags: note.tags,
      owner: note.owner,
      revisionCount: 1,
    };
  });
}

/**
 * Updates an existing note.
 * Only the owner is permitted to update the note.
 * Generates a new revision if content, title, or visibility changed.
 */
export async function updateNote(
  userId: string,
  noteId: string,
  input: UpdateNoteInput
): Promise<NoteDetail> {
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    include: { tags: true },
  });

  if (!existing) {
    throw new NoteNotFoundError();
  }

  // If user cannot even view the note, return 404 to avoid leaking existence
  if (!canViewNote(userId, existing)) {
    throw new NoteNotFoundError();
  }

  // If user can view (e.g. partner viewing shared note) but is not the owner, return 403
  if (!canMutateNote(userId, existing)) {
    throw new NoteForbiddenError('Only the note owner may edit this note');
  }

  const nextTitle = input.title !== undefined ? input.title : existing.title;
  const nextContent =
    input.content !== undefined
      ? sanitizeNoteContent(input.content)
      : existing.content;
  const nextVisibility =
    input.visibility !== undefined ? input.visibility : existing.visibility;
  const nextPinned =
    input.pinned !== undefined ? input.pinned : existing.pinned;

  const isMeaningfulChange =
    nextTitle !== existing.title ||
    nextContent !== existing.content ||
    nextVisibility !== existing.visibility;

  return await prisma.$transaction(async (tx) => {
    // If tags were supplied, update tags
    let tagsUpdateData: Prisma.NoteUpdateInput['tags'] | undefined = undefined;
    if (input.tags !== undefined) {
      const normalized = normalizeTags(input.tags);
      tagsUpdateData = {
        set: [], // disconnect previous
        connectOrCreate: normalized.map((tagName) => ({
          where: { name: tagName },
          create: { name: tagName },
        })),
      };
    }

    const updated = await tx.note.update({
      where: { id: noteId },
      data: {
        title: nextTitle,
        content: nextContent,
        visibility: nextVisibility,
        pinned: nextPinned,
        ...(tagsUpdateData ? { tags: tagsUpdateData } : {}),
      },
      include: {
        owner: { select: AUTHOR_SELECT },
        tags: { select: { id: true, name: true } },
        _count: { select: { revisions: true } },
      },
    });

    // Create revision if meaningful change occurred
    if (isMeaningfulChange) {
      await tx.noteRevision.create({
        data: {
          noteId: updated.id,
          title: updated.title,
          content: updated.content,
          visibility: updated.visibility,
          authorId: userId,
        },
      });
    }

    const revisionCount = await tx.noteRevision.count({
      where: { noteId: updated.id },
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      snippet: extractPlainTextSnippet(updated.content),
      visibility: updated.visibility,
      pinned: updated.pinned,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      tags: updated.tags,
      owner: updated.owner,
      revisionCount,
    };
  });
}

/**
 * Deletes a note and cascades revisions.
 * Only the owner is permitted to delete.
 */
export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!existing) {
    throw new NoteNotFoundError();
  }

  if (!canViewNote(userId, existing)) {
    throw new NoteNotFoundError();
  }

  if (!canMutateNote(userId, existing)) {
    throw new NoteForbiddenError('Only the note owner may delete this note');
  }

  await prisma.note.delete({
    where: { id: noteId },
  });
}

/**
 * Lists note revisions.
 * Revisions are restricted exclusively to the owner of the note.
 */
export async function listNoteRevisions(
  userId: string,
  noteId: string
): Promise<NoteRevisionItem[]> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new NoteNotFoundError();
  }

  if (!canViewNote(userId, note)) {
    throw new NoteNotFoundError();
  }

  if (!canViewRevisions(userId, note)) {
    throw new NoteForbiddenError('Only the note owner may inspect revision history');
  }

  const revisions = await prisma.noteRevision.findMany({
    where: { noteId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: AUTHOR_SELECT },
    },
  });

  return revisions.map((rev) => ({
    id: rev.id,
    noteId: rev.noteId,
    title: rev.title,
    content: rev.content,
    visibility: rev.visibility,
    createdAt: rev.createdAt.toISOString(),
    authorId: rev.authorId,
    author: rev.author,
  }));
}
