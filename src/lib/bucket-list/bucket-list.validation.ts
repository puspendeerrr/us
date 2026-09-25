import { z } from 'zod';

export const bucketCategoryEnum = z.enum([
  'TRAVEL',
  'FOOD',
  'EXPERIENCES',
  'MOVIES',
  'LEARNING',
  'ADVENTURE',
  'PERSONAL',
  'CUSTOM',
]);

export const createBucketItemSchema = z.object({
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
  category: bucketCategoryEnum,
});

export const updateBucketItemSchema = z.object({
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
  category: bucketCategoryEnum.optional(),
  isCompleted: z.boolean().optional(),
});

export const bucketListQuerySchema = z.object({
  status: z.enum(['all', 'active', 'completed']).optional().default('all'),
  category: bucketCategoryEnum.optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export type CreateBucketItemInput = z.infer<typeof createBucketItemSchema>;
export type UpdateBucketItemInput = z.infer<typeof updateBucketItemSchema>;
export type BucketListQueryParams = z.infer<typeof bucketListQuerySchema>;
