import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { distanceKm, boundingBox } from '../lib/geo.js';
import { notify, notifyMany } from '../services/notification.service.js';
import { publicUser } from '../serializers/user.js';

const router = Router();

const SKILL = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO']);
const SKILL_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'];

const gameInclude = {
  host: { select: { id: true, name: true, avatarUrl: true, skillLevel: true, ratingAvg: true } },
  venue: { select: { id: true, name: true, address: true, city: true, latitude: true, longitude: true, images: true } },
  court: { select: { id: true, name: true, sportType: true } },
  players: {
    where: { status: { in: ['JOINED', 'REQUESTED'] } },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, skillLevel: true, ratingAvg: true } },
    },
  },
};

const shape = (game, viewerId) => {
  const joined = game.players.filter((p) => p.status === 'JOINED');
  const me = game.players.find((p) => p.userId === viewerId);
  return {
    ...game,
    playerCount: joined.length,
    spotsLeft: Math.max(0, game.maxPlayers - joined.length),
    isHost: game.hostId === viewerId,
    myStatus: me?.status ?? null,
  };
};

/**
 * GET /games — "Find a Game" feed.
 * Open, upcoming games sorted by distance when the caller shares a location.
 */
router.get(
  '/',
  optionalAuth,
  validate(
    z.object({
      sport: z.string().max(40).optional(),
      skillLevel: SKILL.optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
      radiusKm: z.coerce.number().min(1).max(200).default(25),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      onlyOpen: z.coerce.boolean().default(true),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const f = q(req);
    const lat = f.lat ?? req.user?.latitude;
    const lng = f.lng ?? req.user?.longitude;
    const hasGeo = typeof lat === 'number' && typeof lng === 'number';

    const rows = await prisma.game.findMany({
      where: {
        ...(f.onlyOpen ? { status: 'OPEN' } : { status: { not: 'CANCELLED' } }),
        startsAt: { gte: f.from ?? new Date(), ...(f.to ? { lte: f.to } : {}) },
        ...(f.sport ? { sport: f.sport } : {}),
        ...(f.skillLevel ? { skillLevel: f.skillLevel } : {}),
      },
      include: gameInclude,
      orderBy: { startsAt: 'asc' },
      take: 200,
    });

    let games = rows.map((g) => {
      const gLat = g.latitude ?? g.venue?.latitude;
      const gLng = g.longitude ?? g.venue?.longitude;
      return {
        ...shape(g, req.user?.id),
        distanceKm: hasGeo && gLat != null ? Math.round(distanceKm(lat, lng, gLat, gLng) * 10) / 10 : null,
      };
    });

    if (hasGeo) {
      games = games.filter((g) => g.distanceKm == null || g.distanceKm <= f.radiusKm);
      games.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
    }

    const start = (f.page - 1) * f.limit;
    res.json({
      games: games.slice(start, start + f.limit),
      total: games.length,
      hasMore: start + f.limit < games.length,
    });
  }),
);

/** GET /games/mine — hosting + joined, upcoming first. */
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { hostId: req.user.id },
          { players: { some: { userId: req.user.id, status: { in: ['JOINED', 'REQUESTED'] } } } },
        ],
      },
      include: gameInclude,
      orderBy: { startsAt: 'asc' },
    });

    const now = new Date();
    const shaped = games.map((g) => shape(g, req.user.id));
    res.json({
      upcoming: shaped.filter((g) => g.startsAt >= now && g.status !== 'CANCELLED'),
      past: shaped.filter((g) => g.startsAt < now || g.status === 'CANCELLED'),
    });
  }),
);

/**
 * POST /games — "Host a Game".
 * If a bookingId is supplied the game inherits that slot's venue, court and
 * time, so hosting straight after a booking needs no re-entry.
 */
router.post(
  '/',
  requireAuth,
  validate(
    z
      .object({
        title: z.string().max(80).optional(),
        sport: z.string().min(1).max(40),
        skillLevel: SKILL.default('BEGINNER'),
        maxPlayers: z.number().int().min(2).max(50),
        costPerPlayer: z.number().int().min(0).default(0),
        description: z.string().max(500).optional(),
        autoApprove: z.boolean().default(true),
        bookingId: z.string().uuid().optional(),
        venueId: z.string().uuid().optional(),
        courtId: z.string().uuid().optional(),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().optional(),
        locationName: z.string().max(120).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        inviteNearby: z.boolean().default(true),
      })
      .refine((v) => v.bookingId || (v.startsAt && v.endsAt), {
        message: 'Provide either a bookingId or startsAt + endsAt',
        path: ['startsAt'],
      }),
  ),
  asyncHandler(async (req, res) => {
    const b = req.body;
    let { venueId, courtId, startsAt, endsAt, latitude, longitude, locationName } = b;

    if (b.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: b.bookingId },
        include: { slot: { include: { court: { include: { venue: true } } } }, game: true },
      });
      if (!booking) throw ApiError.notFound('Booking not found');
      if (booking.userId !== req.user.id) throw ApiError.forbidden('That booking is not yours');
      if (booking.game) throw ApiError.conflict('A game already exists for this booking');

      const venue = booking.slot.court.venue;
      venueId = venue.id;
      courtId = booking.slot.courtId;
      startsAt = booking.slot.startsAt;
      endsAt = booking.slot.endsAt;
      latitude ??= venue.latitude;
      longitude ??= venue.longitude;
      locationName ??= venue.name;
    } else if (venueId) {
      const venue = await prisma.venue.findUnique({ where: { id: venueId } });
      if (!venue) throw ApiError.notFound('Venue not found');
      latitude ??= venue.latitude;
      longitude ??= venue.longitude;
      locationName ??= venue.name;
    }

    if (endsAt <= startsAt) throw ApiError.badRequest('End time must be after start time');
    if (startsAt < new Date()) throw ApiError.badRequest('Games cannot start in the past');

    const game = await prisma.game.create({
      data: {
        hostId: req.user.id,
        title: b.title,
        sport: b.sport,
        skillLevel: b.skillLevel,
        maxPlayers: b.maxPlayers,
        costPerPlayer: b.costPerPlayer,
        description: b.description,
        autoApprove: b.autoApprove,
        bookingId: b.bookingId ?? null,
        venueId: venueId ?? null,
        courtId: courtId ?? null,
        startsAt,
        endsAt,
        latitude,
        longitude,
        locationName,
        // The host occupies one of the spots.
        players: { create: { userId: req.user.id, status: 'JOINED' } },
      },
      include: gameInclude,
    });

    if (b.inviteNearby) await inviteNearbyPlayers(game, req.user);

    res.status(201).json({ game: shape(game, req.user.id) });
  }),
);

/** Pings players within 15km who list this sport and sit at a similar level. */
async function inviteNearbyPlayers(game, host) {
  const lat = game.latitude;
  const lng = game.longitude;
  if (lat == null || lng == null) return;

  const box = boundingBox(lat, lng, 15);
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: host.id },
      sportPreferences: { has: game.sport },
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    },
    take: 100,
  });

  const hostIdx = SKILL_ORDER.indexOf(game.skillLevel);
  const matched = candidates
    .filter((u) => Math.abs(SKILL_ORDER.indexOf(u.skillLevel) - hostIdx) <= 1)
    .filter((u) => distanceKm(lat, lng, u.latitude, u.longitude) <= 15)
    .slice(0, 40);

  await notifyMany(
    matched.map((u) => u.id),
    {
      type: 'GAME_INVITE',
      title: `${game.sport} game near you`,
      body: `${host.name} is hosting at ${game.locationName ?? 'a nearby spot'} — ${game.maxPlayers} players`,
      data: { gameId: game.id },
    },
  );
}

/** GET /games/:id */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: gameInclude,
    });
    if (!game) throw ApiError.notFound('Game not found');
    res.json({ game: shape(game, req.user?.id) });
  }),
);

/** POST /games/:id/join — one-tap join, or a request when approval is manual. */
router.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: gameInclude,
    });
    if (!game) throw ApiError.notFound('Game not found');
    if (game.status === 'CANCELLED') throw ApiError.badRequest('This game was cancelled');
    if (game.startsAt < new Date()) throw ApiError.badRequest('This game has already started');

    const existing = game.players.find((p) => p.userId === req.user.id);
    if (existing?.status === 'JOINED') return res.json({ game: shape(game, req.user.id) });
    if (existing?.status === 'REQUESTED') {
      return res.json({ game: shape(game, req.user.id), pendingApproval: true });
    }

    const joinedCount = game.players.filter((p) => p.status === 'JOINED').length;
    if (joinedCount >= game.maxPlayers) throw ApiError.conflict('This game is full');

    const status = game.autoApprove ? 'JOINED' : 'REQUESTED';
    await prisma.gamePlayer.upsert({
      where: { gameId_userId: { gameId: game.id, userId: req.user.id } },
      create: { gameId: game.id, userId: req.user.id, status },
      update: { status, joinedAt: new Date() },
    });

    if (status === 'JOINED' && joinedCount + 1 >= game.maxPlayers) {
      await prisma.game.update({ where: { id: game.id }, data: { status: 'FULL' } });
    }

    await notify(game.hostId, {
      type: status === 'JOINED' ? 'GAME_PLAYER_JOINED' : 'GAME_JOIN_REQUEST',
      title: status === 'JOINED' ? 'New player joined' : 'Join request',
      body: `${req.user.name} ${status === 'JOINED' ? 'joined' : 'wants to join'} your ${game.sport} game`,
      data: { gameId: game.id, userId: req.user.id },
    });

    const fresh = await prisma.game.findUnique({ where: { id: game.id }, include: gameInclude });
    res.json({ game: shape(fresh, req.user.id), pendingApproval: status === 'REQUESTED' });
  }),
);

/** POST /games/:id/players/:userId/approve — host accepts a request. */
router.post(
  '/:id/players/:userId/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const game = await requireHost(req.params.id, req.user.id);

    const joinedCount = await prisma.gamePlayer.count({
      where: { gameId: game.id, status: 'JOINED' },
    });
    if (joinedCount >= game.maxPlayers) throw ApiError.conflict('This game is full');

    await prisma.gamePlayer.update({
      where: { gameId_userId: { gameId: game.id, userId: req.params.userId } },
      data: { status: 'JOINED' },
    });

    if (joinedCount + 1 >= game.maxPlayers) {
      await prisma.game.update({ where: { id: game.id }, data: { status: 'FULL' } });
    }

    await notify(req.params.userId, {
      type: 'GAME_JOIN_APPROVED',
      title: "You're in! 🎉",
      body: `Your request to join the ${game.sport} game was approved`,
      data: { gameId: game.id },
    });

    const fresh = await prisma.game.findUnique({ where: { id: game.id }, include: gameInclude });
    res.json({ game: shape(fresh, req.user.id) });
  }),
);

/** DELETE /games/:id/players/:userId — leave, or host removes someone. */
router.delete(
  '/:id/players/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!game) throw ApiError.notFound('Game not found');

    const isSelf = req.params.userId === req.user.id;
    if (!isSelf && game.hostId !== req.user.id) throw ApiError.forbidden();
    if (isSelf && game.hostId === req.user.id) {
      throw ApiError.badRequest('Hosts cancel the game instead of leaving it');
    }

    await prisma.gamePlayer.updateMany({
      where: { gameId: game.id, userId: req.params.userId },
      data: { status: isSelf ? 'LEFT' : 'REMOVED' },
    });

    // A departure reopens the game.
    if (game.status === 'FULL') {
      await prisma.game.update({ where: { id: game.id }, data: { status: 'OPEN' } });
    }

    if (!isSelf) {
      await notify(req.params.userId, {
        type: 'GAME_REMOVED',
        title: 'Removed from a game',
        body: `The host removed you from the ${game.sport} game`,
        data: { gameId: game.id },
      });
    }

    const fresh = await prisma.game.findUnique({ where: { id: game.id }, include: gameInclude });
    res.json({ game: shape(fresh, req.user.id) });
  }),
);

/** PATCH /games/:id — host edits. */
router.patch(
  '/:id',
  requireAuth,
  validate(
    z.object({
      title: z.string().max(80).optional(),
      description: z.string().max(500).optional(),
      skillLevel: SKILL.optional(),
      maxPlayers: z.number().int().min(2).max(50).optional(),
      costPerPlayer: z.number().int().min(0).optional(),
      autoApprove: z.boolean().optional(),
      status: z.enum(['OPEN', 'CANCELLED', 'COMPLETED']).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const game = await requireHost(req.params.id, req.user.id);
    const updated = await prisma.game.update({
      where: { id: game.id },
      data: req.body,
      include: gameInclude,
    });

    if (req.body.status === 'CANCELLED') {
      await notifyMany(
        updated.players.filter((p) => p.userId !== req.user.id).map((p) => p.userId),
        {
          type: 'GAME_CANCELLED',
          title: 'Game cancelled',
          body: `The ${game.sport} game on ${new Date(game.startsAt).toLocaleDateString('en-IN')} was cancelled`,
          data: { gameId: game.id },
        },
      );
    }

    res.json({ game: shape(updated, req.user.id) });
  }),
);

async function requireHost(gameId, userId) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw ApiError.notFound('Game not found');
  if (game.hostId !== userId) throw ApiError.forbidden('Only the host can do that');
  return game;
}

/** GET /games/:id/suggested-players — who to invite. */
router.get(
  '/:id/suggested-players',
  requireAuth,
  asyncHandler(async (req, res) => {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { players: true },
    });
    if (!game) throw ApiError.notFound('Game not found');

    const taken = new Set(game.players.map((p) => p.userId));
    const lat = game.latitude ?? req.user.latitude;
    const lng = game.longitude ?? req.user.longitude;

    const where = { sportPreferences: { has: game.sport }, id: { notIn: [...taken] } };
    if (lat != null && lng != null) {
      const box = boundingBox(lat, lng, 20);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLng, lte: box.maxLng };
    }

    const users = await prisma.user.findMany({ where, take: 30 });
    const hostIdx = SKILL_ORDER.indexOf(game.skillLevel);

    const suggestions = users
      .map((u) => ({
        user: publicUser(u),
        distanceKm:
          lat != null && u.latitude != null
            ? Math.round(distanceKm(lat, lng, u.latitude, u.longitude) * 10) / 10
            : null,
        skillGap: Math.abs(SKILL_ORDER.indexOf(u.skillLevel) - hostIdx),
      }))
      .sort((a, b) => a.skillGap - b.skillGap || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
      .slice(0, 20);

    res.json({ suggestions });
  }),
);

export default router;
