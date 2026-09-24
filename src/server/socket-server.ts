import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { validateSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getPartner, getDeterministicRoomId } from '@/lib/chat/chat.permissions';
import {
  sendMessage,
  markMessagesRead,
  toggleReaction,
  deleteMessage,
} from '@/lib/chat/chat.service';
import { ReactionType } from '@/lib/chat/chat.types';

const PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function createSocketServer(httpServer?: any): SocketIOServer {
  const server = httpServer || createServer();

  const io = new SocketIOServer(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  ioInstance = io;

  // Server-side authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const parsedCookies = cookie.parseCookie ? cookie.parseCookie(cookieHeader) : {};
      const token = (parsedCookies as Record<string, string>)[SESSION_COOKIE_NAME] || (socket.handshake.auth?.token as string);

      if (!token) {
        return next(new Error('Authentication required: no session token found'));
      }

      const user = await validateSessionToken(token);
      if (!user) {
        return next(new Error('Authentication failed: invalid or expired session'));
      }

      const partner = await getPartner(user.id);
      if (!partner) {
        return next(new Error('Authentication failed: partner account not configured'));
      }

      // Securely attach identity to socket context
      socket.data.user = user;
      socket.data.partner = partner;
      socket.data.roomId = getDeterministicRoomId(user.id, partner.id);

      next();
    } catch (err: unknown) {
      console.error('Socket authentication error:', err);
      next(new Error('Internal authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    const roomId = socket.data.roomId;

    // Join the deterministic private couple room
    socket.join(roomId);

    // 1. Send Message
    socket.on('message:send', async (payload: { content: string; replyToId?: string }, callback) => {
      try {
        if (!payload || typeof payload.content !== 'string' || !payload.content.trim()) {
          if (callback) callback({ error: 'Message content is required' });
          return;
        }

        const message = await sendMessage(user.id, {
          content: payload.content,
          replyToId: payload.replyToId,
        });

        // Broadcast to both partners in the couple room
        io.to(roomId).emit('message:new', message);

        if (callback) callback({ success: true, message });
      } catch (err: unknown) {
        console.error('Socket message:send error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
        if (callback) callback({ error: errorMsg });
      }
    });

    // 2. Mark Read
    socket.on('message:read', async (payload: { messageIds?: string[] } = {}, callback) => {
      try {
        const result = await markMessagesRead(user.id, payload.messageIds);
        if (result.count > 0) {
          io.to(roomId).emit('message:read_receipt', {
            readerId: user.id,
            messageIds: payload.messageIds,
            readAt: result.readAt,
            count: result.count,
          });
        }
        if (callback) callback({ success: true, ...result });
      } catch (err: unknown) {
        console.error('Socket message:read error:', err);
        if (callback) callback({ error: 'Failed to mark messages as read' });
      }
    });

    // 3. Toggle Reaction
    socket.on('message:react', async (payload: { messageId: string; reaction: ReactionType }, callback) => {
      try {
        if (!payload.messageId || !payload.reaction) {
          if (callback) callback({ error: 'messageId and reaction are required' });
          return;
        }

        const updatedMessage = await toggleReaction(user.id, payload.messageId, payload.reaction);
        io.to(roomId).emit('message:reaction_updated', updatedMessage);

        if (callback) callback({ success: true, message: updatedMessage });
      } catch (err: unknown) {
        console.error('Socket message:react error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to toggle reaction';
        if (callback) callback({ error: errorMsg });
      }
    });

    // 4. Delete Message
    socket.on('message:delete', async (payload: { messageId: string }, callback) => {
      try {
        if (!payload.messageId) {
          if (callback) callback({ error: 'messageId is required' });
          return;
        }

        const updatedMessage = await deleteMessage(user.id, payload.messageId);
        io.to(roomId).emit('message:deleted', updatedMessage);

        if (callback) callback({ success: true, message: updatedMessage });
      } catch (err: unknown) {
        console.error('Socket message:delete error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete message';
        if (callback) callback({ error: errorMsg });
      }
    });

    // 5. Typing Indicators (ephemeral, never stored in DB)
    socket.on('typing:start', () => {
      socket.to(roomId).emit('typing:start', {
        userId: user.id,
        displayName: user.displayName,
      });
    });

    socket.on('typing:stop', () => {
      socket.to(roomId).emit('typing:stop', {
        userId: user.id,
      });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('typing:stop', {
        userId: user.id,
      });
    });
  });

  if (!httpServer) {
    server.listen(PORT, () => {
      console.log(`Socket.IO server running on port ${PORT}`);
    });
  }

  return io;
}

// Standalone runner if executed directly via tsx
if (process.env.RUN_STANDALONE_SOCKET === 'true' || require.main === module) {
  createSocketServer();
}
