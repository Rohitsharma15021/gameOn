import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import type { Message } from '../types/api';

/**
 * Joins a game's chat room over Socket.IO for live messages + typing
 * indicators. REST (src/api/messages.ts) still handles history and posting
 * when the socket briefly drops, so the chat screen never fully depends on
 * the connection being up.
 */
export function useGameSocket(gameId: string, onMessage: (m: Message) => void) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !gameId) return;

    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('game:join', gameId, (res: { ok: boolean }) => {
        if (!res?.ok) console.warn('Failed to join game room');
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', (message: Message) => {
      if (message.gameId === gameId) onMessage(message);
    });

    let typingTimeout: ReturnType<typeof setTimeout>;
    socket.on('typing', ({ name, isTyping }: { name: string; isTyping: boolean }) => {
      clearTimeout(typingTimeout);
      if (isTyping) {
        setTypingUser(name);
        typingTimeout = setTimeout(() => setTypingUser(null), 3000);
      } else {
        setTypingUser(null);
      }
    });

    return () => {
      socket.emit('game:leave', gameId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId, token]);

  const sendTyping = (isTyping: boolean) => {
    socketRef.current?.emit('typing', { gameId, isTyping });
  };

  return { connected, typingUser, sendTyping };
}
