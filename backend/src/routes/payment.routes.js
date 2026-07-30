import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { paymentDriver } from '../services/payment.service.js';
import { notify } from '../services/notification.service.js';
import { env } from '../config/env.js';

const router = Router();

/** GET /payments/config — what the mobile checkout sheet needs. */
router.get('/config', (_req, res) => {
  res.json({
    provider: paymentDriver().name,
    currency: env.payments.currency,
    razorpayKeyId: env.payments.razorpay.keyId || null,
    platformFeeBps: env.payments.platformFeeBps,
  });
});

/**
 * POST /payments/webhook — gateway callback. Mounted with a raw body parser in
 * app.js so signatures verify against the exact bytes that were signed.
 */
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const driver = paymentDriver();
    const signature =
      req.headers['x-razorpay-signature'] || req.headers['stripe-signature'] || '';
    const event = driver.verifyWebhook(req.body, signature);

    const orderId =
      event?.payload?.payment?.entity?.order_id ?? event?.data?.object?.id ?? event?.orderId;
    const paymentRef =
      event?.payload?.payment?.entity?.id ?? event?.data?.object?.id ?? event?.paymentRef;
    const type = event?.event ?? event?.type ?? 'unknown';

    if (!orderId) return res.json({ received: true, ignored: 'no order id' });

    const booking = await prisma.booking.findFirst({ where: { paymentOrderId: orderId } });
    if (!booking) return res.json({ received: true, ignored: 'unknown order' });

    const succeeded = /captured|succeeded|paid/i.test(type);
    const failed = /failed/i.test(type);

    if (succeeded && booking.status !== 'CONFIRMED') {
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED', paymentStatus: 'PAID', paymentRef },
        }),
        prisma.slot.update({
          where: { id: booking.slotId },
          data: { status: 'BOOKED', holdUntil: null },
        }),
      ]);
      await notify(booking.userId, {
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed 🎉',
        body: 'Your payment went through and the court is yours.',
        data: { bookingId: booking.id },
      });
    } else if (failed) {
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
        }),
        prisma.slot.updateMany({
          where: { id: booking.slotId, status: 'HELD' },
          data: { status: 'AVAILABLE', holdUntil: null },
        }),
      ]);
    }

    res.json({ received: true });
  }),
);

export default router;
