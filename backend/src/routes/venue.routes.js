import { Router } from 'express';
import dayjs from 'dayjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { distanceKm, boundingBox } from '../lib/geo.js';
import { ensureSlotsForDay, effectiveStatus, dateOnly } from '../services/slot.service.js';

const router = Router();

const discoverySchema = z.object({
  search: z.string().max(80).optional(),
  sport: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.5).max(100).default(25),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  amenities: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : v.split(','))),
  sort: z.enum(['distance', 'rating', 'price']).default('distance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * GET /venues — map + list discovery.
 * Filters in SQL, then does the exact distance pass in JS. Fine to tens of
 * thousands of venues; swap in PostGIS when that stops being true.
 */
router.get(
  '/',
  optionalAuth,
  validate(discoverySchema, 'query'),
  asyncHandler(async (req, res) => {
    const f = q(req);
    const lat = f.lat ?? req.user?.latitude ?? undefined;
    const lng = f.lng ?? req.user?.longitude ?? undefined;
    const hasGeo = typeof lat === 'number' && typeof lng === 'number';

    const where = {
      isActive: true,
      ...(f.search
        ? {
            OR: [
              { name: { contains: f.search, mode: 'insensitive' } },
              { address: { contains: f.search, mode: 'insensitive' } },
              { city: { contains: f.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(f.sport ? { sportsOffered: { has: f.sport } } : {}),
      ...(f.city ? { city: { equals: f.city, mode: 'insensitive' } } : {}),
      ...(f.amenities?.length ? { amenities: { hasEvery: f.amenities } } : {}),
      ...(f.minRating ? { ratingAvg: { gte: f.minRating } } : {}),
      ...(hasGeo
        ? (() => {
            const b = boundingBox(lat, lng, f.radiusKm);
            return {
              latitude: { gte: b.minLat, lte: b.maxLat },
              longitude: { gte: b.minLng, lte: b.maxLng },
            };
          })()
        : {}),
      ...(f.minPrice != null || f.maxPrice != null
        ? {
            courts: {
              some: {
                isActive: true,
                ...(f.sport ? { sportType: f.sport } : {}),
                pricePerHour: {
                  ...(f.minPrice != null ? { gte: f.minPrice } : {}),
                  ...(f.maxPrice != null ? { lte: f.maxPrice } : {}),
                },
              },
            },
          }
        : {}),
    };

    const rows = await prisma.venue.findMany({
      where,
      include: {
        courts: {
          where: { isActive: true },
          select: { id: true, sportType: true, pricePerHour: true, name: true },
        },
      },
    });

    let venues = rows.map((v) => {
      const prices = v.courts.map((c) => c.pricePerHour);
      return {
        ...v,
        startingPrice: prices.length ? Math.min(...prices) : null,
        distanceKm: hasGeo ? round1(distanceKm(lat, lng, v.latitude, v.longitude)) : null,
      };
    });

    if (hasGeo) venues = venues.filter((v) => v.distanceKm != null && v.distanceKm <= f.radiusKm);

    venues.sort((a, b) => {
      if (f.sort === 'rating') return b.ratingAvg - a.ratingAvg;
      if (f.sort === 'price') return (a.startingPrice ?? 1e9) - (b.startingPrice ?? 1e9);
      return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
    });

    const total = venues.length;
    const start = (f.page - 1) * f.limit;
    res.json({
      venues: venues.slice(start, start + f.limit),
      page: f.page,
      limit: f.limit,
      total,
      hasMore: start + f.limit < total,
    });
  }),
);

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

/** GET /venues/:id — detail page payload. */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const venue = await prisma.venue.findUnique({
      where: { id: req.params.id },
      include: {
        courts: { where: { isActive: true }, orderBy: { pricePerHour: 'asc' } },
        owner: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!venue || !venue.isActive) throw ApiError.notFound('Venue not found');

    const [reviews, upcomingGames] = await Promise.all([
      prisma.review.findMany({
        where: { targetType: 'VENUE', targetId: venue.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.game.findMany({
        where: { venueId: venue.id, status: 'OPEN', startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        include: { host: { select: { id: true, name: true, avatarUrl: true } } },
      }),
    ]);

    const distance =
      req.user?.latitude != null
        ? round1(distanceKm(req.user.latitude, req.user.longitude, venue.latitude, venue.longitude))
        : null;

    res.json({
      venue: {
        ...venue,
        distanceKm: distance,
        startingPrice: venue.courts.length
          ? Math.min(...venue.courts.map((c) => c.pricePerHour))
          : null,
      },
      reviews,
      upcomingGames,
    });
  }),
);

/**
 * GET /venues/:id/availability?date=YYYY-MM-DD&sport=
 * Returns every court's slot grid for the day, with past slots marked unavailable.
 */
router.get(
  '/:id/availability',
  optionalAuth,
  validate(
    z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .default(dayjs().format('YYYY-MM-DD')),
      sport: z.string().max(40).optional(),
      courtId: z.string().uuid().optional(),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { date, sport, courtId } = q(req);

    const courts = await prisma.court.findMany({
      where: {
        venueId: req.params.id,
        isActive: true,
        ...(sport ? { sportType: sport } : {}),
        ...(courtId ? { id: courtId } : {}),
      },
      orderBy: { name: 'asc' },
    });
    if (!courts.length) throw ApiError.notFound('No courts match that filter');

    const now = new Date();
    const grids = await Promise.all(
      courts.map(async (court) => {
        const slots = await ensureSlotsForDay(court.id, date);
        return {
          court: {
            id: court.id,
            name: court.name,
            sportType: court.sportType,
            pricePerHour: court.pricePerHour,
            slotMinutes: court.slotMinutes,
            isIndoor: court.isIndoor,
            surface: court.surface,
          },
          slots: slots.map((s) => {
            const status = effectiveStatus(s);
            return {
              id: s.id,
              startsAt: s.startsAt,
              endsAt: s.endsAt,
              price: s.price,
              status: s.startsAt < now && status === 'AVAILABLE' ? 'UNAVAILABLE' : status,
            };
          }),
        };
      }),
    );

    res.json({ date, courts: grids });
  }),
);

/** GET /venues/:id/reviews */
router.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { targetType: 'VENUE', targetId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json({ reviews });
  }),
);

/** GET /venues/meta/sports — filter chips for the search screen. */
router.get(
  '/meta/sports',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.court.groupBy({
      by: ['sportType'],
      _count: { sportType: true },
      _min: { pricePerHour: true },
      orderBy: { _count: { sportType: 'desc' } },
    });
    res.json({
      sports: rows.map((r) => ({
        sport: r.sportType,
        courtCount: r._count.sportType,
        fromPrice: r._min.pricePerHour,
      })),
    });
  }),
);

export default router;
