import { Router } from 'express';
import dayjs from 'dayjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ensureSlotsForDay, dateOnly, effectiveStatus } from '../services/slot.service.js';

const router = Router();

// Every route below is for venue owners/admins managing their own listings.
router.use(requireAuth, requireRole('VENUE_OWNER', 'ADMIN'));

async function ownedVenueOrThrow(venueId, user) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) throw ApiError.notFound('Venue not found');
  if (venue.ownerId !== user.id && user.role !== 'ADMIN') throw ApiError.forbidden();
  return venue;
}

/** GET /admin/venues — venues this owner manages (all venues for ADMIN). */
router.get(
  '/venues',
  asyncHandler(async (req, res) => {
    const venues = await prisma.venue.findMany({
      where: req.user.role === 'ADMIN' ? {} : { ownerId: req.user.id },
      include: { courts: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ venues });
  }),
);

const venueSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  address: z.string().min(1).max(240),
  city: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sportsOffered: z.array(z.string().min(1).max(40)).min(1),
  amenities: z.array(z.string().min(1).max(60)).default([]),
  images: z.array(z.string().url()).default([]),
  openMinute: z.number().int().min(0).max(1439).default(360),
  closeMinute: z.number().int().min(1).max(1440).default(1380),
  phone: z.string().max(20).optional(),
});

/** POST /admin/venues — list a new venue. */
router.post(
  '/venues',
  validate(venueSchema),
  asyncHandler(async (req, res) => {
    const venue = await prisma.venue.create({ data: { ...req.body, ownerId: req.user.id } });
    res.status(201).json({ venue });
  }),
);

/** PATCH /admin/venues/:id — edit photos, pricing metadata, amenities, hours. */
router.patch(
  '/venues/:id',
  validate(venueSchema.partial()),
  asyncHandler(async (req, res) => {
    await ownedVenueOrThrow(req.params.id, req.user);
    const venue = await prisma.venue.update({ where: { id: req.params.id }, data: req.body });
    res.json({ venue });
  }),
);

router.delete(
  '/venues/:id',
  asyncHandler(async (req, res) => {
    await ownedVenueOrThrow(req.params.id, req.user);
    await prisma.venue.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).end();
  }),
);

const courtSchema = z.object({
  name: z.string().min(1).max(80),
  sportType: z.string().min(1).max(40),
  pricePerHour: z.number().int().min(0),
  slotMinutes: z.number().int().min(15).max(240).default(60),
  surface: z.string().max(60).optional(),
  isIndoor: z.boolean().default(false),
  capacity: z.number().int().min(1).max(200).default(10),
});

/** POST /admin/venues/:id/courts — add a court/turf to a venue. */
router.post(
  '/venues/:id/courts',
  validate(courtSchema),
  asyncHandler(async (req, res) => {
    await ownedVenueOrThrow(req.params.id, req.user);
    const court = await prisma.court.create({ data: { ...req.body, venueId: req.params.id } });
    res.status(201).json({ court });
  }),
);

router.patch(
  '/courts/:id',
  validate(courtSchema.partial()),
  asyncHandler(async (req, res) => {
    const court = await prisma.court.findUnique({ where: { id: req.params.id }, include: { venue: true } });
    if (!court) throw ApiError.notFound('Court not found');
    if (court.venue.ownerId !== req.user.id && req.user.role !== 'ADMIN') throw ApiError.forbidden();
    const updated = await prisma.court.update({ where: { id: req.params.id }, data: req.body });
    res.json({ court: updated });
  }),
);

router.delete(
  '/courts/:id',
  asyncHandler(async (req, res) => {
    const court = await prisma.court.findUnique({ where: { id: req.params.id }, include: { venue: true } });
    if (!court) throw ApiError.notFound('Court not found');
    if (court.venue.ownerId !== req.user.id && req.user.role !== 'ADMIN') throw ApiError.forbidden();
    await prisma.court.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).end();
  }),
);

/** GET /admin/courts/:id/calendar?date= — the day's slot grid for the owner view. */
router.get(
  '/courts/:id/calendar',
  validate(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), 'query'),
  asyncHandler(async (req, res) => {
    const court = await prisma.court.findUnique({ where: { id: req.params.id }, include: { venue: true } });
    if (!court) throw ApiError.notFound('Court not found');
    if (court.venue.ownerId !== req.user.id && req.user.role !== 'ADMIN') throw ApiError.forbidden();

    const { date } = q(req);
    const slots = await ensureSlotsForDay(court.id, date);
    const withBookings = await prisma.slot.findMany({
      where: { id: { in: slots.map((s) => s.id) } },
      include: {
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    res.json({
      slots: withBookings.map((s) => ({
        ...s,
        status: effectiveStatus(s),
        booking: s.bookings[0] ?? null,
      })),
    });
  }),
);

/** POST /admin/slots/:id/block | unblock — owner manually blocks maintenance time. */
router.post(
  '/slots/:id/block',
  asyncHandler(async (req, res) => {
    const slot = await requireOwnedSlot(req.params.id, req.user);
    if (slot.status === 'BOOKED') throw ApiError.conflict('Cannot block a booked slot');
    const updated = await prisma.slot.update({ where: { id: slot.id }, data: { status: 'BLOCKED' } });
    res.json({ slot: updated });
  }),
);

router.post(
  '/slots/:id/unblock',
  asyncHandler(async (req, res) => {
    const slot = await requireOwnedSlot(req.params.id, req.user);
    if (slot.status !== 'BLOCKED') throw ApiError.badRequest('Slot is not blocked');
    const updated = await prisma.slot.update({
      where: { id: slot.id },
      data: { status: 'AVAILABLE', holdUntil: null },
    });
    res.json({ slot: updated });
  }),
);

async function requireOwnedSlot(slotId, user) {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { court: { include: { venue: true } } },
  });
  if (!slot) throw ApiError.notFound('Slot not found');
  if (slot.court.venue.ownerId !== user.id && user.role !== 'ADMIN') throw ApiError.forbidden();
  return slot;
}

/** GET /admin/venues/:id/bookings — support tool: recent bookings + contact info. */
router.get(
  '/venues/:id/bookings',
  validate(
    z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    await ownedVenueOrThrow(req.params.id, req.user);
    const { from, to, limit } = q(req);
    const bookings = await prisma.booking.findMany({
      where: {
        slot: {
          court: { venueId: req.params.id },
          ...(from || to ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        },
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        slot: { include: { court: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ bookings });
  }),
);

/**
 * GET /admin/venues/:id/analytics?days=30 — revenue and utilisation dashboard.
 */
router.get(
  '/venues/:id/analytics',
  validate(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), 'query'),
  asyncHandler(async (req, res) => {
    await ownedVenueOrThrow(req.params.id, req.user);
    const { days } = q(req);
    const since = dayjs().subtract(days, 'day').toDate();

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        createdAt: { gte: since },
        slot: { court: { venueId: req.params.id } },
      },
      include: { slot: { include: { court: true } } },
    });

    const revenue = bookings.reduce((sum, b) => sum + b.amount - b.platformFee, 0);
    const grossRevenue = bookings.reduce((sum, b) => sum + b.amount, 0);

    const byDay = {};
    const byCourt = {};
    const bySport = {};
    for (const b of bookings) {
      const day = dayjs(b.createdAt).format('YYYY-MM-DD');
      byDay[day] = (byDay[day] || 0) + b.amount;

      const courtName = b.slot.court.name;
      byCourt[courtName] = (byCourt[courtName] || 0) + b.amount;

      const sport = b.slot.court.sportType;
      bySport[sport] = (bySport[sport] || 0) + 1;
    }

    const totalSlots = await prisma.slot.count({
      where: {
        court: { venueId: req.params.id },
        date: { gte: dateOnly(since) },
      },
    });
    const utilisation = totalSlots ? Math.round((bookings.length / totalSlots) * 1000) / 10 : 0;

    res.json({
      rangeDays: days,
      bookingCount: bookings.length,
      grossRevenue,
      netRevenue: revenue,
      utilisationPct: utilisation,
      revenueByDay: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({ date, amount })),
      revenueByCourt: Object.entries(byCourt).map(([court, amount]) => ({ court, amount })),
      bookingsBySport: Object.entries(bySport).map(([sport, count]) => ({ sport, count })),
    });
  }),
);

export default router;
