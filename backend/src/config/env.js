import 'dotenv/config';

const bool = (v, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const int = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  otp: {
    driver: process.env.OTP_DRIVER || 'mock',
    ttlSeconds: int(process.env.OTP_TTL_SECONDS, 300),
    devCode: process.env.OTP_DEV_CODE || '',
    maxAttempts: 5,
  },

  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appleClientId: process.env.APPLE_CLIENT_ID || '',
  },

  payments: {
    driver: process.env.PAYMENT_DRIVER || 'mock',
    currency: process.env.PAYMENT_CURRENCY || 'INR',
    platformFeeBps: int(process.env.PLATFORM_FEE_BPS, 500),
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },

  push: {
    driver: process.env.PUSH_DRIVER || 'mock',
    fcmServerKey: process.env.FCM_SERVER_KEY || '',
  },

  maps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  verboseLogs: bool(process.env.VERBOSE_LOGS, true),
};

if (env.isProd && env.jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
