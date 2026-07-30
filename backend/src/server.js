import http from 'node:http';
import { createApp } from './app.js';
import { createChatGateway } from './sockets/chat.gateway.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './lib/prisma.js';
import { releaseExpiredHolds } from './services/slot.service.js';

const app = createApp();
const server = http.createServer(app);

createChatGateway(server, env.corsOrigin.includes('*') ? true : env.corsOrigin);

// Abandoned checkouts (user backgrounds the app mid-payment) must not lock a
// court forever — sweep every minute.
const holdSweeper = setInterval(() => {
  releaseExpiredHolds().catch((err) => console.error('[slots] sweep failed', err));
}, 60 * 1000);

server.listen(env.port, () => {
  console.log(`gameOn API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  clearInterval(holdSweeper);
  server.close();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
