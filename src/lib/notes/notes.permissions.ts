import { NoteVisibility } from '@prisma/client';

export interface NotePermissionContext {
  ownerId: string;
  visibility: NoteVisibility;
}

/**
 * Returns true if the user is authorized to read/view the note.
 * A user can view a note if:
 * 1. They are the owner of the note (whether SHARED or PRIVATE), OR
 * 2. The note has SHARED visibility (accessible to both partners).
 *
 * PRIVATE notes owned by the partner must NEVER be viewable.
 */
export function canViewNote(
  userId: string,
  note: NotePermissionContext
): boolean {
  if (!userId || !note) return false;
  if (note.ownerId === userId) return true;
  return note.visibility === 'SHARED';
}

/**
 * Returns true if the user is authorized to mutate (edit, pin, tag, change visibility, delete) the note.
 * Only the owner may mutate the note.
 */
export function canMutateNote(
  userId: string,
  note: { ownerId: string }
): boolean {
  if (!userId || !note) return false;
  return note.ownerId === userId;
}

/**
 * Returns true if the user is authorized to view revision history.
 * Revisions contain sensitive past drafts and are exclusively visible to the note owner.
 */
export function canViewRevisions(
  userId: string,
  note: NotePermissionContext
): boolean {
  if (!userId || !note) return false;
  return note.ownerId === userId;
}
