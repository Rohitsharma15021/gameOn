import { prisma } from './prisma.js';

/**
 * Chat is limited to the host plus players who actually joined. Shared by the
 * REST routes and the socket gateway so both enforce the same rule.
 */
export async function isGameMember(gameId, userId) {
  if (!userId) return false;
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { hostId: true, players: { where: { userId, status: 'JOINED' }, select: { id: true } } },
  });
  if (!game) return false;
  return game.hostId === userId || game.players.length > 0;
}
