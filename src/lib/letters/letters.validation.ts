import { z } from 'zod';

export const createLetterSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content must be 50,000 characters or fewer'),
  recipientId: z
    .string()
    .trim()
    .min(1, 'Recipient is required'),
  unlockAt: z
    .string()
    .or(z.date())
    .refine((val) => {
      const d = typeof val === 'string' ? new Date(val) : val;
      return !isNaN(d.getTime());
    }, 'Invalid unlock date/time format')
    .refine((val) => {
      const d = typeof val === 'string' ? new Date(val) : val;
      // Allow a small 10s buffer for network transmission but strictly require future time
      return d.getTime() > Date.now() - 10000;
    }, 'Unlock date and time must be in the future'),
});

export const updateLetterSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer')
    .optional(),
  content: z
    .string()
    .trim()
    .min(1, 'Content is required')
    .max(50000, 'Content must be 50,000 characters or fewer')
    .optional(),
  recipientId: z
    .string()
    .trim()
    .min(1, 'Recipient is required')
    .optional(),
  unlockAt: z
    .string()
    .or(z.date())
    .refine((val) => {
      const d = typeof val === 'string' ? new Date(val) : val;
      return !isNaN(d.getTime());
    }, 'Invalid unlock date/time format')
    .refine((val) => {
      const d = typeof val === 'string' ? new Date(val) : val;
      return d.getTime() > Date.now() - 10000;
    }, 'Unlock date and time must be in the future')
    .optional(),
});

export const letterQuerySchema = z.object({
  tab: z.enum(['all', 'received', 'sent']).optional().default('all'),
  search: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;
export type LetterQueryParams = z.infer<typeof letterQuerySchema>;
