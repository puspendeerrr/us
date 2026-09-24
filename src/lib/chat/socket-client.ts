'use client';

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socketInstance) {
    // Connect to port 3001 or NEXT_PUBLIC_SOCKET_URL, withCredentials for cookie auth
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : 'http://localhost:3001');

    socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });
  }

  return socketInstance;
}
