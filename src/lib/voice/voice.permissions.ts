import { NoteVisibility } from '@prisma/client';

export interface VoicePermissionContext {
  ownerId: string;
  visibility: NoteVisibility;
}

/**
 * Returns true if the user is authorized to read/view or listen to the voice memory.
 * - Owner can always view/listen (whether SHARED or PRIVATE).
 * - Partner can view/listen ONLY if SHARED.
 * Private partner recordings are strictly forbidden.
 */
export function canViewVoiceMemory(
  userId: string,
  memory: VoicePermissionContext
): boolean {
  if (!userId || !memory) return false;
  if (memory.ownerId === userId) return true;
  return memory.visibility === 'SHARED';
}

/**
 * Returns true if the user is authorized to mutate (edit metadata or delete) the voice memory.
 * Author-only.
 */
export function canMutateVoiceMemory(
  userId: string,
  memory: { ownerId: string }
): boolean {
  if (!userId || !memory) return false;
  return memory.ownerId === userId;
}
