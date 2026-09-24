import { z } from 'zod';

export const noteVisibilitySchema = z.enum(['SHARED', 'PRIVATE']);

export const noteTagSchema = z
  .string()
  .trim()
  .min(1, 'Tag must not be empty')
  .max(30, 'Tag must be 30 characters or fewer')
  .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Tags can only contain letters, numbers, spaces, hyphens, and underscores');

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  content: z
    .string()
    .max(100000, 'Content exceeds maximum allowable size (100KB)'),
  visibility: noteVisibilitySchema,
  pinned: z.boolean().optional().default(false),
  tags: z
    .array(noteTagSchema)
    .max(20, 'Maximum 20 tags per note')
    .optional()
    .default([]),
});

export const updateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer')
    .optional(),
  content: z
    .string()
    .max(100000, 'Content exceeds maximum allowable size (100KB)')
    .optional(),
  visibility: noteVisibilitySchema.optional(),
  pinned: z.boolean().optional(),
  tags: z
    .array(noteTagSchema)
    .max(20, 'Maximum 20 tags per note')
    .optional(),
});

export const notesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  filter: z.enum(['all', 'shared', 'private', 'pinned']).optional().default('all'),
  tag: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NotesQuery = z.infer<typeof notesQuerySchema>;
