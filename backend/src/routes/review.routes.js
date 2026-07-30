import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /reviews — rate a venue you booked or a player you played with.
 * Upserts, so editing a rating replaces it rather than stacking.
 */
router.post(
  '/',
  requireAuth,
  validate(
    z.object({
      targetType: z.enum(['VENUE', 'PLAYER']),
      targetId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { targetType, targetId, rating, comment } = req.body;
    if (targetType === 'PLAYER' && targetId === req.user.id) {
      throw ApiError.badRequest('You cannot review yourself');
    }

    await assertPlayedTogether(req.user.id, targetType, targetId);

    const review = await prisma.review.upsert({
      where: {
        authorId_targetType_targetId: { authorId: req.user.id, targetType, targetId },
      },
      create: { authorId: req.user.id, targetType, targetId, rating, comment },
      update: { rating, comment },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await recalcRating(targetType, targetId);

    res.status(201).json({ review });
  }),
);

/** Only people with shared history can leave a rating. */
async function assertPlayedTogether(userId, targetType, targetId) {
  if (targetType === 'VENUE') {
    const booked = await prisma.booking.count({
      where: {
        userId,
        status: 'CONFIRMED',
        slot: { court: { venueId: targetId } },
      },
    });
    if (!booked) throw ApiError.forbidden('Book this venue before reviewing it');
    return;
  }

  const shared = await prisma.game.count({
    where: {
      OR: [
        { hostId: userId, players: { some: { userId: targetId, status: 'JOINED' } } },
        { hostId: targetId, players: { some: { userId, status: 'JOINED' } } },
        {
          AND: [
            { players: { some: { userId, status: 'JOINED' } } },
            { players: { some: { userId: targetId, status: 'JOINED' } } },
          ],
        },
      ],
    },
  });
  if (!shared) throw ApiError.forbidden('You have not played with this player yet');
}

/** Keeps the denormalised rating columns in step with the reviews table. */
async function recalcRating(targetType, targetId) {
  const agg = await prisma.review.aggregate({
    where: { targetType, targetId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const data = {
    ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
    ratingCount: agg._count.rating,
  };

  if (targetType === 'VENUE') await prisma.venue.update({ where: { id: targetId }, data });
  else await prisma.user.update({ where: { id: targetId }, data });
}

/** GET /reviews?targetType=&targetId= */
router.get(
  '/',
  validate(
    z.object({ targetType: z.enum(['VENUE', 'PLAYER']), targetId: z.string().uuid() }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.validatedQuery ?? req.query;
    const reviews = await prisma.review.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json({ reviews });
  }),
);

/** GET /reviews/pending — things the user can still rate. */
router.get(
  '/pending',
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id, status: 'CONFIRMED', slot: { endsAt: { lt: now } } },
      include: { slot: { include: { court: { include: { venue: true } } } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const reviewed = await prisma.review.findMany({
      where: { authorId: req.user.id, targetType: 'VENUE' },
      select: { targetId: true },
    });
    const done = new Set(reviewed.map((r) => r.targetId));

    const venues = [];
    const seen = new Set();
    for (const b of bookings) {
      const venue = b.slot.court.venue;
      if (done.has(venue.id) || seen.has(venue.id)) continue;
      seen.add(venue.id);
      venues.push({ id: venue.id, name: venue.name, images: venue.images, playedAt: b.slot.startsAt });
    }

    res.json({ venues });
  }),
);

export default router;
