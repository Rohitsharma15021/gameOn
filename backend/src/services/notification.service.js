import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const pushDrivers = {
  async mock(tokens, payload) {
    if (tokens.length) console.log(`[push:mock] -> ${tokens.length} device(s):`, payload.title);
  },
  async fcm(tokens, payload) {
    if (!env.push.fcmServerKey || !tokens.length) return;
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${env.push.fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {},
      }),
    }).catch((err) => console.error('[push:fcm]', err.message));
  },
};

/**
 * Persists an in-app notification and fans it out to the user's devices.
 * Never throws — a failed push must not roll back the action that caused it.
 */
export async function notify(userId, { type, title, body, data }) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, data: data ?? undefined },
    });

    const devices = await prisma.device.findMany({ where: { userId }, select: { token: true } });
    const driver = pushDrivers[env.push.driver] || pushDrivers.mock;
    await driver(
      devices.map((d) => d.token),
      { title, body, data: { type, ...(data || {}) } },
    );

    return notification;
  } catch (err) {
    console.error('[notify]', err.message);
    return null;
  }
}

export async function notifyMany(userIds, payload) {
  await Promise.all([...new Set(userIds)].map((id) => notify(id, payload)));
}
