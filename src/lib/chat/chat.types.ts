import { ReactionType } from '@prisma/client';

export type { ReactionType };

export const REACTION_TO_EMOJI: Record<ReactionType, string> = {
  HEART: '❤️',
  LAUGH: '😂',
  THUMBS_UP: '👍',
  CRY: '😢',
  ANGRY: '😡',
};

export const EMOJI_TO_REACTION: Record<string, ReactionType> = {
  '❤️': 'HEART',
  '😂': 'LAUGH',
  '👍': 'THUMBS_UP',
  '😢': 'CRY',
  '😡': 'ANGRY',
};

export const ALLOWED_REACTIONS = ['HEART', 'LAUGH', 'THUMBS_UP', 'CRY', 'ANGRY'] as const;

export interface ReactionSummary {
  reaction: ReactionType;
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe: boolean;
}

export interface RepliedMessageSummary {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isDeleted: boolean;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
  readAt: string | null;
  isRead: boolean;
  isMine: boolean;
  replyTo: RepliedMessageSummary | null;
  reactions: ReactionSummary[];
}

export interface ChatHistoryResponse {
  messages: ChatMessageItem[];
  hasMore: boolean;
  nextCursor: string | null;
  unreadCount: number;
}
