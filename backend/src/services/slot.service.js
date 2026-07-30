import dayjs from 'dayjs';
import { prisma } from '../lib/prisma.js';

const HOLD_MINUTES = 10;

/**
 * Local midnight for a YYYY-MM-DD string. openMinute/closeMinute are minutes
 * from midnight in the venue's local time, so slot start times must anchor to
 * the server's local midnight, not UTC — otherwise "opens at 6am" renders as
 * 11:30am for a UTC+5:30 server/viewer. Single-timezone simplification: a
 * multi-timezone deployment would store each venue's IANA tz and localize per row.
 */
export const dateOnly = (value) => new Date(`${dayjs(value).format('YYYY-MM-DD')}T00:00:00.000`);

/**
 * Lazily materialises a court's slots for a given day from the venue's opening
 * hours. Generating on read keeps the slots table from exploding while still
 * giving bookings a real row to lock against.
 */
export async function ensureSlotsForDay(courtId, date) {
  const court = await prisma.court.findUnique({ where: { id: courtId }, include: { venue: true } });
  if (!court) return [];

  const day = dateOnly(date);
  const existing = await prisma.slot.findMany({
    where: { courtId, date: day },
    orderBy: { startsAt: 'asc' },
  });

  const step = court.slotMinutes || 60;
  const expected = Math.max(0, Math.floor((court.venue.closeMinute - court.venue.openMinute) / step));
  if (existing.length >= expected) return existing;

  const hourlyPrice = court.pricePerHour;
  const rows = [];
  for (let i = 0; i < expected; i += 1) {
    const startMinute = court.venue.openMinute + i * step;
    const startsAt = dayjs(day).add(startMinute, 'minute').toDate();
    const endsAt = dayjs(startsAt).add(step, 'minute').toDate();
    rows.push({
      courtId,
      date: day,
      startsAt,
      endsAt,
      price: Math.round((hourlyPrice * step) / 60),
    });
  }

  if (rows.length) {
    await prisma.slot.createMany({ data: rows, skipDuplicates: true });
  }

  return prisma.slot.findMany({ where: { courtId, date: day }, orderBy: { startsAt: 'asc' } });
}

/** A HELD slot whose hold has lapsed is available again. */
export function effectiveStatus(slot) {
  if (slot.status === 'HELD' && (!slot.holdUntil || slot.holdUntil < new Date())) return 'AVAILABLE';
  return slot.status;
}

export const holdExpiry = () => dayjs().add(HOLD_MINUTES, 'minute').toDate();

/** Releases stale holds so abandoned checkouts free the court back up. */
export async function releaseExpiredHolds() {
  const { count } = await prisma.slot.updateMany({
    where: { status: 'HELD', holdUntil: { lt: new Date() } },
    data: { status: 'AVAILABLE', holdUntil: null },
  });
  if (count) console.log(`[slots] released ${count} expired hold(s)`);
  return count;
}
