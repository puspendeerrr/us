import { prisma } from '@/lib/prisma';
import { ReactionType, Prisma } from '@prisma/client';
import {
  ChatMessageItem,
  ChatHistoryResponse,
  ReactionSummary,
  RepliedMessageSummary,
  REACTION_TO_EMOJI,
  ALLOWED_REACTIONS,
} from './chat.types';
import { SendMessageInput } from './chat.validation';
import { isCoupleMember, canMutateMessage } from './chat.permissions';

export class ChatNotFoundError extends Error {
  constructor(message = 'Message not found') {
    super(message);
    this.name = 'ChatNotFoundError';
  }
}

export class ChatForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'ChatForbiddenError';
  }
}

const MESSAGE_INCLUDE = {
  sender: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  replyTo: {
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  },
  reactions: {
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  },
} as const;

type PrismaMessageWithRelations = Prisma.ChatMessageGetPayload<{
  include: typeof MESSAGE_INCLUDE;
}>;

/**
 * Formats a raw Prisma ChatMessage record into a secure, UI-ready ChatMessageItem.
 */
export function formatMessage(
  msg: PrismaMessageWithRelations,
  currentUserId: string
): ChatMessageItem {
  const isDeleted = msg.deletedAt !== null;
  const isMine = msg.senderId === currentUserId;

  // Aggregate reactions by reaction type
  const reactionsMap = new Map<ReactionType, { count: number; userIds: string[]; reactedByMe: boolean }>();
  for (const r of msg.reactions) {
    const existing = reactionsMap.get(r.reaction) || { count: 0, userIds: [], reactedByMe: false };
    existing.count += 1;
    existing.userIds.push(r.userId);
    if (r.userId === currentUserId) {
      existing.reactedByMe = true;
    }
    reactionsMap.set(r.reaction, existing);
  }

  const reactions: ReactionSummary[] = Array.from(reactionsMap.entries()).map(([reaction, data]) => ({
    reaction,
    emoji: REACTION_TO_EMOJI[reaction] || '👍',
    count: data.count,
    userIds: data.userIds,
    reactedByMe: data.reactedByMe,
  }));

  // Format replied message summary if present
  let replyToSummary: RepliedMessageSummary | null = null;
  if (msg.replyTo) {
    const isReplyDeleted = msg.replyTo.deletedAt !== null;
    replyToSummary = {
      id: msg.replyTo.id,
      senderId: msg.replyTo.senderId,
      senderName: msg.replyTo.sender?.displayName || 'Partner',
      content: isReplyDeleted ? 'This message was deleted' : msg.replyTo.content.slice(0, 150),
      isDeleted: isReplyDeleted,
    };
  } else if (msg.replyToId) {
    replyToSummary = {
      id: msg.replyToId,
      senderId: '',
      senderName: 'Message',
      content: 'Original message unavailable',
      isDeleted: true,
    };
  }

  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.sender.displayName,
    senderAvatar: msg.sender.avatarUrl,
    content: isDeleted ? 'This message was deleted.' : msg.content,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
    deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : null,
    isDeleted,
    readAt: msg.readAt ? msg.readAt.toISOString() : null,
    isRead: msg.readAt !== null,
    isMine,
    replyTo: replyToSummary,
    reactions,
  };
}

/**
 * Retrieves paginated chat history for the couple conversation.
 */
export async function getChatHistory(
  userId: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<ChatHistoryResponse> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ChatForbiddenError('Unauthorized');
  }

  const limit = options.limit ? Math.min(options.limit, 100) : 30;

  const queryArgs: Prisma.ChatMessageFindManyArgs = {
    take: limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: MESSAGE_INCLUDE,
  };

  if (options.cursor) {
    queryArgs.cursor = { id: options.cursor };
    queryArgs.skip = 1;
  }

  const rawMessages = await prisma.chatMessage.findMany(queryArgs);
  const hasMore = rawMessages.length > limit;
  const messagesSlice = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Chronological order (older messages first)
  const sorted = [...messagesSlice].reverse();
  const formatted = sorted.map((m) => formatMessage(m as PrismaMessageWithRelations, userId));
  const nextCursor = hasMore ? messagesSlice[messagesSlice.length - 1].id : null;

  // Real unread count for current user
  const unreadCount = await getUnreadCount(userId);

  return {
    messages: formatted,
    hasMore,
    nextCursor,
    unreadCount,
  };
}

/**
 * Creates and persists a new chat message in PostgreSQL.
 */
export async function sendMessage(
  userId: string,
  input: SendMessageInput
): Promise<ChatMessageItem> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ChatForbiddenError('Unauthorized');
  }

  // Validate replyToId if present
  if (input.replyToId) {
    const parent = await prisma.chatMessage.findUnique({
      where: { id: input.replyToId },
      select: { id: true },
    });
    if (!parent) {
      throw new ChatNotFoundError('Referenced message for reply does not exist');
    }
  }

  const created = await prisma.chatMessage.create({
    data: {
      senderId: userId,
      content: input.content.trim(),
      replyToId: input.replyToId || null,
    },
    include: MESSAGE_INCLUDE,
  });

  return formatMessage(created as PrismaMessageWithRelations, userId);
}

/**
 * Marks incoming messages as read for the current user.
 */
export async function markMessagesRead(
  userId: string,
  messageIds?: string[]
): Promise<{ count: number; readAt: string }> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ChatForbiddenError('Unauthorized');
  }

  const now = new Date();
  const where: Prisma.ChatMessageWhereInput = {
    senderId: { not: userId },
    readAt: null,
    deletedAt: null,
  };

  if (messageIds && messageIds.length > 0) {
    where.id = { in: messageIds };
  }

  const result = await prisma.chatMessage.updateMany({
    where,
    data: {
      readAt: now,
    },
  });

  return {
    count: result.count,
    readAt: now.toISOString(),
  };
}

/**
 * Toggles a reaction (adds if not present, removes if already present).
 */
export async function toggleReaction(
  userId: string,
  messageId: string,
  reaction: ReactionType
): Promise<ChatMessageItem> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ChatForbiddenError('Unauthorized');
  }

  if (!ALLOWED_REACTIONS.includes(reaction)) {
    throw new Error('Invalid reaction type');
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, deletedAt: true },
  });

  if (!message) {
    throw new ChatNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.messageReaction.findUnique({
      where: {
        messageId_userId_reaction: {
          messageId,
          userId,
          reaction,
        },
      },
    });

    if (existing) {
      await tx.messageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await tx.messageReaction.create({
        data: {
          messageId,
          userId,
          reaction,
        },
      });
    }
  });

  const updatedMessage = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: MESSAGE_INCLUDE,
  });

  return formatMessage(updatedMessage as PrismaMessageWithRelations, userId);
}

/**
 * Soft deletes a message (author only).
 */
export async function deleteMessage(
  userId: string,
  messageId: string
): Promise<ChatMessageItem> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, deletedAt: true },
  });

  if (!message) {
    throw new ChatNotFoundError();
  }

  if (!canMutateMessage(userId, message)) {
    throw new ChatForbiddenError('You can only delete your own messages');
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      content: 'This message was deleted.',
    },
    include: MESSAGE_INCLUDE,
  });

  return formatMessage(updated as PrismaMessageWithRelations, userId);
}

/**
 * Searches messages server-side within the couple's conversation.
 */
export async function searchMessages(
  userId: string,
  queryText: string,
  limit = 20
): Promise<ChatMessageItem[]> {
  const isMember = await isCoupleMember(userId);
  if (!isMember) {
    throw new ChatForbiddenError('Unauthorized');
  }

  const term = queryText.trim();
  if (!term) return [];

  const rawMessages = await prisma.chatMessage.findMany({
    where: {
      content: {
        contains: term,
        mode: 'insensitive',
      },
      deletedAt: null,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: MESSAGE_INCLUDE,
  });

  return rawMessages.map((m) => formatMessage(m as PrismaMessageWithRelations, userId));
}

/**
 * Returns current unread message count for the user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.chatMessage.count({
    where: {
      senderId: { not: userId },
      readAt: null,
      deletedAt: null,
    },
  });
}
