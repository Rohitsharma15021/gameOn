import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';

/**
 * OTP delivery drivers. `mock` prints to the server log and echoes the code in
 * the API response so the app is testable without an SMS provider. Swap
 * OTP_DRIVER once you have Twilio/MSG91 credentials.
 */
const drivers = {
  async mock(phone, code) {
    console.log(`\n  [otp] ${phone} -> ${code}  (expires in ${env.otp.ttlSeconds}s)\n`);
    return { echo: true };
  },
  async twilio(phone, code) {
    // TODO: wire the Twilio SDK. Kept as a stub so the driver contract is clear.
    throw ApiError.badRequest(`Twilio driver not configured (phone ${phone}, code ${code.length} digits)`);
  },
  async msg91(phone) {
    throw ApiError.badRequest(`MSG91 driver not configured (phone ${phone})`);
  },
};

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

export function normalisePhone(raw) {
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  // Default to India when no country code is supplied.
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export async function requestOtp(rawPhone) {
  const phone = normalisePhone(rawPhone);

  // Throttle: max 3 codes per phone per 10 minutes.
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await prisma.otpCode.count({ where: { phone, createdAt: { gte: since } } });
  if (recent >= 3) throw ApiError.tooMany('Too many OTP requests. Try again in a few minutes.');

  const code = generateCode();
  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: await bcrypt.hash(code, 8),
      expiresAt: new Date(Date.now() + env.otp.ttlSeconds * 1000),
    },
  });

  const driver = drivers[env.otp.driver] || drivers.mock;
  const result = await driver(phone, code);

  return {
    phone,
    expiresInSeconds: env.otp.ttlSeconds,
    // Only ever echoed by the mock driver in non-production.
    devCode: result?.echo && !env.isProd ? code : undefined,
  };
}

export async function verifyOtp(rawPhone, code) {
  const phone = normalisePhone(rawPhone);

  // Dev escape hatch so QA/simulators can log in without SMS.
  if (!env.isProd && env.otp.devCode && code === env.otp.devCode) return phone;

  const record = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw ApiError.badRequest('This code has expired. Request a new one.');
  if (record.attempts >= env.otp.maxAttempts) {
    throw ApiError.tooMany('Too many incorrect attempts. Request a new code.');
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw ApiError.badRequest('Incorrect code');
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return phone;
}
