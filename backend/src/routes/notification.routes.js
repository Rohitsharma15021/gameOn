import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  validate(
    z.object({
      unreadOnly: z.coerce.boolean().default(false),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { unreadOnly, limit } = q(req);
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id, ...(unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);
    res.json({ notifications, unreadCount });
  }),
);

router.post(
  '/read',
  requireAuth,
  validate(z.object({ ids: z.array(z.string().uuid()).optional() })),
  asyncHandler(async (req, res) => {
    const { count } = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null,
        ...(req.body.ids?.length ? { id: { in: req.body.ids } } : {}),
      },
      data: { readAt: new Date() },
    });
    res.json({ updated: count });
  }),
);

export default router;
