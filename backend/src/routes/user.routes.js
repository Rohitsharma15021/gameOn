import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { publicUser } from '../serializers/user.js';

const router = Router();

const SKILL = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO']);

const profileSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  email: z.string().email().optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  sportPreferences: z.array(z.string().min(1).max(40)).max(12).optional(),
  skillLevel: SKILL.optional(),
});

/** PATCH /users/me — profile setup and later edits share one endpoint. */
router.patch(
  '/me',
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
    });
    res.json({ user: publicUser(user, { self: true }) });
  }),
);

/** POST /users/me/onboarding — marks profile setup complete. */
router.post(
  '/me/onboarding',
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...req.body, onboardedAt: new Date() },
    });
    res.json({ user: publicUser(user, { self: true }) });
  }),
);

/** GET /users/:id — public player profile with history and badges. */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const self = req.user?.id === req.params.id;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw ApiError.notFound('Player not found');

    const [hostedCount, playedCount, reviews, recentGames] = await Promise.all([
      prisma.game.count({ where: { hostId: user.id } }),
      prisma.gamePlayer.count({ where: { userId: user.id, status: 'JOINED' } }),
      prisma.review.findMany({
        where: { targetType: 'PLAYER', targetId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.game.findMany({
        where: {
          startsAt: { lt: new Date() },
          players: { some: { userId: user.id, status: 'JOINED' } },
        },
        orderBy: { startsAt: 'desc' },
        take: 5,
        include: { venue: { select: { id: true, name: true, city: true } } },
      }),
    ]);

    res.json({
      user: publicUser(user, { self }),
      stats: { hostedCount, playedCount, reviewCount: reviews.length },
      badges: computeBadges({ hostedCount, playedCount, user }),
      reviews,
      recentGames,
    });
  }),
);

function computeBadges({ hostedCount, playedCount, user }) {
  const badges = [];
  if (playedCount >= 1) badges.push({ key: 'first_game', label: 'First Game', icon: '🎯' });
  if (playedCount >= 10) badges.push({ key: 'regular', label: 'Regular', icon: '🔥' });
  if (playedCount >= 50) badges.push({ key: 'veteran', label: 'Veteran', icon: '🏆' });
  if (hostedCount >= 5) badges.push({ key: 'organiser', label: 'Organiser', icon: '📣' });
  if (user.ratingCount >= 5 && user.ratingAvg >= 4.5) {
    badges.push({ key: 'great_teammate', label: 'Great Teammate', icon: '⭐' });
  }
  if (user.skillLevel === 'PRO') badges.push({ key: 'pro', label: 'Pro', icon: '💎' });
  return badges;
}

/** GET /users?sport=&skill=&near= — player search, used by game invites. */
router.get(
  '/',
  requireAuth,
  validate(
    z.object({
      search: z.string().max(60).optional(),
      sport: z.string().max(40).optional(),
      skillLevel: SKILL.optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { search, sport, skillLevel, limit } = q(req);
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(sport ? { sportPreferences: { has: sport } } : {}),
        ...(skillLevel ? { skillLevel } : {}),
      },
      take: limit,
      orderBy: { ratingAvg: 'desc' },
    });
    res.json({ users: users.map((u) => publicUser(u)) });
  }),
);

export default router;
