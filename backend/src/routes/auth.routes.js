import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { requestOtp, verifyOtp, normalisePhone } from '../services/otp.service.js';
import { env } from '../config/env.js';
import { publicUser } from '../serializers/user.js';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const makeReferralCode = (name) =>
  `${(name || 'GO').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'GO'}${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;

async function findOrCreateUser({ phone, name, email, avatarUrl, referredByCode }) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return { user: existing, isNew: false };

  let referredById = null;
  if (referredByCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } });
    referredById = referrer?.id ?? null;
  }

  const user = await prisma.user.create({
    data: {
      phone,
      name: name || 'Player',
      email: email || null,
      avatarUrl: avatarUrl || null,
      referralCode: makeReferralCode(name),
      referredById,
    },
  });

  if (referredById) {
    // Both sides earn points once the referred user signs up.
    await prisma.user.updateMany({
      where: { id: { in: [referredById, user.id] } },
      data: { rewardPoints: { increment: 100 } },
    });
  }

  return { user, isNew: true };
}

/** POST /auth/otp/request — sends a login code. */
router.post(
  '/otp/request',
  otpLimiter,
  validate(z.object({ phone: z.string().min(6).max(20) })),
  asyncHandler(async (req, res) => {
    const result = await requestOtp(req.body.phone);
    res.json(result);
  }),
);

/** POST /auth/otp/verify — exchanges a code for a session token. */
router.post(
  '/otp/verify',
  otpLimiter,
  validate(
    z.object({
      phone: z.string().min(6).max(20),
      code: z.string().min(4).max(8),
      name: z.string().min(1).max(60).optional(),
      referralCode: z.string().max(20).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const phone = await verifyOtp(req.body.phone, req.body.code);
    const { user, isNew } = await findOrCreateUser({
      phone,
      name: req.body.name,
      referredByCode: req.body.referralCode,
    });

    res.json({
      token: signToken(user),
      user: publicUser(user, { self: true }),
      isNewUser: isNew,
      needsOnboarding: !user.onboardedAt,
    });
  }),
);

/**
 * POST /auth/oauth — Google / Apple sign-in.
 * The client performs the native flow and posts the resulting ID token; we
 * verify it against the provider's tokeninfo endpoint before trusting it.
 */
router.post(
  '/oauth',
  validate(
    z.object({
      provider: z.enum(['google', 'apple']),
      idToken: z.string().min(10),
      phone: z.string().min(6).max(20).optional(),
      referralCode: z.string().max(20).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const profile = await verifyOAuthToken(req.body.provider, req.body.idToken);

    // Apple hides the phone number, so an OAuth-only account is keyed on email
    // with a placeholder phone the user can replace during onboarding.
    const phone = req.body.phone
      ? normalisePhone(req.body.phone)
      : `oauth:${profile.provider}:${profile.sub}`;

    const byEmail = profile.email
      ? await prisma.user.findUnique({ where: { email: profile.email } })
      : null;

    const { user, isNew } = byEmail
      ? { user: byEmail, isNew: false }
      : await findOrCreateUser({
          phone,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.picture,
          referredByCode: req.body.referralCode,
        });

    res.json({
      token: signToken(user),
      user: publicUser(user, { self: true }),
      isNewUser: isNew,
      needsOnboarding: !user.onboardedAt,
    });
  }),
);

async function verifyOAuthToken(provider, idToken) {
  if (provider === 'google') {
    if (!env.oauth.googleClientId) throw ApiError.badRequest('Google sign-in is not configured');
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) throw ApiError.unauthorized('Invalid Google token');
    const info = await res.json();
    if (info.aud !== env.oauth.googleClientId) throw ApiError.unauthorized('Token audience mismatch');
    return {
      provider,
      sub: info.sub,
      email: info.email,
      name: info.name,
      picture: info.picture,
    };
  }

  // Apple: verifying the JWT needs Apple's rotating JWKS. Left as an explicit
  // stub rather than a fake pass, so it cannot ship half-trusted.
  throw ApiError.badRequest('Apple sign-in verification is not wired up yet');
}

/** GET /auth/me */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user, { self: true }) });
  }),
);

/** POST /auth/devices — register an FCM token for push. */
router.post(
  '/devices',
  requireAuth,
  validate(z.object({ token: z.string().min(10), platform: z.enum(['ios', 'android', 'web']) })),
  asyncHandler(async (req, res) => {
    const device = await prisma.device.upsert({
      where: { token: req.body.token },
      create: { userId: req.user.id, token: req.body.token, platform: req.body.platform },
      update: { userId: req.user.id, platform: req.body.platform },
    });
    res.status(201).json({ device });
  }),
);

router.delete(
  '/devices/:token',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.device.deleteMany({ where: { token: req.params.token, userId: req.user.id } });
    res.status(204).end();
  }),
);

export default router;
