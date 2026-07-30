import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { isGameMember } from '../lib/gameAccess.js';
import { setIo } from './io.js';

/**
 * Real-time layer for game group chat. Auth happens once at the handshake
 * (JWT in `auth.token`); room membership is re-checked on every join so a
 * removed player can't keep listening on a stale socket.
 */
export function createChatGateway(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return next(new Error('Account no longer exists'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('game:join', async (gameId, ack) => {
      if (typeof gameId !== 'string') return ack?.({ ok: false, error: 'gameId required' });
      const allowed = await isGameMember(gameId, socket.user.id);
      if (!allowed) return ack?.({ ok: false, error: 'Not a member of this game' });
      socket.join(`game:${gameId}`);
      ack?.({ ok: true });
    });

    socket.on('game:leave', (gameId) => {
      socket.leave(`game:${gameId}`);
    });

    socket.on('message:send', async ({ gameId, text }, ack) => {
      try {
        if (!gameId || !text?.trim()) throw new Error('gameId and text are required');
        if (text.length > 1000) throw new Error('Message is too long');
        if (!(await isGameMember(gameId, socket.user.id))) throw new Error('Not a member of this game');

        const message = await prisma.message.create({
          data: { gameId, senderId: socket.user.id, text: text.trim() },
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        });

        io.to(`game:${gameId}`).emit('message:new', message);
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('typing', ({ gameId, isTyping }) => {
      if (!gameId) return;
      socket.to(`game:${gameId}`).emit('typing', {
        userId: socket.user.id,
        name: socket.user.name,
        isTyping: !!isTyping,
      });
    });
  });

  setIo(io);
  return io;
}
