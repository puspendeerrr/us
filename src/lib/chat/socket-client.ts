'use client';

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

/**
 * Resolves the Socket.IO server URL from environment variables.
 * In local development, defaults to http://localhost:3001.
 * In production, uses NEXT_PUBLIC_SOCKET_URL and never assumes port 3001 on the web domain.
 */
export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, '');
  }

  // Local development fallback only
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3001';
  }

  // In production without NEXT_PUBLIC_SOCKET_URL, return empty string
  return '';
}

export function getSocketClient(): Socket {
  if (!socketInstance) {
    const socketUrl = getSocketUrl();

    socketInstance = io(socketUrl || 'http://localhost:3001', {
      withCredentials: true,
      autoConnect: false,
      reconnection: Boolean(socketUrl),
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    if (!socketUrl && process.env.NODE_ENV === 'production') {
      console.warn(
        '[SocketClient] NEXT_PUBLIC_SOCKET_URL is not set. Real-time chat will remain in REST fallback mode until configured.'
      );
    }
  }

  return socketInstance;
}
