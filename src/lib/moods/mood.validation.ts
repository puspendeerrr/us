import { z } from 'zod';

export const MOOD_TYPES = [
  'LOVED',
  'HAPPY',
  'NORMAL',
  'MISSING_YOU',
  'ANGRY_FRUSTRATED',
  'EMOTIONAL',
  'TIRED_DRAINED',
] as const;

export const MOOD_VISIBILITIES = ['SHARED', 'PRIVATE'] as const;

export const moodTypeSchema = z.enum(MOOD_TYPES);
export const moodVisibilitySchema = z.enum(MOOD_VISIBILITIES);

/**
 * Validates date string in either ISO 8601 or YYYY-MM-DD format.
 */
function isValidDateString(val: string): boolean {
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export const createMoodSchema = z
  .object({
    mood: moodTypeSchema,
    note: z
      .string()
      .trim()
      .max(2000, { message: 'Note must be at most 2000 characters.' })
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    date: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'Invalid date format.' }),
    visibility: moodVisibilitySchema,
  })
  .strict();

export const updateMoodSchema = z
  .object({
    mood: moodTypeSchema.optional(),
    note: z
      .string()
      .trim()
      .max(2000, { message: 'Note must be at most 2000 characters.' })
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    date: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'Invalid date format.' })
      .optional(),
    visibility: moodVisibilitySchema.optional(),
  })
  .strict();

export const moodQuerySchema = z.object({
  date: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  mood: moodTypeSchema.optional(),
  visibility: z.enum(['ALL', 'SHARED', 'PRIVATE']).optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
