import { z } from 'zod';

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-m4a',
  'audio/aac',
] as const;

export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_AUDIO_DURATION = 600; // 10 minutes (600 seconds)

export const MIME_TO_EXTENSION: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
};

export const voiceVisibilitySchema = z.enum(['SHARED', 'PRIVATE']);

export const createVoiceMemorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional()
    .nullable(),
  visibility: voiceVisibilitySchema,
  durationSeconds: z.coerce
    .number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 second')
    .max(MAX_AUDIO_DURATION, 'Recording duration cannot exceed 10 minutes (600 seconds)'),
  recordedAt: z.string().datetime().optional(),
});

export const updateVoiceMemorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional()
    .nullable(),
  visibility: voiceVisibilitySchema.optional(),
});

export const voiceQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  filter: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase() : val),
      z.enum(['all', 'shared', 'private', 'mine'])
    )
    .optional()
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateVoiceInput = z.infer<typeof createVoiceMemorySchema>;
export type UpdateVoiceInput = z.infer<typeof updateVoiceMemorySchema>;
export type VoiceQuery = z.infer<typeof voiceQuerySchema>;
