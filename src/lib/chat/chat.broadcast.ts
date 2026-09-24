import { getIO } from '@/server/socket-server';
import { getPartner, getDeterministicRoomId } from './chat.permissions';
import { ChatMessageItem } from './chat.types';

/**
 * Broadcasts an event to the couple's Socket.IO room if the socket server is running in-process.
 */
export async function broadcastToCoupleRoom(
  senderId: string,
  event: string,
  data: any
): Promise<void> {
  const io = getIO();
  if (!io) return;

  try {
    const partner = await getPartner(senderId);
    if (!partner) return;

    const roomId = getDeterministicRoomId(senderId, partner.id);
    io.to(roomId).emit(event, data);
  } catch (err) {
    console.error('Failed to broadcast to couple room:', err);
  }
}
