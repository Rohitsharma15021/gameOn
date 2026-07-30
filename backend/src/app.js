import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import venueRoutes from './routes/venue.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import gameRoutes from './routes/game.routes.js';
import messageRoutes from './routes/message.routes.js';
import reviewRoutes from './routes/review.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.includes('*') ? true : env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Webhook needs the raw body for signature verification, so it must be
  // mounted before the JSON body parser touches the request stream.
  app.use('/payments/webhook', express.raw({ type: '*/*' }));
  app.use('/payments', paymentRoutes);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  app.use(apiLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/venues', venueRoutes);
  app.use('/bookings', bookingRoutes);
  app.use('/games', gameRoutes);
  app.use('/games/:gameId/messages', messageRoutes);
  app.use('/reviews', reviewRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
