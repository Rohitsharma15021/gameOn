import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate, q } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { paymentDriver, platformFee } from '../services/payment.service.js';
import { holdExpiry } from '../services/slot.service.js';
import { notify, notifyMany } from '../services/notification.service.js';
import { env } from '../config/env.js';

const router = Router();

const bookingInclude = {
  slot: { include: { court: { include: { venue: true } } } },
  splits: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
  game: { select: { id: true, sport: true, status: true, maxPlayers: true } },
};

/**
 * POST /bookings — reserves a slot and opens a payment order.
 *
 * The slot is claimed with a conditional updateMany so two players tapping the
 * same slot at the same moment cannot both win: exactly one update matches.
 */
router.post(
  '/',
  requireAuth,
  validate(
    z.object({
      slotId: z.string().uuid(),
      notes: z.string().max(280).optional(),
      splitWith: z
        .array(
          z.object({
            userId: z.string().uuid().optional(),
            phone: z.string().min(6).max(20).optional(),
            name: z.string().max(60).optional(),
          }),
        )
        .max(20)
        .optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { slotId, notes, splitWith = [] } = req.body;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { court: { include: { venue: true } } },
    });
    if (!slot) throw ApiError.notFound('Slot not found');
    if (slot.startsAt < new Date()) throw ApiError.badRequest('That slot has already started');

    // Claim the slot: available, or a hold that has since lapsed.
    const claimed = await prisma.slot.updateMany({
      where: {
        id: slotId,
        OR: [{ status: 'AVAILABLE' }, { status: 'HELD', holdUntil: { lt: new Date() } }],
      },
      data: { status: 'HELD', holdUntil: holdExpiry() },
    });
    if (claimed.count === 0) throw ApiError.conflict('That slot was just taken. Pick another.');

    const amount = slot.price;
    const fee = platformFee(amount);

    // Payer + each invited friend share the cost evenly.
    const shares = splitEvenly(amount, splitWith.length + 1);

    try {
      const driver = paymentDriver();
      const order = await driver.createOrder({
        amount: shares[0],
        currency: env.payments.currency,
        receipt: `booking_${slot.id.slice(0, 8)}`,
        notes: { venue: slot.court.venue.name, court: slot.court.name },
      });

      const booking = await prisma.booking.create({
        data: {
          userId: req.user.id,
          slotId: slot.id,
          amount,
          platformFee: fee,
          currency: env.payments.currency,
          notes,
          paymentProvider: driver.name,
          paymentOrderId: order.orderId,
          splits: {
            create: [
              {
                userId: req.user.id,
                name: req.user.name,
                phone: req.user.phone,
                amount: shares[0],
              },
              ...splitWith.map((p, i) => ({
                userId: p.userId ?? null,
                phone: p.phone ?? null,
                name: p.name ?? null,
                amount: shares[i + 1],
              })),
            ],
          },
        },
        include: bookingInclude,
      });

      res.status(201).json({
        booking,
        payment: { ...order.checkout, amountDue: shares[0] },
        holdExpiresAt: holdExpiry(),
      });
    } catch (err) {
      // Do not sit on a slot we failed to charge for.
      await prisma.slot.updateMany({
        where: { id: slotId, status: 'HELD' },
        data: { status: 'AVAILABLE', holdUntil: null },
      });
      throw err;
    }
  }),
);

/** Splits an integer amount without losing or inventing paise. */
function splitEvenly(total, parts) {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * POST /bookings/:id/confirm — verifies the gateway payload and books the slot.
 */
router.post(
  '/:id/confirm',
  requireAuth,
  validate(
    z.object({
      paymentId: z.string().optional(),
      signature: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== req.user.id) throw ApiError.forbidden();
    if (booking.status === 'CONFIRMED') return res.json({ booking });
    if (booking.status === 'CANCELLED') throw ApiError.badRequest('This booking was cancelled');

    const driver = paymentDriver();
    const { ok, paymentRef } = await driver.verifyPayment({
      orderId: booking.paymentOrderId,
      paymentId: req.body.paymentId,
      signature: req.body.signature,
    });

    if (!ok) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'FAILED' },
      });
      throw ApiError.badRequest('Payment could not be verified');
    }

    const [updated] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID', paymentRef },
        include: bookingInclude,
      }),
      prisma.slot.update({
        where: { id: booking.slotId },
        data: { status: 'BOOKED', holdUntil: null },
      }),
      prisma.bookingSplit.updateMany({
        where: { bookingId: booking.id, userId: req.user.id },
        data: { status: 'PAID', paidAt: new Date() },
      }),
    ]);

    const venue = booking.slot.court.venue;
    await notify(req.user.id, {
      type: 'BOOKING_CONFIRMED',
      title: 'Booking confirmed 🎉',
      body: `${venue.name} · ${booking.slot.court.name} on ${formatWhen(booking.slot.startsAt)}`,
      data: { bookingId: booking.id, venueId: venue.id },
    });

    // Nudge everyone who owes their share.
    const owed = updated.splits.filter((s) => s.userId && s.userId !== req.user.id);
    await notifyMany(
      owed.map((s) => s.userId),
      {
        type: 'SPLIT_REQUEST',
        title: `${req.user.name} split a booking with you`,
        body: `${venue.name} on ${formatWhen(booking.slot.startsAt)} — your share is ${money(owed[0]?.amount ?? 0)}`,
        data: { bookingId: booking.id },
      },
    );

    res.json({ booking: updated });
  }),
);

const money = (paise) => `₹${(paise / 100).toFixed(0)}`;
const formatWhen = (d) =>
  new Date(d).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

/** GET /bookings?scope=upcoming|past|all */
router.get(
  '/',
  requireAuth,
  validate(
    z.object({
      scope: z.enum(['upcoming', 'past', 'all']).default('all'),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { scope, limit } = q(req);
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ userId: req.user.id }, { splits: { some: { userId: req.user.id } } }],
        ...(scope === 'upcoming'
          ? { status: { not: 'CANCELLED' }, slot: { startsAt: { gte: now } } }
          : {}),
        ...(scope === 'past' ? { slot: { startsAt: { lt: now } } } : {}),
      },
      include: bookingInclude,
      orderBy: { slot: { startsAt: scope === 'past' ? 'desc' : 'asc' } },
      take: limit,
    });

    res.json({ bookings });
  }),
);

/** GET /bookings/:id */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });
    if (!booking) throw ApiError.notFound('Booking not found');

    const isParticipant =
      booking.userId === req.user.id || booking.splits.some((s) => s.userId === req.user.id);
    if (!isParticipant) throw ApiError.forbidden();

    res.json({ booking });
  }),
);

/** POST /bookings/:id/splits/:splitId/pay — a friend settles their share. */
router.post(
  '/:id/splits/:splitId/pay',
  requireAuth,
  asyncHandler(async (req, res) => {
    const split = await prisma.bookingSplit.findUnique({
      where: { id: req.params.splitId },
      include: { booking: { include: { slot: true } } },
    });
    if (!split || split.bookingId !== req.params.id) throw ApiError.notFound('Split not found');
    if (split.status === 'PAID') return res.json({ split });

    const claimable = !split.userId || split.userId === req.user.id;
    if (!claimable) throw ApiError.forbidden('This share belongs to another player');

    const driver = paymentDriver();
    const order = await driver.createOrder({
      amount: split.amount,
      currency: env.payments.currency,
      receipt: `split_${split.id.slice(0, 8)}`,
      notes: { bookingId: split.bookingId },
    });
    const { ok, paymentRef } = await driver.verifyPayment({ orderId: order.orderId });
    if (!ok) throw ApiError.badRequest('Payment failed');

    const updated = await prisma.bookingSplit.update({
      where: { id: split.id },
      data: { status: 'PAID', paidAt: new Date(), userId: req.user.id },
    });

    await notify(split.booking.userId, {
      type: 'SPLIT_PAID',
      title: 'Share settled',
      body: `${req.user.name} paid ${money(split.amount)} towards your booking`,
      data: { bookingId: split.bookingId },
    });

    res.json({ split: updated, paymentRef });
  }),
);

/**
 * POST /bookings/:id/cancel — frees the slot. Refunds are full up to 12h before
 * start, then forfeited; adjust `refundWindowHours` to match your policy.
 */
router.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { slot: true },
    });
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== req.user.id) throw ApiError.forbidden();
    if (booking.status === 'CANCELLED') return res.json({ booking });

    const refundWindowHours = 12;
    const hoursToStart = (booking.slot.startsAt - Date.now()) / 3600000;
    const refundable = booking.paymentStatus === 'PAID' && hoursToStart >= refundWindowHours;

    const [updated] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          paymentStatus: refundable ? 'REFUNDED' : booking.paymentStatus,
        },
        include: bookingInclude,
      }),
      prisma.slot.update({
        where: { id: booking.slotId },
        data: { status: 'AVAILABLE', holdUntil: null },
      }),
    ]);

    res.json({
      booking: updated,
      refund: {
        eligible: refundable,
        amount: refundable ? booking.amount : 0,
        reason: refundable ? null : `Cancellations within ${refundWindowHours}h are non-refundable`,
      },
    });
  }),
);

export default router;
