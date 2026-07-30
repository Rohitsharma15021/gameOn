import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { isGameMember } from '../lib/gameAccess.js';
import { getIo } from '../sockets/io.js';
import { notifyMany } from '../services/notification.service.js';

const router = Router({ mergeParams: true });

const senderSelect = { select: { id: true, name: true, avatarUrl: true } };

/** GET /games/:gameId/messages?before=<iso> — newest last, cursor paginated. */
router.get(
  '/',
  requireAuth,
  validate(
    z.object({
      before: z.coerce.date().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    if (!(await isGameMember(gameId, req.user.id))) {
      throw ApiError.forbidden('Join the game to see its chat');
    }

    const { before, limit } = q(req);
    const rows = await prisma.message.findMany({
      where: { gameId, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { sender: senderSelect },
    });

    res.json({
      messages: rows.reverse(),
      hasMore: rows.length === limit,
      nextCursor: rows.length ? rows[0].createdAt : null,
    });
  }),
);

/** POST /games/:gameId/messages — also broadcast over the socket room. */
router.post(
  '/',
  requireAuth,
  validate(z.object({ text: z.string().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    if (!(await isGameMember(gameId, req.user.id))) {
      throw ApiError.forbidden('Join the game to post in its chat');
    }

    const message = await prisma.message.create({
      data: { gameId, senderId: req.user.id, text: req.body.text },
      include: { sender: senderSelect },
    });

    getIo()?.to(`game:${gameId}`).emit('message:new', message);

    const members = await prisma.gamePlayer.findMany({
      where: { gameId, status: 'JOINED', userId: { not: req.user.id } },
      select: { userId: true },
    });
    await notifyMany(
      members.map((m) => m.userId),
      {
        type: 'CHAT_MESSAGE',
        title: req.user.name,
        body: req.body.text.slice(0, 120),
        data: { gameId },
      },
    );

    res.status(201).json({ message });
  }),
);

export default router;
