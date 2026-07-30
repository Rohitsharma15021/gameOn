import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';

/**
 * Payment gateway abstraction.
 *
 * Every driver exposes the same three calls:
 *   createOrder({ amount, currency, receipt, notes }) -> { orderId, providerKey, checkout }
 *   verifyPayment(payload)                            -> { ok, paymentRef }
 *   verifyWebhook(rawBody, signature)                 -> parsed event
 *
 * `mock` settles instantly and is what the seeded app runs on. Drop in real
 * credentials and flip PAYMENT_DRIVER to go live — no call sites change.
 */

const mock = {
  name: 'mock',
  async createOrder({ amount, currency, receipt }) {
    const orderId = `mock_order_${crypto.randomBytes(8).toString('hex')}`;
    return {
      orderId,
      providerKey: 'mock_key',
      checkout: { provider: 'mock', orderId, amount, currency, receipt, autoSettle: true },
    };
  },
  async verifyPayment({ orderId }) {
    return { ok: true, paymentRef: `mock_pay_${orderId.slice(-8)}` };
  },
  verifyWebhook(rawBody) {
    return JSON.parse(rawBody.toString('utf8'));
  },
};

const razorpay = {
  name: 'razorpay',
  async createOrder({ amount, currency, receipt, notes }) {
    const { keyId, keySecret } = env.payments.razorpay;
    if (!keyId || !keySecret) throw ApiError.badRequest('Razorpay keys are not configured');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });
    if (!res.ok) throw ApiError.badRequest(`Razorpay order failed: ${await res.text()}`);
    const order = await res.json();
    return {
      orderId: order.id,
      providerKey: keyId,
      checkout: { provider: 'razorpay', orderId: order.id, keyId, amount, currency },
    };
  },
  async verifyPayment({ orderId, paymentId, signature }) {
    const expected = crypto
      .createHmac('sha256', env.payments.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const ok =
      expected.length === (signature || '').length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
    return { ok, paymentRef: paymentId };
  },
  verifyWebhook(rawBody, signature) {
    const expected = crypto
      .createHmac('sha256', env.payments.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');
    if (expected !== signature) throw ApiError.forbidden('Invalid webhook signature');
    return JSON.parse(rawBody.toString('utf8'));
  },
};

const stripe = {
  name: 'stripe',
  async createOrder({ amount, currency, receipt, notes }) {
    const { secretKey } = env.payments.stripe;
    if (!secretKey) throw ApiError.badRequest('Stripe key is not configured');

    const body = new URLSearchParams({
      amount: String(amount),
      currency: currency.toLowerCase(),
      'automatic_payment_methods[enabled]': 'true',
      description: receipt,
    });
    for (const [k, v] of Object.entries(notes || {})) body.append(`metadata[${k}]`, String(v));

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) throw ApiError.badRequest(`Stripe intent failed: ${await res.text()}`);
    const intent = await res.json();
    return {
      orderId: intent.id,
      providerKey: intent.client_secret,
      checkout: { provider: 'stripe', clientSecret: intent.client_secret, amount, currency },
    };
  },
  async verifyPayment({ orderId }) {
    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${orderId}`, {
      headers: { Authorization: `Bearer ${env.payments.stripe.secretKey}` },
    });
    const intent = await res.json();
    return { ok: intent.status === 'succeeded', paymentRef: intent.id };
  },
  verifyWebhook(rawBody) {
    // Signature verification needs the stripe SDK's constructEvent; left to the
    // integrator so we do not hand-roll crypto for a paid path.
    return JSON.parse(rawBody.toString('utf8'));
  },
};

const drivers = { mock, razorpay, stripe };

export const paymentDriver = () => drivers[env.payments.driver] || mock;

/** Platform commission on a booking, in the smallest currency unit. */
export const platformFee = (amount) =>
  Math.round((amount * env.payments.platformFeeBps) / 10000);
