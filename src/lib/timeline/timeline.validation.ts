import { z } from 'zod';

export const TIMELINE_CATEGORIES = [
  'BEGINNING',
  'MILESTONE',
  'TRIP',
  'MEMORY',
  'ACHIEVEMENT',
  'CUSTOM',
] as const;

export const timelineCategorySchema = z.enum(TIMELINE_CATEGORIES);

function isValidDateString(val: string): boolean {
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export const createTimelineEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title is required.' })
      .max(200, { message: 'Title cannot exceed 200 characters.' }),
    description: z
      .string()
      .trim()
      .max(3000, { message: 'Description cannot exceed 3000 characters.' })
      .optional()
      .nullable(),
    date: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'Invalid date format.' }),
    category: timelineCategorySchema,
  })
  .strict();

export const updateTimelineEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Title is required.' })
      .max(200, { message: 'Title cannot exceed 200 characters.' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(3000, { message: 'Description cannot exceed 3000 characters.' })
      .optional()
      .nullable(),
    date: z
      .string()
      .trim()
      .refine(isValidDateString, { message: 'Invalid date format.' })
      .optional(),
    category: timelineCategorySchema.optional(),
  })
  .strict();

export const timelineQuerySchema = z.object({
  category: timelineCategorySchema.optional(),
  search: z.string().trim().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
