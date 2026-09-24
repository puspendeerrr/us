import { z } from 'zod';
import { ALLOWED_REACTIONS } from './chat.types';

export const reactionTypeSchema = z.enum(ALLOWED_REACTIONS);

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters'),
  replyToId: z.string().trim().min(1).optional(),
});

export const toggleReactionSchema = z.object({
  reaction: reactionTypeSchema,
});

export const chatHistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const chatSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query cannot be empty').max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;
export type ChatSearchQuery = z.infer<typeof chatSearchQuerySchema>;
