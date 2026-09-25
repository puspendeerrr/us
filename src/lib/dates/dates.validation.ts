import { z } from 'zod';

export const dateCategoryEnum = z.enum([
  'ANNIVERSARY',
  'BIRTHDAY',
  'FIRST_MEET',
  'FIRST_CALL',
  'FIRST_DATE',
  'TRIP',
  'CUSTOM',
]);

export const createImportantDateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2,000 characters or fewer')
    .optional()
    .nullable(),
  date: z
    .string()
    .or(z.date())
    .refine((val) => {
      const d = typeof val === 'string' ? new Date(val) : val;
      return !isNaN(d.getTime());
    }, 'Invalid date format'),
  category: dateCategoryEnum,
  recursAnnually: z.boolean().optional().default(false),
});

export const updateImportantDateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2,000 characters or fewer')
    .optional()
    .nullable(),
  date: z
    .string()
    .or(z.date())
    .refine((val) => {
      const d = typeof val === 'string' ? new Date(val) : val;
      return !isNaN(d.getTime());
    }, 'Invalid date format')
    .optional(),
  category: dateCategoryEnum.optional(),
  recursAnnually: z.boolean().optional(),
});

export const datesQuerySchema = z.object({
  tab: z
    .enum(['all', 'upcoming', 'today', 'past', 'recurring'])
    .optional()
    .default('all'),
  category: dateCategoryEnum.optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export type CreateImportantDateInput = z.infer<typeof createImportantDateSchema>;
export type UpdateImportantDateInput = z.infer<typeof updateImportantDateSchema>;
export type DatesQueryParams = z.infer<typeof datesQuerySchema>;
